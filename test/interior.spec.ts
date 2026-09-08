import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { Burden, Caste, Domain, Task } from '../src/core/state/ants.js'
import { BroodFate } from '../src/core/state/brood.js'
import { broodBandTopCm, seedBandCm } from '../src/core/systems/interior.js'
import type { Params } from '../src/core/params/params.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

/**
 * A colony with a nest already dug, so that what is being tested is what happens *inside*
 * one rather than how long it takes to make one.
 *
 * The shaft and chambers are carved directly into the grid. That is legitimate here and
 * would not be in test/nest-signature.spec.ts: the architecture gate exists to prove the
 * digging rules produce this shape, and these tests take the shape as given in order to ask
 * what the ants living in it do. Carving it also keeps the suite to seconds — growing a
 * metre-deep nest honestly costs a hundred simulated days.
 */
function colonyWithNest(seed: number, depthCm = 100, params: Params = PARAMS): Colony {
  const colony = new Colony({ seed, params })
  const { nest, soil } = colony
  const cell = nest.cellSizeCm
  const rows = Math.round(depthCm / cell)

  for (let row = 0; row <= rows; row += 1) {
    // A shaft one cell wide, with a chamber every 20 cm.
    const wide = row % Math.round(20 / cell) === 0 && row > 0
    const halfWidth = wide ? Math.round(6 / cell) : 0
    for (let d = -halfWidth; d <= halfWidth; d += 1) {
      const col = nest.entranceCol + d
      if (nest.excavate(col, row)) soil.applyVoid(nest, col, row)
    }
  }
  return colony
}

/**
 * Puts a worker in the nest at a given depth, on a given task.
 *
 * `timer` is the age this individual is due to start foraging at, and it has to be set
 * deliberately: the demographic engine reads it every day and moves a worker along the
 * one-way progression when its own schedule comes due. Left at zero, every worker in this
 * file was promoted out of brood care on its first morning — which is the demographic
 * engine working correctly and the test asking the wrong question.
 */
function addWorker(colony: Colony, task: number, depthCm: number, dueDays = 300): number {
  const { ants, clock } = colony.sim
  const slot = ants.spawn(Caste.MinorWorker, Domain.Nest)
  ants.x[slot] = 0
  ants.y[slot] = depthCm
  ants.task[slot] = task
  ants.ageTicks[slot] = Math.round(60 * clock.ticksPerDay)
  ants.timer[slot] = dueDays
  ants.lengthMm[slot] = colony.sim.params.colony.minorWorkerLengthMm.value
  ants.fat[slot] = 1
  // Not a digger, so excavation leaves it alone and this file is testing what it says it is.
  ants.digger[slot] = 255
  return slot
}

describe('a seed a forager brings home', () => {
  it('is put down in the nest rather than into a counter', () => {
    const colony = colonyWithNest(11)
    const forager = addWorker(colony, Task.Forager, 1)
    colony.sim.ants.burden[forager] = Burden.Seed

    colony.run(colony.sim.clock.ticksPerDay)

    expect(colony.interior.totalSeedsDeposited).toBeGreaterThan(0)
    expect(colony.summary().seedsStored).toBeGreaterThan(0)
    // And it is somewhere a person could point at, not a global.
    let found = false
    for (let row = 0; row < colony.nest.rows && !found; row += 1) {
      for (let col = 0; col < colony.nest.cols; col += 1) {
        if (colony.nest.seeds.get(col, row) > 0) {
          found = true
          break
        }
      }
    }
    expect(found).toBe(true)
  })

  it('is dropped in the topmost chambers, never carried down by the forager itself', () => {
    // Tschinkel & Seal 2015: foragers deposit in the top chambers and a separate class of
    // workers takes seeds deeper. A forager that walked its own seed down to 60 cm would be
    // reproducing the pattern by the wrong mechanism.
    const colony = colonyWithNest(12)
    for (let n = 0; n < 20; n += 1) {
      const forager = addWorker(colony, Task.Forager, 0.5)
      colony.sim.ants.burden[forager] = Burden.Seed
    }
    colony.run(colony.sim.clock.ticksPerDay)

    const limit = PARAMS.seeds.foragerDepositMaxDepthCm.value
    let deepest = 0
    for (let row = 0; row < colony.nest.rows; row += 1) {
      for (let col = 0; col < colony.nest.cols; col += 1) {
        if (colony.nest.seeds.get(col, row) > 0)
          deepest = Math.max(deepest, colony.nest.depthOf(row))
      }
    }
    expect(deepest).toBeLessThanOrEqual(limit + colony.nest.cellSizeCm)
  })

  it('is carried down into the seed chambers by transfer workers', () => {
    const colony = colonyWithNest(13)
    // Seeds sitting in the top chambers, as foragers would have left them.
    const shallowRow = colony.nest.rowOfDepth(2)
    colony.nest.seeds.set(colony.nest.entranceCol, shallowRow, 60)
    for (let n = 0; n < 30; n += 1) addWorker(colony, Task.Transfer, 2 + (n % 10))

    colony.run(colony.sim.clock.ticksPerDay * 3)

    const band = seedBandCm(colony.sim, colony.nest)
    let inBand = 0
    let aboveBand = 0
    for (let row = 0; row < colony.nest.rows; row += 1) {
      const depth = colony.nest.depthOf(row)
      for (let col = 0; col < colony.nest.cols; col += 1) {
        const seeds = colony.nest.seeds.get(col, row)
        if (seeds <= 0) continue
        if (depth >= band.top) inBand += seeds
        else aboveBand += seeds
      }
    }
    expect(inBand).toBeGreaterThan(aboveBand)
  })
})

describe('brood', () => {
  it('is placed in the nest, and the placement tracks the demographic count', () => {
    const colony = colonyWithNest(14)
    colony.demography.brood.lay(BroodFate.Worker, 200)
    colony.run(colony.sim.clock.ticksPerDay * 2)

    const placed = colony.summary().broodInChambers + colony.interior.broodCarried
    // Within a day's laying and dying of the authoritative count. The two are reconciled on
    // the day boundary, so they are equal at that instant and drift only within a day.
    expect(placed).toBeGreaterThan(0)
    expect(Math.abs(placed - colony.demography.brood.total)).toBeLessThan(
      colony.demography.brood.total * 0.5 + 5,
    )
  })

  it('ends up deep, which is where the excavations found it', () => {
    // The queen settles into the lower nest first, which is the whole mechanism: brood
    // appears where she is. Laying the clutch before she has moved would be testing a
    // situation the model never reaches — a queen standing in her own entrance.
    const colony = colonyWithNest(15)
    for (let n = 0; n < 40; n += 1) addWorker(colony, Task.BroodCare, 5 + (n % 20))
    colony.run(colony.sim.clock.ticksPerDay * 2)

    colony.demography.brood.lay(BroodFate.Worker, 300)
    colony.run(colony.sim.clock.ticksPerDay * 2)

    const band = broodBandTopCm(colony.sim, colony.nest)
    let deep = 0
    let shallow = 0
    for (let row = 0; row < colony.nest.rows; row += 1) {
      const depth = colony.nest.depthOf(row)
      for (let col = 0; col < colony.nest.cols; col += 1) {
        const brood = colony.nest.brood.get(col, row)
        if (brood <= 0) continue
        if (depth >= band) deep += brood
        else shallow += brood
      }
    }
    expect(deep).toBeGreaterThan(shallow)
  })
})

describe('the workforce sorts itself by depth', () => {
  /**
   * The measured stratification: foragers in the top 15 cm, brood-care workers deep. This
   * is the one result in this file that is held against a published measurement rather than
   * against a mechanism, and it is the reason the mechanism exists.
   */
  it('puts brood-care workers below foragers', () => {
    const colony = colonyWithNest(16)
    const foragers: number[] = []
    const nurses: number[] = []
    // Everyone starts at the same depth, so any separation is the model's doing.
    for (let n = 0; n < 60; n += 1) foragers.push(addWorker(colony, Task.Forager, 40))
    for (let n = 0; n < 60; n += 1) nurses.push(addWorker(colony, Task.BroodCare, 40))

    colony.run(colony.sim.clock.ticksPerDay * 6)

    const mean = (slots: number[]): number =>
      slots
        .filter((s) => colony.sim.ants.isAlive(s) && colony.sim.ants.domain[s] === Domain.Nest)
        .reduce((sum, s, _i, arr) => sum + colony.sim.ants.y[s]! / arr.length, 0)

    expect(mean(nurses)).toBeGreaterThan(mean(foragers))
  })
})

describe('determinism', () => {
  it('is unaffected by any of this', () => {
    const a = colonyWithNest(99)
    const b = colonyWithNest(99)
    for (const colony of [a, b]) {
      colony.demography.brood.lay(BroodFate.Worker, 120)
      for (let n = 0; n < 30; n += 1) addWorker(colony, Task.BroodCare, 10 + (n % 30))
      for (let n = 0; n < 10; n += 1) {
        const forager = addWorker(colony, Task.Forager, 1)
        colony.sim.ants.burden[forager] = Burden.Seed
      }
    }
    a.run(a.sim.clock.ticksPerDay * 2)
    b.run(b.sim.clock.ticksPerDay * 2)
    expect(a.sim.digest()).toBe(b.sim.digest())
  })
})
