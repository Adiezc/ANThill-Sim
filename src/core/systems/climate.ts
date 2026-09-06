/**
 * Weather, from the monthly normals in the parameter file.
 *
 * The table is the real 1991-2020 climate normals for Tallahassee, north Florida, which is
 * the study site for essentially all of the cited field work: humid subtropical, hot wet
 * summers, mild winters with occasional frost, a summer rainfall maximum. Everything
 * seasonal in the model is downstream of this — soil temperature, and through it seed
 * germination; soil moisture, and through it excavation; the nuptial flight trigger; the
 * winter excavation lull.
 *
 * Monthly means are interpolated to a daily value with a Catmull-Rom spline through the
 * twelve months, wrapped at the year boundary, so December runs into January without a
 * step. Rain is drawn as discrete events rather than smeared, because a nuptial flight
 * needs a heavy rain to follow and a month of drizzle is not the same weather as one
 * thunderstorm. See docs/SCIENCE.md section 9.
 */

import { ln } from '../math/approx.js'
import { cosTurns } from '../math/trig.js'
import { DAYS_IN_MONTH, DAYS_IN_YEAR, MONTH_START } from '../sim/calendar.js'
import type { Params } from '../params/params.js'
import type { Prng } from '../math/prng.js'

export interface Weather {
  /** Air temperature right now, including the diurnal swing. */
  readonly airTemperatureC: number
  /** Today's mean, without the diurnal swing. Drives the soil model. */
  readonly dailyMeanC: number
  readonly dailyHighC: number
  readonly dailyLowC: number
  /** Rain that fell today, in millimetres. Zero on most days. */
  readonly rainfallMm: number
  /** True when today's rain passed the heavy threshold. Gates the nuptial flight. */
  readonly heavyRain: boolean
  readonly frostPossible: boolean
}

/**
 * Catmull-Rom through twelve monthly values, wrapped. Returns the value at a fractional
 * month position, so mid-January reads as January's mean and the boundaries are smooth.
 */
function interpolateMonthly(values: readonly number[], position: number): number {
  const i = Math.floor(position)
  const t = position - i
  const at = (k: number): number => values[((k % 12) + 12) % 12]!
  const p0 = at(i - 1)
  const p1 = at(i)
  const p2 = at(i + 1)
  const p3 = at(i + 2)
  const t2 = t * t
  const t3 = t2 * t
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
  )
}

/**
 * Fractional month position for a day of year, placed at the middle of each month so that
 * the interpolated value at mid-month equals the tabulated normal exactly.
 */
function monthPosition(dayOfYear: number): number {
  for (let m = 0; m < 12; m += 1) {
    const start = MONTH_START[m]!
    const days = DAYS_IN_MONTH[m]!
    if (dayOfYear < start + days) {
      return m + (dayOfYear - start) / days - 0.5
    }
  }
  return 11.5
}

export class ClimateModel {
  private readonly highs: number[]
  private readonly lows: number[]
  private readonly precip: number[]
  private readonly params: Params

  /** Today's weather, recomputed once per simulated day. */
  private today: Weather

  constructor(params: Params) {
    this.params = params
    this.highs = params.climate.monthly.map((m) => m.highC)
    this.lows = params.climate.monthly.map((m) => m.lowC)
    this.precip = params.climate.monthly.map((m) => m.precipMm)
    this.today = {
      airTemperatureC: 0,
      dailyMeanC: 0,
      dailyHighC: 0,
      dailyLowC: 0,
      rainfallMm: 0,
      heavyRain: false,
      frostPossible: false,
    }
  }

  /** Mean of the twelve monthly means. The soil model oscillates about this. */
  get annualMeanC(): number {
    let sum = 0
    for (let m = 0; m < 12; m += 1) sum += (this.highs[m]! + this.lows[m]!) / 2
    return sum / 12
  }

  /** Half the peak-to-trough swing of the annual cycle in daily mean temperature. */
  get annualAmplitudeC(): number {
    let min = Infinity
    let max = -Infinity
    for (let m = 0; m < 12; m += 1) {
      const mean = (this.highs[m]! + this.lows[m]!) / 2
      if (mean < min) min = mean
      if (mean > max) max = mean
    }
    return (max - min) / 2
  }

  /**
   * Day of year on which the annual temperature cycle peaks, as a fraction of the year.
   * Derived from the table rather than assumed, so a different climate file moves it.
   */
  get annualPeakDayFraction(): number {
    let bestDay = 0
    let bestMean = -Infinity
    for (let day = 0; day < DAYS_IN_YEAR; day += 1) {
      const mean = this.dailyMeanForDay(day)
      if (mean > bestMean) {
        bestMean = mean
        bestDay = day
      }
    }
    return bestDay / DAYS_IN_YEAR
  }

  private dailyMeanForDay(dayOfYear: number): number {
    const pos = monthPosition(dayOfYear)
    return (interpolateMonthly(this.highs, pos) + interpolateMonthly(this.lows, pos)) / 2
  }

  /** Rolls one new day of weather. Called on the day boundary and nowhere else. */
  rollDay(dayOfYear: number, month: number, prng: Prng): void {
    const pos = monthPosition(dayOfYear)
    const high = interpolateMonthly(this.highs, pos)
    const low = interpolateMonthly(this.lows, pos)
    const monthlyTotal = interpolateMonthly(this.precip, pos)

    // Rain as discrete events. The daily probability is set so that the expected monthly
    // total matches the normals, and event size is exponential about the mean event, which
    // is what puts the occasional heavy storm in the record.
    const meanEvent = this.params.climate.meanRainEventMm.value
    const daysInMonth = DAYS_IN_MONTH[month - 1]!
    const rainProbability = Math.min(1, monthlyTotal / (daysInMonth * meanEvent))
    let rainfall = 0
    if (prng.chance(rainProbability)) {
      // Exponential draw. `1 - u` keeps the argument of the logarithm off zero.
      rainfall = -meanEvent * lnSafe(1 - prng.nextFloat())
    }

    this.today = {
      airTemperatureC: (high + low) / 2,
      dailyMeanC: (high + low) / 2,
      dailyHighC: high,
      dailyLowC: low,
      rainfallMm: rainfall,
      heavyRain: rainfall >= this.params.climate.heavyRainMm.value,
      frostPossible: this.params.climate.frostPossibleMonths.includes(month) && low <= 2,
    }
  }

  /**
   * Weather at a point in the day. The diurnal swing is a cosine peaking at the hour named
   * in the parameter file, which is what makes midday relocation activity dip and morning
   * foraging possible.
   */
  at(dayFraction: number): Weather {
    const peakHour = this.params.climate.dailyTemperaturePeakHour.value
    const phase = dayFraction - peakHour / 24
    const swing = ((this.today.dailyHighC - this.today.dailyLowC) / 2) * cosTurns(phase)
    return { ...this.today, airTemperatureC: this.today.dailyMeanC + swing }
  }

  /** Today's weather without the diurnal swing. */
  get day(): Weather {
    return this.today
  }
}

/** ln of a value clamped off zero, so an exponential draw cannot return Infinity. */
function lnSafe(x: number): number {
  return ln(x < 1e-12 ? 1e-12 : x)
}
