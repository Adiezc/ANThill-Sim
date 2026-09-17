/**
 * Alarm: something disturbs the foragers out on the ground, and they answer it.
 *
 * What is measured, for this species. A disturbed or injured worker releases an alarm scent
 * from her mandibular glands, 4-methyl-3-heptanone. Workers that smell it are drawn towards
 * it; close to the source they run in tight circles, open their mandibles, and appear to
 * release the scent themselves, so the alarm is passed on from ant to ant. The scent from one
 * crushed worker reaches about 6 cm, 13 seconds after release, and is gone after about 35;
 * the circling happens within about 3 cm and lasts about 8 seconds (Wilson 1958; Bossert &
 * Wilson 1963; McGurk et al. 1966).
 *
 * What is ours. What the disturbance is, how often one happens and how long it stays. And the
 * scale: this model steps a minute at a time and a forager walks metres in a step, so the real
 * scent lives for less than one step and reaches a fiftieth of the ground a step covers. A
 * forager within `alarm.responseRadiusM` of a disturbance responds in the step it is there,
 * standing in for the relay that carries a real alarm further than one puff. An alarmed
 * forager goes to the disturbance and circles it instead of searching, and picks nothing up;
 * she stays alarmed for as many steps as the scent lasts after the last thing that alarmed
 * her, which at 35 seconds is one. Her trip keeps its clock, so a long alarm sends her home.
 *
 * Nothing here kills an ant, and nothing here reaches into the nest.
 */

import { Caste, Domain, Task } from '../state/ants.js'
import { cosTurns, headingFromTurns, headingOf, sinTurns, turnsFromHeading } from '../math/trig.js'
import { Prng } from '../math/prng.js'
import { RULE } from '../provenance/rules.js'
import { HOURS_IN_DAY, MINUTES_IN_HOUR } from '../sim/calendar.js'
import { surfaceIsForageable } from './foraging.js'
import type { Simulation } from '../sim/simulation.js'
import type { ClimateModel } from './climate.js'
import type { SoilModel } from './soil.js'

export interface AlarmState {
  /** Its own random stream, so adding alarm did not reshuffle every other draw in a run. */
  readonly prng: Prng
  readonly climate: ClimateModel
  readonly soil: SoilModel
  /** Ants out carrying the store during a move, which alarm leaves alone. See relocation. */
  readonly carrierIds: Uint32Array
  /** Ant id plus one for each slot that is alarmed, else 0. Shared with foraging. */
  readonly alarmedIds: Uint32Array
  /** Tick up to which each alarmed ant stays alarmed. */
  readonly alarmedUntil: Float64Array
  /** The disturbance: x and y in metres from the entrance, and the tick it leaves, or -1. */
  readonly intruder: Float64Array
  alarmedNow: number
  totalIntruders: number
  totalAlarmed: number
}

export function createAlarmState(
  climate: ClimateModel,
  soil: SoilModel,
  carrierIds: Uint32Array,
  alarmedIds: Uint32Array,
  seed: number,
): AlarmState {
  return {
    prng: new Prng((seed ^ 0x0a1a3e5c) >>> 0),
    climate,
    soil,
    carrierIds,
    alarmedIds,
    alarmedUntil: new Float64Array(alarmedIds.length),
    intruder: Float64Array.of(0, 0, -1),
    alarmedNow: 0,
    totalIntruders: 0,
    totalAlarmed: 0,
  }
}

/** True while a disturbance is out on the ground. */
export function intruderPresent(sim: Simulation, state: AlarmState): boolean {
  return state.intruder[2]! > sim.clock.tick
}

/** True if the ant in this slot is alarmed right now. */
export function isAlarmed(sim: Simulation, state: AlarmState, slot: number): boolean {
  return state.alarmedIds[slot] === sim.ants.id[slot]! + 1
}

/**
 * Puts a disturbance on the ground at a point, for a number of ticks. The system calls this
 * when one happens; tests call it to put one where they want it.
 */
export function startIntrusion(
  sim: Simulation,
  state: AlarmState,
  xM: number,
  yM: number,
  ticks: number,
): void {
  state.intruder[0] = xM
  state.intruder[1] = yM
  state.intruder[2] = sim.clock.tick + Math.max(1, ticks)
  state.totalIntruders += 1
}

export function makeAlarmSystem(state: AlarmState) {
  return function alarm(sim: Simulation): void {
    const { ants, params, clock } = sim
    const a = params.alarm
    const tick = clock.tick
    const secondsPerTick = params.time.secondsPerTick.value
    const lingerTicks = Math.max(1, Math.ceil(a.fadeOutSeconds.value / secondsPerTick))
    const raining = state.climate.isRaining(clock.date().dayFraction)

    // A disturbance turns up where a forager is searching, since a disturbance nobody meets
    // raises no alarm. Rolled per step across the active part of the day.
    if (!intruderPresent(sim, state) && !raining && a.intrudersPerDay.value > 0) {
      const activeFraction =
        params.foraging.activeDayFractionEnd.value - params.foraging.activeDayFractionStart.value
      const chance = a.intrudersPerDay.value / Math.max(1, clock.ticksPerDay * activeFraction)
      if (surfaceIsForageable(sim, state) && state.prng.chance(chance)) {
        const found = randomForagerOut(sim, state)
        if (found >= 0) {
          const minutes = state.prng.nextRange(a.intruderStayMinutes.min, a.intruderStayMinutes.max)
          const ticksPerMinute = clock.ticksPerDay / (HOURS_IN_DAY * MINUTES_IN_HOUR)
          startIntrusion(
            sim,
            state,
            ants.x[found]!,
            ants.y[found]!,
            Math.round(minutes * ticksPerMinute),
          )
        }
      }
    }

    // Foragers near the disturbance take up the alarm. Rain ends it: foragers head home.
    const present = intruderPresent(sim, state) && !raining
    const ix = state.intruder[0]!
    const iy = state.intruder[1]!
    const reach = a.responseRadiusM.value
    let alarmed = 0
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Surface) {
        state.alarmedIds[i] = 0
        continue
      }
      if (!isForager(sim, state, i)) continue
      const id = ants.id[i]! + 1
      if (present) {
        const dx = ants.x[i]! - ix
        const dy = ants.y[i]! - iy
        if (dx * dx + dy * dy <= reach * reach) {
          if (state.alarmedIds[i] !== id) state.totalAlarmed += 1
          state.alarmedIds[i] = id
          state.alarmedUntil[i] = tick + lingerTicks
        }
      }
      if (state.alarmedIds[i] !== id) continue
      if (raining || state.alarmedUntil[i]! <= tick) {
        state.alarmedIds[i] = 0
        continue
      }
      respond(sim, state, i, present)
      alarmed += 1
    }
    state.alarmedNow = alarmed
  }
}

/** A forager, as opposed to a carrier, a winged ant leaving on a flight, or the queen. */
function isForager(sim: Simulation, state: AlarmState, slot: number): boolean {
  const { ants } = sim
  if (ants.task[slot] !== Task.Forager) return false
  const caste = ants.caste[slot]
  if (caste !== Caste.MinorWorker && caste !== Caste.MajorWorker) return false
  return state.carrierIds[slot] !== ants.id[slot]! + 1
}

/** A forager out on the ground, chosen at random, or -1 if there is none. */
function randomForagerOut(sim: Simulation, state: AlarmState): number {
  const { ants } = sim
  if (ants.count === 0) return -1
  const start = state.prng.nextInt(ants.count)
  for (let k = 0; k < ants.count; k += 1) {
    const i = (start + k) % ants.count
    if (ants.isAlive(i) && ants.domain[i] === Domain.Surface && isForager(sim, state, i)) return i
  }
  return -1
}

/**
 * An alarmed forager's step: to the disturbance if she is not at it, and round it in tight
 * circles once she is, within the measured circling distance. With the disturbance gone she
 * circles where she stands until the alarm fades.
 */
function respond(sim: Simulation, state: AlarmState, slot: number, present: boolean): void {
  const { ants, params } = sim
  ants.ruleId[slot] = RULE.alarm
  const circle = params.alarm.extremeAlarmRadiusCm.value / 100
  const speed = params.foraging.speedMetresPerTick.value
  if (present) {
    const dx = state.intruder[0]! - ants.x[slot]!
    const dy = state.intruder[1]! - ants.y[slot]!
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > circle) {
      const step = Math.min(speed, distance - circle * 0.5)
      const turns = turnsFromHeading(headingOf(dx, dy))
      ants.heading[slot] = headingFromTurns(turns)
      ants.x[slot] = ants.x[slot]! + cosTurns(turns) * step
      ants.y[slot] = ants.y[slot]! + sinTurns(turns) * step
      return
    }
  }
  const turns = state.prng.nextFloat()
  ants.heading[slot] = headingFromTurns(turns + 0.25)
  const cx = present ? state.intruder[0]! : ants.x[slot]!
  const cy = present ? state.intruder[1]! : ants.y[slot]!
  ants.x[slot] = cx + cosTurns(turns) * circle
  ants.y[slot] = cy + sinTurns(turns) * circle
}
