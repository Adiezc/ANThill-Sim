import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { ClimateModel } from '../src/core/systems/climate.js'
import { SoilModel, dampingDepthCm } from '../src/core/systems/soil.js'
import { Prng } from '../src/core/math/prng.js'
import { DAYS_IN_YEAR } from '../src/core/sim/calendar.js'

const PARAMS = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

describe('climate from the monthly normals', () => {
  const climate = new ClimateModel(PARAMS)

  it('reproduces the tabulated normals at mid-month', () => {
    // July: high 33, low 23. The interpolation is placed so mid-month reads the table
    // exactly, or the whole seasonal cycle would be quietly shifted. A single day's weather
    // strays from the normal on purpose (D33), so the normal itself is what is checked.
    const midJuly = 196 // July starts on day 181; this is the 16th
    const prng = new Prng(1)
    climate.rollDay(midJuly, 7, prng)
    expect(climate.day.normalHighC).toBeCloseTo(33, 1)
    expect(climate.day.normalLowC).toBeCloseTo(23, 1)
  })

  it('derives the annual mean and swing from the table, not from a constant', () => {
    // Monthly means run from 11.5 (January) to 28 (July and August). Both figures are
    // computed from the table, so they change if the climate file changes.
    expect(climate.annualMeanC).toBeCloseTo(20.29, 2)
    expect(climate.annualAmplitudeC).toBeCloseTo(8.25, 2)
    // The peak of the annual cycle falls in July or August, not on a hard-coded day.
    const peakDay = climate.annualPeakDayFraction * DAYS_IN_YEAR
    expect(peakDay).toBeGreaterThan(180)
    expect(peakDay).toBeLessThan(230)
  })

  it('crosses the year boundary without a step', () => {
    const prng = new Prng(1)
    const readings: number[] = []
    for (const day of [360, 362, 364, 0, 2, 4]) {
      climate.rollDay(day, day > 300 ? 12 : 1, prng)
      readings.push((climate.day.normalHighC + climate.day.normalLowC) / 2)
    }
    for (let i = 1; i < readings.length; i += 1) {
      expect(Math.abs(readings[i]! - readings[i - 1]!)).toBeLessThan(1)
    }
  })

  it('delivers roughly the tabulated rainfall over a simulated year', () => {
    // Rain is drawn as discrete events rather than smeared, because a nuptial flight needs
    // a heavy rain to follow. The totals must still come out right.
    const prng = new Prng(20240607)
    const model = new ClimateModel(PARAMS)
    let total = 0
    let heavyDays = 0
    const years = 30
    for (let y = 0; y < years; y += 1) {
      for (let day = 0; day < DAYS_IN_YEAR; day += 1) {
        const month = PARAMS.climate.monthly.findIndex((_m, i) => day < cumulativeDays(i + 1)) + 1
        model.rollDay(day, month, prng)
        total += model.day.rainfallMm
        if (model.day.heavyRain) heavyDays += 1
      }
    }
    const tabulated = PARAMS.climate.monthly.reduce((sum, m) => sum + m.precipMm, 0)
    expect(total / years).toBeGreaterThan(tabulated * 0.85)
    expect(total / years).toBeLessThan(tabulated * 1.15)
    // Heavy rain must be common enough to trigger flights and rare enough to be weather.
    expect(heavyDays / years).toBeGreaterThan(5)
    expect(heavyDays / years).toBeLessThan(60)
  })

  it('swings through the day, peaking in the afternoon', () => {
    const prng = new Prng(3)
    climate.rollDay(181, 7, prng)
    const dawn = climate.at(6 / 24).airTemperatureC
    const afternoon = climate.at(15 / 24).airTemperatureC
    const midnight = climate.at(0).airTemperatureC
    expect(afternoon).toBeGreaterThan(dawn)
    expect(afternoon).toBeGreaterThan(midnight)
    expect(afternoon).toBeCloseTo(climate.day.dailyHighC, 1)
  })
})

function cumulativeDays(months: number): number {
  const lengths = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  let sum = 0
  for (let i = 0; i < months; i += 1) sum += lengths[i]!
  return sum
}

describe('soil temperature', () => {
  const climate = new ClimateModel(PARAMS)
  const soil = new SoilModel(PARAMS)

  /** The model's mean at a depth over the days either side of `centreDay`. */
  const meanOver = (depthCm: number, centreDay: number, halfWidthDays: number): number => {
    let sum = 0
    for (let k = -halfWidthDays; k <= halfWidthDays; k += 1) {
      sum += soil.temperatureAt(depthCm, (centreDay + k + DAYS_IN_YEAR) % DAYS_IN_YEAR, climate)
    }
    return sum / (2 * halfWidthDays + 1)
  }

  // Mean soil temperature over each burial period of Tschinkel & Kwapich 2016, at 5, 15, 40
  // and 80 cm, which barely differed by depth. April is given as about 18 °C early in the
  // month rising to 21.8 by its end, and the burial year ran from one February to the next.
  // Each entry is [centre day, half-width in days, measured °C].
  const MEASURED: readonly (readonly [number, number, number])[] = [
    [45, 14, 11.5], // February 2015
    [97, 7, 18], // early April
    [112, 7, 21.8], // late April
    [166, 15, 26.8], // June
    [227, 15, 28], // August
    [288, 15, 22.8], // October
    [349, 15, 17.9], // December
    [45, 14, 13.1], // February 2016
  ]
  const BURIAL_DEPTHS_CM = [5, 15, 40, 80]

  it('reproduces the soil temperatures measured in the burial experiment', () => {
    // The model is a damped sinusoid driven by thirty-year air normals and the measurements
    // are one year, so it cannot match every month. It runs up to 3.5 °C cold in late April
    // and 2 °C cold in December, and up to 3.6 °C warm in February at 80 cm. RMS 1.8 °C;
    // before the thermal lag and surface offset were fitted to these figures it was 2.6,
    // and 6 °C warm in February at 80 cm. See DECISIONS.md D25.
    let squared = 0
    let n = 0
    for (const [day, halfWidth, measuredC] of MEASURED) {
      for (const depth of BURIAL_DEPTHS_CM) {
        const error = meanOver(depth, day, halfWidth) - measuredC
        expect(Math.abs(error)).toBeLessThan(4)
        squared += error * error
        n += 1
      }
    }
    expect(Math.sqrt(squared / n)).toBeLessThan(2)
  })

  it('keeps the monthly mean nearly the same from 5 to 80 cm, as measured', () => {
    // Measured: at most about 2 °C between depths in any month. What falls with depth is the
    // daily swing, not the mean. The model reaches 2.5 °C in June and December.
    for (const [day, halfWidth] of MEASURED) {
      const means = BURIAL_DEPTHS_CM.map((depth) => meanOver(depth, day, halfWidth))
      expect(Math.max(...means) - Math.min(...means)).toBeLessThan(3)
    }
  })

  it('derives its damping depth from the tabulated thermal lag', () => {
    // 20 days per metre pins the damping depth at about 2.9 m for a 365-day cycle, a thermal
    // diffusivity of about 8e-7 m²/s: damp sand. It is derived rather than authored so that
    // the two cannot disagree.
    expect(dampingDepthCm(PARAMS)).toBeCloseTo(290.5, 0)
  })

  it('damps the seasonal swing with depth', () => {
    const swing = (depthCm: number): number => {
      let min = Infinity
      let max = -Infinity
      for (let day = 0; day < DAYS_IN_YEAR; day += 5) {
        const t = soil.temperatureAt(depthCm, day, climate)
        if (t < min) min = t
        if (t > max) max = t
      }
      return max - min
    }
    const surface = swing(0)
    const shallow = swing(20)
    const deep = swing(300)
    expect(surface).toBeGreaterThan(shallow)
    expect(shallow).toBeGreaterThan(deep)
    // At 3 m the annual swing is about a third of the surface swing.
    expect(deep / surface).toBeGreaterThan(0.25)
    expect(deep / surface).toBeLessThan(0.45)
  })

  it('lags the surface with depth', () => {
    // This is why deep chambers are still warming in autumn when the surface has cooled.
    const peakDay = (depthCm: number): number => {
      let best = 0
      let bestT = -Infinity
      for (let day = 0; day < DAYS_IN_YEAR; day += 1) {
        const t = soil.temperatureAt(depthCm, day, climate)
        if (t > bestT) {
          bestT = t
          best = day
        }
      }
      return best
    }
    const atSurface = peakDay(0)
    const at1m = peakDay(100)
    const at2m = peakDay(200)
    expect(at1m - atSurface).toBeGreaterThan(15)
    expect(at1m - atSurface).toBeLessThan(25)
    expect(at2m).toBeGreaterThan(at1m)
  })

  it('lets foraging begin in early March and not in February', () => {
    // Foraging began within five days of 1 March in three of four study years. Onset follows
    // the soil at forager depth crossing a [B] threshold, so that threshold has to sit
    // between the February soil and the early-March soil.
    const depth = PARAMS.labour.foragerDepthMaxCm.value
    const threshold = PARAMS.labour.foragingOnsetSoilTempC.value
    const fifthOfMarch = 63
    expect(soil.temperatureAt(depth, fifthOfMarch, climate)).toBeGreaterThan(threshold)
    expect(meanOver(depth, 45, 14)).toBeLessThan(threshold)
  })

  it('stays inside a plausible range for north Florida sand', () => {
    for (const depth of [0, 10, 50, 150, 300]) {
      for (let day = 0; day < DAYS_IN_YEAR; day += 10) {
        const t = soil.temperatureAt(depth, day, climate)
        expect(t).toBeGreaterThan(0)
        expect(t).toBeLessThan(45)
      }
    }
  })
})

describe('soil moisture', () => {
  it('wets from the top down and leaves the deep soil alone', () => {
    const soil = new SoilModel(PARAMS)
    const col = 10
    const deepRow = soil.moisture.rowOf(200)
    const before = soil.moisture.get(col, deepRow)

    soil.updateMoisture(30) // a heavy storm
    expect(soil.moisture.get(col, soil.moisture.rowOf(2))).toBeGreaterThan(0.6)
    // 30 mm wets about 30 cm of sand. Two metres down, nothing has changed.
    expect(soil.moisture.get(col, deepRow)).toBeCloseTo(before, 5)
  })

  it('dries the surface out again but not the seed chambers', () => {
    const soil = new SoilModel(PARAMS)
    soil.updateMoisture(30)
    const wetSurface = soil.moisture.get(10, soil.moisture.rowOf(2))
    for (let day = 0; day < 40; day += 1) soil.updateMoisture(0)

    expect(soil.moisture.get(10, soil.moisture.rowOf(2))).toBeLessThan(wetSurface)
    // Seed chambers sit at 20 to 80 cm in damp soil. A dry spell must not empty them.
    const chamberMoisture = soil.moisture.get(10, soil.moisture.rowOf(50))
    expect(chamberMoisture).toBeGreaterThan(PARAMS.excavation.soilMoistureDiggableMin.value)
    expect(chamberMoisture).toBeLessThan(PARAMS.excavation.soilMoistureDiggableMax.value)
  })

  it('closes the surface to excavation when saturated, and when bone dry', () => {
    const soil = new SoilModel(PARAMS)
    const surfaceRow = soil.moisture.rowOf(1)

    // Saturated: a very heavy storm puts the top of the nest above the workable window.
    soil.updateMoisture(200)
    expect(soil.moisture.get(10, surfaceRow)).toBeGreaterThan(
      PARAMS.excavation.soilMoistureDiggableMax.value,
    )
    expect(soil.isDiggable(10, surfaceRow)).toBe(false)

    // And the deep soil is unaffected, so the colony can still work below.
    expect(soil.isDiggable(10, soil.moisture.rowOf(150))).toBe(true)
  })

  it('is most workable at the optimal moisture', () => {
    const soil = new SoilModel(PARAMS)
    const row = soil.moisture.rowOf(100)
    const at = (m: number): number => {
      soil.moisture.set(5, row, m)
      return soil.workability(5, row)
    }
    expect(at(PARAMS.excavation.soilMoistureOptimal.value)).toBeCloseTo(1, 6)
    expect(at(0.02)).toBe(0)
    expect(at(0.95)).toBe(0)
    expect(at(0.2)).toBeGreaterThan(0)
    expect(at(0.2)).toBeLessThan(1)
  })
})

describe('soil stress and arching', () => {
  /** A stand-in nest: the set of cells that have been dug. */
  function voids(cells: readonly [number, number][]): {
    isVoid: (c: number, r: number) => boolean
  } {
    const keys = new Set(cells.map(([c, r]) => `${c},${r}`))
    return { isVoid: (c, r) => keys.has(`${c},${r}`) }
  }

  it('rises with depth in undisturbed soil', () => {
    const soil = new SoilModel(PARAMS)
    const none = voids([])
    expect(soil.stressAt(none, 10, soil.stress.rowOf(10))).toBeLessThan(
      soil.stressAt(none, 10, soil.stress.rowOf(200)),
    )
  })

  it('arches the load around a void', () => {
    const soil = new SoilModel(PARAMS)
    const col = 100
    const row = soil.stress.rowOf(100)
    const none = voids([])

    // A short horizontal tunnel.
    const tunnel: [number, number][] = []
    for (let c = col - 2; c <= col + 2; c += 1) tunnel.push([c, row])
    const dug = voids(tunnel)

    // Soil beside the tunnel carries what the void no longer can: harder to remove next.
    expect(soil.stressAt(dug, col + 4, row)).toBeGreaterThan(soil.stressAt(none, col + 4, row))
    // Soil beneath it is shielded, which is much of why a shaft is a shaft.
    expect(soil.stressAt(dug, col, row + 2)).toBeLessThan(soil.stressAt(none, col, row + 2))
  })

  it('leaves distant soil untouched', () => {
    const soil = new SoilModel(PARAMS)
    const row = soil.stress.rowOf(100)
    const none = voids([])
    const dug = voids([[50, row]])
    expect(soil.stressAt(dug, 150, row)).toBe(soil.stressAt(none, 150, row))
  })

  it('does not saturate as a nest is dug out', () => {
    // This is the failure that stalled the first excavation run at 2 cm depth. Arching was
    // implemented as an accumulation — every new void added load to its neighbours and
    // nothing ever removed any — so within a few dozen cells every grain around the nest
    // was at maximum load and no ant could take anything. A void redistributes load; it
    // does not create it. Stress is therefore computed from the void configuration rather
    // than accumulated, and this test pins that.
    const soil = new SoilModel(PARAMS)
    const row = soil.stress.rowOf(150)
    const chamber: [number, number][] = []
    for (let c = 60; c < 140; c += 1) {
      for (let r = row - 1; r <= row + 1; r += 1) chamber.push([c, r])
    }
    const dug = voids(chamber)

    // Soil just below a wide chamber must stay workable, or the nest can never deepen.
    const below = soil.stressAt(dug, 100, row + 2)
    expect(below).toBeLessThan(0.9)
    expect(below).toBeLessThan(soil.stressAt(voids([]), 100, row + 2))
  })

  it('never leaves [0, 1]', () => {
    const soil = new SoilModel(PARAMS)
    const row = soil.stress.rowOf(250)
    const all: [number, number][] = []
    for (let c = 80; c < 120; c += 1) {
      for (let r = row - 10; r <= row + 10; r += 1) all.push([c, r])
    }
    const dug = voids(all)
    for (let c = 70; c < 130; c += 1) {
      const v = soil.stressAt(dug, c, row + 12)
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
