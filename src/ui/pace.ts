/**
 * The time-lapse the simulator opens with.
 *
 * A reader who opens "Watch a colony" has come to see one start, so a day takes thirty seconds
 * while something can be seen happening: the queen digging, eggs being laid, a daughter
 * hatching, sand, seeds or brood being carried, a forager out on the ground. While nothing is,
 * it skips ahead, and it brakes back to thirty seconds a day as soon as something starts. The
 * founding is the case for it: about a week of digging and laying, then some seven weeks in
 * which the only change is brood growing in the dark.
 *
 * This decides only how many steps run each real second, never their size, so a colony watched
 * in time-lapse is the same colony, step for step, as the same seed run headless. The skip
 * speed, the hold and the wind-up are choices about watching, not about ants.
 */

import { Burden } from '../core/state/ants.js'
import type { Colony } from '../core/sim/colony.js'

/** Real seconds a simulated day takes while something is happening. */
export const WATCH_SECONDS_PER_DAY = 30

/** The fastest the time-lapse skips, in simulated days per real second. */
const SKIP_DAYS_PER_SECOND = 2

/**
 * Simulated hours it stays slow after the last thing happened. A founding queen removes a cell
 * every hour or two, so her digging reads as one stretch of work rather than a stutter.
 */
const HOLD_HOURS = 4

/** Real seconds the skip takes to wind up from a day in thirty seconds to full speed. */
const WIND_UP_SECONDS = 3

export class Timelapse {
  private rate = 1 / WATCH_SECONDS_PER_DAY
  private lastHappenedTick = 0
  private lastDug = -1
  private lastEggs = 0
  private lastFoundingEggs = 0
  private lastEclosed = 0
  private lastSeeds = 0

  /** Simulated days per real second from now, having looked at what changed since last frame. */
  update(colony: Colony, elapsedSeconds: number): number {
    const { clock } = colony.sim
    if (this.happening(colony)) this.lastHappenedTick = clock.tick

    const slow = 1 / WATCH_SECONDS_PER_DAY
    if (clock.tick - this.lastHappenedTick < (HOLD_HOURS / 24) * clock.ticksPerDay) {
      this.rate = slow
    } else {
      // Geometric, so the skip is felt as one smooth acceleration rather than a jump.
      const growth = Math.log(SKIP_DAYS_PER_SECOND / slow) / WIND_UP_SECONDS
      this.rate = Math.min(SKIP_DAYS_PER_SECOND, this.rate * Math.exp(growth * elapsedSeconds))
    }
    return this.rate
  }

  /** Stays slow for a while from now, for a moment worth seeing that is not itself busy. */
  hold(colony: Colony): void {
    this.lastHappenedTick = colony.sim.clock.tick
    this.rate = 1 / WATCH_SECONDS_PER_DAY
  }

  /** True while it is running faster than a day in thirty seconds. */
  get skipping(): boolean {
    return this.rate > 1.5 / WATCH_SECONDS_PER_DAY
  }

  private happening(colony: Colony): boolean {
    const { nest, demography, foraging, sim } = colony
    const eggs = demography.brood.eggCount
    const first = this.lastDug < 0
    const changed =
      nest.excavatedCells !== this.lastDug ||
      demography.foundingEggsLaid !== this.lastFoundingEggs ||
      eggs > this.lastEggs + 1e-6 ||
      demography.totalEclosed !== this.lastEclosed ||
      foraging.totalSeedsCollected !== this.lastSeeds
    this.lastDug = nest.excavatedCells
    this.lastFoundingEggs = demography.foundingEggsLaid
    this.lastEggs = eggs
    this.lastEclosed = demography.totalEclosed
    this.lastSeeds = foraging.totalSeedsCollected
    if (first || changed || foraging.antsOnSurface > 0) return true

    const { ants } = sim
    for (let i = 0; i < ants.count; i += 1) {
      if (ants.isAlive(i) && ants.burden[i] !== Burden.Nothing) return true
    }
    return false
  }
}
