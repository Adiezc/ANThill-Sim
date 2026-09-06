/**
 * Deterministic trigonometry, expressed in turns rather than radians.
 *
 * Angles in the simulation are headings, and a heading is naturally a fraction of a full
 * turn. Working in turns removes pi from the argument reduction entirely, which is where
 * a naive implementation loses its last bits, and it makes the quantisation of ant
 * headings exact rather than approximate.
 *
 * `sinTurns(0.25) === 1` exactly. `cosTurns(0.5) === -1` exactly.
 *
 * A lookup table is built once at module load from the series below. The table is not
 * committed as data because it is cheaper and more auditable to derive it from seven
 * coefficients than to review 4096 literals, and because the derivation uses nothing but
 * IEEE 754 arithmetic it is bit-identical on every engine. See docs/DETERMINISM.md.
 */

/** Coefficients of sin(pi x / 2) = sum_k (-1)**k (pi/2)**(2k+1) x**(2k+1) / (2k+1)!. */
const S1 = 1.5707963267948966
const S3 = -0.6459640975062462
const S5 = 0.07969262624616703
const S7 = -0.004681754135318687
const S9 = 0.00016044118478735975
const S11 = -3.598843235212084e-6
const S13 = 5.692172921967924e-8
const S15 = -6.688035109811464e-10
const S17 = 6.066935731106192e-12
const S19 = -4.377065467313739e-14

/** `sin(pi * x / 2)` for x in [-1, 1]. */
function sinQuarterTurn(x: number): number {
  const x2 = x * x
  let p = S19
  p = S17 + x2 * p
  p = S15 + x2 * p
  p = S13 + x2 * p
  p = S11 + x2 * p
  p = S9 + x2 * p
  p = S7 + x2 * p
  p = S5 + x2 * p
  p = S3 + x2 * p
  p = S1 + x2 * p
  return x * p
}

/**
 * Sine of an angle given in turns. One turn is a full revolution, so `t = 0.25` is a
 * quarter turn. Exact at the four cardinal directions.
 */
export function sinTurns(t: number): number {
  // Reduce to [0, 1). The subtraction is exact for the magnitudes the simulation uses.
  let r = t - Math.floor(t)

  // Fold into the first quadrant, tracking the sign, so the series is only ever
  // evaluated on [0, 1] where it is most accurate.
  let sign = 1
  if (r >= 0.5) {
    r -= 0.5
    sign = -1
  }
  if (r > 0.25) r = 0.5 - r

  // The cardinal directions are pinned rather than left to the series. Shafts, chamber
  // floors and grid-aligned movement all land exactly on them, and a heading that is
  // meant to be straight down should not drift sideways by 1e-11 per tick.
  if (r === 0) return 0
  if (r === 0.25) return sign

  return sign * sinQuarterTurn(r * 4)
}

/** Cosine of an angle given in turns. Exact at the four cardinal directions. */
export function cosTurns(t: number): number {
  return sinTurns(t + 0.25)
}

/**
 * Number of distinct headings an ant can hold. Headings are quantised, which is both what
 * makes the lookup table the natural representation and what keeps heading arithmetic
 * exact. A power of two so that wrapping is a mask.
 */
/** Degrees in a full turn. A unit conversion, not a parameter. */
export const DEGREES_PER_TURN = 360

export const HEADING_STEPS = 4096
const HEADING_MASK = HEADING_STEPS - 1

const SIN_TABLE = new Float64Array(HEADING_STEPS)
const COS_TABLE = new Float64Array(HEADING_STEPS)
for (let i = 0; i < HEADING_STEPS; i += 1) {
  const t = i / HEADING_STEPS
  SIN_TABLE[i] = sinTurns(t)
  COS_TABLE[i] = cosTurns(t)
}

/** Sine of a quantised heading. `heading` is wrapped, so any integer is valid. */
export function sinHeading(heading: number): number {
  return SIN_TABLE[heading & HEADING_MASK]!
}

/** Cosine of a quantised heading. `heading` is wrapped, so any integer is valid. */
export function cosHeading(heading: number): number {
  return COS_TABLE[heading & HEADING_MASK]!
}

/** Converts turns to the nearest quantised heading. */
export function headingFromTurns(t: number): number {
  return Math.round(t * HEADING_STEPS) & HEADING_MASK
}

/** Converts a quantised heading back to turns in [0, 1). */
export function turnsFromHeading(heading: number): number {
  return (heading & HEADING_MASK) / HEADING_STEPS
}

/**
 * Smallest signed difference between two quantised headings, in heading steps, in
 * (-HEADING_STEPS/2, HEADING_STEPS/2]. Used wherever an ant turns towards something.
 */
export function headingDelta(from: number, to: number): number {
  const d = (to - from) & HEADING_MASK
  return d > HEADING_STEPS / 2 ? d - HEADING_STEPS : d
}

/**
 * Quantised heading of the vector (dx, dy), measured in turns anticlockwise from +x.
 * Replaces Math.atan2, which is not bit-identical across engines.
 */
export function headingOf(dx: number, dy: number): number {
  if (dx === 0 && dy === 0) return 0

  // Octant reduction, then a series for atan on [0, 1], expressed in turns.
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  const swapped = ay > ax
  const ratio = swapped ? ax / ay : ay / ax

  let turns = atanTurns(ratio)
  if (swapped) turns = 0.25 - turns
  if (dx < 0) turns = 0.5 - turns
  if (dy < 0) turns = -turns

  return headingFromTurns(turns)
}

/** `atan(x) / (2 pi)` for x in [0, 1], to about 1e-9. */
function atanTurns(x: number): number {
  // atan(x) = x - x**3/3 + x**5/5 - ... converges too slowly near 1, so halve the angle
  // twice using atan(x) = 2 atan(x / (1 + sqrt(1 + x**2))) before applying the series.
  let y = x / (1 + Math.sqrt(1 + x * x))
  y = y / (1 + Math.sqrt(1 + y * y))
  const y2 = y * y
  const atan =
    y *
    (1 -
      y2 *
        (0.3333333333333333 -
          y2 *
            (0.2 -
              y2 * (0.14285714285714285 - y2 * (0.1111111111111111 - y2 * 0.09090909090909091)))))
  return (4 * atan) / 6.283185307179586
}
