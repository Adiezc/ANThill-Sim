/**
 * Births, ageing, task allocation and death.
 *
 * The shape of this system is set by one finding, which is also the most counter-intuitive
 * thing about the species: **allocation is one-way and it does not respond to need.**
 * Kwapich & Tschinkel removed half of a colony's foragers and no worker moved up from any
 * other caste to replace them. Larval survival fell instead. Raising forager number, body
 * fat or the larva-to-forager ratio induced no reversion either, and increased forager
 * survival actually *inhibits* new workers entering the role.
 *
 * So there is no feedback loop here looking at how many foragers the colony has and
 * appointing more. A worker eclosies deep, nurses, becomes a transfer worker, moves upward,
 * forages, and dies. What varies is how fast it makes that journey — and that is set by
 * when it was born, not by what the colony needs. A worker that eclosed in June forages at
 * 43 days old with a standard deviation under two days; one that eclosed in autumn
 * overwinters and does not forage for 210 to 360 days.
 *
 * Both are HARD RULEs and the parameter loader refuses a file that flips either.
 *
 * See docs/SCIENCE.md section 4.
 */

import { exp } from '../math/approx.js'
import { DAYS_IN_MONTH, MONTH_START } from '../sim/calendar.js'
import { RULE } from '../provenance/rules.js'
import { BroodFate } from '../state/brood.js'
import { assignDiggerTrait } from './excavation.js'
import { Caste, Domain, Task } from '../state/ants.js'
import type { BroodFateValue, BroodStore } from '../state/brood.js'
import type { Simulation } from '../sim/simulation.js'
import type { Params } from '../params/params.js'
import type { NestGrid } from '../state/nest.js'

/** How the colony is investing its brood, the player's one seasonal lever. */
export const BroodInvestment = {
  /** Everything into workers. */
  Workers: 0,
  Balanced: 1,
  /** As much into alates as the season allows. */
  Alates: 2,
} as const
export type BroodInvestmentValue = (typeof BroodInvestment)[keyof typeof BroodInvestment]

export type ColonyPhase = 'founding' | 'growing' | 'mature' | 'queenless' | 'dead'

export interface DemographyState {
  readonly brood: BroodStore
  /** Where new adults eclose. Demography needs to know how deep the nest actually is. */
  readonly nest: NestGrid
  phase: ColonyPhase
  /** Slot of the queen in the ant store, or -1 once she is dead. */
  queenSlot: number
  /**
   * The queen's remaining reserve during claustral founding, as a fraction of her starting
   * fat and flight muscle. She takes in no food until the first workers open the nest.
   */
  queenReserve: number
  /** The player's lever. Acts on developmental scheduling only; it never reassigns adults. */
  investment: BroodInvestmentValue
  /** Day of year the colony first foraged this year, or -1. Larvae follow it by 30-40 days. */
  firstForagingDayOfYear: number
  /** Eggs laid so far during claustral founding. She raises one first brood, not a stream. */
  foundingEggsLaid: number
  /** How many she will raise, drawn once at founding. */
  readonly nanaticTarget: number
  /**
   * Fractional adults left over from eclosion, carried to the next day.
   *
   * Brood is held as cohort counts, so a day's eclosion is a real number; adults are
   * individuals, so only whole ones can be created. Discarding the fraction sounds
   * harmless and is not: a colony of six workers ecloses about half an adult a day, every
   * day of it was floored to zero, and no founding colony survived its first year.
   */
  eclosionCarry: [number, number, number]
  /** Running totals for the end-of-run summary. */
  totalEclosed: number
  totalLarvaeStarved: number
  totalForagersLost: number
  yearOfDeath: number
}

export function createDemographyState(
  brood: BroodStore,
  nest: NestGrid,
  params: Params,
  nanaticTarget: number,
): DemographyState {
  return {
    brood,
    nest,
    foundingEggsLaid: 0,
    nanaticTarget,
    eclosionCarry: [0, 0, 0],
    phase: 'founding',
    queenSlot: -1,
    queenReserve: params.brood.queenFoundingFatReserve.value,
    investment: BroodInvestment.Balanced,
    firstForagingDayOfYear: -1,
    totalEclosed: 0,
    totalLarvaeStarved: 0,
    totalForagersLost: 0,
    yearOfDeath: -1,
  }
}

/** Adult workers alive, excluding the queen, alates and males. */
export function countWorkers(sim: Simulation): number {
  const { ants } = sim
  let workers = 0
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    const caste = ants.caste[i]!
    if (caste === Caste.MinorWorker || caste === Caste.MajorWorker || caste === Caste.Callow) {
      workers += 1
    }
  }
  return workers
}

export function countForagers(sim: Simulation): number {
  const { ants } = sim
  let foragers = 0
  for (let i = 0; i < ants.count; i += 1) {
    if (ants.isAlive(i) && ants.task[i] === Task.Forager) foragers += 1
  }
  return foragers
}

/**
 * Age at which a worker eclosing on this day of year will first forage.
 *
 * This is the whole mechanism. Summer-born workers reach it in 43 days; autumn-born ones
 * overwinter and take 210 to 360. Nothing about colony need enters into it.
 */
function ageAtFirstForagingDays(dayOfYear: number, params: Params, sim: Simulation): number {
  const month = monthOfDayOfYear(dayOfYear)
  const summerBorn = month >= 6 && month <= 8
  if (summerBorn) {
    const mean = params.labour.ageAtFirstForagingDaysSummerBorn.value
    const sd = params.labour.ageAtFirstForagingSummerBornSd.value
    return Math.max(1, mean + sim.prng.nextNormal() * sd)
  }
  const range = params.labour.ageAtFirstForagingDaysAutumnBornRange
  return sim.prng.nextRange(range.min, range.max)
}

function monthOfDayOfYear(dayOfYear: number): number {
  for (let m = 11; m >= 0; m -= 1) if (dayOfYear >= MONTH_START[m]!) return m + 1
  return 1
}

/**
 * Eggs the queen lays today.
 *
 * Laying is seasonal — colonies are active March to November and do not overwinter with
 * brood — and scales with colony size up to the mature rate. Both the rate and its scaling
 * are invented; no laying rate is published for this species.
 */
function eggsToday(
  sim: Simulation,
  state: DemographyState,
  workers: number,
  month: number,
): number {
  const { params } = sim
  if (state.phase === 'founding') {
    // A claustral queen raises one first brood, not a stream. She lays until she has the
    // clutch she can afford and then stops, because every egg is paid for out of flight
    // muscle she cannot replace until her daughters open the nest.
    const remaining = state.nanaticTarget - state.foundingEggsLaid
    return Math.max(0, Math.min(params.brood.queenEggsPerDayFounding.value, remaining))
  }
  if (!params.colony.activeMonths.value.includes(month)) return 0

  // Laying is limited by how much brood the workers can feed, not by the queen, so it
  // scales with worker number until it reaches the rate a mature colony sustains.
  return Math.min(
    params.brood.queenEggsPerDayMature.value,
    workers * params.brood.queenEggsPerWorkerPerDay.value,
  )
}

/**
 * How the day's eggs are split between workers, alates and males.
 *
 * The player's lever acts here and only here. It biases developmental scheduling upstream
 * of everything else; it cannot reassign an adult, because in this species nothing can.
 * Alates are produced only once a colony has passed sexual maturity at about 700 workers,
 * and are paid for out of worker fat stored the previous autumn.
 */
function splitByFate(
  count: number,
  sim: Simulation,
  state: DemographyState,
  workers: number,
  month: number,
): Record<BroodFateValue, number> {
  const { params } = sim
  const sexuallyMature = workers >= params.colony.sexualMaturityWorkers.value
  // Alates fly May to July, and the brood that becomes them is laid in the spring before.
  const alateSeason = params.brood.alateBroodMonths.value.includes(month)

  if (!sexuallyMature || !alateSeason) {
    return { [BroodFate.Worker]: count, [BroodFate.Alate]: 0, [BroodFate.Male]: 0 }
  }

  const alateShare =
    state.investment === BroodInvestment.Alates
      ? params.brood.alateShareAlateBias.value
      : state.investment === BroodInvestment.Workers
        ? params.brood.alateShareWorkerBias.value
        : params.brood.alateShareBalanced.value

  const sexual = count * alateShare
  const half = sexual / 2
  return {
    [BroodFate.Worker]: count - sexual,
    [BroodFate.Alate]: half,
    [BroodFate.Male]: half,
  }
}

/**
 * The demographic system. Most of it runs once a day; only ageing and mortality are
 * per-tick, and even those are applied as daily rates on the day boundary.
 */
export function makeDemographySystem(state: DemographyState) {
  return (sim: Simulation): void => {
    const { ants, clock } = sim
    if (state.phase === 'dead') return

    // Adults age every tick. Everything else is a daily process.
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i)) continue
      ants.ageTicks[i] = ants.ageTicks[i]! + 1
      if (ants.task[i] === Task.Forager) ants.foragingTicks[i] = ants.foragingTicks[i]! + 1
    }

    if (!clock.isDayBoundary) return
    runDay(sim, state)
  }
}

function runDay(sim: Simulation, state: DemographyState): void {
  const { ants, params, clock, prng } = sim
  const date = clock.date()
  const workers = countWorkers(sim)

  // ---- The queen ----
  if (state.queenSlot >= 0 && !ants.isAlive(state.queenSlot)) state.queenSlot = -1
  if (state.queenSlot < 0 && state.phase !== 'queenless') {
    state.phase = 'queenless'
  } else if (state.queenSlot >= 0) {
    const dailyHazard = 1 - exp(-1 / (params.colony.queenLifespanYears.value * 365))
    if (prng.chance(dailyHazard)) {
      ants.kill(state.queenSlot)
      state.queenSlot = -1
      state.phase = 'queenless'
    }
  }

  // ---- Laying ----
  if (state.phase !== 'queenless' && state.queenSlot >= 0) {
    const count = eggsToday(sim, state, workers, date.month)
    if (count > 0) {
      if (state.phase === 'founding') {
        // A claustral queen takes in no food. Every egg is paid for out of her own flight
        // muscle, and if the reserve runs out before the first workers eclose, founding
        // fails — which is what happens to the overwhelming majority of real queens.
        const cost = count * params.brood.queenFoundingFatPerEgg.value
        if (state.queenReserve < cost) {
          state.phase = 'dead'
          state.yearOfDeath = date.colonyYear
          if (state.queenSlot >= 0) ants.kill(state.queenSlot)
          return
        }
        state.queenReserve -= cost
        state.foundingEggsLaid += count
        state.brood.lay(BroodFate.Worker, count)
      } else {
        const split = splitByFate(count, sim, state, workers, date.month)
        state.brood.lay(BroodFate.Worker, split[BroodFate.Worker])
        state.brood.lay(BroodFate.Alate, split[BroodFate.Alate])
        state.brood.lay(BroodFate.Male, split[BroodFate.Male])
      }
    }
  }

  // ---- Starvation ----
  // The colony's only means of feeding larvae is its foragers. When there are too few for
  // the brood on hand, larvae die. Nothing is recruited to fix it.
  // The 1.64 foragers per larva that Kwapich & Tschinkel measured is a correlation in
  // mature colonies, not a feeding requirement, and treating it as a hard threshold starves
  // every founding colony to death within a year. Larvae begin to die only when foragers
  // fall well below it. A real food account arrives with the seed store at step 7.
  const foragers = countForagers(sim)
  const larvae = state.brood.larvaCount
  if (larvae > 0 && state.phase !== 'founding') {
    const needed =
      (larvae / params.labour.foragersPerLarva.value) *
      params.brood.starvationForagerRatioTolerance.value
    if (foragers < needed) {
      const shortfall = 1 - foragers / needed
      state.totalLarvaeStarved += state.brood.starveLarvae(
        shortfall * params.brood.starvationSeverityPerDay.value,
      )
    }
  }

  // ---- No overwintering brood ----
  if (
    params.brood.noOverwinteringBrood.value &&
    date.month > params.brood.latestPupalEclosionMonth.value
  ) {
    state.totalLarvaeStarved += state.brood.clearForWinter()
  }

  // ---- Brood advances ----
  const eclosed = state.brood.advanceDay(
    1 - params.brood.eggMortalityPerDay.value,
    1 - params.brood.larvaMortalityPerDay.value,
    1 - params.brood.pupaMortalityPerDay.value,
  )
  eclose(sim, state, eclosed, date.dayOfYear)

  // ---- Adults: task progression and death ----
  progressTasks(sim, state, date.dayOfYear)
  applyMortality(sim, state)

  // ---- Phase ----
  if (state.phase === 'founding' && workers > 0) state.phase = 'growing'
  if (state.phase === 'growing' && workers >= params.colony.sexualMaturityWorkers.value) {
    state.phase = 'mature'
  }
  // A colony is over when there is nobody left to raise anyone. A momentary gap with no
  // adult workers is survivable if the queen is alive and there is brood in the nest — which
  // is exactly the situation a founding colony is in for its first two months.
  const queenAlive = state.queenSlot >= 0 && ants.isAlive(state.queenSlot)
  if (workers === 0 && state.brood.total < 1 && !queenAlive) {
    state.phase = 'dead'
    state.yearOfDeath = date.colonyYear
  }
  if (state.phase === 'queenless' && workers === 0 && state.brood.total < 1) {
    state.phase = 'dead'
    state.yearOfDeath = date.colonyYear
  }
}

function eclose(
  sim: Simulation,
  state: DemographyState,
  counts: Record<BroodFateValue, number>,
  dayOfYear: number,
): void {
  const { ants, params, prng } = sim

  for (let fate = 0 as BroodFateValue; fate <= 2; fate = (fate + 1) as BroodFateValue) {
    const count = counts[fate] + state.eclosionCarry[fate]!
    const whole = Math.floor(count)
    state.eclosionCarry[fate] = count - whole
    for (let n = 0; n < whole; n += 1) {
      const caste =
        fate === BroodFate.Alate ? Caste.Alate : fate === BroodFate.Male ? Caste.Male : Caste.Callow
      const slot = ants.spawn(caste, Domain.Nest)
      if (slot < 0) return // the store is full; the colony has hit its capacity

      // Workers eclose deep, in the bottom of the nest as it currently is, and work their
      // way up. "As it currently is" matters: a founding colony's nest is a few centimetres
      // deep, and placing a callow at mature depth buries it in solid sand.
      const where = state.nest.deepVoidNear(params.brood.eclosionDepthBand.value, prng.nextFloat())
      ants.x[slot] = state.nest.offsetOf(where.col)
      ants.y[slot] = state.nest.depthOf(where.row)
      ants.fat[slot] = 1
      ants.task[slot] = Task.None
      ants.ruleId[slot] = RULE.idle
      // The age at which this individual will first forage is fixed now, by the season it
      // eclosed in, and never revisited. The exception is the founding brood: nanitics open
      // the nest and begin foraging at once rather than waiting out the age schedule their
      // later sisters follow.
      ants.timer[slot] =
        state.phase === 'founding' && params.brood.nanaticsForageImmediately.value
          ? Math.round(params.brood.callowDurationDays.value)
          : Math.round(ageAtFirstForagingDays(dayOfYear, params, sim))
      const major = prng.chance(params.colony.majorWorkerFraction.value)
      if (caste === Caste.Callow) {
        ants.lengthMm[slot] = major
          ? params.colony.majorWorkerLengthMm.value
          : params.colony.minorWorkerLengthMm.value
      }
      assignDiggerTrait(ants, slot, prng)
      state.totalEclosed += 1
    }
  }
}

/**
 * The one-way progression.
 *
 * Callow, then brood care deep in the nest, then transfer work, then foraging. A worker
 * moves on when it is old enough, or when its fat has fallen below the threshold — never
 * because the colony is short of anything, and never backwards.
 */
function progressTasks(sim: Simulation, state: DemographyState, dayOfYear: number): void {
  const { ants, params, clock } = sim
  void state
  const ticksPerDay = clock.ticksPerDay
  const callowDays = params.brood.callowDurationDays.value
  const fatThreshold = params.labour.foragerFatThreshold.value

  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    const caste = ants.caste[i]!
    if (caste !== Caste.Callow && caste !== Caste.MinorWorker && caste !== Caste.MajorWorker) {
      continue
    }

    const ageDays = ants.ageTicks[i]! / ticksPerDay

    // A callow darkens and joins the workforce.
    if (caste === Caste.Callow && ageDays >= callowDays) {
      ants.caste[i] =
        ants.lengthMm[i]! >= params.colony.majorWorkerLengthMm.value
          ? Caste.MajorWorker
          : Caste.MinorWorker
      ants.task[i] = Task.BroodCare
      continue
    }
    if (caste === Caste.Callow) continue

    // HARD RULE: a forager never goes back. Nothing below this line can lower a task.
    if (ants.task[i] === Task.Forager) continue

    // Fat is the proximate cue, and its rate of fall is what encodes the schedule.
    //
    // Tschinkel 1998 is unambiguous that a worker becomes a forager when its fat drops
    // below about ten percent. What is not published is how fast fat falls — and that is
    // exactly where the difference between a summer-born worker and an autumn-born one
    // lives. So the burn rate is derived from the age this individual is due to forage at,
    // which makes the two rules one rule instead of two racing each other.
    //
    // They did race, in the first version: a flat two percent a day put every worker past
    // the threshold in 45 days regardless of when it eclosed, the autumn cohort foraged
    // into the winter, and no colony survived its first year.
    const dueDays = Math.max(1, ants.timer[i]!)
    const burnPerDay = (1 - fatThreshold) / dueDays
    ants.fat[i] = Math.max(0, ants.fat[i]! - burnPerDay)

    // Autumn: workers gain about 24 percent in weight before winter, storing the fat that
    // pays for next year's alates. That is what carries the autumn cohort through to spring
    // rather than burning it out on foraging trips in December.
    if (params.brood.autumnFatGainMonths.value.includes(monthOfDayOfYear(dayOfYear))) {
      const autumnDays = params.brood.autumnFatGainMonths.value.reduce(
        (sum, m) => sum + DAYS_IN_MONTH[m - 1]!,
        0,
      )
      ants.fat[i] = Math.min(
        1,
        ants.fat[i]! + (burnPerDay + params.labour.autumnWorkerWeightGain.value / autumnDays),
      )
    }

    if (ants.fat[i]! < fatThreshold) {
      ants.task[i] = Task.Forager
      ants.y[i] = params.labour.foragerObservedMaxDepthCm.value * 0.5
      ants.ruleId[i] = RULE.idle
    } else if (ageDays >= dueDays * params.brood.transferFractionOfForagingAge.value) {
      if (ants.task[i] === Task.BroodCare) ants.task[i] = Task.Transfer
    }
  }
}

/**
 * Death.
 *
 * Foragers die fast: 3 to 4 percent a day, and within 27 days of their first trip. That is
 * applied as a hazard rather than a hard cap, so 27 days is an emergent mean rather than a
 * cliff. Inside workers die slowly.
 */
function applyMortality(sim: Simulation, state: DemographyState): void {
  const { ants, params, prng, clock } = sim
  const mortality = params.labour.foragerMortalityPerDay
  const rate = (mortality.min + mortality.max) / 2

  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    if (i === state.queenSlot) continue

    if (ants.task[i] === Task.Forager) {
      if (prng.chance(rate)) {
        ants.kill(i)
        state.totalForagersLost += 1
      }
      continue
    }

    // Inside workers. Nothing published for this species; scaled well below the forager
    // hazard so that the forager's short life stays the dominant demographic fact.
    const ageDays = ants.ageTicks[i]! / clock.ticksPerDay
    if (
      ageDays > params.brood.insideWorkerLifespanDays.value &&
      prng.chance(params.brood.insideWorkerMortalityPerDay.value)
    ) {
      ants.kill(i)
    }
  }
}
