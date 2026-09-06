/**
 * Exact float64 bit manipulation.
 *
 * The transcendental approximations in this directory need to split a double into a
 * mantissa and a power of two, and to scale a double by an exact power of two. Both are
 * ordinarily done with Math.frexp / Math.ldexp equivalents built on Math.pow, which is
 * not bit-identical across engines. Doing it through the bit pattern is exact everywhere,
 * because IEEE 754 is exactly specified. See docs/DETERMINISM.md.
 */

const buffer = new ArrayBuffer(8)
const f64 = new Float64Array(buffer)
const u32 = new Uint32Array(buffer)

// Index of the word holding the sign and exponent. Determined at load time rather than
// assumed, so the module is correct on a big-endian host as well as a little-endian one.
const HI = (() => {
  f64[0] = 2
  return u32[1] === 0x40000000 ? 1 : 0
})()
const LO = HI === 1 ? 0 : 1

const EXPONENT_BIAS = 1023

/**
 * Splits `x` into a mantissa in [1, 2) and an integer exponent, such that
 * `mantissa * 2 ** exponent === x`. Exact. `x` must be finite, non-zero and positive.
 */
export function splitExponent(x: number): { mantissa: number; exponent: number } {
  f64[0] = x
  const hi = u32[HI]!
  let biased = (hi >>> 20) & 0x7ff

  if (biased === 0) {
    // Subnormal. Scale into the normal range by an exact power of two, then correct.
    const scaled = splitExponent(x * 18014398509481984) // 2 ** 54
    return { mantissa: scaled.mantissa, exponent: scaled.exponent - 54 }
  }

  // Replace the exponent field with the bias, leaving a value in [1, 2).
  u32[HI] = (hi & 0x800fffff) | (EXPONENT_BIAS << 20)
  const mantissa = f64[0]
  biased -= EXPONENT_BIAS
  return { mantissa, exponent: biased }
}

/** `x * 2 ** n`, computed exactly for any integer `n`. */
export function scaleByPowerOfTwo(x: number, n: number): number {
  if (x === 0 || !isFinite(x)) return x
  if (n > 1023) {
    // Split the scaling so the intermediate does not overflow before the result does.
    return scaleByPowerOfTwo(scaleByPowerOfTwo(x, 1023), n - 1023)
  }
  if (n < -1022) {
    return scaleByPowerOfTwo(scaleByPowerOfTwo(x, -1022), n + 1022)
  }
  u32[HI] = (EXPONENT_BIAS + n) << 20
  u32[LO] = 0
  return x * f64[0]!
}
