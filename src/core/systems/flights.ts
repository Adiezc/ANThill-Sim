/**
 * Nuptial flights: winged queens and males leaving the nest after heavy rain.
 *
 * What is measured, for this species. Colonies raise sexuals only once they have about 700
 * workers, and only in spring. Flights are synchronised across colonies and usually follow the
 * first heavy summer rain; colonies have some of both sexes ready for that rain and go on
 * rearing more for the flights after it (Smith & Tschinkel 2006). They fly from May to July, on
 * a calm, humid morning after heavy rain.
 *
 * What is ours. A flight happens on the first morning without rain within a few days of a
 * day whose rain passed `climate.heavyRainMm`, at `brood.nuptialFlightHour`. Every winged
 * queen and male old enough to have darkened climbs out, gathers on the sand round the
 * entrance and is gone within `brood.nuptialFlightDepartureTicks`. The rest wait for the next
 * rain. One flight per rain. What becomes of them afterwards is not modelled: mating happens
 * away from the nest, and new colonies are other runs.
 *
 * Nothing here reads colony size. A colony too small to raise sexuals simply has none to send.
 */

import { Caste, Domain, Task } from '../state/ants.js'
import { cosTurns, headingFromTurns, sinTurns } from '../math/trig.js'
import { RULE } from '../provenance/rules.js'
import { HOURS_IN_DAY } from '../sim/calendar.js'
import type { Simulation } from '../sim/simulation.js'
import type { ClimateModel } from './climate.js'

export interface FlightRecord {
  readonly colonyYear: number
  readonly month: number
  readonly dayOfMonth: number
  readonly gynes: number
  readonly males: number
}

export interface FlightState {
  readonly climate: ClimateModel
  /** Day index of the last heavy rain in the flight season that has not yet had its flight, or -1. */
  heavyRainDay: number
  /** Winged ants out on the sand right now, about to fly. */
  aloft: number
  totalFlights: number
  totalGynesFlown: number
  totalMalesFlown: number
  readonly flights: FlightRecord[]
}

export function createFlightState(climate: ClimateModel): FlightState {
  return {
    climate,
    heavyRainDay: -1,
    aloft: 0,
    totalFlights: 0,
    totalGynesFlown: 0,
    totalMalesFlown: 0,
    flights: [],
  }
}

export function makeFlightSystem(state: FlightState) {
  return function flights(sim: Simulation): void {
    const { ants, params, clock, prng } = sim
    const date = clock.date()
    const day = clock.daysElapsed
    const inSeason = params.climate.nuptialFlightMonths.value.includes(date.month)

    if (clock.isDayBoundary) {
      if (inSeason && state.climate.day.heavyRain) state.heavyRainDay = day
      if (
        state.heavyRainDay >= 0 &&
        day - state.heavyRainDay > params.brood.nuptialFlightDaysAfterRain.value
      ) {
        state.heavyRainDay = -1
      }
    }

    // Those already out leave, one by one, over the departure window.
    if (state.aloft > 0) {
      for (let i = 0; i < ants.count; i += 1) {
        if (!ants.isAlive(i) || ants.domain[i] !== Domain.Surface) continue
        const caste = ants.caste[i]
        if (caste !== Caste.Alate && caste !== Caste.Male) continue
        ants.timer[i] = ants.timer[i]! - 1
        if (ants.timer[i]! <= 0) {
          ants.kill(i)
          state.aloft -= 1
        }
      }
    }

    // The flight itself: on the hour, the morning after heavy rain, if it is not raining.
    const flightTick = Math.round(
      (params.brood.nuptialFlightHour.value / HOURS_IN_DAY) * clock.ticksPerDay,
    )
    if (clock.tick % clock.ticksPerDay !== flightTick) return
    if (!inSeason || state.heavyRainDay < 0 || day <= state.heavyRainDay) return
    if (state.climate.isRaining(date.dayFraction)) return

    const matureTicks = params.brood.callowDurationDays.value * clock.ticksPerDay
    const departure = params.brood.nuptialFlightDepartureTicks.value
    const discRadiusM =
      (params.nest.surfaceDiscDiameterCm.min + params.nest.surfaceDiscDiameterCm.max) / 4 / 100
    let gynes = 0
    let males = 0
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const caste = ants.caste[i]
      if (caste !== Caste.Alate && caste !== Caste.Male) continue
      if (ants.ageTicks[i]! < matureTicks) continue

      ants.domain[i] = Domain.Surface
      const angle = prng.nextFloat()
      const r = discRadiusM * Math.sqrt(prng.nextFloat())
      ants.x[i] = r * cosTurns(angle)
      ants.y[i] = r * sinTurns(angle)
      ants.heading[i] = headingFromTurns(prng.nextFloat())
      ants.task[i] = Task.None
      ants.timer[i] = 1 + Math.floor(prng.nextFloat() * departure)
      ants.ruleId[i] = RULE.nuptialFlight
      if (caste === Caste.Alate) gynes += 1
      else males += 1
    }

    state.heavyRainDay = -1
    if (gynes + males === 0) return
    state.aloft += gynes + males
    state.totalFlights += 1
    state.totalGynesFlown += gynes
    state.totalMalesFlown += males
    state.flights.push({
      colonyYear: date.colonyYear,
      month: date.month,
      dayOfMonth: date.dayOfMonth,
      gynes,
      males,
    })
  }
}
