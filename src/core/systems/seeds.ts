/**
 * The seed store: germination, opening, and what the larvae are fed.
 *
 * This is the mechanic the simulator exists for. Tschinkel & Kwapich 2016 found that the
 * Florida harvester ant collects seeds of every size, can open only the small ones, and
 * keeps the rest in damp chambers where they germinate. A germinating seed splits its own
 * husk. The ants find it within a day or two and feed it to the larvae, so the large seeds
 * that make up most of a store are food the colony can reach only when the seed itself
 * starts to grow. See docs/SCIENCE.md section 6.
 *
 * Once a day, over every cell of the store:
 *
 *  - seeds of each size class germinate at a rate read from the laboratory tests at the
 *    soil temperature of that cell's depth. Depth has no effect of its own; the burial
 *    experiment found none.
 *  - small and medium seeds are opened and eaten at the measured rates, faster when the
 *    colony has its majors. Large and very large seeds are never opened, by a major or by
 *    anyone else. HARD RULE on the range.
 *  - germinating seeds are found and fed out at the measured daily rate.
 *
 * What is eaten goes to the larvae. Their need is what it takes to build a worker, and a day
 * on which they get less than that is a day on which some of them starve. Nothing recruits
 * a forager to fix it and nothing draws on the store faster.
 *
 * ## Why the laboratory rates are scaled down
 *
 * The germination rates in the paper were measured on damp plaster, without ants, without
 * neighbouring seeds. Used as they stand they would have a mature store of three hundred
 * thousand seeds sprouting several grams of food a day, enough to raise the brood with no
 * foraging at all — and colonies kept from foraging were observed to lose their larvae
 * within a week. The same paper measured germination inside natural chambers the ants could
 * not reach, and found about a hundredth of the laboratory rate. `inNestGerminationFactor`
 * carries that ratio, and DECISIONS.md D22 records the argument.
 *
 * Like the brood, the store is counts rather than individuals, so a day's germination is a
 * fraction of what a cell holds rather than a coin toss per seed.
 */

import { pow } from '../math/approx.js'
import { Caste } from '../state/ants.js'
import type { Simulation } from '../sim/simulation.js'
import type { Params } from '../params/params.js'
import type { NestGrid } from '../state/nest.js'
import type { SoilModel } from './soil.js'
import type { DemographyState } from './demography.js'

/**
 * Everything the seed store owns between days.
 *
 * The per-class stores are recounted from the grids every day rather than maintained as
 * running sums, for the same reason the interior recounts: a total that drifts from the
 * grid it summarises is a number this project cannot afford to report.
 */
export interface SeedStoreState {
  readonly nest: NestGrid
  readonly soil: SoilModel
  /** Read for the larvae, and written with how short of their need the day's food fell. */
  readonly demography: DemographyState

  /** Seeds in store by size class, and their mass in milligrams, as of the last day. */
  readonly storedByClass: Float64Array
  readonly storedMgByClass: Float64Array
  /** Germinating seeds lying in the chambers, not yet found. */
  germinatingInStore: number
  germinatingMgInStore: number

  /** The last day's food, in milligrams of seed, and what the larvae needed. */
  foodMgToday: number
  germinatedFoodMgToday: number
  larvalDemandMgToday: number

  /** Running totals, for the readouts, the study output and the tests. */
  readonly totalGerminatedByClass: Float64Array
  readonly totalOpenedByClass: Float64Array
  totalGerminatedEatenMg: number
  totalOpenedEatenMg: number
  totalFedToLarvaeMg: number
  totalGerminatedFedToLarvaeMg: number
  /** Seeds that germinated outside the active season and were lost rather than eaten. */
  totalLostOutOfSeason: number
}

export function createSeedStoreState(
  nest: NestGrid,
  soil: SoilModel,
  demography: DemographyState,
  params: Params,
): SeedStoreState {
  const classes = params.seeds.sizeClassNames.value.length
  return {
    nest,
    soil,
    demography,
    storedByClass: new Float64Array(classes),
    storedMgByClass: new Float64Array(classes),
    germinatingInStore: 0,
    germinatingMgInStore: 0,
    foodMgToday: 0,
    germinatedFoodMgToday: 0,
    larvalDemandMgToday: 0,
    totalGerminatedByClass: new Float64Array(classes),
    totalOpenedByClass: new Float64Array(classes),
    totalGerminatedEatenMg: 0,
    totalOpenedEatenMg: 0,
    totalFedToLarvaeMg: 0,
    totalGerminatedFedToLarvaeMg: 0,
    totalLostOutOfSeason: 0,
  }
}

/**
 * Whether workers can open a seed of this size class at all.
 *
 * A class is openable when its narrowest seed is narrower than the widest seed a worker can
 * open. Nothing about the colony changes this — not majors, not hunger. HARD RULE.
 */
export function isOpenable(params: Params, sizeClass: number): boolean {
  return (
    params.seeds.sizeClassMinWidthMm.value[sizeClass]! <
    params.foraging.maxOpenableSeedWidthMm.value
  )
}

/**
 * Fraction of a size class germinating in one laboratory test period at a temperature.
 *
 * Linear between the four tested temperatures and held at the nearest one beyond them,
 * because inventing a response outside the tested range would be worse than admitting the
 * range ends.
 */
export function germinationFraction(
  params: Params,
  sizeClass: number,
  temperatureC: number,
): number {
  const temperatures = params.seeds.germinationTestTemperaturesC.value
  const fractions = params.seeds.germinationByClass[sizeClass]!.value
  const last = temperatures.length - 1
  if (temperatureC <= temperatures[0]!) return fractions[0]!
  if (temperatureC >= temperatures[last]!) return fractions[last]!
  let k = 0
  while (temperatureC > temperatures[k + 1]!) k += 1
  const t = (temperatureC - temperatures[k]!) / (temperatures[k + 1]! - temperatures[k]!)
  return fractions[k]! + (fractions[k + 1]! - fractions[k]!) * t
}

/**
 * Daily chance that a stored seed of this class germinates in a chamber at this soil
 * temperature.
 *
 * The laboratory fraction per test becomes a constant daily chance, and that is scaled by
 * `inNestGerminationFactor`, because seeds packed in a chamber germinate at a small fraction
 * of the rate they manage alone on damp plaster. There is no depth argument: depth had no
 * significant effect in the burial experiment, and it acts here only through temperature.
 */
export function germinationChancePerDay(
  params: Params,
  sizeClass: number,
  temperatureC: number,
): number {
  const fraction = germinationFraction(params, sizeClass, temperatureC)
  if (fraction <= 0) return 0
  const laboratory =
    fraction >= 1 ? 1 : 1 - pow(1 - fraction, 1 / params.seeds.germinationTestDurationDays.value)
  return laboratory * params.seeds.inNestGerminationFactor.value
}

/**
 * How much faster than a colony without majors this colony opens small and medium seeds.
 *
 * With no majors the rate is the measured third; at the share of majors in that experiment
 * or above it is the full rate. The straight line between is invented. This multiplies the
 * rate and does nothing else: which seeds can be opened is `isOpenable`, and majors do not
 * enter into it.
 */
export function majorOpeningFactor(params: Params, majorShareOfWorkers: number): number {
  if (!params.seeds.majorsIncreaseOpeningRate.value) return 1
  const without = params.seeds.openingRateFractionWithoutMajors.value
  const reference = params.seeds.openingMajorReferenceFraction.value
  const share = reference <= 0 ? 1 : Math.min(1, Math.max(0, majorShareOfWorkers / reference))
  return without + (1 - without) * share
}

/**
 * Milligrams of seed one larva needs per day.
 *
 * What it takes to build a worker: a minor's dry mass, divided by how much of the seed it
 * eats ends up as ant, spread over the time it spends as a larva. Worker mass is measured,
 * larval duration is bracketed by the literature, and the conversion efficiency is invented.
 * Every larva is treated as a worker larva; an alate larva needs more, and nothing in the
 * bibliography says how much.
 */
export function larvalDemandMgPerDay(params: Params): number {
  return (
    params.colony.minorWorkerDryMassMg.value /
    (params.brood.larvalSeedConversionEfficiency.value * params.brood.larvaDurationDays.value)
  )
}

/**
 * Share of the stored seed mass in sizes the ants cannot open. Tschinkel & Kwapich found
 * about 70 percent or more, which is the figure the store is measured against.
 */
export function unopenableShareByWeight(params: Params, state: SeedStoreState): number {
  let total = 0
  let unopenable = 0
  for (let c = 0; c < state.storedMgByClass.length; c += 1) {
    const mg = state.storedMgByClass[c]!
    total += mg
    if (!isOpenable(params, c)) unopenable += mg
  }
  return total > 0 ? unopenable / total : 0
}

/** The system. Runs on the day boundary, after the interior and before demography. */
export function makeSeedStoreSystem(state: SeedStoreState) {
  return (sim: Simulation): void => {
    if (!sim.clock.isDayBoundary) return
    if (state.demography.phase === 'dead') return
    runDay(sim, state)
  }
}

function runDay(sim: Simulation, state: SeedStoreState): void {
  const { params, ants } = sim
  const { nest, soil } = state
  const seeds = params.seeds
  const classes = seeds.sizeClassNames.value.length
  const mass = seeds.sizeClassMassMg.value
  const active = params.colony.activeMonths.value.includes(sim.clock.date().month)

  // Majors raise the rate at which small and medium seeds are opened, so the rate depends on
  // the share of the workforce that is major. Nothing else about the ants matters here.
  let workers = 0
  let majors = 0
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    const caste = ants.caste[i]
    if (caste === Caste.MajorWorker) majors += 1
    if (caste === Caste.MajorWorker || caste === Caste.MinorWorker) workers += 1
  }
  const rateFactor = majorOpeningFactor(params, workers === 0 ? 0 : majors / workers)
  const opensToday = active || !seeds.seedsOpenedOnlyInActiveSeason.value
  const opening = new Float64Array(classes)
  for (let c = 0; c < classes; c += 1) {
    opening[c] =
      opensToday && isOpenable(params, c) ? seeds.openingChancePerDay.value[c]! * rateFactor : 0
  }

  // Out of season, nothing germinating is eaten. What sprouts in winter has sprouted too far
  // by spring, and the ants carry it out.
  const removal = active ? seeds.germinatingRemovalChancePerDay.value : 0
  const outOfSeason = !active && seeds.germinationOutsideActiveSeasonIsLost.value

  state.storedByClass.fill(0)
  state.storedMgByClass.fill(0)
  let germinatingCount = 0
  let germinatingMg = 0
  let germinatedFoodMg = 0
  let openedFoodMg = 0
  const chance = new Float64Array(classes)

  const bounds = nest.pheromoneBounds()
  const minRow = Math.max(0, bounds.minRow)
  const maxRow = Math.min(nest.rows - 1, bounds.maxRow)
  const minCol = Math.max(0, bounds.minCol)
  const maxCol = Math.min(nest.cols - 1, bounds.maxCol)

  for (let row = minRow; row <= maxRow; row += 1) {
    // Soil temperature varies with depth and not across the slice, so one row shares one
    // set of chances.
    const temperatureC = soil.temperature.get(nest.entranceCol, row)
    for (let c = 0; c < classes; c += 1) {
      chance[c] = germinationChancePerDay(params, c, temperatureC)
    }

    for (let col = minCol; col <= maxCol; col += 1) {
      if (nest.seeds.get(col, row) > 0) {
        let left = 0
        for (let c = 0; c < classes; c += 1) {
          const layer = nest.seedsByClass[c]!
          const count = layer.get(col, row)
          if (count <= 0) continue
          const germinated = count * chance[c]!
          const opened = (count - germinated) * opening[c]!
          const remaining = count - germinated - opened
          layer.set(col, row, remaining)
          left += remaining

          state.storedByClass[c]! += remaining
          state.storedMgByClass[c]! += remaining * mass[c]!
          state.totalGerminatedByClass[c]! += germinated
          state.totalOpenedByClass[c]! += opened
          openedFoodMg += opened * mass[c]!

          if (outOfSeason) {
            state.totalLostOutOfSeason += germinated
          } else {
            nest.germinating.add(col, row, germinated)
            nest.germinatingMg.add(col, row, germinated * mass[c]!)
          }
        }
        // The total is rebuilt from the classes rather than decremented, so the two layers
        // cannot drift apart a rounding error at a time.
        nest.seeds.set(col, row, left)
      }

      const sprouting = nest.germinating.get(col, row)
      if (sprouting > 0) {
        if (outOfSeason) {
          state.totalLostOutOfSeason += sprouting
          nest.germinating.set(col, row, 0)
          nest.germinatingMg.set(col, row, 0)
        } else if (removal > 0) {
          const mg = nest.germinatingMg.get(col, row)
          germinatedFoodMg += mg * removal
          nest.germinating.set(col, row, sprouting * (1 - removal))
          nest.germinatingMg.set(col, row, mg * (1 - removal))
        }
        germinatingCount += nest.germinating.get(col, row)
        germinatingMg += nest.germinatingMg.get(col, row)
      }
    }
  }

  // Everything eaten today is offered to the larvae, germinating seed first. Adults are not
  // fed from the store in this model — worker fat follows its own published schedule — so
  // the preference for germinating seed decides only which food is counted as having fed
  // the larvae when there is more than they need.
  const demandMg = state.demography.brood.larvaCount * larvalDemandMgPerDay(params)
  const foodMg = germinatedFoodMg + openedFoodMg
  const fedMg = Math.min(foodMg, demandMg)

  state.germinatingInStore = germinatingCount
  state.germinatingMgInStore = germinatingMg
  state.foodMgToday = foodMg
  state.germinatedFoodMgToday = germinatedFoodMg
  state.larvalDemandMgToday = demandMg
  state.totalGerminatedEatenMg += germinatedFoodMg
  state.totalOpenedEatenMg += openedFoodMg
  state.totalFedToLarvaeMg += fedMg
  state.totalGerminatedFedToLarvaeMg += Math.min(germinatedFoodMg, demandMg)

  // Demography runs next and answers a shortfall with larval death, and with nothing else.
  state.demography.larvalFoodShortfall = demandMg > 0 ? 1 - fedMg / demandMg : 0
}
