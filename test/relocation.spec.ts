import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { SurfaceGrid } from '../src/core/state/surface.js'
import { Prng } from '../src/core/math/prng.js'
import { moveChanceForMonth, seedsInTransit } from '../src/core/systems/relocation.js'
import { Burden, Caste, Domain, Task } from '../src/core/state/ants.js'
import { BroodFate } from '../src/core/state/brood.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

describe('nest relocation', () => {
  it('moves most often in July and never outside May to November', () => {
    const c = new Colony({ seed: 1, params: PARAMS, capacity: 50 })
    const chances = Array.from({ length: 12 }, (_, m) => moveChanceForMonth(c.sim, m + 1))
    // A colony able to move every day of the season makes the measured mean number of moves.
    const days = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    const expected = chances.reduce((sum, p, m) => sum + p * days[m]!, 0)
    expect(expected).toBeCloseTo(PARAMS.relocation.movesPerYearMean.value, 9)
    for (const m of [1, 2, 3, 4, 12]) expect(chances[m - 1]).toBe(0)
    expect(Math.max(...chances)).toBe(chances[6])
    expect(chances[5]!).toBeGreaterThan(chances[4]!)
    expect(chances[7]!).toBeGreaterThan(chances[9]!)
  })

  it('slides the ground, seeds and trails, under a moved entrance', () => {
    const surface = new SurfaceGrid(PARAMS, new Prng(5))
    const col = Math.floor(surface.cols / 2)
    const row = Math.floor(surface.rows / 2)
    surface.recruitment.set(col, row, 7)
    const ceiling = surface.seedCeiling.get(col, row)
    surface.shift(8, -4, PARAMS, new Prng(6))
    // The patch and the trail that were 2 m east and 1 m south of the old entrance are now that
    // much closer to the new one.
    expect(surface.recruitment.get(col - 8, row + 4)).toBe(7)
    expect(surface.seedCeiling.get(col - 8, row + 4)).toBe(ceiling)
    // Ground newly in view has at least its background seed.
    const background =
      PARAMS.foraging.backgroundSeedsPerSquareMetre.value * surface.cellSizeM * surface.cellSizeM
    expect(surface.seeds.get(surface.cols - 1, 0)).toBeGreaterThanOrEqual(background - 1e-6)
  })

  it('starts a new nest at the new site and brings the whole seed store', () => {
    const c = new Colony({ seed: 9, params: PARAMS, capacity: 60 })
    c.run(c.sim.clock.ticksPerDay * 20)
    const { nest } = c
    // A store to carry, in a cell that has been dug. Very large seeds, which the ants cannot
    // open, so none is eaten while the test waits for midnight.
    const where = nest.deepestVoid()
    nest.addSeed(3, where.col, where.row, 40)
    let before = 0
    for (let i = 0; i < nest.seeds.data.length; i += 1) before += nest.seeds.data[i]!
    const generation = nest.generation

    const r = c.relocation
    r.moveDxCells = 8
    r.moveDyCells = 0
    r.moveDays = 4
    r.movePending = true
    // Past the next midnight, when the colony changes site if nobody is out.
    const tpd = c.sim.clock.ticksPerDay
    c.run(tpd - (c.sim.clock.tick % tpd) + 1)

    expect(r.moveStartDay).toBeGreaterThanOrEqual(0)
    expect(nest.generation).toBe(generation + 1)
    // The new nest is the incipient shaft and chamber, not the old nest.
    const incipient = PARAMS.nest.incipientDepthCm
    expect(nest.maxDepthCm).toBeGreaterThanOrEqual(incipient.min - 1)
    expect(nest.maxDepthCm).toBeLessThanOrEqual(incipient.max + 1)
    // Every seed is either set down in the new nest or still on its way.
    let inCells = 0
    for (let i = 0; i < nest.seeds.data.length; i += 1) inCells += nest.seeds.data[i]!
    // A seed or two may germinate in a day; none is lost in the move.
    expect(inCells + seedsInTransit(r)).toBeGreaterThanOrEqual(before - 1)
  }, 120000)

  it('seeds the new nest with a helical shaft, not a straight pipe', () => {
    // D49. A relocating colony has no founding queen, so the new nest has to be put there
    // rather than dug. It used to be put there as a dead-straight vertical column of cells
    // driven down from the entrance, which is a shape nothing in this model digs: every shaft
    // here, the founding queen's included, descends at the measured angle for its depth and
    // spirals as it goes (Tschinkel 2004). Since a colony moves about once a year, from its
    // second year on the nest a reader watches began as a 33 cm pipe.
    //
    // Measured on this configuration before the fix: 66 of 76 cells in the entrance column,
    // six columns used in all, and a vertical clearance of 33 cm — the whole shaft standing
    // open in one line. After it: 14 of 95 in the entrance column, eleven columns, 3 cm.
    const c = new Colony({ seed: 9, params: PARAMS, capacity: 60 })
    c.run(c.sim.clock.ticksPerDay * 20)
    const r = c.relocation
    r.moveDxCells = 8
    r.moveDyCells = 0
    r.moveDays = 4
    r.movePending = true
    const tpd = c.sim.clock.ticksPerDay
    c.run(tpd - (c.sim.clock.tick % tpd) + 1)

    const { nest } = c
    let inEntranceCol = 0
    let voids = 0
    let maxClearanceCm = 0
    const columns = new Set<number>()
    for (let row = 0; row < nest.rows; row += 1) {
      for (let col = 0; col < nest.cols; col += 1) {
        if (!nest.isVoid(col, row)) continue
        voids += 1
        columns.add(col)
        if (col === nest.entranceCol) inEntranceCol += 1
        const clearance = nest.verticalClearanceCm(col, row)
        if (clearance > maxClearanceCm) maxClearanceCm = clearance
      }
    }

    // It still reaches the incipient depth: the geometry changed, not the depth.
    const incipient = PARAMS.nest.incipientDepthCm
    expect(nest.maxDepthCm).toBeGreaterThanOrEqual(incipient.min - 1)
    expect(nest.maxDepthCm).toBeLessThanOrEqual(incipient.max + 1)

    // And it descends rather than dropping. A straight pipe puts almost every cell in one
    // column and stands open for its whole length; a helix does neither.
    expect(columns.size).toBeGreaterThan(5)
    expect(inEntranceCol / voids).toBeLessThan(0.5)
    expect(maxClearanceCm).toBeLessThan(incipient.min / 2)
  })

  it('carries the store along the trail, seeds first and brood after, as the move goes on', () => {
    // A colony of foragers with a store and a brood to move, in July. The age structure is
    // artificial, as in the foraging tests: this is about what the carriers do.
    const c = new Colony({ seed: 11, params: PARAMS, capacity: 400, flightDayOfYear: 190 })
    const tpd = c.sim.clock.ticksPerDay
    c.run(tpd)
    const { ants } = c.sim
    for (let n = 0; n < 200; n += 1) {
      const slot = ants.spawn(Caste.MinorWorker, Domain.Nest)
      ants.ageTicks[slot] = tpd * 100
      ants.task[slot] = Task.Forager
      ants.lengthMm[slot] = PARAMS.colony.minorWorkerLengthMm.value
    }
    const where = c.nest.deepestVoid()
    c.nest.addSeed(3, where.col, where.row, 150)
    c.demography.brood.lay(BroodFate.Worker, 40)

    const r = c.relocation
    r.moveDxCells = 12
    r.moveDyCells = 0
    r.moveDays = 5
    r.movePending = true
    // It is midnight, with nobody out, so the colony changes site on the next tick.
    c.run(1)
    expect(r.moveStartDay).toBeGreaterThanOrEqual(0)
    expect(seedsInTransit(r)).toBeGreaterThan(100)
    expect(r.broodAtOldNest).toBeGreaterThan(0)

    // Through the move, an hour at a time: who is out, what they hold, and what is left.
    let mostOut = 0
    let seedCarriersSeen = 0
    let broodTakenWhileSeedsLeft = false
    let lastBroodAtOld = r.broodAtOldNest
    for (let hour = 0; hour < 24 * 5 - 2; hour += 1) {
      c.run(tpd / 24)
      mostOut = Math.max(mostOut, r.carriersOut)
      for (let i = 0; i < ants.count; i += 1) {
        if (!ants.isAlive(i) || ants.domain[i] !== Domain.Surface) continue
        if (r.carrierIds[i] === ants.id[i]! + 1 && ants.burden[i] === Burden.Seed) {
          seedCarriersSeen += 1
        }
      }
      if (r.broodAtOldNest < lastBroodAtOld && seedsInTransit(r) >= 1)
        broodTakenWhileSeedsLeft = true
      lastBroodAtOld = r.broodAtOldNest
    }

    // A minority carries, and more of them later in the move.
    expect(mostOut).toBeGreaterThan(0)
    expect(mostOut).toBeLessThanOrEqual(Math.ceil(200 * PARAMS.relocation.carrierShareAtEnd.value))
    expect(seedCarriersSeen).toBeGreaterThan(0)
    // The seeds were walked in, and the brood only once they were gone.
    expect(r.totalSeedsCarried).toBeGreaterThan(100)
    expect(broodTakenWhileSeedsLeft).toBe(false)
    expect(r.totalBroodCarried).toBeGreaterThan(0)

    // At the end nobody is left on the trail and nothing is left at the old nest.
    c.run(tpd * 2)
    expect(r.moveStartDay).toBe(-1)
    expect(r.carriersOut).toBe(0)
    expect(r.broodAtOldNest).toBe(0)
    expect(c.demography.broodOutsideNest).toBe(0)
  }, 180000)

  it('moves along a trail, within the season, up to the yearly limit and the measured distance', () => {
    // Tschinkel 2014; Harrison & Gentry 1981.
    const c = new Colony({ seed: 7, params: PARAMS, capacity: 40 })
    c.demography.phase = 'growing'
    c.run(c.sim.clock.ticksPerDay * 365 * 2)
    const moves = c.relocation.moves
    expect(moves.length).toBeGreaterThan(0)
    const r = PARAMS.relocation
    // Counted by season, May to November of one calendar year.
    const perYear = new Map<number, number>()
    for (const m of moves) {
      expect(r.seasonWindowMonths.value).toContain(m.month)
      expect(m.distanceM).toBeLessThanOrEqual(r.maxDistanceMetres.value + c.surface.cellSizeM)
      expect(m.days).toBeGreaterThanOrEqual(r.durationDays.min)
      expect(m.days).toBeLessThanOrEqual(r.durationDays.max)
      // The colony's own year starts on 15 June, so May and early June open the next season.
      const early = m.month === 5 || (m.month === 6 && m.dayOfMonth < 15)
      const season = early ? m.colonyYear + 1 : m.colonyYear
      perYear.set(season, (perYear.get(season) ?? 0) + 1)
    }
    for (const n of perYear.values()) expect(n).toBeLessThanOrEqual(r.movesPerYearMax.value)
    expect(moves.length / 2).toBeLessThanOrEqual(r.movesPerYearMax.value)
  }, 300000)
})
