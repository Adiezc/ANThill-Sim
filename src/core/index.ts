/**
 * Public surface of the simulation core.
 *
 * Everything exported here must run unchanged in a browser Worker and in Node, with no
 * shim: no DOM, no Node built-ins, no wall clock, and no randomness but the injected
 * Prng. See docs/ARCHITECTURE.md and docs/DETERMINISM.md.
 */

export const CORE_VERSION = '0.1.0'
