import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { Caste, Domain } from '../src/core/state/ants.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

/**
 * A colony holding winged queens and males, without growing one to the 700 workers at which
 * a real colony starts rearing them. Half are old enough to fly and half have just eclosed.
 */
function colonyWithSexuals(seed: number, startDayOfYear: number): Colony {
  const c = new Colony({ seed, params: PARAMS, capacity: 200, flightDayOfYear: startDayOfYear })
  c.run(c.sim.clock.ticksPerDay)
  const { ants } = c.sim
  const tpd = c.sim.clock.ticksPerDay
  for (let n = 0; n < 40; n += 1) {
    const slot = ants.spawn(n % 2 === 0 ? Caste.Alate : Caste.Male, Domain.Nest)
    ants.x[slot] = 0
    ants.y[slot] = c.nest.depthOf(2)
    // Ten of each sex old enough to fly, and ten of each a day old. The young ones are checked
    // on the first flight only, which with this seed comes before they are old enough.
    ants.ageTicks[slot] = n < 20 ? tpd * 40 : tpd
  }
  return c
}

function sexualsInNest(c: Colony): number {
  const { ants } = c.sim
  let n = 0
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
    if (ants.caste[i] === Caste.Alate || ants.caste[i] === Caste.Male) n += 1
  }
  return n
}

describe('nuptial flights', () => {
  it('fly on a morning after heavy rain, taking only those old enough', () => {
    // Flights usually follow the first heavy summer rain, and colonies keep rearing sexuals
    // for later flights (Smith & Tschinkel 2006).
    const c = colonyWithSexuals(31, 150)
    const tpd = c.sim.clock.ticksPerDay
    const heavyDays: number[] = []
    for (let t = 0; t < tpd * 70 && c.flights.totalFlights === 0; t += 1) {
      c.run(1)
      if (c.sim.clock.tick % tpd === 1 && c.climate.day.heavyRain) {
        heavyDays.push(c.sim.clock.daysElapsed)
      }
    }
    expect(heavyDays.length).toBeGreaterThan(0)
    expect(c.flights.totalFlights).toBe(1)

    const flightDay = c.sim.clock.daysElapsed
    const sinceRain = flightDay - heavyDays[heavyDays.length - 1]!
    expect(sinceRain).toBeGreaterThanOrEqual(1)
    expect(sinceRain).toBeLessThanOrEqual(PARAMS.brood.nuptialFlightDaysAfterRain.value)
    expect(c.sim.clock.date().dayFraction * 24).toBeCloseTo(PARAMS.brood.nuptialFlightHour.value, 1)

    const f = c.flights.flights[0]!
    expect(f.gynes).toBe(10)
    expect(f.males).toBe(10)
    expect(sexualsInNest(c)).toBe(20)

    // Within the departure window they have all gone, and none was counted as a forager.
    expect(c.foraging.antsOnSurface).toBe(0)
    c.run(PARAMS.brood.nuptialFlightDepartureTicks.value + 1)
    expect(c.flights.aloft).toBe(0)
    expect(c.foraging.antsOnSurface).toBe(0)
  }, 120000)

  it('does not fly outside May to July, whatever the rain', () => {
    const c = colonyWithSexuals(32, 250)
    c.run(c.sim.clock.ticksPerDay * 60)
    expect(c.flights.totalFlights).toBe(0)
    expect(sexualsInNest(c)).toBe(40)
  }, 120000)
})
