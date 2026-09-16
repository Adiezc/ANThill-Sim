import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { Caste, Domain, Task } from '../src/core/state/ants.js'
import { ClimateModel } from '../src/core/systems/climate.js'
import { Prng } from '../src/core/math/prng.js'
import { HOURS_IN_DAY, MONTH_START } from '../src/core/sim/calendar.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

/** Rolls a run of July days, which have summer storms and the hottest sand. */
function julyDays(seed: number, years: number): ClimateModel['day'][] {
  const climate = new ClimateModel(PARAMS, seed)
  const prng = new Prng(seed)
  const days: ClimateModel['day'][] = []
  for (let y = 0; y < years; y += 1) {
    for (let d = MONTH_START[6]!; d < MONTH_START[7]!; d += 1) {
      climate.rollDay(d, 7, prng)
      days.push(climate.day)
    }
  }
  return days
}

describe('weather', () => {
  it('varies from day to day around the monthly normals', () => {
    const days = julyDays(3, 5)
    const highs = days.map((d) => d.dailyHighC)
    expect(Math.max(...highs) - Math.min(...highs)).toBeGreaterThan(5)
    const mean = highs.reduce((a, b) => a + b, 0) / highs.length
    expect(Math.abs(mean - 33)).toBeLessThan(3)
    expect(days.some((d) => d.sky === 'clear')).toBe(true)
    expect(days.some((d) => d.sky === 'cloudy')).toBe(true)
    expect(days.some((d) => d.sky === 'rain')).toBe(true)
  })

  it('brings summer rain in the afternoon', () => {
    const earliest = (PARAMS.climate.afternoonStormStartHour.value - 2) / HOURS_IN_DAY
    const rainy = julyDays(4, 5).filter((d) => d.rainfallMm > 0)
    expect(rainy.length).toBeGreaterThan(10)
    for (const d of rainy) {
      // A long storm is pulled earlier so that it ends by midnight.
      const hours = (d.rainEndFraction - d.rainStartFraction) * HOURS_IN_DAY
      expect(d.rainStartFraction).toBeGreaterThanOrEqual(
        Math.min(earliest, 1 - hours / HOURS_IN_DAY) - 1e-9,
      )
    }
  })

  it('heats sand in sun far more than under cloud, and not at all at night', () => {
    const climate = new ClimateModel(PARAMS, 5)
    const prng = new Prng(5)
    const noon = PARAMS.climate.solarPeakHour.value / HOURS_IN_DAY
    let clear = NaN
    let cloudy = NaN
    for (let d = MONTH_START[6]!; d < MONTH_START[7]!; d += 1) {
      climate.rollDay(d, 7, prng)
      const heating = climate.surfaceTemperatureC(30, noon) - 30 - climate.day.temperatureAnomalyC
      if (climate.day.sky === 'clear') clear = heating
      if (climate.day.sky === 'cloudy') cloudy = heating
      expect(
        climate.surfaceTemperatureC(30, 0.1) - 30 - climate.day.temperatureAnomalyC,
      ).toBeCloseTo(0, 9)
    }
    expect(clear).toBeCloseTo(PARAMS.climate.clearSkySurfaceHeatingC.value, 5)
    expect(cloudy).toBeLessThan(clear / 2)
  })
})

describe('foragers and rain', () => {
  it('sends no forager out while it rains, and brings those outside home', () => {
    // Foraging pauses during heavy rain (Kwapich & Tschinkel 2013).
    const c = new Colony({ seed: 21, params: PARAMS, capacity: 200, flightDayOfYear: 190 })
    c.run(c.sim.clock.ticksPerDay)
    const { ants } = c.sim
    for (let n = 0; n < 50; n += 1) {
      const slot = ants.spawn(Caste.MinorWorker, Domain.Nest)
      if (slot < 0) break
      ants.ageTicks[slot] = c.sim.clock.ticksPerDay * 200
      ants.task[slot] = Task.Forager
      ants.fat[slot] = 0
      ants.lengthMm[slot] = PARAMS.colony.minorWorkerLengthMm.value
    }

    let rainTicks = 0
    let outAtRainStart = -1
    let caughtOut = false
    for (let t = 0; t < c.sim.clock.ticksPerDay * 30 && rainTicks < 600; t += 1) {
      const raining = c.climate.isRaining(c.sim.clock.date().dayFraction)
      const started = c.foraging.totalTripsStarted
      const outBefore = c.foraging.antsOnSurface
      c.run(1)
      if (!raining) {
        outAtRainStart = -1
        continue
      }
      rainTicks += 1
      expect(c.foraging.totalTripsStarted).toBe(started)
      expect(c.foraging.antsOnSurface).toBeLessThanOrEqual(outBefore)
      if (outAtRainStart < 0) outAtRainStart = outBefore
      if (outAtRainStart > 0) caughtOut = true
    }
    expect(rainTicks).toBeGreaterThan(60)
    expect(caughtOut).toBe(true)
  }, 120000)
})
