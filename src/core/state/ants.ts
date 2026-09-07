/**
 * Ant state, as struct-of-arrays typed arrays.
 *
 * Not objects. The colony reaches several thousand individuals and every one of them is
 * touched every tick, so this is partly about cache behaviour, but it is mostly about
 * what it makes free: serialisation, hashing, save/load and headless output are all just
 * the underlying buffers, and the determinism guarantee reduces to iterating by index.
 *
 * Nothing here knows any biology. Castes and tasks are enumerated because the species has
 * them; every rate, threshold and duration attached to them lives in the parameter file.
 */

import { HEADING_STEPS } from '../math/trig.js'

/**
 * Which of the two spatial domains an ant currently occupies. There is no third
 * coordinate and no 3D model behind these; they are two 2D projections that meet at the
 * nest entrance. See docs/DECISIONS.md D1.
 */
export const Domain = {
  /** Plan view, metres, above ground: trails, foraging range, relocation. */
  Surface: 0,
  /** Vertical slice, centimetres, below ground: shafts, chambers, brood, seed stores. */
  Nest: 1,
} as const
export type DomainValue = (typeof Domain)[keyof typeof Domain]

/**
 * Caste is fixed at eclosion and never changes. There is deliberately no soldier or
 * warrior value: *P. badius* has no defensive caste, and majors are seed-crackers.
 * See docs/SCIENCE.md section 11.
 */
export const Caste = {
  Queen: 0,
  Alate: 1,
  Male: 2,
  MinorWorker: 3,
  MajorWorker: 4,
  /** A newly eclosed adult, not yet pigmented or working. */
  Callow: 5,
} as const
export type CasteValue = (typeof Caste)[keyof typeof Caste]

/**
 * Task is distinct from caste and follows the one-way age progression: workers eclose
 * deep, nurse, become transfer workers, migrate upward, then forage until they die.
 *
 * HARD RULE: this progression never runs backwards. Foragers do not revert to inside
 * work, and no task is ever backfilled from another caste in response to a shortage.
 * Both were tested in this species and rejected (Kwapich & Tschinkel 2013, 2016).
 * See docs/SCIENCE.md section 4.
 */
export const Task = {
  None: 0,
  BroodCare: 1,
  Transfer: 2,
  Excavator: 3,
  Forager: 4,
} as const
export type TaskValue = (typeof Task)[keyof typeof Task]

/** What an ant is carrying. Burden priority during relocation is a parameter, not a rule here. */
export const Burden = {
  Nothing: 0,
  SoilPellet: 1,
  Seed: 2,
  Brood: 3,
  Charcoal: 4,
  Corpse: 5,
} as const
export type BurdenValue = (typeof Burden)[keyof typeof Burden]

/** Slots are reused after death, so an id alone does not identify an individual. */
export const ALIVE = 1
export const DEAD = 0

export class AntStore {
  /** Number of slots allocated, alive or not. */
  capacity: number
  /** Highest slot index ever used. Iteration runs [0, count), not [0, capacity). */
  count = 0
  /** Monotonic id counter. Never reused, so a tracked ant cannot be silently swapped. */
  private nextId = 1

  readonly id: Uint32Array
  readonly alive: Uint8Array

  /** Domain-local coordinates. Metres on the surface, centimetres in the nest. */
  readonly x: Float32Array
  readonly y: Float32Array
  readonly domain: Uint8Array

  /** Quantised heading in [0, HEADING_STEPS). See math/trig.ts. */
  readonly heading: Uint16Array

  readonly caste: Uint8Array
  readonly task: Uint8Array
  readonly burden: Uint8Array

  /** Age in ticks. Uint32 holds ~8000 simulated years at one minute per tick. */
  readonly ageTicks: Uint32Array
  /** Ticks since this ant first foraged. Zero for an ant that never has. */
  readonly foragingTicks: Uint32Array
  /** General-purpose countdown used by whichever behaviour currently owns the ant. */
  readonly timer: Uint32Array

  /** Fat as a fraction of body mass. Drives the transition to foraging. */
  readonly fat: Float32Array
  /** Body length in millimetres. Set from the parameter file at eclosion. */
  readonly lengthMm: Float32Array

  /** Homing vector held by path integration, in domain-local units. */
  readonly homeVecX: Float32Array
  readonly homeVecY: Float32Array

  /**
   * Where this forager last found something, in surface metres, or (0, 0) for never.
   *
   * A forager returns to within about half a metre of its previous site on successive
   * trips, so the site is remembered as a position rather than as a direction: a
   * remembered patch stays where it is when the ant does not. The entrance is the origin,
   * so (0, 0) is unambiguous as "no memory" — no ant ever forages at the entrance itself.
   */
  readonly fidelityX: Float32Array
  readonly fidelityY: Float32Array

  /**
   * This individual's persistent digging propensity, 0 to 255, drawn once at eclosion.
   *
   * It reconciles two things Tschinkel 2004 reports together. "A worker either digs
   * consistently or does not dig at all" — so this cannot be re-rolled, and it is not.
   * But participation also differs sharply by age: 82 percent of old workers came to the
   * surface carrying sand against 19 percent of young ones. So an ant digs when its fixed
   * propensity falls under the participation rate for its age band, which means an
   * individual can begin digging as it ages but never flips back and forth, and the
   * population proportions come out at the measured values.
   *
   * HARD RULE, and `excavation.diggingIsAPersistentTrait` records it.
   * See docs/SCIENCE.md section 3.
   */
  readonly digger: Uint8Array

  /**
   * Recent collisions with nestmates, decayed each tick. This is the only thing regulating
   * an ant's digging effort; there is no global control. See docs/SCIENCE.md section 3.
   */
  readonly agitation: Float32Array

  /**
   * Turns of the shaft helix this ant has traversed, which is what makes a shaft a helix.
   * An excavator turns steadily as it descends, so the spiral is a property of the digger
   * rather than of a plan. Projected into the vertical slice it becomes the zigzag.
   */
  readonly helixPhase: Float32Array

  /**
   * Distance in centimetres from this ant's dig face back to open space, used for the
   * feedback that makes ants dig less in a tunnel that is already long.
   */
  readonly tunnelLengthCm: Float32Array

  /**
   * Centimetres this ant has carried its current burden. Sand moves up through the nest in
   * stages rather than one ant hauling it from the face to the surface, so a carrier puts
   * its pellet down after a short leg and someone else takes it on.
   */
  readonly carriedCm: Float32Array

  /**
   * Id of the rule the ant is currently following, for the inspector's citation line.
   * See core/provenance. This is the entire educational payload of the project, so it is
   * first-class state rather than a debug field.
   */
  readonly ruleId: Uint16Array

  /** Free slots, newest first. Reusing slots keeps `count` from growing without bound. */
  private freeList: number[] = []

  constructor(capacity: number) {
    this.capacity = capacity
    this.id = new Uint32Array(capacity)
    this.alive = new Uint8Array(capacity)
    this.x = new Float32Array(capacity)
    this.y = new Float32Array(capacity)
    this.domain = new Uint8Array(capacity)
    this.heading = new Uint16Array(capacity)
    this.caste = new Uint8Array(capacity)
    this.task = new Uint8Array(capacity)
    this.burden = new Uint8Array(capacity)
    this.ageTicks = new Uint32Array(capacity)
    this.foragingTicks = new Uint32Array(capacity)
    this.timer = new Uint32Array(capacity)
    this.fat = new Float32Array(capacity)
    this.lengthMm = new Float32Array(capacity)
    this.homeVecX = new Float32Array(capacity)
    this.homeVecY = new Float32Array(capacity)
    this.fidelityX = new Float32Array(capacity)
    this.fidelityY = new Float32Array(capacity)
    this.digger = new Uint8Array(capacity)
    this.agitation = new Float32Array(capacity)
    this.helixPhase = new Float32Array(capacity)
    this.tunnelLengthCm = new Float32Array(capacity)
    this.carriedCm = new Float32Array(capacity)
    this.ruleId = new Uint16Array(capacity)
  }

  /**
   * Allocates a slot. Returns -1 when the store is full rather than growing, because
   * growing would reallocate every buffer mid-tick; the caller decides.
   */
  spawn(caste: CasteValue, domain: DomainValue): number {
    // Free slots are taken newest-first from an array, never from a Set or a Map, so the
    // order is a property of the simulation rather than of the host's hashing.
    const slot = this.freeList.length > 0 ? this.freeList.pop()! : this.count
    if (slot >= this.capacity) return -1
    if (slot === this.count) this.count += 1

    this.id[slot] = this.nextId
    this.nextId += 1
    this.alive[slot] = ALIVE
    this.x[slot] = 0
    this.y[slot] = 0
    this.domain[slot] = domain
    this.heading[slot] = 0
    this.caste[slot] = caste
    this.task[slot] = Task.None
    this.burden[slot] = Burden.Nothing
    this.ageTicks[slot] = 0
    this.foragingTicks[slot] = 0
    this.timer[slot] = 0
    this.fat[slot] = 0
    this.lengthMm[slot] = 0
    this.homeVecX[slot] = 0
    this.homeVecY[slot] = 0
    this.fidelityX[slot] = 0
    this.fidelityY[slot] = 0
    this.digger[slot] = 0
    this.agitation[slot] = 0
    this.helixPhase[slot] = 0
    this.tunnelLengthCm[slot] = 0
    this.carriedCm[slot] = 0
    this.ruleId[slot] = 0
    return slot
  }

  kill(slot: number): void {
    if (this.alive[slot] !== ALIVE) return
    this.alive[slot] = DEAD
    this.freeList.push(slot)
  }

  isAlive(slot: number): boolean {
    return this.alive[slot] === ALIVE
  }

  /**
   * Advances a heading by a signed number of steps, wrapping. Kept here rather than at
   * each call site so that heading arithmetic is exact and identical everywhere.
   */
  turn(slot: number, steps: number): void {
    this.heading[slot] = (this.heading[slot]! + steps) & (HEADING_STEPS - 1)
  }

  /** Every buffer, in a fixed order, for serialisation and hashing. */
  buffers(): ArrayBufferView[] {
    return [
      this.id,
      this.alive,
      this.x,
      this.y,
      this.domain,
      this.heading,
      this.caste,
      this.task,
      this.burden,
      this.ageTicks,
      this.foragingTicks,
      this.timer,
      this.fat,
      this.lengthMm,
      this.homeVecX,
      this.homeVecY,
      this.fidelityX,
      this.fidelityY,
      this.digger,
      this.agitation,
      this.helixPhase,
      this.tunnelLengthCm,
      this.carriedCm,
      this.ruleId,
    ]
  }

  /** Free-list and id counter, which are state but are not typed arrays. */
  auxiliary(): Uint32Array {
    return Uint32Array.of(this.count, this.nextId, this.freeList.length, ...this.freeList)
  }
}
