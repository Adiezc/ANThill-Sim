/**
 * Simulated time.
 *
 * The core advances on a fixed timestep and nothing else. Playback speed changes how many
 * ticks are run per animation frame; it never changes the size of a tick and it never
 * changes simulation fidelity, so a run at 32x and the same run at 1x are the same run.
 *
 * There is no wall clock here and no `Date`. Everything is derived from an integer tick
 * count, which is also what makes the calendar exactly reproducible.
 */

/** Days per month in a fixed 365-day year. See docs/DECISIONS.md D9. */
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const
const DAYS_IN_YEAR = 365

/** First day-of-year, zero-based, for each month. Derived, not authored. */
const MONTH_START: readonly number[] = (() => {
  const starts: number[] = []
  let acc = 0
  for (const days of DAYS_IN_MONTH) {
    starts.push(acc)
    acc += days
  }
  return starts
})()

export interface CalendarDate {
  /** Whole years since the nuptial flight that founded this colony. */
  readonly colonyYear: number
  /** 1 to 12. */
  readonly month: number
  /** 1 to 31. */
  readonly dayOfMonth: number
  /** 0 to 364. */
  readonly dayOfYear: number
  /** 0 to 1, where 0 is midnight and 0.5 is midday. */
  readonly dayFraction: number
}

export class Clock {
  /** Ticks elapsed since the run began. The single source of simulated time. */
  tick = 0

  readonly ticksPerDay: number
  readonly secondsPerTick: number

  /**
   * Day of year on which the run begins, so a colony founded in June is not silently
   * founded on 1 January. Zero-based.
   */
  readonly startDayOfYear: number

  constructor(secondsPerTick: number, startDayOfYear = 0) {
    if (!Number.isInteger(secondsPerTick) || secondsPerTick <= 0) {
      throw new Error(`secondsPerTick must be a positive integer, got ${secondsPerTick}`)
    }
    if (86400 % secondsPerTick !== 0) {
      throw new Error(
        `secondsPerTick must divide a day exactly, or the calendar drifts against the tick count; got ${secondsPerTick}`,
      )
    }
    this.secondsPerTick = secondsPerTick
    this.ticksPerDay = 86400 / secondsPerTick
    this.startDayOfYear = startDayOfYear
  }

  advance(): void {
    this.tick += 1
  }

  /** Whole simulated days elapsed since the run began. */
  get daysElapsed(): number {
    return Math.floor(this.tick / this.ticksPerDay)
  }

  /** True on the first tick of a new simulated day. Systems that run daily hang off this. */
  get isDayBoundary(): boolean {
    return this.tick % this.ticksPerDay === 0
  }

  date(): CalendarDate {
    const days = this.startDayOfYear + this.daysElapsed
    const colonyYear = Math.floor(days / DAYS_IN_YEAR)
    const dayOfYear = days - colonyYear * DAYS_IN_YEAR

    let month = 0
    while (month < 11 && dayOfYear >= MONTH_START[month + 1]!) month += 1

    return {
      colonyYear,
      month: month + 1,
      dayOfMonth: dayOfYear - MONTH_START[month]! + 1,
      dayOfYear,
      dayFraction: (this.tick % this.ticksPerDay) / this.ticksPerDay,
    }
  }

  /** Ticks in a given number of simulated days. Used wherever a rate is authored per day. */
  ticksFromDays(days: number): number {
    return Math.round(days * this.ticksPerDay)
  }

  /** Simulated days in a given number of ticks. */
  daysFromTicks(ticks: number): number {
    return ticks / this.ticksPerDay
  }

  snapshot(): Uint32Array {
    return Uint32Array.of(this.tick)
  }

  restore(state: Uint32Array): void {
    this.tick = state[0]!
  }
}
