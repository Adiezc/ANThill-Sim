import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { Caste, Domain, Task } from '../src/core/state/ants.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

describe('the dead', () => {
  it('are carried out of the nest by workers', () => {
    // Workers of other ants carry corpses out, further than other refuse (Diez et al. 2012).
    const c = new Colony({ seed: 41, params: PARAMS, capacity: 80 })
    c.run(c.sim.clock.ticksPerDay * 20)
    const { nest } = c
    const { ants } = c.sim
    const where = nest.deepestVoid()
    nest.corpses.add(where.col, where.row, 3)
    for (let n = 0; n < 20; n += 1) {
      const slot = ants.spawn(Caste.MinorWorker, Domain.Nest)
      ants.x[slot] = nest.offsetOf(where.col)
      ants.y[slot] = nest.depthOf(where.row)
      ants.task[slot] = Task.Transfer
      ants.ageTicks[slot] = c.sim.clock.ticksPerDay * 60
      ants.fat[slot] = 1
      ants.timer[slot] = 300
      ants.lengthMm[slot] = PARAMS.colony.minorWorkerLengthMm.value
    }
    c.run(c.sim.clock.ticksPerDay * 3)
    let left = 0
    for (let i = 0; i < nest.corpses.data.length; i += 1) left += nest.corpses.data[i]!
    expect(left).toBe(0)
    // Each is out, or on its way up.
    c.run(c.sim.clock.ticksPerDay * 5)
    expect(c.interior.totalCorpsesCarriedOut).toBeGreaterThanOrEqual(3)
  }, 120000)

  it('leave a body where an ant dies underground, but not where a forager dies', () => {
    const c = new Colony({ seed: 42, params: PARAMS, capacity: 40 })
    c.run(c.sim.clock.ticksPerDay * 2)
    // The queen dies of the daily hazard in her chamber; her body stays there.
    const q = c.demography.queenSlot
    const col = c.nest.colOfOffset(c.sim.ants.x[q]!)
    const row = c.nest.rowOfDepth(c.sim.ants.y[q]!)
    const before = c.nest.corpses.get(col, row)
    const hazard = PARAMS.colony.queenLifespanYears
    ;(hazard as { value: number }).value = 1e-9
    c.run(c.sim.clock.ticksPerDay)
    ;(hazard as { value: number }).value = 17
    expect(c.demography.queenSlot).toBe(-1)
    let total = 0
    for (let i = 0; i < c.nest.corpses.data.length; i += 1) total += c.nest.corpses.data[i]!
    expect(total).toBeGreaterThanOrEqual(before + 1)
  }, 120000)
})
