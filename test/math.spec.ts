import { describe, expect, it } from 'vitest'
import {
  decayFromLifetime,
  decayOverInterval,
  exp,
  exp2,
  ln,
  pow,
} from '../src/core/math/approx.js'
import {
  HEADING_STEPS,
  cosTurns,
  headingDelta,
  headingFromTurns,
  headingOf,
  sinHeading,
  sinTurns,
} from '../src/core/math/trig.js'
import { scaleByPowerOfTwo, splitExponent } from '../src/core/math/bits.js'

/**
 * Two things are being asserted here, and only one of them is accuracy.
 *
 * The first is that these functions are close enough to the truth for a simulation whose
 * biological inputs are quoted to two significant figures. The tolerances below are far
 * tighter than that, deliberately.
 *
 * The second, and the reason the module exists, is that they AGREE — that the same input
 * gives the same bits in Chrome, in Firefox and in Node, which Math.exp and friends do
 * not guarantee. Agreement is pinned by the golden values at the end of this file. If a
 * golden value changes, reproducibility has been broken for everyone who has already run
 * the model, and that is not a test to relax casually.
 */

const RELATIVE = (actual: number, expected: number): number =>
  expected === 0 ? Math.abs(actual) : Math.abs((actual - expected) / expected)

describe('bit manipulation', () => {
  it('splits and reassembles exactly', () => {
    for (const x of [1, 2, 3, 0.5, 1e-300, 1e300, 1.7976931348623157e308, 5e-324, Math.PI]) {
      const { mantissa, exponent } = splitExponent(x)
      expect(mantissa).toBeGreaterThanOrEqual(1)
      expect(mantissa).toBeLessThan(2)
      expect(scaleByPowerOfTwo(mantissa, exponent)).toBe(x)
    }
  })

  it('scales by powers of two without rounding', () => {
    expect(scaleByPowerOfTwo(1, 0)).toBe(1)
    expect(scaleByPowerOfTwo(3, 10)).toBe(3072)
    expect(scaleByPowerOfTwo(1, -1074)).toBe(5e-324)
    expect(scaleByPowerOfTwo(1, 1024)).toBe(Infinity)
  })
})

describe('exp and ln', () => {
  it('matches the host Math to within 1e-12 relative', () => {
    for (let x = -40; x <= 40; x += 0.25) {
      expect(RELATIVE(exp(x), Math.exp(x))).toBeLessThan(1e-12)
    }
  })

  it('matches the host Math.log to within 1e-12 relative', () => {
    for (const x of [1e-8, 1e-3, 0.1, 0.5, 0.9, 1, 1.5, 2, 10, 1000, 1e8]) {
      expect(RELATIVE(ln(x), Math.log(x))).toBeLessThan(1e-12)
    }
  })

  it('is exact where it should be', () => {
    expect(exp2(0)).toBe(1)
    expect(exp2(10)).toBe(1024)
    expect(exp2(-1)).toBe(0.5)
    expect(ln(1)).toBe(0)
    expect(pow(2, 10)).toBeCloseTo(1024, 9)
    expect(pow(5, 0)).toBe(1)
    expect(pow(5, 1)).toBe(5)
  })

  it('matches the host Math.pow to within 1e-13 relative', () => {
    for (const base of [0.9, 0.995, 0.999, 1.5, 2, 7]) {
      for (const e of [0.5, 2, 10, 100, 600, 5000]) {
        const expected = Math.pow(base, e)
        // Overflow and underflow agree trivially and say nothing about the series.
        if (!Number.isFinite(expected) || expected === 0) continue
        expect(RELATIVE(pow(base, e), expected)).toBeLessThan(1e-13)
      }
    }
  })

  it('round-trips exp and ln', () => {
    for (let x = 0.01; x < 100; x *= 1.7) {
      expect(RELATIVE(exp(ln(x)), x)).toBeLessThan(1e-12)
    }
  })
})

describe('decay helpers', () => {
  it('agrees with repeated multiplication', () => {
    const perTick = 0.995
    let byMultiplication = 1
    for (let i = 0; i < 10; i += 1) byMultiplication *= perTick
    expect(RELATIVE(decayOverInterval(perTick, 10), byMultiplication)).toBeLessThan(1e-12)
  })

  it('derives a lifetime decay constant that reaches the residual on time', () => {
    // This is how the building pheromone's authored lifetime becomes a decay constant
    // rather than the two being specified separately and disagreeing. DECISIONS.md D6.
    const lifetime = 600
    const k = decayFromLifetime(lifetime, 0.01)
    expect(RELATIVE(decayOverInterval(k, lifetime), 0.01)).toBeLessThan(1e-9)
  })
})

describe('trigonometry in turns', () => {
  it('is exact at the cardinal directions', () => {
    expect(sinTurns(0)).toBe(0)
    expect(sinTurns(0.25)).toBe(1)
    expect(sinTurns(0.5)).toBe(0)
    expect(sinTurns(0.75)).toBe(-1)
    expect(cosTurns(0)).toBe(1)
    expect(cosTurns(0.25)).toBe(0)
    expect(cosTurns(0.5)).toBe(-1)
    expect(cosTurns(0.75)).toBe(0)
  })

  it('matches the host Math.sin to within 1e-11', () => {
    for (let i = 0; i < 2000; i += 1) {
      const t = i / 2000
      expect(Math.abs(sinTurns(t) - Math.sin(t * 2 * Math.PI))).toBeLessThan(1e-11)
    }
  })

  it('wraps over many turns without drift', () => {
    for (const t of [-3.25, -1.25, 0.75, 5.75, 1000.25]) {
      expect(Math.abs(sinTurns(t) - sinTurns(t - Math.floor(t)))).toBe(0)
    }
  })

  it('recovers a heading from a vector', () => {
    expect(headingOf(1, 0)).toBe(0)
    expect(headingOf(0, 1)).toBe(HEADING_STEPS / 4)
    expect(headingOf(-1, 0)).toBe(HEADING_STEPS / 2)
    expect(headingOf(0, -1)).toBe((3 * HEADING_STEPS) / 4)
    for (let i = 0; i < HEADING_STEPS; i += 37) {
      const recovered = headingOf(
        Math.cos((i / HEADING_STEPS) * 2 * Math.PI),
        Math.sin((i / HEADING_STEPS) * 2 * Math.PI),
      )
      expect(Math.abs(headingDelta(i, recovered))).toBeLessThanOrEqual(1)
    }
  })

  it('takes the short way round', () => {
    expect(headingDelta(0, 10)).toBe(10)
    expect(headingDelta(10, 0)).toBe(-10)
    expect(headingDelta(0, HEADING_STEPS - 1)).toBe(-1)
    expect(headingDelta(HEADING_STEPS - 1, 0)).toBe(1)
  })

  it('agrees between the table and the series', () => {
    for (let i = 0; i < HEADING_STEPS; i += 1) {
      expect(sinHeading(i)).toBe(sinTurns(i / HEADING_STEPS))
    }
    expect(headingFromTurns(0.5)).toBe(HEADING_STEPS / 2)
  })
})

describe('golden values', () => {
  /**
   * These pin the exact bits. They are not here to check accuracy — the tests above do
   * that — but to detect the day someone "optimises" a coefficient and silently
   * invalidates every run anyone has published. Regenerate deliberately, never casually,
   * and say so in the pull request. See docs/DETERMINISM.md.
   */
  it('produces the committed bit patterns', () => {
    expect(exp(1)).toBe(2.718281828459045)
    expect(exp(-10)).toBe(0.000045399929762484834)
    expect(ln(10)).toBe(2.3025850929940455)
    expect(pow(0.995, 600)).toBe(0.04941382211003863)
    expect(sinTurns(0.1)).toBe(0.5877852522924731)
    expect(cosTurns(0.1)).toBe(0.8090169943749475)
  })
})
