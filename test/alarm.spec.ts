import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { Burden, Caste, Domain, Task } from '../src/core/state/ants.js'
import { intruderPresent, isAlarmed } from '../src/core/systems/alarm.js'
import type { Params } from '../src/core/params/params.js'

const RAW = JSON.parse(
  readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
) as Record<string, unknown>

function withOverrides(overrides: Record<string, unknown>): Params {
  const copy = JSON.parse(JSON.stringify(RAW)) as Record<string, unknown>
  for (const [path, value] of Object.entries(overrides)) {
    const keys = path.split('.')
    let node = copy as Record<string, unknown>
    for (const key of keys.slice(0, -1)) node = node[key] as Record<string, unknown>
    ;(node[keys[keys.length - 1]!] as Record<string, unknown>).value = value
  }
  return loadSpecies(copy).params
}

/** A colony of foragers on a July morning, as in the foraging tests: an artificial age structure. */
function foragersOut(seed: number, params: Params): Colony {
  const c = new Colony({ seed, params, capacity: 220, flightDayOfYear: 190 })
  const tpd = c.sim.clock.ticksPerDay
  c.run(tpd)
  const { ants } = c.sim
  for (let n = 0; n < 60; n += 1) {
    const slot = ants.spawn(Caste.MinorWorker, Domain.Nest)
    ants.ageTicks[slot] = tpd * 100
    ants.task[slot] = Task.Forager
    ants.lengthMm[slot] = params.colony.minorWorkerLengthMm.value
  }
  // To mid-morning, when foragers are out.
  c.run(Math.round(tpd * 0.4))
  return c
}

describe('alarm on the foraging ground', () => {
  it('raises no alarm when nothing ever disturbs the foragers', () => {
    const c = foragersOut(3, withOverrides({ 'alarm.intrudersPerDay': 0 }))
    c.run(c.sim.clock.ticksPerDay * 2)
    expect(c.alarm.totalIntruders).toBe(0)
    expect(c.alarm.totalAlarmed).toBe(0)
  })

  it('draws the foragers near a disturbance to it, where they circle and pick nothing up', () => {
    // Disturbances all day long, so one is met within the hour.
    const params = withOverrides({ 'alarm.intrudersPerDay': 100000 })
    const c = foragersOut(4, params)
    const { ants } = c.sim
    let hour = 0
    while (c.alarm.alarmedNow === 0 && hour < 60) {
      c.run(1)
      hour += 1
    }
    expect(c.alarm.alarmedNow).toBeGreaterThan(0)
    expect(intruderPresent(c.sim, c.alarm)).toBe(true)

    // A few steps on: every alarmed forager is on the ground, within circling distance of the
    // disturbance, and none has taken a seed while alarmed.
    const burdens = new Map<number, number>()
    for (let i = 0; i < ants.count; i += 1) {
      if (isAlarmed(c.sim, c.alarm, i)) burdens.set(i, ants.burden[i]!)
    }
    c.run(3)
    const circle = params.alarm.extremeAlarmRadiusCm.value / 100
    let checked = 0
    for (let i = 0; i < ants.count; i += 1) {
      if (!isAlarmed(c.sim, c.alarm, i)) continue
      expect(ants.domain[i]).toBe(Domain.Surface)
      const dx = ants.x[i]! - c.alarm.intruder[0]!
      const dy = ants.y[i]! - c.alarm.intruder[1]!
      expect(Math.sqrt(dx * dx + dy * dy)).toBeLessThanOrEqual(
        params.foraging.speedMetresPerTick.value + circle,
      )
      if (burdens.has(i) && burdens.get(i) === Burden.Nothing) {
        expect(ants.burden[i]).toBe(Burden.Nothing)
      }
      checked += 1
    }
    expect(checked).toBeGreaterThan(0)
  })

  it('lets the alarm fade within a step of the disturbance leaving, as the scent does', () => {
    const params = withOverrides({ 'alarm.intrudersPerDay': 100000 })
    const c = foragersOut(5, params)
    let steps = 0
    while (c.alarm.alarmedNow === 0 && steps < 60) {
      c.run(1)
      steps += 1
    }
    expect(c.alarm.alarmedNow).toBeGreaterThan(0)
    // Send the disturbance away, and stop new ones.
    c.alarm.intruder[2] = c.sim.clock.tick
    ;(c.sim.params.alarm.intrudersPerDay as { value: number }).value = 0
    const linger = Math.ceil(params.alarm.fadeOutSeconds.value / params.time.secondsPerTick.value)
    c.run(linger + 1)
    expect(c.alarm.alarmedNow).toBe(0)
  })

  it('gives the same run for the same seed', () => {
    const params = withOverrides({ 'alarm.intrudersPerDay': 50 })
    const a = foragersOut(6, params)
    const b = foragersOut(6, params)
    a.run(a.sim.clock.ticksPerDay)
    b.run(b.sim.clock.ticksPerDay)
    expect(a.alarm.totalAlarmed).toBeGreaterThan(0)
    expect(a.sim.digest()).toBe(b.sim.digest())
  })
})
