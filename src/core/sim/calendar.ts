/**
 * The Gregorian month lengths, and nothing else.
 *
 * These live in their own file so that the "no biological constant is hard-coded" check
 * can exempt them by name rather than exempting the clock wholesale. They are calendar
 * facts, not parameters — but 31, 30 and 28 also happen to be Tallahassee summer
 * temperatures and a beetle count, so an exemption is needed and it should be as small and
 * as visible as possible.
 *
 * A fixed 365-day year, no leap days. See docs/DECISIONS.md D9.
 */

export const DAYS_IN_MONTH: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]

export const DAYS_IN_YEAR = 365

/**
 * Hours in a day. A clock fact like the month lengths, and here for the same reason: 24 is
 * also one of the temperatures seeds were germinated at.
 */
export const HOURS_IN_DAY = 24

/** First day-of-year, zero-based, for each month. Derived, not authored. */
export const MONTH_START: readonly number[] = (() => {
  const starts: number[] = []
  let acc = 0
  for (const days of DAYS_IN_MONTH) {
    starts.push(acc)
    acc += days
  }
  return starts
})()
