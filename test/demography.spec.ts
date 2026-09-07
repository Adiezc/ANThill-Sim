import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { BroodStore, BroodFate } from '../src/core/state/brood.js'
import { Caste, Task } from '../src/core/state/ants.js'
import { countForagers, countWorkers } from '../src/core/systems/demography.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

/**
 * Capacity is kept small on purpose. These tests are about mechanism, not scale, and a
 * colony of a few hundred exercises every rule a colony of five thousand does while
 * running in a time a test suite can afford. The long-run trajectory is checked separately
 * and is skipped by default.
 */
function colony(seed = 1, days = 0, capacity = 400): Colony {
  const c = new Colony({ seed, params: PARAMS, capacity })
  if (days > 0) c.run(c.sim.clock.ticksPerDay * days)
  return c
}

describe('brood cohorts', () => {
  it('moves a cohort through egg, larva and pupa in the stated time', () => {
    const brood = new BroodStore(3, 4, 2)
    brood.lay(BroodFate.Worker, 100)
    expect(brood.eggCount).toBeCloseTo(100, 5)

    let eclosed = 0
    for (let day = 0; day < 9; day += 1) {
      eclosed += brood.advanceDay(1, 1, 1)[BroodFate.Worker]
    }
    // Three days as an egg, four as a larva, two as a pupa.
    expect(eclosed).toBeCloseTo(100, 4)
    expect(brood.total).toBeCloseTo(0, 4)
  })

  it('keeps the three fates separate', () => {
    const brood = new BroodStore(2, 2, 2)
    brood.lay(BroodFate.Worker, 10)
    brood.lay(BroodFate.Alate, 4)
    let workers = 0
    let alates = 0
    for (let day = 0; day < 6; day += 1) {
      const out = brood.advanceDay(1, 1, 1)
      workers += out[BroodFate.Worker]
      alates += out[BroodFate.Alate]
    }
    expect(workers).toBeCloseTo(10, 4)
    expect(alates).toBeCloseTo(4, 4)
  })

  it('clears brood that cannot finish before winter', () => {
    // HARD RULE: P. badius does not overwinter with brood. October is the latest possible
    // date of pupal eclosion, and larvae present after that were observed to be doomed.
    const brood = new BroodStore(3, 3, 3)
    brood.lay(BroodFate.Worker, 50)
    brood.advanceDay(1, 1, 1)
    const lost = brood.clearForWinter()
    expect(lost).toBeGreaterThan(0)
    expect(brood.eggCount).toBe(0)
    expect(brood.larvaCount).toBe(0)
  })
})

describe('claustral founding', () => {
  it('starts with exactly one queen and no workers', () => {
    const c = colony()
    expect(c.demography.phase).toBe('founding')
    expect(countWorkers(c.sim)).toBe(0)
    expect(c.sim.ants.caste[c.demography.queenSlot]).toBe(Caste.Queen)
  })

  it('raises a first brood from the queen’s own reserves and nothing else', () => {
    const c = colony(1, 90)
    // She takes in no food, so her reserve only falls.
    expect(c.demography.queenReserve).toBeLessThan(PARAMS.brood.queenFoundingFatReserve.value)
    expect(c.demography.foundingEggsLaid).toBeGreaterThan(0)
    expect(c.demography.foundingEggsLaid).toBeLessThanOrEqual(c.demography.nanaticTarget)
    expect(countWorkers(c.sim)).toBeGreaterThan(0)
    expect(c.demography.phase).not.toBe('founding')
  })

  it('digs its own shaft: the queen is the first excavator', () => {
    const c = colony(1, 40)
    expect(c.nest.maxDepthCm).toBeGreaterThan(0)
    expect(c.nest.excavatedCells).toBeGreaterThan(1)
  })

  it('never carries a fractional adult into oblivion', () => {
    // Brood is cohort counts, adults are individuals, and a small colony ecloses well under
    // one adult a day. Flooring that fraction away silently killed every founding colony.
    const c = colony(1, 120)
    expect(c.demography.totalEclosed).toBeGreaterThan(0)
    for (const carry of c.demography.eclosionCarry) {
      expect(carry).toBeGreaterThanOrEqual(0)
      expect(carry).toBeLessThan(1)
    }
  })
})

/**
 * Builds a colony with a workforce already in place, instead of simulating a year to grow
 * one. These tests are about a rule, not about a trajectory, and growing the colony first
 * made each of them take over a minute for no extra assurance.
 */
function stockedColony(seed: number, workers: number, ageDays: number, fat: number): Colony {
  // Headroom matters: the colony's own brood claims slots first, and too tight a capacity
  // silently leaves the workforce unstocked.
  const c = colony(seed, 0, workers * 2 + 60)
  c.run(c.sim.clock.ticksPerDay) // one day, so the nest has somewhere to put them
  const { ants, clock, params } = c.sim
  for (let n = 0; n < workers; n += 1) {
    const slot = ants.spawn(Caste.MinorWorker, 1)
    if (slot < 0) break
    ants.ageTicks[slot] = Math.round(ageDays * clock.ticksPerDay)
    ants.fat[slot] = fat
    ants.task[slot] = Task.BroodCare
    ants.timer[slot] = params.labour.ageAtFirstForagingDaysSummerBorn.value
    ants.lengthMm[slot] = params.colony.minorWorkerLengthMm.value
    const where = c.nest.deepVoidNear(0.5, n / workers)
    ants.x[slot] = c.nest.offsetOf(where.col)
    ants.y[slot] = c.nest.depthOf(where.row)
  }
  return c
}

describe('HARD RULE: allocation is one-way and does not respond to need', () => {
  it('never turns a forager back into an inside worker', () => {
    // Raising forager number, body fat or the larva-to-forager ratio induces no reversion,
    // and neither does starvation. Tested by Kwapich & Tschinkel 2016 and rejected.
    const c = stockedColony(3, 120, 40, 0.15)
    const wasForager = new Set<number>()

    for (let day = 0; day < 40; day += 1) {
      c.run(c.sim.clock.ticksPerDay)
      for (let i = 0; i < c.sim.ants.count; i += 1) {
        if (!c.sim.ants.isAlive(i)) continue
        const id = c.sim.ants.id[i]!
        if (c.sim.ants.task[i] === Task.Forager) {
          wasForager.add(id)
        } else if (wasForager.has(id)) {
          throw new Error(`ant ${id} left the forager role for task ${c.sim.ants.task[i]}`)
        }
      }
    }
    expect(wasForager.size).toBeGreaterThan(0)
  })

  it('answers a forager cull with larval death, not with replacements', () => {
    // Removing 50 % of the forager population drew no workers from other castes. Larval
    // survival suffered instead. This is the single most counter-intuitive fact about the
    // species and the one a well-meaning contributor is most likely to "fix".
    //
    // The colony is stocked with two cohorts: workers on the edge of foraging, and younger
    // ones with a full fat reserve and a long schedule ahead of them. The second group is
    // the pool a colony would draw on if it could. It must not shrink.
    const c = stockedColony(5, 120, 45, 0.11)
    const { ants, clock, params } = c.sim
    const reserve = 150
    for (let n = 0; n < reserve; n += 1) {
      const slot = ants.spawn(Caste.MinorWorker, 1)
      if (slot < 0) break
      ants.ageTicks[slot] = Math.round(20 * clock.ticksPerDay)
      ants.fat[slot] = 1
      ants.task[slot] = Task.BroodCare
      // An autumn-born schedule: this worker is not due to forage for the best part of a year.
      ants.timer[slot] = params.labour.ageAtFirstForagingDaysAutumnBornRange.max
      ants.lengthMm[slot] = params.colony.minorWorkerLengthMm.value
      const where = c.nest.deepVoidNear(0.5, n / reserve)
      ants.x[slot] = c.nest.offsetOf(where.col)
      ants.y[slot] = c.nest.depthOf(where.row)
    }

    c.run(clock.ticksPerDay * 3)
    const before = countForagers(c.sim)
    const insideBefore = countWorkers(c.sim) - before
    expect(before).toBeGreaterThan(10)
    expect(insideBefore).toBeGreaterThan(50)

    let culled = 0
    const target = Math.floor(before / 2)
    for (let i = 0; i < ants.count && culled < target; i += 1) {
      if (ants.isAlive(i) && ants.task[i] === Task.Forager) {
        ants.kill(i)
        culled += 1
      }
    }
    const afterCull = countForagers(c.sim)
    const insideAfterCull = countWorkers(c.sim) - afterCull

    c.run(clock.ticksPerDay * 7)

    // The forager population does not refill from the inside workforce, and the inside
    // workforce is not drained to try. Each of those young workers will forage one day,
    // on its own schedule, and losing half the foragers does not bring that day forward.
    const recovered = countForagers(c.sim) - afterCull
    expect(recovered).toBeLessThan(culled * 0.5)
    const insideNow = countWorkers(c.sim) - countForagers(c.sim)
    expect(insideNow).toBeGreaterThan(insideAfterCull * 0.8)
  })
})

describe('development rate is set by season of birth, not by colony need', () => {
  it('gives summer-born and autumn-born workers very different schedules', () => {
    // Summer-born workers forage at 43 days (SD 1.78). Autumn-born ones overwinter and do
    // not forage for 210 to 360 days. The schedule is fixed at eclosion and never revisited.
    const c = colony(9, 420, 900)
    const schedules: number[] = []
    for (let i = 0; i < c.sim.ants.count; i += 1) {
      if (!c.sim.ants.isAlive(i)) continue
      const caste = c.sim.ants.caste[i]!
      if (caste !== Caste.MinorWorker && caste !== Caste.MajorWorker) continue
      schedules.push(c.sim.ants.timer[i]!)
    }
    expect(schedules.length).toBeGreaterThan(5)
    const short = schedules.filter((d) => d < 100).length
    const long = schedules.filter((d) => d >= 200).length
    // Both cohorts exist in the same nest at the same time, which is the observation:
    // long-lived autumn workers forage alongside their short-lived summer sisters.
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(0)
  })
})

describe('the annual cycle of foraging', () => {
  /**
   * Stocks a colony with a spread of ages and schedules and runs it through a year, so the
   * seasonal shape can be measured without simulating the five years it would take to grow
   * one. The age structure is artificial and the peak height should not be read too closely;
   * the shape — winter zero, spring rise, summer maximum, autumn decline — is the point.
   */
  function annualForagingTrace(seed: number, workers: number): { month: number; frac: number }[] {
    const c = colony(seed, 0, workers * 2)
    c.run(c.sim.clock.ticksPerDay)
    const { ants, clock, params } = c.sim
    for (let n = 0; n < workers; n += 1) {
      const slot = ants.spawn(Caste.MinorWorker, 1)
      if (slot < 0) break
      const ageDays = (n / workers) * 365
      ants.ageTicks[slot] = Math.round(ageDays * clock.ticksPerDay)
      ants.fat[slot] = 1 - (ageDays / 365) * 0.85
      ants.task[slot] = Task.BroodCare
      // A third on the summer schedule, the rest overwintering.
      ants.timer[slot] = n % 3 === 0 ? 43 : 210 + (n % 150)
      ants.lengthMm[slot] = params.colony.minorWorkerLengthMm.value
      const where = c.nest.deepVoidNear(0.8, ((n * 7919) % 1000) / 1000)
      ants.x[slot] = c.nest.offsetOf(where.col)
      ants.y[slot] = c.nest.depthOf(where.row)
    }

    const trace: { month: number; frac: number }[] = []
    for (let day = 0; day < 365; day += 1) {
      c.run(clock.ticksPerDay)
      const w = countWorkers(c.sim)
      trace.push({ month: c.sim.clock.date().month, frac: w > 0 ? countForagers(c.sim) / w : 0 })
    }
    return trace
  }

  function peakIn(trace: { month: number; frac: number }[], months: number[]): number {
    return Math.max(0, ...trace.filter((t) => months.includes(t.month)).map((t) => t.frac))
  }

  it('does not forage in winter', () => {
    // Foraging falls to zero by December and does not resume until late February at the
    // earliest. A worker whose 210-to-360-day schedule comes due in January waits: without
    // that gate the model produced a January foraging peak in a species that is dormant.
    const trace = annualForagingTrace(2, 900)
    expect(peakIn(trace, [12, 1, 2])).toBeLessThan(0.05)
  }, 300000)

  it('forages most in summer', () => {
    // Foraging begins in March or April and reaches its annual maximum in midsummer.
    const trace = annualForagingTrace(2, 900)
    expect(peakIn(trace, [6, 7, 8])).toBeGreaterThan(peakIn(trace, [12, 1, 2]))
    expect(peakIn(trace, [6, 7, 8])).toBeGreaterThan(0.15)
  }, 300000)

  it('rises through the spring rather than all at once', () => {
    // Onset follows soil temperature, not the calendar: foraging began within five days of
    // 1 March in three of four study years and a full month later in the fourth. Gating on
    // the month alone released the whole overwintered cohort on one morning.
    const trace = annualForagingTrace(2, 900)
    const march = trace.filter((t) => t.month === 3).map((t) => t.frac)
    const early = Math.max(0, ...march.slice(0, 8))
    const late = Math.max(0, ...march.slice(-8))
    expect(late).toBeGreaterThan(early)
  }, 300000)
})

describe('colony trajectory', () => {
  it.skip('reaches sexual maturity in the reported four to five years [measured: year 5]', () => {
    // Skipped by default because it simulates five years of a colony growing past four
    // thousand workers, which takes minutes rather than seconds. Run it deliberately when
    // the demographic parameters change. Measured trajectory at seed 1: 5, 13, 63, 294,
    // 1177 workers at the end of years 1 to 5, crossing the 700 of sexual maturity in year
    // 5 and reaching about 4800 by year 7 against a reported mean mature size of 4300.
    // Pogonomyrmex colonies grow to maturity in 4-5 years, and P. badius begins releasing
    // alates at about 700 workers.
    const c = colony(1)
    const ticksPerYear = c.sim.clock.ticksPerDay * 365
    let matureYear = -1
    for (let year = 1; year <= 7 && matureYear < 0; year += 1) {
      c.run(ticksPerYear)
      if (countWorkers(c.sim) >= PARAMS.colony.sexualMaturityWorkers.value) matureYear = year
    }
    expect(matureYear).toBeGreaterThanOrEqual(3)
    expect(matureYear).toBeLessThanOrEqual(6)
  }, 600000)

  it('is deterministic', () => {
    const a = colony(11, 120).summary()
    const b = colony(11, 120).summary()
    expect(a).toEqual(b)
  })
})
