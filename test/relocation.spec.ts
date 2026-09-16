import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { SurfaceGrid } from '../src/core/state/surface.js'
import { Prng } from '../src/core/math/prng.js'
import { moveChanceForMonth, seedsInTransit } from '../src/core/systems/relocation.js'

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
