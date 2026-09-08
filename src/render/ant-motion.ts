/**
 * Smoothed positions for drawing ants, and the direction each one is facing.
 *
 * The simulation moves an ant one grid cell at a time on a fixed timestep, and at one
 * simulated day per minute that is a step every second or so. Drawn literally, a nest is a
 * still photograph that twitches. This holds a second, purely visual position per ant that
 * chases the simulated one, so an ant *walks* between the cells the model puts it in.
 *
 * **Nothing here is state.** It is not hashed, it is not saved, the headless runner never
 * constructs it, and no system reads it. If it were deleted the model would produce exactly
 * the same run. That is the line this file must stay on the right side of: the simulation
 * decides where an ant is, and this decides only how the picture gets there.
 */

import { Domain } from '../core/state/ants.js'
import type { AntStore } from '../core/state/ants.js'

/** How quickly the drawn position catches up, as a fraction of the gap per second. */
const CATCH_UP_PER_SECOND = 12

/** Below this movement, in domain units per second, an ant keeps the facing it had. */
const FACING_EPSILON = 1e-4

export class AntMotion {
  private readonly x: Float32Array
  private readonly y: Float32Array
  /** Unit vector of travel, for drawing an ant facing the way it is going. */
  private readonly faceX: Float32Array
  private readonly faceY: Float32Array
  private readonly seen: Uint8Array
  /** The id in each slot last frame, so a reused slot does not inherit a stale position. */
  private readonly id: Uint32Array

  constructor(capacity: number) {
    this.x = new Float32Array(capacity)
    this.y = new Float32Array(capacity)
    this.faceX = new Float32Array(capacity)
    this.faceY = new Float32Array(capacity)
    this.seen = new Uint8Array(capacity)
    this.id = new Uint32Array(capacity)
    this.faceX.fill(1)
  }

  /** Advances every drawn position toward where the simulation says the ant now is. */
  update(ants: AntStore, elapsedSeconds: number): void {
    // Framerate-independent easing: the same fraction of the remaining gap per unit of real
    // time, whatever the frame rate, so a slow frame does not make the ants lurch.
    const k = 1 - Math.exp(-CATCH_UP_PER_SECOND * Math.min(0.25, Math.max(0, elapsedSeconds)))

    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i)) {
        this.seen[i] = 0
        continue
      }
      const targetX = ants.x[i]!
      const targetY = ants.y[i]!

      // A new ant, a slot that has been reused, or one that has just changed domain — the
      // surface and the nest are different coordinate systems and easing between them would
      // send an ant flying across the picture.
      if (this.seen[i] === 0 || this.id[i] !== ants.id[i]!) {
        this.x[i] = targetX
        this.y[i] = targetY
        this.faceX[i] = 1
        this.faceY[i] = 0
        this.seen[i] = 1
        this.id[i] = ants.id[i]!
        continue
      }

      const dx = (targetX - this.x[i]!) * k
      const dy = (targetY - this.y[i]!) * k

      // A jump larger than an ant could walk is a teleport — leaving or entering the nest,
      // or being placed by the demographic engine. Snap rather than glide.
      const jump = Math.abs(targetX - this.x[i]!) + Math.abs(targetY - this.y[i]!)
      const limit = ants.domain[i] === Domain.Surface ? 2 : 12
      if (jump > limit) {
        this.x[i] = targetX
        this.y[i] = targetY
        continue
      }

      this.x[i] = this.x[i]! + dx
      this.y[i] = this.y[i]! + dy

      const speed = Math.hypot(dx, dy)
      if (speed > FACING_EPSILON) {
        this.faceX[i] = dx / speed
        this.faceY[i] = dy / speed
      }
    }
  }

  drawnX(slot: number): number {
    return this.x[slot]!
  }

  drawnY(slot: number): number {
    return this.y[slot]!
  }

  facingX(slot: number): number {
    return this.faceX[slot]!
  }

  facingY(slot: number): number {
    return this.faceY[slot]!
  }
}
