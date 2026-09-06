/**
 * The object that owns simulation state and advances it.
 *
 * It deliberately contains no biology. Mechanics are systems, registered in a fixed order
 * and run in that order every tick; this class owns the state they share, the clock, the
 * one PRNG, and the checkpointing that makes reproducibility auditable.
 *
 * Two properties are load-bearing and are asserted by test/determinism.spec.ts:
 *
 *   - System order is fixed at construction and never depends on anything but the order
 *     systems were registered. No iteration over a Set or a Map, no sorting by name.
 *   - Nothing outside a system may draw from the PRNG. The renderer, the UI and the
 *     inspector read state; they never advance it. A stray draw from a hover handler
 *     would desynchronise a run from its own headless replay.
 */

import { Prng } from '../math/prng.js'
import { AntStore } from '../state/ants.js'
import { StateHasher } from '../state/hash.js'
import { Clock } from './clock.js'
import type { Params } from '../params/params.js'

/**
 * A mechanic. Runs once per tick, in registration order, with the whole simulation in
 * hand. Systems mutate state and may draw from `sim.prng`; they must not hold state of
 * their own between ticks, or it would escape the digest and the save file.
 */
export type System = (sim: Simulation) => void

export interface SimulationOptions {
  readonly seed: number
  readonly params: Params
  /** Slots to allocate in the ant store. Not a biological quantity; a memory budget. */
  readonly capacity: number
  /** Day of year the run begins on, zero-based. A June flight is not a January one. */
  readonly startDayOfYear?: number
}

export class Simulation {
  readonly seed: number
  readonly params: Params
  readonly prng: Prng
  readonly clock: Clock
  readonly ants: AntStore

  private readonly systems: System[] = []
  private readonly systemNames: string[] = []

  constructor(options: SimulationOptions) {
    this.seed = options.seed
    this.params = options.params
    this.prng = new Prng(options.seed)
    this.clock = new Clock(options.params.time.secondsPerTick.value, options.startDayOfYear ?? 0)
    this.ants = new AntStore(options.capacity)
  }

  /**
   * Registers a mechanic. Order matters and is the order of these calls; it is part of the
   * model, not an implementation detail, so it is recorded and reported in the digest.
   */
  register(name: string, system: System): this {
    this.systems.push(system)
    this.systemNames.push(name)
    return this
  }

  /** The registered systems, in order. Surfaced so a run can report what it actually ran. */
  get pipeline(): readonly string[] {
    return this.systemNames
  }

  /** Advances exactly one fixed timestep. */
  step(): void {
    for (let i = 0; i < this.systems.length; i += 1) this.systems[i]!(this)
    this.clock.advance()
  }

  /** Advances `n` steps. Identical in every respect to calling `step` `n` times. */
  run(ticks: number): void {
    for (let i = 0; i < ticks; i += 1) this.step()
  }

  /**
   * A digest over the entire simulation state: the clock, the PRNG's internal position,
   * every ant buffer and the store's bookkeeping. Two runs are the same run if this agrees
   * at every checkpoint, not merely at the end, so a divergence is caught at the tick it
   * happens rather than a simulated year later. See docs/DETERMINISM.md.
   */
  digest(): string {
    const hasher = new StateHasher()
    hasher.absorb(this.clock.snapshot())
    hasher.absorb(this.prng.snapshot())
    hasher.absorb(this.ants.auxiliary())
    for (const buffer of this.ants.buffers()) hasher.absorb(buffer)
    return hasher.digest()
  }
}
