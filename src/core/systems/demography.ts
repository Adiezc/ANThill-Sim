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
import { DAYS_IN_MONTH, DAYS_IN_YEAR, MONTH_START } from '../sim/calendar.js'
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
  /**
   * Soil temperature where foragers are, updated each day by the caller. Foraging onset in
   * spring follows temperature rather than the calendar.
   */
  soilTemperatureAtForagerDepthC: number
  /**
   * How far short of the larvae's need the day's food fell, from 0 to 1. Written on the day
   * boundary by the seed store, which runs just before this system. See systems/seeds.ts.
   */
  larvalFoodShortfall: number
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
    soilTemperatureAtForagerDepthC: 0,
    larvalFoodShortfall: 0,
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
 * This is the whole mechanism. The year's own workers reach it in 43 days. Workers born in
 * the autumn overwinter and take 210 to 360. Nothing about colony need enters into it.
 *
 * "The year's own workers" means everything that ecloses in the active season before the
 * autumn fattening begins. Kwapich & Tschinkel 2013 describe them as the first cohorts of the
 * year, eclosing from late May alongside the sexual alates. This rule used to read June to
 * August only, which put a growing colony's May callows on the overwintering schedule. They
 * sat inside through their first summer and foraged the following spring. Nothing ecloses in
 * March or April in the field, so the wider window changes nothing a paper measured.
 *
 * An autumn-born worker's 210 to 360 days are drawn so that they end by mid-July. Those
 * workers dominate the foragers from March to mid-July and not after. Drawn across the whole
 * range, a worker born in mid-October came due the following October, took up foraging in
 * November and was still foraging in December, when colonies are dormant.
 */
function ageAtFirstForagingDays(dayOfYear: number, params: Params, sim: Simulation): number {
  const month = monthOfDayOfYear(dayOfYear)
  const autumnBorn =
    month >= Math.min(...params.brood.autumnFatGainMonths.value) - 1 ||
    !params.labour.foragingSeasonMonths.value.includes(month)
  if (!autumnBorn) {
    const mean = params.labour.ageAtFirstForagingDaysSummerBorn.value
    const sd = params.labour.ageAtFirstForagingSummerBornSd.value
    return Math.max(1, mean + sim.prng.nextNormal() * sd)
  }
  const range = params.labour.ageAtFirstForagingDaysAutumnBornRange
  const lastOnset = params.labour.autumnBornLastOnsetDayOfYear.value
  const daysToLastOnset = (lastOnset - dayOfYear + DAYS_IN_YEAR) % DAYS_IN_YEAR
  const latest = Math.max(range.min, Math.min(range.max, daysToLastOnset))
  return sim.prng.nextRange(range.min, latest)
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
      dieInNest(sim, state, state.queenSlot)
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
  // Larvae eat what the seed store yields: small seeds the workers open, and large seeds
  // only once they have germinated. The store runs just before this system and records how
  // far short of the larvae's need the day's food fell. A shortfall is answered with larval
  // death and with nothing else — no forager is recruited and no store is raided faster —
  // which is what Kwapich & Tschinkel found when they removed half a colony's foragers, and
  // what was found when colonies were kept from foraging with full stores beneath them.
  // A founding queen feeds her first brood from her own body, so none of this applies
  // until the nest is open. See systems/seeds.ts.
  const larvae = state.brood.larvaCount
  if (larvae > 0 && state.phase !== 'founding' && state.larvalFoodShortfall > 0) {
    state.totalLarvaeStarved += state.brood.starveLarvae(
      state.larvalFoodShortfall * params.brood.starvationSeverityPerDay.value,
    )
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
  applyMortality(sim, state, date.dayOfYear)

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
function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

function progressTasks(sim: Simulation, state: DemographyState, dayOfYear: number): void {
  const { ants, params, clock } = sim
  const ticksPerDay = clock.ticksPerDay
  const callowDays = params.brood.callowDurationDays.value
  const fatThreshold = params.labour.foragerFatThreshold.value
  const month = monthOfDayOfYear(dayOfYear)
  const inForagingSeason = params.labour.foragingSeasonMonths.value.includes(month)
  const lastSeasonMonth = Math.max(...params.labour.foragingSeasonMonths.value)
  const seasonEndDayOfYear = MONTH_START[lastSeasonMonth - 1]! + DAYS_IN_MONTH[lastSeasonMonth - 1]!
  const slowScheduleMinDays = params.labour.ageAtFirstForagingDaysAutumnBornRange.min
  const pastSlowOnsetWindow = dayOfYear > params.labour.autumnBornLastOnsetDayOfYear.value

  // How readily a worker whose own schedule has come due actually takes up foraging today.
  //
  // Onset is temperature-driven, not calendar-driven: foraging began within five days of
  // 1 March in three of the four study years and a full month later in the fourth. Making
  // it a hard date instead released the whole overwintered backlog on one morning, which
  // gave a March spike and an April trough in a species whose foraging climbs steadily from
  // March to a midsummer maximum.
  const soilTempC = state.soilTemperatureAtForagerDepthC
  const onsetChance = inForagingSeason
    ? clamp01(
        (soilTempC - params.labour.foragingOnsetSoilTempC.value) /
          params.labour.foragingOnsetTempSpanC.value,
      )
    : 0

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
    //
    // The age is counted from eclosion, and a callow burns nothing, so the fall is spread
    // over the days left after the callow stage. Spreading it over the whole age put every
    // worker two weeks behind its own schedule: the 43-day cohort foraged at 57.
    //
    // A worker that has gained fat since then burns faster, so that it still reaches the
    // threshold on the day it is due. The 210 to 360 days are counted from eclosion and
    // already include the autumn fattening below. Burning at the plain rate counted that
    // fattening twice: it cancelled the whole autumn's fall, so the autumn cohort's clock
    // effectively restarted on 1 December. None of it foraged before mid-June, spring brood
    // starved with no one bringing seed home, and the paper has that cohort foraging from
    // March.
    const dueDays = Math.max(1, ants.timer[i]!)
    const daysToDue = dueDays - ageDays
    const plainBurnPerDay = (1 - fatThreshold) / Math.max(1, dueDays - callowDays)
    const burnPerDay =
      daysToDue > 1
        ? Math.max(plainBurnPerDay, (ants.fat[i]! - fatThreshold) / daysToDue)
        : plainBurnPerDay
    ants.fat[i] = Math.max(0, ants.fat[i]! - burnPerDay)

    // Autumn. Workers gain about 24 percent in weight before winter, storing the fat that pays
    // for next year's alates. That carries the autumn cohort through to spring rather than
    // burning it out on foraging trips in December.
    //
    // It applies only to a worker that will not reach foraging age before the season ends.
    // Applied to everyone, it froze the summer cohort in September: a worker born in late
    // July and due to forage in mid-September had its fat topped back up and waited until
    // March. Kwapich & Tschinkel 2013 found those workers foraging, and dead, by September.
    // It froze a founding colony's first workers in the same way, so no food at all came in
    // during the colony's first year.
    const foragesThisSeason = dueDays - ageDays <= seasonEndDayOfYear - dayOfYear
    if (!foragesThisSeason && params.brood.autumnFatGainMonths.value.includes(month)) {
      const autumnDays = params.brood.autumnFatGainMonths.value.reduce(
        (sum, m) => sum + DAYS_IN_MONTH[m - 1]!,
        0,
      )
      ants.fat[i] = Math.min(
        1,
        ants.fat[i]! + (burnPerDay + params.labour.autumnWorkerWeightGain.value / autumnDays),
      )
    }

    // Foraging is seasonal, and this is the gate that makes the annual cycle come out.
    //
    // A worker whose own schedule falls due in December waits for spring: colonies are
    // dormant, foraging falls to zero by December and does not resume until late February
    // at the earliest. Without this gate the autumn cohort took up foraging the moment its
    // 210-to-360-day clock expired, which for many of them is midwinter, and the model
    // produced a January foraging peak in a species that does not forage in January.
    //
    // It also concentrates recruitment into the spring, which is what lifts the summer
    // proportion foraging towards the measured 33 to 42 percent.
    //
    // The overwintering cohort has a narrower window still: March to mid-July. A worker on
    // that schedule that is still inside after mid-July waits for the next spring. Without
    // this, the slowest of them came due in October, foraged through November and was still
    // out in December.
    const slowSchedule = dueDays >= slowScheduleMinDays
    if (
      ants.fat[i]! < fatThreshold &&
      !(slowSchedule && pastSlowOnsetWindow) &&
      sim.prng.chance(onsetChance)
    ) {
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
function applyMortality(sim: Simulation, state: DemographyState, dayOfYear: number): void {
  const { ants, params, prng, clock } = sim
  const mortality = params.labour.foragerMortalityPerDay
  const rate = (mortality.min + mortality.max) / 2
  const inSeason = params.labour.foragingSeasonMonths.value.includes(monthOfDayOfYear(dayOfYear))

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
      dieInNest(sim, state, i)
      continue
    }

    // Over winter the colony shrinks. Kwapich & Tschinkel are explicit that the spring rise
    // in proportion foraging comes from more foragers *and* a smaller colony, so the losses
    // have to be real rather than an artefact of how the proportion is counted.
    if (!inSeason && prng.chance(params.labour.winterWorkerMortalityPerDay.value)) {
      dieInNest(sim, state, i)
    }
  }
}

/**
 * An ant that dies underground leaves her body where she died, for the workers to carry out.
 * A forager's death is the risk of foraging, and she dies out on the ground, so the forager
 * hazard above kills without leaving a body in the nest.
 */
function dieInNest(sim: Simulation, state: DemographyState, slot: number): void {
  const { ants } = sim
  const { nest } = state
  if (ants.domain[slot] === Domain.Nest) {
    const col = nest.colOfOffset(ants.x[slot]!)
    const row = nest.rowOfDepth(ants.y[slot]!)
    if (nest.inBounds(col, row) && nest.isVoid(col, row)) nest.corpses.add(col, row, 1)
  }
  ants.kill(slot)
}
