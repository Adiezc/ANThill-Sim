/**
 * A colony of a fixed size, digging, with no demography.
 *
 * The architecture gate needs a mature nest, which needs thousands of workers — but the
 * demographic engine is the next step, not this one. So this harness supplies N workers
 * directly, of fixed ages, with no births, deaths or ageing, and lets them dig.
 *
 * That separation is the point. If the nest comes out wrong once real demography is wired
 * in, it will be clear whether the fault is in the digging rules or in the population
 * feeding them. See docs/DECISIONS.md and docs/VALIDATION.md.
 *
 * This is a validation harness, not a mechanic. It does not ship in the simulator.
 */

import { Simulation } from './simulation.js'
import { Caste, Domain, Task } from '../state/ants.js'
import { NestGrid } from '../state/nest.js'
import { SoilModel } from '../systems/soil.js'
import { ClimateModel } from '../systems/climate.js'
import { assignDiggerTrait, makeExcavationSystem } from '../systems/excavation.js'
import type { ExcavationState } from '../systems/excavation.js'
import type { Params } from '../params/params.js'

export interface HarnessOptions {
  readonly seed: number
  readonly params: Params
  /** Workers in the colony. Fixed for the whole run. */
  readonly workers: number
  /** Day of year the run starts on. Excavation responds to soil moisture and temperature. */
  readonly startDayOfYear?: number
}

export interface NestHarness {
  readonly sim: Simulation
  readonly nest: NestGrid
  readonly soil: SoilModel
  readonly climate: ClimateModel
  readonly excavation: ExcavationState
  run(ticks: number): void
}

export function createNestHarness(options: HarnessOptions): NestHarness {
  const { params, workers } = options

  const sim = new Simulation({
    seed: options.seed,
    params,
    capacity: workers + 1,
    startDayOfYear: options.startDayOfYear ?? 120,
  })

  const nest = new NestGrid(params)
  const soil = new SoilModel(params)
  const climate = new ClimateModel(params)
  const excavation: ExcavationState = {
    nest,
    soil,
    surfacePellets: 0,
    redepositedPellets: 0,
    foundingTargetDepthCm: 0,
    occupants: new Uint16Array(nest.cols * nest.rows),
    blockAnts: new Uint16Array(nest.blockCols * nest.blockRows),
  }

  // Open the entrance so there is somewhere to stand. One cell: everything below it is dug
  // by the ants themselves.
  nest.excavate(nest.entranceCol, 0)
  soil.applyVoid(nest, nest.entranceCol, 0)

  // The weather has to exist before anything can dig, because moisture gates excavation.
  const rollWeather = (): void => {
    const date = sim.clock.date()
    if (sim.clock.isDayBoundary) {
      climate.rollDay(date.dayOfYear, date.month, sim.prng)
      soil.updateMoisture(climate.day.rainfallMm)
      soil.updateTemperature(date.dayOfYear, climate)
    }
  }

  sim.register('climate', rollWeather)
  sim.register('excavation', makeExcavationSystem(excavation))

  // Seed the colony. Ages are spread across the range at which digging participation is
  // measured, so the mixture of diggers and non-diggers is the measured one rather than a
  // uniform guess.
  const ticksPerDay = sim.clock.ticksPerDay
  const oldest = params.labour.ageAtFirstForagingDaysSummerBorn.value * 1.5
  for (let i = 0; i < workers; i += 1) {
    const slot = sim.ants.spawn(
      sim.prng.chance(params.colony.majorWorkerFraction.value)
        ? Caste.MajorWorker
        : Caste.MinorWorker,
      Domain.Nest,
    )
    if (slot < 0) break
    sim.ants.ageTicks[slot] = Math.round(sim.prng.nextRange(0, oldest) * ticksPerDay)
    sim.ants.task[slot] = Task.Excavator
    sim.ants.x[slot] = nest.offsetOf(nest.entranceCol)
    sim.ants.y[slot] = nest.depthOf(0)
    sim.ants.lengthMm[slot] =
      sim.ants.caste[slot] === Caste.MajorWorker
        ? params.colony.majorWorkerLengthMm.value
        : params.colony.minorWorkerLengthMm.value
    assignDiggerTrait(sim.ants, slot, sim.prng)
  }

  // Prime the weather before the first tick so the first dig sees real soil.
  climate.rollDay(sim.clock.date().dayOfYear, sim.clock.date().month, sim.prng)
  soil.updateMoisture(climate.day.rainfallMm)
  soil.updateTemperature(sim.clock.date().dayOfYear, climate)

  return {
    sim,
    nest,
    soil,
    climate,
    excavation,
    run: (ticks: number) => sim.run(ticks),
  }
}
