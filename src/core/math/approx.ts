/**
 * Deterministic replacements for the transcendental Math functions.
 *
 * ECMA-262 requires only that Math.exp, Math.pow, Math.log and the trigonometric family
 * be within an implementation-defined approximation of the true result. V8, SpiderMonkey
 * and JavaScriptCore disagree in the last bits, so a seeded run would diverge silently
 * between a browser and Node. Everything here is built from IEEE 754 arithmetic and exact
 * bit manipulation only, and therefore produces identical results on every engine.
 *
 * These are fixed truncated series, not minimax fits. Accuracy is ~1e-10 relative or
 * better across the domains the simulation uses, which is far tighter than any biological
 * quantity in the model, and the coefficients are exact rationals times powers of a
 * constant, so they are auditable by hand. Accuracy is not the point; agreement is.
 *
 * See docs/DETERMINISM.md.
 */

import { scaleByPowerOfTwo, splitExponent } from './bits.js'

/** ln(2), correctly rounded. */
const LN2 = 0.6931471805599453
/** log2(e), correctly rounded. */
const LOG2E = 1.4426950408889634
/** sqrt(2), correctly rounded. Used only as a branch point for mantissa centring. */
const SQRT2 = 1.4142135623730951

/** Coefficients of 2 ** f = sum_n (f ln2) ** n / n!, for |f| <= 0.5. */
const EXP2_C1 = 0.6931471805599453
const EXP2_C2 = 0.2402265069591007
const EXP2_C3 = 0.055504108664821576
const EXP2_C4 = 0.009618129107628477
const EXP2_C5 = 0.0013333558146428441
const EXP2_C6 = 0.00015403530393381606
const EXP2_C7 = 1.5252733804059838e-5
const EXP2_C8 = 1.3215486790144305e-6
const EXP2_C9 = 1.0178086009239696e-7
const EXP2_C10 = 7.054911620801121e-9
const EXP2_C11 = 4.44553827187081e-10
const EXP2_C12 = 2.5678435993488196e-11
const EXP2_C13 = 1.3691488853904124e-12

/** `2 ** x` for any real x. */
export function exp2(x: number): number {
  if (x !== x) return NaN
  if (x >= 1024) return Infinity
  if (x <= -1075) return 0

  // Split into an integer part, scaled exactly by bit manipulation, and a fraction in
  // [-0.5, 0.5] handled by the series.
  const k = Math.round(x)
  const f = x - k

  // Horner, evaluated from the smallest term upwards so the rounding error of each
  // addition lands on a term that is already negligible.
  let p = EXP2_C13
  p = EXP2_C12 + f * p
  p = EXP2_C11 + f * p
  p = EXP2_C10 + f * p
  p = EXP2_C9 + f * p
  p = EXP2_C8 + f * p
  p = EXP2_C7 + f * p
  p = EXP2_C6 + f * p
  p = EXP2_C5 + f * p
  p = EXP2_C4 + f * p
  p = EXP2_C3 + f * p
  p = EXP2_C2 + f * p
  p = EXP2_C1 + f * p
  p = 1 + f * p

  return scaleByPowerOfTwo(p, k)
}

/** `e ** x`. */
export function exp(x: number): number {
  return exp2(x * LOG2E)
}

/**
 * Natural logarithm. `x` must be positive; returns NaN for negatives and -Infinity for 0,
 * matching Math.log.
 */
export function ln(x: number): number {
  if (x !== x || x < 0) return NaN
  if (x === 0) return -Infinity
  if (x === Infinity) return Infinity

  let { mantissa: m, exponent: e } = splitExponent(x)

  // Centre the mantissa on 1 so the atanh series converges fastest: |s| <= 0.1716.
  if (m > SQRT2) {
    m *= 0.5
    e += 1
  }

  const s = (m - 1) / (m + 1)
  const s2 = s * s

  // ln(m) = 2 * (s + s**3/3 + s**5/5 + ...)
  // ln(m) = 2 * (s + s**3/3 + s**5/5 + ...), coefficients 2/(2k+1), Horner from the tail.
  let series = 0.09523809523809523
  series = 0.10526315789473684 + s2 * series
  series = 0.11764705882352941 + s2 * series
  series = 0.13333333333333333 + s2 * series
  series = 0.15384615384615385 + s2 * series
  series = 0.18181818181818182 + s2 * series
  series = 0.2222222222222222 + s2 * series
  series = 0.2857142857142857 + s2 * series
  series = 0.4 + s2 * series
  series = 0.6666666666666666 + s2 * series
  series = 2 + s2 * series
  series = s * series

  return e * LN2 + series
}

/** `x ** y` for finite positive `x`. This is the only form the simulation needs. */
export function pow(x: number, y: number): number {
  if (y === 0) return 1
  if (y === 1) return x
  if (x === 1) return 1
  if (x === 0) return y > 0 ? 0 : Infinity
  if (x < 0) return NaN
  return exp2(y * ln(x) * LOG2E)
}

/**
 * Converts a per-tick multiplicative decay constant into the equivalent constant for a
 * different interval. Used because pheromone diffusion and decay run on a sub-schedule
 * rather than every tick, and the two must agree. See docs/ARCHITECTURE.md.
 */
export function decayOverInterval(perTick: number, ticks: number): number {
  return pow(perTick, ticks)
}

/**
 * The per-tick multiplicative decay constant that reduces a signal to `residual` after
 * `lifetimeTicks` ticks. This is how the building pheromone's authored lifetime becomes a
 * decay constant, rather than the two being specified separately and disagreeing.
 * See docs/DECISIONS.md D6.
 */
export function decayFromLifetime(lifetimeTicks: number, residual = 0.01): number {
  if (lifetimeTicks <= 0) return 0
  return exp(ln(residual) / lifetimeTicks)
}
