/**
 * A colony, from the nuptial flight to the end-of-run summary.
 *
 * This assembles the pieces — soil, climate, excavation, brood, demography — into one run,
 * and owns the state they share. It is the object the Worker drives and the renderer reads.
 *
 * It begins with a single mated queen who lands, sheds her wings, digs a shaft and one
 * chamber, seals herself in and raises her first daughters on nothing but her own fat and
 * flight muscle. She takes in no food while she does it. If her reserve runs out before
 * they eclose, the colony is over — which is what happens to the overwhelming majority of
 * real queens.
 */

import { Simulation } from './simulation.js'
import { Caste, Domain, Task } from '../state/ants.js'
import { BroodStore } from '../state/brood.js'
import { NestGrid } from '../state/nest.js'
import { SurfaceGrid } from '../state/surface.js'
import { SoilModel } from '../systems/soil.js'
import { ClimateModel } from '../systems/climate.js'
import { makeExcavationSystem } from '../systems/excavation.js'
import { createForagingState, makeForagingSystem, meanTripTicks } from '../systems/foraging.js'
import { createInteriorState, makeInteriorSystem } from '../systems/interior.js'
import {
  createDemographyState,
  makeDemographySystem,
  countForagers,
  countWorkers,
} from '../systems/demography.js'
import { RULE } from '../provenance/rules.js'
import type { ExcavationState } from '../systems/excavation.js'
import type { ForagingState } from '../systems/foraging.js'
import type { InteriorState } from '../systems/interior.js'
import type { DemographyState } from '../systems/demography.js'
import type { Params } from '../params/params.js'

export interface ColonyOptions {
  readonly seed: number
  readonly params: Params
  /** Slots for ants. A memory budget, not a biological limit. */
  readonly capacity?: number
  /**
   * Day of year the nuptial flight happens. Alates fly May to July after heavy rain; the
   * default is mid-June, which is when first mating flights were recorded every year of
   * Kwapich & Tschinkel's study.
   */
  readonly flightDayOfYear?: number
}

export interface ColonySummary {
  readonly yearsSurvived: number
  readonly workers: number
  readonly foragers: number
  readonly brood: number
  readonly peakWorkers: number
  readonly totalEclosed: number
  readonly totalLarvaeStarved: number
  readonly totalForagersLost: number
  readonly nestDepthCm: number
  readonly soilMovedCells: number
  readonly phase: string
  /** Seeds lying in the nest's own chambers, where the ants put them. */
  readonly seedsStored: number
  /** Seeds in a worker's mandibles inside the nest, on their way to or down the store. */
  readonly seedsInTransit: number
  /** Brood the colony is holding, as placed in chambers. */
  readonly broodInChambers: number
  readonly totalSeedsCollected: number
  readonly foragersOnSurface: number
  /** Mean completed foraging trip, in ticks. A tick is one simulated minute; see D7. */
  readonly meanTripTicks: number
}

export class Colony {
  readonly sim: Simulation
  readonly nest: NestGrid
  readonly soil: SoilModel
  readonly climate: ClimateModel
  readonly excavation: ExcavationState
  readonly demography: DemographyState
  readonly surface: SurfaceGrid
  readonly foraging: ForagingState
  readonly interior: InteriorState

  private peakWorkers = 0

  constructor(options: ColonyOptions) {
    const { params } = options
    const capacity = options.capacity ?? params.colony.maxWorkers.value

    this.sim = new Simulation({
      seed: options.seed,
      params,
      capacity,
      startDayOfYear: options.flightDayOfYear ?? 165,
    })

    this.nest = new NestGrid(params)
    this.soil = new SoilModel(params)
    this.climate = new ClimateModel(params)
    this.excavation = {
      nest: this.nest,
      soil: this.soil,
      surfacePellets: 0,
      redepositedPellets: 0,
      foundingTargetDepthCm: 0,
      foundingDigTicks: 0,
      foundingChamberCol: -1,
      foundingChamberRow: -1,
      occupants: new Uint16Array(this.nest.cols * this.nest.rows),
      blockAnts: new Uint16Array(this.nest.blockCols * this.nest.blockRows),
    }
    const nanatics = Math.round(
      this.sim.prng.nextRange(params.brood.nanaticCount.min, params.brood.nanaticCount.max),
    )
    this.demography = createDemographyState(
      new BroodStore(
        params.brood.eggDurationDays.value,
        params.brood.larvaDurationDays.value,
        params.brood.pupaDurationDays.value,
      ),
      this.nest,
      params,
      nanatics,
    )

    // The ground above. Trunk trail directions are drawn from the colony's own seed here,
    // before anything walks on them, so a colony's trails are a property of its seed.
    this.surface = new SurfaceGrid(params, this.sim.prng)
    this.foraging = createForagingState(this.surface, this.soil, this.climate)

    // Movement, brood tending and the seed store, inside the nest. It borrows excavation's
    // per-cell ant counts rather than recounting them: excavation fills that array at the
    // top of every tick and runs first.
    this.interior = createInteriorState(this.nest, this.demography, this.excavation.occupants)

    // The entrance. Everything below it the colony digs itself.
    this.nest.excavate(this.nest.entranceCol, 0)
    this.soil.applyVoid(this.nest, this.nest.entranceCol, 0)

    // The depth she will sink her founding shaft to. Incipient nests are 29 to 37 cm.
    this.excavation.foundingTargetDepthCm = this.sim.prng.nextRange(
      params.nest.incipientDepthCm.min,
      params.nest.incipientDepthCm.max,
    )

    // The queen lands and sheds her wings. She is the only queen this colony will ever
    // have: P. badius is monogynous, and the parameter loader refuses a file that says
    // otherwise.
    const queen = this.sim.ants.spawn(Caste.Queen, Domain.Nest)
    this.sim.ants.x[queen] = 0
    this.sim.ants.y[queen] = this.nest.depthOf(0)
    this.sim.ants.fat[queen] = 1
    this.sim.ants.task[queen] = Task.Excavator
    this.sim.ants.digger[queen] = 0
    this.sim.ants.ruleId[queen] = RULE.digShaftDescent
    this.demography.queenSlot = queen

    // Weather has to exist before anything can dig; moisture gates excavation.
    const date = this.sim.clock.date()
    this.climate.rollDay(date.dayOfYear, date.month, this.sim.prng)
    this.soil.updateMoisture(this.climate.day.rainfallMm)
    this.soil.updateTemperature(date.dayOfYear, this.climate)

    // Everything mutable that is not an ant, folded into the digest. Registration order is
    // part of the digest, so these are listed in the order the systems that write them run.
    this.sim.registerState('nest', () => this.nest.buffers())
    this.sim.registerState('soil', () => this.soil.buffers())
    this.sim.registerState('brood', () => this.demography.brood.buffers())
    this.sim.registerState('surface', () => this.surface.buffers())

    this.sim.register('climate', () => this.rollWeather())
    this.sim.register('excavation', makeExcavationSystem(this.excavation))
    this.sim.register('interior', makeInteriorSystem(this.interior))
    this.sim.register('demography', makeDemographySystem(this.demography))
    this.sim.register('foraging', makeForagingSystem(this.foraging))
    this.sim.register('newAdults', () => this.settleNewAdults())
  }

  private rollWeather(): void {
    if (!this.sim.clock.isDayBoundary) return
    const date = this.sim.clock.date()
    this.climate.rollDay(date.dayOfYear, date.month, this.sim.prng)
    this.soil.updateMoisture(this.climate.day.rainfallMm)
    this.soil.updateTemperature(date.dayOfYear, this.climate)

    // Foraging onset in spring follows soil temperature where the foragers are.
    this.demography.soilTemperatureAtForagerDepthC = this.soil.temperatureAt(
      this.sim.params.labour.foragerObservedMaxDepthCm.value,
      date.dayOfYear,
      this.climate,
    )
  }

  /**
   * Retires the queen from digging once her daughters are working.
   *
   * A founding queen digs her own shaft and first chamber. A queen with workers lays.
   */
  private settleNewAdults(): void {
    if (!this.sim.clock.isDayBoundary) return
    const { ants } = this.sim
    const queen = this.demography.queenSlot
    if (queen >= 0 && this.demography.phase !== 'founding' && ants.task[queen] !== Task.None) {
      ants.task[queen] = Task.None
      ants.digger[queen] = 255
      this.excavation.foundingTargetDepthCm = 0
    }
  }

  step(): void {
    this.sim.step()
    const workers = countWorkers(this.sim)
    if (workers > this.peakWorkers) this.peakWorkers = workers
  }

  run(ticks: number): void {
    for (let i = 0; i < ticks; i += 1) this.step()
  }

  get alive(): boolean {
    return this.demography.phase !== 'dead'
  }

  summary(): ColonySummary {
    const date = this.sim.clock.date()
    return {
      yearsSurvived: date.colonyYear,
      workers: countWorkers(this.sim),
      foragers: countForagers(this.sim),
      brood: this.demography.brood.total,
      peakWorkers: this.peakWorkers,
      totalEclosed: this.demography.totalEclosed,
      totalLarvaeStarved: this.demography.totalLarvaeStarved,
      totalForagersLost: this.demography.totalForagersLost,
      nestDepthCm: this.nest.maxDepthCm,
      soilMovedCells: this.nest.excavatedCells,
      phase: this.demography.phase,
      seedsStored: this.interior.seedsInStore,
      seedsInTransit: this.interior.seedsCarried,
      broodInChambers: this.interior.broodInCells,
      totalSeedsCollected: this.foraging.totalSeedsCollected,
      foragersOnSurface: this.foraging.antsOnSurface,
      meanTripTicks: meanTripTicks(this.foraging),
    }
  }
}
