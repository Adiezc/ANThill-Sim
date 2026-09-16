import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { SurfaceGrid } from '../src/core/state/surface.js'
import { Prng } from '../src/core/math/prng.js'
import { moveChanceForMonth } from '../src/core/systems/relocation.js'

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
