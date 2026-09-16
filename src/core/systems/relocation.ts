/**
 * Nest relocation: the colony moving house, about once a year.
 *
 * What is measured, for this species. Colonies move about once a year, some up to four times,
 * between May and November, most often in July, when more than 1 percent of colonies move on
 * a given day. A move goes along an existing foraging trail, the main trunk trail 78 percent of
 * the time, a mean of about 4 m and rarely more than 10, and takes 4 to 6 days. The whole seed
 * store and the brood are carried, the new nest is dug during the move, and it comes out
 * statistically indistinguishable from the one left behind. Trails keep their directions. Why
 * colonies move is unknown (Tschinkel 2013, 2014; Harrison & Gentry 1981).
 *
 * What is ours. Moves are drawn day by day, most likely in the peak month and less likely the
 * further a month is from it. A move's distance is exponential about the mean, cut at the
 * maximum. The new nest is not dug here: it is taken to be the replica the excavations found,
 * so the chambers, brood and seed store stay as they are and the colony simply stands on new
 * ground when the move is done. The move finishes at midnight, when no forager is out.
 *
 * Nothing here reads soil, neighbours or colony state beyond whether the colony has workers.
 * No cause of moving is modelled, because none is known.
 */

import { Domain } from '../state/ants.js'
import { cosTurns, sinTurns } from '../math/trig.js'
import { ln } from '../math/approx.js'
import { Prng } from '../math/prng.js'
import { DAYS_IN_MONTH } from '../sim/calendar.js'
import type { Simulation } from '../sim/simulation.js'
import type { SurfaceGrid } from '../state/surface.js'
import type { DemographyState } from './demography.js'

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
  readonly demography: DemographyState
  /** Day the current move started, or -1 when the colony is not moving. */
  moveStartDay: number
  moveDays: number
  moveDxCells: number
  moveDyCells: number
  moveAlongMainTrail: boolean
  movesThisYear: number
  totalMoves: number
  totalDistanceM: number
  readonly moves: MoveRecord[]
}

export function createRelocationState(
  surface: SurfaceGrid,
  demography: DemographyState,
  seed: number,
): RelocationState {
  return {
    prng: new Prng((seed ^ 0x2e10ca7e) >>> 0),
    surface,
    demography,
    moveStartDay: -1,
    moveDays: 0,
    moveDxCells: 0,
    moveDyCells: 0,
    moveAlongMainTrail: true,
    movesThisYear: 0,
    totalMoves: 0,
    totalDistanceM: 0,
    moves: [],
  }
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
    if (!clock.isDayBoundary) return
    const date = clock.date()
    const day = clock.daysElapsed
    const r = params.relocation

    // Moves are counted per season, which starts with the first month of the season. A colony's
    // own year starts on the day its queen landed, in the middle of a season.
    const firstMonth = Math.min(...r.seasonWindowMonths.value)
    if (date.month === firstMonth && date.dayOfMonth === 1) state.movesThisYear = 0

    if (state.moveStartDay >= 0) {
      if (day - state.moveStartDay < state.moveDays) return
      for (let i = 0; i < ants.count; i += 1) {
        // A forager still out at midnight would be left behind; finish the move tomorrow.
        if (ants.isAlive(i) && ants.domain[i] === Domain.Surface) return
      }
      finishMove(sim, state)
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
    state.moveStartDay = day
  }
}

function finishMove(sim: Simulation, state: RelocationState): void {
  const { ants, params, clock } = sim
  const { surface, prng } = state
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
  state.movesThisYear += 1
  state.moveStartDay = -1
}
