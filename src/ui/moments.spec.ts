import { describe, expect, it } from 'vitest'
import { AntStore, Burden, Caste, Domain } from '../core/state/ants.js'
import { Moments } from './moments.js'
import { niceCeiling } from './history.js'
import type { Colony } from '../core/sim/colony.js'

/**
 * The moments the simulator offers to show. They read a colony and write nothing, so they are
 * tested against a stand-in holding just the fields they read, rather than a colony run for two
 * simulated months to reach its first hatching.
 */

const TICKS_PER_DAY = 1440

interface FakeColony {
  sim: { ants: AntStore; clock: { tick: number; ticksPerDay: number; daysElapsed: number } }
  demography: { totalEclosed: number }
  flights: { aloft: number; totalFlights: number }
  relocation: { moveStartDay: number; totalMoves: number }
  alarm: { alarmedNow: number; totalIntruders: number; intruder: Float64Array }
}

function fake(): FakeColony {
  return {
    sim: {
      ants: new AntStore(64),
      clock: { tick: 0, ticksPerDay: TICKS_PER_DAY, daysElapsed: 0 },
    },
    demography: { totalEclosed: 0 },
    flights: { aloft: 0, totalFlights: 0 },
    relocation: { moveStartDay: -1, totalMoves: 0 },
    alarm: { alarmedNow: 0, totalIntruders: 0, intruder: Float64Array.of(0, 0, -1) },
  }
}

const asColony = (c: FakeColony): Colony => c as unknown as Colony

function worker(c: FakeColony, ageDays: number): number {
  const slot = c.sim.ants.spawn(Caste.MinorWorker, Domain.Nest)
  c.sim.ants.ageTicks[slot] = ageDays * TICKS_PER_DAY
  return slot
}

function advanceDays(c: FakeColony, days: number): void {
  c.sim.clock.tick += days * TICKS_PER_DAY
  c.sim.clock.daysElapsed += days
}

describe('moments worth watching', () => {
  it('offers nothing while nothing is happening', () => {
    const c = fake()
    worker(c, 30)
    expect(new Moments().next(asColony(c))).toBeNull()
  })

  it('offers the first hatching once, and points at the youngest worker', () => {
    const c = fake()
    const moments = new Moments()
    expect(moments.next(asColony(c))).toBeNull()
    c.sim.ants.spawn(Caste.Queen, Domain.Nest)
    worker(c, 5)
    const newest = worker(c, 0)
    c.demography.totalEclosed = 2

    const moment = moments.next(asColony(c))
    expect(moment?.key).toBe('first-worker')
    expect(moment?.target).toEqual({ kind: 'ant', slot: newest })
    expect(moment?.live(asColony(c))).toBe(true)
    expect(moments.next(asColony(c))).toBeNull()

    advanceDays(c, 3)
    expect(moment?.live(asColony(c))).toBe(false)
  })

  it('does not announce what was already under way when watching began', () => {
    const c = fake()
    worker(c, 30)
    c.demography.totalEclosed = 400
    c.flights.aloft = 5
    const moments = new Moments()
    expect(moments.next(asColony(c))).toBeNull()
  })

  it('offers a mating flight while winged ants are out, slowly, at the entrance', () => {
    const c = fake()
    const moments = new Moments()
    moments.next(asColony(c))
    c.flights.aloft = 12
    const moment = moments.next(asColony(c))
    expect(moment?.target).toEqual({ kind: 'entrance' })
    expect(moment?.slow).toBe(true)
    expect(moments.next(asColony(c))).toBeNull()
    c.flights.aloft = 0
    expect(moment?.live(asColony(c))).toBe(false)
  })

  it('offers a move of house as the whole nest', () => {
    const c = fake()
    const moments = new Moments()
    moments.next(asColony(c))
    c.relocation.moveStartDay = 0
    expect(moments.next(asColony(c))?.target).toEqual({ kind: 'nest' })
  })

  it('offers a body being carried out, but not again for weeks', () => {
    const c = fake()
    const moments = new Moments()
    const carrier = worker(c, 20)
    c.sim.ants.burden[carrier] = Burden.Corpse
    const moment = moments.next(asColony(c))
    expect(moment?.target).toEqual({ kind: 'ant', slot: carrier })
    expect(moment?.slow).toBe(true)

    c.sim.ants.burden[carrier] = Burden.Nothing
    expect(moment?.live(asColony(c))).toBe(false)
    advanceDays(c, 5)
    c.sim.ants.burden[carrier] = Burden.Corpse
    expect(moments.next(asColony(c))).toBeNull()
    advanceDays(c, 60)
    expect(moments.next(asColony(c))).not.toBeNull()
  })

  it('offers an alarm on the ground while foragers answer it, and keeps the camera still', () => {
    const c = fake()
    const moments = new Moments()
    moments.next(asColony(c))
    c.alarm.intruder[2] = c.sim.clock.tick + 10
    c.alarm.totalIntruders = 1
    c.alarm.alarmedNow = 3
    const moment = moments.next(asColony(c))
    expect(moment?.target).toEqual({ kind: 'map' })
    expect(moment?.slow).toBe(true)
    c.alarm.alarmedNow = 0
    expect(moment?.live(asColony(c))).toBe(false)
  })
})

describe('the history chart axis', () => {
  it('tops each chart at a round number at or above its largest value', () => {
    expect(niceCeiling(0)).toBe(1)
    expect(niceCeiling(1)).toBe(1)
    expect(niceCeiling(14)).toBe(20)
    expect(niceCeiling(24)).toBe(50)
    expect(niceCeiling(274)).toBe(500)
    expect(niceCeiling(500)).toBe(500)
    expect(niceCeiling(4300)).toBe(5000)
  })
})
