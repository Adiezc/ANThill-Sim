/**
 * Nest relocation: the colony moving house, about once a year.
 *
 * What is measured, for this species. Colonies move about once a year, some up to four times,
 * between May and November, most often in July, when more than 1 percent of colonies move on
 * a given day. A move goes along an existing foraging trail, the main trunk trail 78 percent of
 * the time, a mean of about 4 m and rarely more than 10, and takes 4 to 6 days. Workers carry
 * the whole seed store and the brood and dig the new nest during the move and after it, and it
 * comes out statistically indistinguishable from the one left behind. Trails keep their
 * directions. Why colonies move is unknown (Tschinkel 2013, 2014; Harrison & Gentry 1981).
 *
 * What is ours. Moves are drawn day by day, most likely in the peak month. A move's distance is
 * exponential about the mean, cut at the maximum. The colony changes site at the first midnight
 * with no forager out: the ground slides under the entrance, the old nest is left behind and
 * the grid is filled back in, and every ant in the nest starts at the new entrance with a fresh
 * digging tally. The new nest starts as the shaft and chamber a founding queen digs, and the
 * ordinary excavation rules enlarge it, so its size follows the colony as it is now.
 *
 * The seed store and the brood stay at the old site until they are carried. From the first
 * morning, foragers walk the trail to the old nest, pick up one seed each, or once the seeds
 * are gone one piece of brood, and carry it in at the new entrance, where the interior's rules
 * put it away. Seeds before brood is the measured order of burdens (charcoal, between them, is
 * not modelled), and the share of workers carrying rises through the move, as measured; how
 * high it goes is ours. Carriers stop at night, in rain and on sand too hot to cross, as
 * foragers do. Whatever is still at the old nest when the move ends is set down in the new one
 * without a carrier, and counted, so a reader can see how much of the move was walked.
 *
 * Nothing here reads soil, neighbours or colony state beyond whether the colony has workers.
 * No cause of moving is modelled, because none is known.
 */

import { Burden, Caste, Domain, Task } from '../state/ants.js'
import { cosTurns, headingFromTurns, headingOf, sinTurns, turnsFromHeading } from '../math/trig.js'
import { RULE } from '../provenance/rules.js'
import { countWorkers } from './demography.js'
import { surfaceIsForageable } from './foraging.js'
import { ln } from '../math/approx.js'
import { Prng } from '../math/prng.js'
import { DAYS_IN_MONTH, HOURS_IN_DAY } from '../sim/calendar.js'
import type { Simulation } from '../sim/simulation.js'
import type { NestGrid } from '../state/nest.js'
import type { SurfaceGrid } from '../state/surface.js'
import type { DemographyState } from './demography.js'
import type { SoilModel } from './soil.js'
import type { ClimateModel } from './climate.js'

export interface MoveRecord {
  readonly colonyYear: number
  readonly month: number
  readonly dayOfMonth: number
  readonly distanceM: number
  readonly days: number
  readonly alongMainTrail: boolean
}

export interface RelocationState {
  /**
   * Its own random stream, seeded from the colony's seed, so that adding relocation did not
   * reshuffle every other draw in a run.
   */
  readonly prng: Prng
  readonly surface: SurfaceGrid
  readonly nest: NestGrid
  readonly soil: SoilModel
  readonly climate: ClimateModel
  readonly demography: DemographyState
  /** Shared with foraging: ant id plus one for each slot out carrying the store, else 0. */
  readonly carrierIds: Uint32Array
  /** Each carrier's leg of the trip: walking to the old nest, loading there, or walking back. */
  readonly carrierLeg: Uint8Array
  /** Brood still at the old nest, waiting to be carried. */
  broodAtOldNest: number
  /** Carriers on the trail right now. */
  carriersOut: number
  totalSeedsCarried: number
  totalBroodCarried: number
  /** What was still at the old nest when a move ended, set down in the new nest without a carrier. */
  totalSeedsUncarried: number
  totalBroodUncarried: number
  /** A move has been decided on and waits for a midnight with nobody out. */
  movePending: boolean
  /** Day the colony changed site, or -1 when it is not moving. */
  moveStartDay: number
  moveDays: number
  moveDxCells: number
  moveDyCells: number
  moveAlongMainTrail: boolean
  movesThisYear: number
  totalMoves: number
  totalDistanceM: number
  /** Seeds of each size class from the old store, not yet set down in the new nest. */
  readonly storeInTransit: Float64Array
  readonly moves: MoveRecord[]
}

export function createRelocationState(
  surface: SurfaceGrid,
  nest: NestGrid,
  soil: SoilModel,
  climate: ClimateModel,
  demography: DemographyState,
  seed: number,
  carrierIds: Uint32Array,
): RelocationState {
  return {
    prng: new Prng((seed ^ 0x2e10ca7e) >>> 0),
    surface,
    nest,
    soil,
    climate,
    demography,
    carrierIds,
    carrierLeg: new Uint8Array(carrierIds.length),
    broodAtOldNest: 0,
    carriersOut: 0,
    totalSeedsCarried: 0,
    totalBroodCarried: 0,
    totalSeedsUncarried: 0,
    totalBroodUncarried: 0,
    movePending: false,
    moveStartDay: -1,
    moveDays: 0,
    moveDxCells: 0,
    moveDyCells: 0,
    moveAlongMainTrail: true,
    movesThisYear: 0,
    totalMoves: 0,
    totalDistanceM: 0,
    storeInTransit: new Float64Array(nest.seedsByClass.length),
    moves: [],
  }
}

/** Seeds still waiting to be set down in a new nest. */
export function seedsInTransit(state: RelocationState): number {
  let total = 0
  for (const n of state.storeInTransit) total += n
  return total
}

/**
 * Daily chance of starting a move in a month.
 *
 * Highest in the peak month and falling off in a straight line either side, scaled so that a
 * colony that could move every day of the season makes the measured mean number of moves a
 * year. That puts July a little under the 1 percent a day measured across a population, which
 * also counts second and later moves.
 */
export function moveChanceForMonth(sim: Simulation, month: number): number {
  const r = sim.params.relocation
  const season = r.seasonWindowMonths.value
  if (!season.includes(month)) return 0
  const peak = r.peakMonth.value
  let furthest = 0
  for (const m of season) furthest = Math.max(furthest, Math.abs(m - peak))
  const weight = (m: number): number => 1 - Math.abs(m - peak) / (furthest + 1)
  let weightedDays = 0
  for (const m of season) weightedDays += DAYS_IN_MONTH[m - 1]! * weight(m)
  return (r.movesPerYearMean.value / weightedDays) * weight(month)
}

export function makeRelocationSystem(state: RelocationState) {
  return function relocation(sim: Simulation): void {
    const { clock, params, ants } = sim
    const { prng } = state

    // During a move the store is carried. After it, whatever the carriers did not bring is set
    // down in the new nest as the colony makes room for it, hour by hour.
    if (state.moveStartDay >= 0) {
      carry(sim, state)
    } else {
      const ticksPerHour = Math.max(1, Math.round(clock.ticksPerDay / HOURS_IN_DAY))
      if (clock.tick % ticksPerHour === 0 && seedsInTransit(state) > 0) setDownStore(sim, state)
    }

    if (!clock.isDayBoundary) return
    const date = clock.date()
    const day = clock.daysElapsed
    const r = params.relocation

    // Moves are counted per season, which starts with its first month. A colony's own year
    // starts on the day its queen landed, in the middle of a season.
    const firstMonth = Math.min(...r.seasonWindowMonths.value)
    if (date.month === firstMonth && date.dayOfMonth === 1) state.movesThisYear = 0

    if (state.moveStartDay >= 0) {
      if (day - state.moveStartDay >= state.moveDays) finishMove(sim, state)
      return
    }

    if (state.movePending) {
      for (let i = 0; i < ants.count; i += 1) {
        // A forager still out at midnight would be left behind; change site tomorrow.
        if (ants.isAlive(i) && ants.domain[i] === Domain.Surface) return
      }
      changeSite(sim, state)
      state.movePending = false
      state.moveStartDay = day
      return
    }

    const phase = state.demography.phase
    if (phase !== 'growing' && phase !== 'mature') return
    if (state.movesThisYear >= r.movesPerYearMax.value) return
    if (!prng.chance(moveChanceForMonth(sim, date.month))) return

    // Along a trail: the main one most of the time, otherwise another at random.
    const trails = state.surface.trunkTrailTurns
    const main = trails.length === 1 || prng.chance(r.mainTrailShare.value)
    const turns = main ? trails[0]! : trails[1 + prng.nextInt(trails.length - 1)]!
    const draw = -r.meanDistanceMetres.value * ln(Math.max(1e-12, 1 - prng.nextFloat()))
    const distanceM = Math.min(r.maxDistanceMetres.value, draw)
    const cell = state.surface.cellSizeM
    state.moveDxCells = Math.round((distanceM * cosTurns(turns)) / cell)
    state.moveDyCells = Math.round((distanceM * sinTurns(turns)) / cell)
    state.moveAlongMainTrail = main
    state.moveDays = Math.round(prng.nextRange(r.durationDays.min, r.durationDays.max))
    state.movesThisYear += 1
    state.movePending = true
  }
}

/** The colony is at its new site: new ground above, a new nest to dig below. */
function changeSite(sim: Simulation, state: RelocationState): void {
  const { ants, params } = sim
  const { surface, prng, nest, soil } = state
  const dx = state.moveDxCells
  const dy = state.moveDyCells
  surface.shift(dx, dy, params, prng)

  // Remembered foraging sites are remembered relative to the old entrance. They are still the
  // same places on the ground, so they move with it; one now off the map is forgotten.
  const shiftX = dx * surface.cellSizeM
  const shiftY = dy * surface.cellSizeM
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    if (ants.fidelityX[i] === 0 && ants.fidelityY[i] === 0) continue
    const fx = ants.fidelityX[i]! - shiftX
    const fy = ants.fidelityY[i]! - shiftY
    const keep = surface.contains(fx, fy) && (fx !== 0 || fy !== 0)
    ants.fidelityX[i] = keep ? fx : 0
    ants.fidelityY[i] = keep ? fy : 0
  }

  // The whole seed store comes along. Seeds already germinating are left behind.
  for (let k = 0; k < nest.seedsByClass.length; k += 1) {
    let held = 0
    const data = nest.seedsByClass[k]!.data
    for (let i = 0; i < data.length; i += 1) held += data[i]!
    state.storeInTransit[k]! += held
  }

  // The brood stays at the old nest until it is carried, after the seeds.
  state.broodAtOldNest = state.demography.brood.total
  state.demography.broodOutsideNest = state.broodAtOldNest

  nest.clearToSoil()
  soil.resetStress()

  // The new nest starts as the shaft and chamber a founding queen digs, at the measured
  // incipient depth. The digging rules cannot start a nest from a single cell, which is also
  // why a founding queen has a rule of her own (D27); from here the workers enlarge it.
  const cell = nest.cellSizeCm
  const incipient = params.nest.incipientDepthCm
  const shaftRows = Math.round((incipient.min + incipient.max) / 2 / cell)
  const run = Math.max(1, Math.round(params.excavation.foundingChamberRunCm.value / cell))
  const height = Math.max(1, Math.round(params.nest.chamberHeightCm.value / cell))
  const dig = (col: number, row: number): void => {
    if (nest.excavate(col, row)) soil.applyVoid(nest, col, row)
  }
  for (let row = 0; row < shaftRows; row += 1) dig(nest.entranceCol, row)
  for (let k = 1; k < run; k += 1) {
    for (let h = 0; h < height; h += 1) dig(nest.entranceCol + k, shaftRows - 1 - h)
  }

  // Everyone underground starts again at the new entrance. Sand in mandibles is dropped;
  // brood is kept and set down in the new nest. Each ant's tally of sand dug is
  // for the nest she dug, so it starts again with the new one.
  const entranceX = nest.offsetOf(nest.entranceCol)
  const entranceY = nest.depthOf(0)
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
    ants.x[i] = entranceX
    ants.y[i] = entranceY
    if (ants.burden[i] === Burden.SoilPellet) ants.burden[i] = Burden.Nothing
    // A seed in her mandibles joins the store in transit, so that nobody is left waiting at a
    // full entrance with a seed and nothing dug to put it in.
    if (ants.burden[i] === Burden.Seed) {
      state.storeInTransit[ants.seedClass[i]!]! += 1
      ants.burden[i] = Burden.Nothing
    }
    ants.dugCells[i] = 0
    ants.tunnelLengthCm[i] = 0
    ants.carriedCm[i] = 0
    ants.agitation[i] = 0
  }
}

/**
 * Sets seeds from the old store down in the topmost dug cells of the new nest, up to the cap.
 * Never in the entrance itself, which foragers coming home have to get through.
 */
function setDownStore(sim: Simulation, state: RelocationState): void {
  const { nest } = state
  const cap = sim.params.seeds.maxSeedsPerCell.value
  let waiting = seedsInTransit(state)
  for (let row = 1; row <= nest.deepestRow && waiting > 0; row += 1) {
    for (let col = 0; col < nest.cols && waiting > 0; col += 1) {
      if (!nest.isVoid(col, row)) continue
      const room = cap - nest.seeds.get(col, row)
      if (room <= 0) continue
      const put = Math.min(room, waiting)
      for (let k = 0; k < state.storeInTransit.length; k += 1) {
        const share = (state.storeInTransit[k]! / waiting) * put
        nest.addSeed(k, col, row, share)
        state.storeInTransit[k]! -= share
      }
      waiting -= put
    }
  }
}

function finishMove(sim: Simulation, state: RelocationState): void {
  const { clock, ants } = sim
  // Anyone still on the trail comes in with what she holds, and what is left at the old nest
  // is set down in the new one without a carrier, and counted.
  for (let i = 0; i < ants.count; i += 1) {
    if (state.carrierIds[i] === 0) continue
    if (ants.isAlive(i) && state.carrierIds[i] === ants.id[i]! + 1) arriveAtNewNest(sim, state, i)
    state.carrierIds[i] = 0
  }
  state.carriersOut = 0
  state.totalSeedsUncarried += seedsInTransit(state)
  state.totalBroodUncarried += state.broodAtOldNest
  state.broodAtOldNest = 0
  state.demography.broodOutsideNest = 0
  const cell = state.surface.cellSizeM
  const shiftX = state.moveDxCells * cell
  const shiftY = state.moveDyCells * cell
  const date = clock.date()
  const distanceM = Math.sqrt(shiftX * shiftX + shiftY * shiftY)
  state.moves.push({
    colonyYear: date.colonyYear,
    month: date.month,
    dayOfMonth: date.dayOfMonth,
    distanceM,
    days: state.moveDays,
    alongMainTrail: state.moveAlongMainTrail,
  })
  state.totalMoves += 1
  state.totalDistanceM += distanceM
  state.moveStartDay = -1
}

/**
 * One tick of carrying the store: every carrier out takes a step, and while there is anything
 * left at the old nest and the ground can be crossed, foragers at home set out until the share
 * of the colony on the trail matches how far through the move it is.
 */
function carry(sim: Simulation, state: RelocationState): void {
  const { ants, params, clock } = sim
  const cell = state.surface.cellSizeM
  const oldX = -state.moveDxCells * cell
  const oldY = -state.moveDyCells * cell

  let out = 0
  let broodOnTrail = 0
  for (let i = 0; i < ants.count; i += 1) {
    if (state.carrierIds[i] === 0) continue
    // Died on the trail, or the slot has since gone to a new ant.
    if (
      !ants.isAlive(i) ||
      state.carrierIds[i] !== ants.id[i]! + 1 ||
      ants.domain[i] !== Domain.Surface
    ) {
      state.carrierIds[i] = 0
      continue
    }
    stepCarrier(sim, state, i, oldX, oldY)
    if (state.carrierIds[i] === 0) continue
    out += 1
    if (ants.burden[i] === Burden.Brood) broodOnTrail += 1
  }
  state.carriersOut = out
  state.broodAtOldNest = Math.max(
    0,
    Math.min(state.broodAtOldNest, state.demography.brood.total - broodOnTrail),
  )
  state.demography.broodOutsideNest = state.broodAtOldNest + broodOnTrail

  if (seedsInTransit(state) < 1 && state.broodAtOldNest < 1) return
  if (!surfaceIsForageable(sim, state)) return

  const progress = Math.min(
    1,
    Math.max(
      0,
      (clock.daysElapsed + clock.date().dayFraction - state.moveStartDay) /
        Math.max(1, state.moveDays),
    ),
  )
  // Rounded up, so that a small colony has a carrier from the first morning rather than none
  // for the whole move.
  const wanted = Math.ceil(countWorkers(sim) * params.relocation.carrierShareAtEnd.value * progress)
  if (out >= wanted || ants.count === 0) return

  // Foragers at home with nothing in their mandibles take it up, looked for from a random
  // place in the store so that it is not always the same few.
  const start = state.prng.nextInt(ants.count)
  for (let k = 0; k < ants.count && out < wanted; k += 1) {
    const i = (start + k) % ants.count
    if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
    if (ants.task[i] !== Task.Forager || ants.burden[i] !== Burden.Nothing) continue
    const caste = ants.caste[i]
    if (caste !== Caste.MinorWorker && caste !== Caste.MajorWorker) continue
    ants.domain[i] = Domain.Surface
    ants.x[i] = 0
    ants.y[i] = 0
    ants.homeVecX[i] = 0
    ants.homeVecY[i] = 0
    ants.timer[i] = 0
    state.carrierIds[i] = ants.id[i]! + 1
    state.carrierLeg[i] = LEG_OUT
    ants.ruleId[i] = RULE.relocationCarry
    out += 1
  }
  state.carriersOut = out
}

const LEG_OUT = 0
const LEG_LOADING = 1
const LEG_BACK = 2

/** A carrier's step: along the trail, a pause to load at the old nest, and back. */
function stepCarrier(
  sim: Simulation,
  state: RelocationState,
  slot: number,
  oldX: number,
  oldY: number,
): void {
  const { ants, params } = sim
  const leg = state.carrierLeg[slot]

  if (leg === LEG_LOADING) {
    ants.timer[slot] = ants.timer[slot]! + 1
    if (ants.timer[slot]! < params.relocation.loadHandlingTicks.value) return
    pickUp(sim, state, slot)
    state.carrierLeg[slot] = LEG_BACK
    return
  }

  const goalX = leg === LEG_OUT ? oldX : 0
  const goalY = leg === LEG_OUT ? oldY : 0
  const dx = goalX - ants.x[slot]!
  const dy = goalY - ants.y[slot]!
  const speed = params.foraging.speedMetresPerTick.value
  if (dx * dx + dy * dy <= speed * speed) {
    ants.homeVecX[slot] = ants.homeVecX[slot]! - dx
    ants.homeVecY[slot] = ants.homeVecY[slot]! - dy
    ants.x[slot] = goalX
    ants.y[slot] = goalY
    if (leg === LEG_OUT) {
      state.carrierLeg[slot] = LEG_LOADING
      ants.timer[slot] = 0
    } else {
      arriveAtNewNest(sim, state, slot)
    }
    return
  }

  // Along the trail, a little unsteadily.
  const turns =
    turnsFromHeading(headingOf(dx, dy)) +
    state.prng.nextNormal() * params.foraging.searchTurnSdTurns.value
  ants.heading[slot] = headingFromTurns(turns)
  const stepX = cosTurns(turns) * speed
  const stepY = sinTurns(turns) * speed
  ants.x[slot] = ants.x[slot]! + stepX
  ants.y[slot] = ants.y[slot]! + stepY
  // Her homing vector is kept as a forager's is, step by step.
  ants.homeVecX[slot] = ants.homeVecX[slot]! - stepX
  ants.homeVecY[slot] = ants.homeVecY[slot]! - stepY
}

/** Seeds first, one at a time, in proportion to what is left of each size; then brood. */
function pickUp(sim: Simulation, state: RelocationState, slot: number): void {
  const { ants } = sim
  const store = state.storeInTransit
  let whole = 0
  for (const n of store) whole += Math.floor(n)
  if (whole >= 1) {
    let pick = state.prng.nextFloat() * whole
    let k = 0
    while (k < store.length - 1 && pick >= Math.floor(store[k]!)) {
      pick -= Math.floor(store[k]!)
      k += 1
    }
    store[k] = store[k]! - 1
    ants.seedClass[slot] = k
    ants.burden[slot] = Burden.Seed
    return
  }
  if (state.broodAtOldNest >= 1) {
    state.broodAtOldNest -= 1
    ants.burden[slot] = Burden.Brood
  }
}

/** In at the new entrance. The interior's rules put the seed or the brood away from here. */
function arriveAtNewNest(sim: Simulation, state: RelocationState, slot: number): void {
  const { ants } = sim
  const { nest } = state
  ants.domain[slot] = Domain.Nest
  ants.x[slot] = nest.offsetOf(nest.entranceCol)
  ants.y[slot] = nest.depthOf(0)
  ants.timer[slot] = 0
  if (ants.burden[slot] === Burden.Seed) state.totalSeedsCarried += 1
  else if (ants.burden[slot] === Burden.Brood) state.totalBroodCarried += 1
  state.carrierIds[slot] = 0
}
