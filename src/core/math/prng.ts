import { ln } from './approx.js'

/**
 * The simulation's only source of randomness.
 *
 * xoshiro128** over four 32-bit words, seeded through splitmix32. Every operation is
 * 32-bit integer arithmetic via `Math.imul`, `>>>` and `^`, all of which are exactly
 * specified by ECMA-262, so the stream is bit-identical on every engine. There is no
 * reliance on `Math.random`, on the host clock, or on anything the caller has not
 * supplied.
 *
 * One instance is constructed per run from the run seed and passed explicitly into every
 * system that needs it. Adding a new consumer changes the whole downstream stream and
 * will fail the determinism test; that is the test working. See docs/DETERMINISM.md.
 */
export class Prng {
  private s0 = 0
  private s1 = 0
  private s2 = 0
  private s3 = 0

  constructor(seed: number) {
    // splitmix32 expansion, so that adjacent seeds produce well-separated streams rather
    // than correlated ones. A user typing 1, 2, 3 should get three unrelated colonies.
    let z = seed >>> 0
    const next = (): number => {
      z = (z + 0x9e3779b9) >>> 0
      let t = z
      t = Math.imul(t ^ (t >>> 16), 0x21f0aaad) >>> 0
      t = Math.imul(t ^ (t >>> 15), 0x735a2d97) >>> 0
      return (t ^ (t >>> 15)) >>> 0
    }
    this.s0 = next()
    this.s1 = next()
    this.s2 = next()
    this.s3 = next()

    // An all-zero state is a fixed point of xoshiro and must not occur.
    if ((this.s0 | this.s1 | this.s2 | this.s3) === 0) this.s0 = 0x9e3779b9
  }

  /** Uniform 32-bit unsigned integer. */
  nextUint32(): number {
    const result = (Math.imul(rotl(Math.imul(this.s1, 5) >>> 0, 7) >>> 0, 9) >>> 0) >>> 0
    const t = (this.s1 << 9) >>> 0

    this.s2 = (this.s2 ^ this.s0) >>> 0
    this.s3 = (this.s3 ^ this.s1) >>> 0
    this.s1 = (this.s1 ^ this.s2) >>> 0
    this.s0 = (this.s0 ^ this.s3) >>> 0
    this.s2 = (this.s2 ^ t) >>> 0
    this.s3 = rotl(this.s3, 11) >>> 0

    return result
  }

  /** Uniform in [0, 1). 24 bits of mantissa, which is ample and exactly representable. */
  nextFloat(): number {
    return (this.nextUint32() >>> 8) / 16777216
  }

  /** Uniform in [min, max). */
  nextRange(min: number, max: number): number {
    return min + this.nextFloat() * (max - min)
  }

  /**
   * Uniform integer in [0, bound). Rejection-sampled rather than taken modulo, so the
   * distribution is exactly uniform and the number of draws consumed is deterministic
   * given the stream.
   */
  nextInt(bound: number): number {
    if (bound <= 1) return 0
    const limit = 0x100000000 - (0x100000000 % bound)
    let r = this.nextUint32()
    while (r >= limit) r = this.nextUint32()
    return r % bound
  }

  /** True with probability `p`. */
  chance(p: number): boolean {
    return this.nextFloat() < p
  }

  /**
   * A draw from the standard normal, by the Marsaglia polar method. Both variates are
   * produced but only one is returned; the spare is deliberately discarded rather than
   * cached, because a cache would make the number of stream draws depend on call history
   * and so on which systems ran earlier.
   */
  nextNormal(): number {
    let u = 0
    let v = 0
    let s = 0
    do {
      u = this.nextFloat() * 2 - 1
      v = this.nextFloat() * 2 - 1
      s = u * u + v * v
    } while (s >= 1 || s === 0)
    return u * Math.sqrt((-2 * ln(s)) / s)
  }

  /** The internal state, for serialisation and hashing. */
  snapshot(): Uint32Array {
    return Uint32Array.of(this.s0, this.s1, this.s2, this.s3)
  }

  /** Restores a state produced by `snapshot`. */
  restore(state: Uint32Array): void {
    this.s0 = state[0]! >>> 0
    this.s1 = state[1]! >>> 0
    this.s2 = state[2]! >>> 0
    this.s3 = state[3]! >>> 0
  }
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0
}
