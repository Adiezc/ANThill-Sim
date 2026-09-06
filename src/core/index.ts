/**
 * Public surface of the simulation core.
 *
 * Everything exported here must run unchanged in a browser Worker and in Node, with no
 * shim: no DOM, no Node built-ins, no wall clock, and no randomness but the injected
 * Prng. See docs/ARCHITECTURE.md and docs/DETERMINISM.md.
 */

export const CORE_VERSION = '0.1.0'

export { Prng } from './math/prng.js'
export { exp, exp2, ln, pow, decayOverInterval, decayFromLifetime } from './math/approx.js'
export {
  HEADING_STEPS,
  cosHeading,
  cosTurns,
  headingDelta,
  headingFromTurns,
  headingOf,
  sinHeading,
  sinTurns,
  turnsFromHeading,
} from './math/trig.js'
export { AntStore, Burden, Caste, Domain, Task } from './state/ants.js'
export type { BurdenValue, CasteValue, DomainValue, TaskValue } from './state/ants.js'
export { StateHasher, hashBuffers } from './state/hash.js'
export { Clock } from './sim/clock.js'
export type { CalendarDate } from './sim/clock.js'
