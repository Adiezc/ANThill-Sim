import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { Caste, Domain, Task } from '../src/core/state/ants.js'
import {
  germinationChancePerDay,
  isOpenable,
  majorOpeningFactor,
  unopenableShareByWeight,
} from '../src/core/systems/seeds.js'
import type { Params } from '../src/core/params/params.js'

const RAW = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
) as Record<string, unknown>

const PARAMS = loadSpecies(RAW).params

/** Size classes, in the order of `seeds.sizeClassNames`. */
const SMALL = 0
const MEDIUM = 1
const LARGE = 2
const VERY_LARGE = 3
const ALL = [SMALL, MEDIUM, LARGE, VERY_LARGE]

const JUNE = 165
const JANUARY = 15

/** The species file with some values replaced, for the manipulations below. */
function edited(changes: Record<string, unknown>): Record<string, unknown> {
  const copy = JSON.parse(JSON.stringify(RAW)) as Record<string, unknown>
  for (const [path, value] of Object.entries(changes)) {
    const keys = path.split('.')
    let node = copy
    for (const key of keys.slice(0, -1)) node = node[key] as Record<string, unknown>
    ;(node[keys[keys.length - 1]!] as Record<string, unknown>).value = value
  }
  return copy
}

/**
 * A colony with a nest already dug — a shaft with a chamber every 20 cm — so that what is
 * tested is what happens to a store rather than how long it takes to build somewhere to keep
 * one. The same construction as test/interior.spec.ts, and legitimate for the same reason.
 */
function colonyWithNest(seed: number, params: Params = PARAMS, dayOfYear = JUNE): Colony {
  const colony = new Colony({ seed, params, capacity: 400, flightDayOfYear: dayOfYear })
  const { nest, soil } = colony
  const cell = nest.cellSizeCm
  const rows = Math.round(100 / cell)
  for (let row = 0; row <= rows; row += 1) {
    const wide = row % Math.round(20 / cell) === 0 && row > 0
    const halfWidth = wide ? Math.round(6 / cell) : 0
    for (let d = -halfWidth; d <= halfWidth; d += 1) {
      const col = nest.entranceCol + d
      if (nest.excavate(col, row)) soil.applyVoid(nest, col, row)
    }
  }
  return colony
}

/** Seeds of one class spread over the floor of the chamber at a depth. */
function stock(colony: Colony, sizeClass: number, count: number, depthCm = 60): void {
  const { nest } = colony
  const row = nest.rowOfDepth(depthCm)
  const cols: number[] = []
  for (let col = 0; col < nest.cols; col += 1) if (nest.isVoid(col, row)) cols.push(col)
  for (const col of cols) nest.addSeed(sizeClass, col, row, count / cols.length)
}

function storedInRow(colony: Colony, sizeClass: number, row: number): number {
  const layer = colony.nest.seedsByClass[sizeClass]!
  let total = 0
  for (let col = 0; col < colony.nest.cols; col += 1) total += layer.get(col, row)
  return total
}

function stored(colony: Colony, sizeClass: number): number {
  const layer = colony.nest.seedsByClass[sizeClass]!
  let total = 0
  for (let i = 0; i < layer.data.length; i += 1) total += layer.data[i]!
  return total
}

/**
 * Workers that neither dig nor carry seeds, deep in the nest, so that what is measured is the
 * store and not the traffic through it. They are there because majors set how fast seeds
 * are opened, and a colony with no workers has no majors.
 */
function addWorkers(colony: Colony, minors: number, majors: number): void {
  const { ants, clock, params } = colony.sim
  for (let n = 0; n < minors + majors; n += 1) {
    const major = n < majors
    const slot = ants.spawn(major ? Caste.MajorWorker : Caste.MinorWorker, Domain.Nest)
    ants.x[slot] = 0
    ants.y[slot] = 70
    ants.task[slot] = Task.BroodCare
    ants.ageTicks[slot] = Math.round(60 * clock.ticksPerDay)
    ants.timer[slot] = 300
    ants.lengthMm[slot] = major
      ? params.colony.majorWorkerLengthMm.value
      : params.colony.minorWorkerLengthMm.value
    ants.fat[slot] = 1
    ants.digger[slot] = 255
  }
}

/** Larvae in the nest now, rather than eggs laid and waited for. */
function withLarvae(colony: Colony, larvae: number): Colony {
  colony.demography.phase = 'growing'
  // Five days into a worker larva's 22, so none pupate while a test is watching.
  colony.demography.brood.larvae[5] = larvae
  return colony
}

describe('which seeds the ants can open', () => {
  it('can open small and medium seeds, and not large or very large ones', () => {
    expect(ALL.map((c) => isOpenable(PARAMS, c))).toEqual([true, true, false, false])
  })

  it('eats small seeds within days and leaves the large ones in the store', () => {
    // Tschinkel & Kwapich 2016, Figure 7: within twelve days 82 percent of small and 58
    // percent of medium seeds had been eaten, and the large ones lay unopened in the nest.
    const colony = colonyWithNest(41)
    addWorkers(colony, 95, 5)
    for (const c of ALL) stock(colony, c, 300)
    colony.run(colony.sim.clock.ticksPerDay * 12)

    expect(stored(colony, SMALL) / 300).toBeLessThan(0.25)
    expect(stored(colony, MEDIUM) / 300).toBeLessThan(0.5)
    expect(stored(colony, LARGE) / 300).toBeGreaterThan(0.9)
    expect(stored(colony, VERY_LARGE) / 300).toBeGreaterThan(0.9)
    expect(colony.seedStore.totalOpenedByClass[LARGE]).toBe(0)
    expect(colony.seedStore.totalOpenedByClass[VERY_LARGE]).toBe(0)
  })

  it('opens faster with majors, and opens nothing more', () => {
    // Figure 8: majors roughly tripled the rate at which small and medium seeds were opened,
    // and the widest seed opened was the same with or without them. HARD RULE on the range.
    const withMajors = (majors: number): Colony => {
      const colony = colonyWithNest(42)
      addWorkers(colony, 100 - majors, majors)
      for (const c of ALL) stock(colony, c, 300)
      colony.run(colony.sim.clock.ticksPerDay * 5)
      return colony
    }
    const some = withMajors(7)
    const none = withMajors(0)
    expect(some.seedStore.totalOpenedByClass[SMALL]!).toBeGreaterThan(
      none.seedStore.totalOpenedByClass[SMALL]! * 1.5,
    )
    for (const colony of [some, none]) {
      expect(colony.seedStore.totalOpenedByClass[LARGE]).toBe(0)
      expect(colony.seedStore.totalOpenedByClass[VERY_LARGE]).toBe(0)
    }
    expect(majorOpeningFactor(PARAMS, 0)).toBeCloseTo(
      PARAMS.seeds.openingRateFractionWithoutMajors.value,
      10,
    )
    expect(majorOpeningFactor(PARAMS, PARAMS.seeds.openingMajorReferenceFraction.value)).toBe(1)
  })

  it('refuses a parameter file that lets a seed too wide to open be opened', () => {
    expect(() =>
      loadSpecies(edited({ 'seeds.openingChancePerDay': [0.235, 0.142, 0.1, 0] })),
    ).toThrow(/until they germinate/)
  })
})

describe('germination', () => {
  it('follows the laboratory temperature response of each size class', () => {
    // Figure 12B: large seeds germinate most at 15 C and hardly at all at 32 C; small seeds
    // germinate best when it is cool.
    expect(germinationChancePerDay(PARAMS, LARGE, 15)).toBeGreaterThan(
      germinationChancePerDay(PARAMS, LARGE, 32) * 10,
    )
    expect(germinationChancePerDay(PARAMS, SMALL, 10)).toBeGreaterThan(
      germinationChancePerDay(PARAMS, SMALL, 32),
    )
    // Interpolated between tested temperatures, held beyond them.
    const between = germinationChancePerDay(PARAMS, LARGE, 19.5)
    expect(between).toBeLessThan(germinationChancePerDay(PARAMS, LARGE, 15))
    expect(between).toBeGreaterThan(germinationChancePerDay(PARAMS, LARGE, 24))
    expect(germinationChancePerDay(PARAMS, LARGE, 40)).toBe(
      germinationChancePerDay(PARAMS, LARGE, 32),
    )
  })

  it('depends on the soil temperature at a depth, and on nothing else about the depth', () => {
    // Seeds buried at 5, 15, 40 and 80 cm showed no significant effect of depth. Whatever
    // differs between two chambers here differs because their soil temperature does.
    const colony = colonyWithNest(43)
    stock(colony, LARGE, 1000, 20)
    stock(colony, LARGE, 1000, 80)
    colony.run(colony.sim.clock.ticksPerDay)
    for (const depth of [20, 80]) {
      const row = colony.nest.rowOfDepth(depth)
      const temperatureC = colony.soil.temperature.get(colony.nest.entranceCol, row)
      const germinated = 1 - storedInRow(colony, LARGE, row) / 1000
      expect(germinated).toBeCloseTo(germinationChancePerDay(PARAMS, LARGE, temperatureC), 5)
    }
  })

  it('happens in the chambers, and the ants find the germinating seeds within days', () => {
    // Figure 15: in chambers the ants could reach, germinating seeds were rare, because the
    // ants take them.
    const colony = colonyWithNest(44)
    addWorkers(colony, 95, 5)
    stock(colony, LARGE, 50000)
    stock(colony, VERY_LARGE, 20000)
    colony.run(colony.sim.clock.ticksPerDay * 30)

    const store = colony.seedStore
    const germinated =
      store.totalGerminatedByClass[LARGE]! + store.totalGerminatedByClass[VERY_LARGE]!
    expect(germinated).toBeGreaterThan(0)
    expect(store.totalGerminatedEatenMg).toBeGreaterThan(0)
    expect(store.germinatingInStore).toBeLessThan(germinated * 0.5)
  })

  it('is lost rather than eaten outside the active season', () => {
    // Wheeler found winter chambers full of seeds sprouted too far to eat.
    const colony = colonyWithNest(45, PARAMS, JANUARY)
    stock(colony, LARGE, 50000)
    colony.run(colony.sim.clock.ticksPerDay * 10)
    expect(colony.seedStore.totalLostOutOfSeason).toBeGreaterThan(0)
    expect(colony.seedStore.totalGerminatedEatenMg).toBe(0)
  })
})

describe('what the larvae eat', () => {
  it('feeds larvae on germinating seeds the ants could never have opened', () => {
    // Germinating seeds were fed to larvae in preference to anything else, and it is the only
    // way a large seed is ever eaten.
    const starved = (params: Params): number => {
      const colony = withLarvae(colonyWithNest(47, params), 50)
      addWorkers(colony, 95, 5)
      stock(colony, LARGE, 400000)
      stock(colony, VERY_LARGE, 100000)
      colony.run(colony.sim.clock.ticksPerDay * 10)
      return colony.demography.totalLarvaeStarved
    }
    const noGermination = loadSpecies(
      edited({
        'seeds.germinationSmallByTemperature': [0, 0, 0, 0],
        'seeds.germinationMediumByTemperature': [0, 0, 0, 0],
        'seeds.germinationLargeByTemperature': [0, 0, 0, 0],
        'seeds.germinationVeryLargeByTemperature': [0, 0, 0, 0],
      }),
    ).params
    expect(starved(PARAMS)).toBeLessThan(starved(noGermination))
  })

  it('does not rescue a colony that stops foraging: most of its larvae starve within a week', () => {
    // Colonies kept from foraging did not draw on their stores, and their larvae starved in
    // as little as seven days (Kwapich & Tschinkel 2013; Smith 2007; as reported by Tschinkel
    // & Kwapich 2016). A store of seeds the ants cannot open is not food until it germinates,
    // and in a chamber it germinates slowly.
    const colony = withLarvae(colonyWithNest(46), 200)
    addWorkers(colony, 95, 5)
    stock(colony, LARGE, 20000)
    stock(colony, VERY_LARGE, 5000)
    const before = colony.demography.brood.larvaCount
    colony.run(colony.sim.clock.ticksPerDay * 7)
    expect(colony.demography.brood.larvaCount).toBeLessThan(before * 0.5)
  })
})

describe('the store', () => {
  it('fills with the seeds nobody can open when foragers bring in every size', () => {
    // About 70 percent or more of stored seed mass is in sizes the ants cannot open, because
    // they collect every size and eat only the small ones (Figures 21 and 22).
    const colony = colonyWithNest(48)
    addWorkers(colony, 95, 5)
    const shares = PARAMS.seeds.collectedFractionByClass.value
    for (let day = 0; day < 90; day += 1) {
      shares.forEach((share, c) => stock(colony, c, 100 * share))
      colony.run(colony.sim.clock.ticksPerDay)
    }
    expect(unopenableShareByWeight(PARAMS, colony.seedStore)).toBeGreaterThanOrEqual(
      PARAMS.seeds.largeSeedStoreFractionByWeight.value,
    )
  })

  it('accounts for every seed: each is still stored, has germinated, or has been eaten', () => {
    const colony = colonyWithNest(49)
    addWorkers(colony, 95, 5)
    for (const c of ALL) stock(colony, c, 500)
    colony.run(colony.sim.clock.ticksPerDay * 20)
    const store = colony.seedStore
    for (const c of ALL) {
      expect(
        stored(colony, c) + store.totalGerminatedByClass[c]! + store.totalOpenedByClass[c]!,
      ).toBeCloseTo(500, 0)
    }
  })

  it('keeps the all-class total equal to the sum of the classes', () => {
    const colony = colonyWithNest(50)
    for (const c of ALL) stock(colony, c, 200)
    colony.run(colony.sim.clock.ticksPerDay * 3)
    let total = 0
    for (let i = 0; i < colony.nest.seeds.data.length; i += 1) total += colony.nest.seeds.data[i]!
    const byClass = ALL.reduce((sum, c) => sum + stored(colony, c), 0)
    expect(total).toBeCloseTo(byClass, 1)
  })

  it('is deterministic', () => {
    const run = (): string => {
      const colony = colonyWithNest(51)
      addWorkers(colony, 95, 5)
      withLarvae(colony, 40)
      for (const c of ALL) stock(colony, c, 1000)
      colony.run(colony.sim.clock.ticksPerDay * 4)
      return colony.sim.digest()
    }
    expect(run()).toBe(run())
  })
})
