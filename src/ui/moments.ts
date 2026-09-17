/**
 * Moments worth watching, and where to look for them.
 *
 * The diary records that something happened. This catches the few things a reader could still
 * see if they looked now, while they are happening, and says where the camera should go. It
 * reads the model and writes nothing to it. Where the camera goes, and how slowly the colony
 * runs while a moment is watched, are choices about watching, like the time-lapse, not about
 * ants: a colony watched this way is the same colony, step for step, as the same seed run
 * headless.
 */

import { Burden, Caste, Domain } from '../core/state/ants.js'
import { intruderPresent } from '../core/systems/alarm.js'
import type { Colony } from '../core/sim/colony.js'

export type MomentTarget =
  | { readonly kind: 'ant'; readonly slot: number }
  | { readonly kind: 'entrance' }
  | { readonly kind: 'nest' }
  /** Out on the foraging ground, which the map in the corner shows; the camera stays put. */
  | { readonly kind: 'map' }

export interface Moment {
  readonly key: string
  /** What is happening, in a few words, for the banner. */
  readonly title: string
  readonly target: MomentTarget
  /** True while there is still something to see. */
  readonly live: (colony: Colony) => boolean
  /**
   * Whether to slow right down while it is watched. A mating flight and a worker carrying a body
   * out are over in simulated minutes, which at the time-lapse's day in thirty seconds is a blink.
   */
  readonly slow: boolean
}

/** Simulated days before another body being carried out is offered, so it is not offered daily. */
const CORPSE_MOMENT_GAP_DAYS = 60

/** Simulated days a newly hatched worker stays worth a look. */
const HATCH_MOMENT_DAYS = 2

export class Moments {
  private eclosedBefore = false
  private aloftBefore = false
  private movingBefore = false
  private lastCorpseDay = -Infinity
  private alarmBefore = false

  /** The moment that has just begun, if any. Call once per frame, after the colony steps. */
  next(colony: Colony): Moment | null {
    const { sim, demography, flights, relocation } = colony
    const { ants, clock } = sim
    const day = clock.daysElapsed

    const aloft = flights.aloft > 0
    const aloftStarted = aloft && !this.aloftBefore
    this.aloftBefore = aloft
    if (aloftStarted) {
      return {
        key: 'flight-' + flights.totalFlights,
        title: 'A mating flight is starting',
        target: { kind: 'entrance' },
        live: (c) => c.flights.aloft > 0,
        slow: true,
      }
    }

    const alarm = colony.alarm.alarmedNow > 0 && intruderPresent(sim, colony.alarm)
    const alarmStarted = alarm && !this.alarmBefore
    this.alarmBefore = alarm
    if (alarmStarted) {
      return {
        key: 'alarm-' + colony.alarm.totalIntruders,
        title: 'Foragers are raising the alarm',
        target: { kind: 'map' },
        live: (c) => c.alarm.alarmedNow > 0,
        slow: true,
      }
    }

    const moving = relocation.moveStartDay >= 0
    const moveStarted = moving && !this.movingBefore
    this.movingBefore = moving
    if (moveStarted) {
      return {
        key: 'move-' + relocation.totalMoves,
        title: 'The colony is moving house',
        target: { kind: 'nest' },
        live: (c) => c.relocation.moveStartDay >= 0,
        slow: false,
      }
    }

    const eclosed = demography.totalEclosed > 0
    const firstHatch = eclosed && !this.eclosedBefore
    this.eclosedBefore = eclosed
    if (firstHatch) {
      const slot = youngestWorker(colony)
      if (slot >= 0) {
        const bornTick = clock.tick - ants.ageTicks[slot]!
        return {
          key: 'first-worker',
          title: 'The first worker has hatched',
          target: { kind: 'ant', slot },
          live: (c) =>
            c.sim.ants.isAlive(slot) &&
            c.sim.clock.tick - bornTick < HATCH_MOMENT_DAYS * c.sim.clock.ticksPerDay,
          slow: false,
        }
      }
    }

    if (day - this.lastCorpseDay >= CORPSE_MOMENT_GAP_DAYS) {
      for (let i = 0; i < ants.count; i += 1) {
        if (!ants.isAlive(i) || ants.burden[i] !== Burden.Corpse) continue
        if (ants.domain[i] !== Domain.Nest) continue
        this.lastCorpseDay = day
        return {
          key: 'corpse-' + day,
          title: 'A worker is carrying out the dead',
          target: { kind: 'ant', slot: i },
          live: (c) => c.sim.ants.isAlive(i) && c.sim.ants.burden[i] === Burden.Corpse,
          slow: true,
        }
      }
    }

    return null
  }
}

/** The worker that hatched most recently, or -1. */
function youngestWorker(colony: Colony): number {
  const { ants } = colony.sim
  let best = -1
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
    const caste = ants.caste[i]
    if (caste === Caste.Queen || caste === Caste.Alate || caste === Caste.Male) continue
    if (best < 0 || ants.ageTicks[i]! < ants.ageTicks[best]!) best = i
  }
  return best
}
