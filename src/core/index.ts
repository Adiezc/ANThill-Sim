/**
 * Public surface of the simulation core.
 *
 * Everything exported here must run unchanged in a browser Worker and in Node, with no
 * shim: no DOM, no Node built-ins, no wall clock, and no randomness but the injected
 * Prng. See docs/ARCHITECTURE.md and docs/DETERMINISM.md.
 */

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
export { Simulation } from './sim/simulation.js'
export type { System, SimulationOptions } from './sim/simulation.js'
export type { CalendarDate } from './sim/clock.js'
export * from './params/index.js'
export * from './provenance/index.js'
export { Grid2D } from './state/grid.js'
export type { GridBounds } from './state/grid.js'
export { NestGrid, measureNest, SOIL, VOID } from './state/nest.js'
export type { NestMeasurement } from './state/nest.js'
export { SoilModel, dampingDepthCm } from './systems/soil.js'
export { ClimateModel } from './systems/climate.js'
export type { Weather } from './systems/climate.js'
export { makeExcavationSystem, assignDiggerTrait, isDigging } from './systems/excavation.js'
export type { ExcavationState } from './systems/excavation.js'
export { SurfaceGrid } from './state/surface.js'
export {
  createForagingState,
  makeForagingSystem,
  meanTripTicks,
  surfaceIsForageable,
} from './systems/foraging.js'
export type { ForagingState } from './systems/foraging.js'
export { createNestHarness } from './sim/nest-harness.js'
export type { NestHarness, HarnessOptions } from './sim/nest-harness.js'
export { BroodStore, BroodFate } from './state/brood.js'
export type { BroodFateValue } from './state/brood.js'
export {
  makeDemographySystem,
  createDemographyState,
  countWorkers,
  countForagers,
  BroodInvestment,
} from './systems/demography.js'
export type { DemographyState, ColonyPhase, BroodInvestmentValue } from './systems/demography.js'
export { Colony } from './sim/colony.js'
export type { ColonyOptions, ColonySummary } from './sim/colony.js'
