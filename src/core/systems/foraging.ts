/**
 * Foraging: leaving the nest, searching, finding, and coming home.
 *
 * The shape of this system is set by three findings, two of which are prohibitions.
 *
 * **Worker size predicts nothing.** Not the size of seed collected, not the distance
 * travelled to collect it. Ferster & Traniello tested the intuitive rule — big ants fetch
 * big seeds from far away — and rejected it. So nothing below reads `lengthMm` or `caste`,
 * and `foraging.workerSizePredictsSeedSize` records the prohibition as a HARD RULE the
 * parameter loader will not let a file flip.
 *
 * **Ranges are not defended.** A colony's range is used almost exclusively by that colony,
 * but exclusivity is a consequence of where the trails point, not of any fighting. There is
 * no territorial behaviour here and no other colony to have it with.
 *
 * **Trip duration is search time, not distance.** A forager returning to a remembered patch
 * is not on a shorter trip than one that wandered; it is on a trip with less searching in
 * it. So the trip budget below is a time budget, spent by walking, and site fidelity buys
 * an ant a shorter search rather than a shorter walk.
 *
 * What is emergent and must stay emergent: a trunk trail is a direction the colony favours,
 * but the *trail* — the visible line of ants and pheromone running out from the entrance —
 * is not drawn anywhere in this file. It is what is left behind when successful foragers
 * walk home laying recruitment pheromone, and it exists on screen only because they did.
 *
 * See docs/SCIENCE.md sections 5 and 8.
 */

import { Burden, Caste, Domain, Task } from '../state/ants.js'
import { cosTurns, headingOf, sinTurns, turnsFromHeading, headingFromTurns } from '../math/trig.js'
import { pow } from '../math/approx.js'
import { RULE } from '../provenance/rules.js'
import { HOURS_IN_DAY } from '../sim/calendar.js'
import type { Simulation } from '../sim/simulation.js'
import type { SurfaceGrid } from '../state/surface.js'
import type { SoilModel } from './soil.js'
import type { ClimateModel } from './climate.js'

/**
 * Everything the foraging system owns.
 *
 * As with excavation, this is a plain record rather than a class with methods, because a
 * system must hold no state of its own between ticks: anything that persists lives here,
 * where the digest and the save file can see it.
 */
export interface ForagingState {
  readonly surface: SurfaceGrid
  readonly soil: SoilModel
  readonly climate: ClimateModel

  /** Running totals, for the end-of-run summary and the validation gates. */
  totalTripsStarted: number
  totalTripsSuccessful: number
  totalSeedsCollected: number
  /** Sum of completed trip durations in ticks, with the count, so a mean can be reported. */
  totalTripTicks: number
  completedTrips: number
  /** Foragers currently above ground. Cheap to maintain, awkward to recount. */
  antsOnSurface: number
}

export function createForagingState(
  surface: SurfaceGrid,
  soil: SoilModel,
  climate: ClimateModel,
): ForagingState {
  return {
    surface,
    soil,
    climate,
    totalTripsStarted: 0,
    totalTripsSuccessful: 0,
    totalSeedsCollected: 0,
    totalTripTicks: 0,
    completedTrips: 0,
    antsOnSurface: 0,
  }
}

/**
 * Whether the ground is fit to forage on at this moment.
 *
 * Two gates. Surface temperature is the one with evidence behind it: harvester ants stop
 * foraging when the ground gets hot enough to cost them more water than a trip is worth,
 * and the desert *Pogonomyrmex* literature is unambiguous that this is a real constraint
 * even though no threshold is published for *badius*. Night is the second: these are
 * diurnal ants.
 *
 * Neither gate decides *whether* a worker forages — that is the one-way age progression in
 * demography, which no shortage or surplus can hurry. These decide only whether a worker
 * that already forages goes out right now.
 */
export function surfaceIsForageable(sim: Simulation, state: ForagingState): boolean {
  const { params } = sim
  const date = sim.clock.date()
  const dayFraction = date.dayFraction

  if (
    dayFraction < params.foraging.activeDayFractionStart.value ||
    dayFraction > params.foraging.activeDayFractionEnd.value
  ) {
    return false
  }

  // Foraging pauses during rain.
  if (state.climate.isRaining(dayFraction)) return false

  const seasonalC = state.soil.temperatureAt(0, date.dayOfYear, state.climate)
  const surfaceTempC = state.climate.surfaceTemperatureC(seasonalC, dayFraction)
  return surfaceTempC <= params.foraging.surfaceTemperatureMaxC.value
}

/**
 * The system. Runs every tick, over every ant, in slot order.
 */
export function makeForagingSystem(state: ForagingState) {
  return function foraging(sim: Simulation): void {
    const { ants, params } = sim
    const { surface } = state

    if (sim.clock.isDayBoundary) {
      // In a drought year the plants set less seed: the year starts with a small crop on the
      // ground, and it grows back only that far.
      const crop = state.climate.drought ? params.foraging.droughtSeedCropFactor.value : 1
      if (state.climate.drought && sim.clock.date().dayOfYear === 0) surface.capSeeds(crop)
      surface.replenishSeeds(params.foraging.seedReplenishmentPerDay.value, crop)
    }

    const forageable = surfaceIsForageable(sim, state)
    const raining = state.climate.isRaining(sim.clock.date().dayFraction)

    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i)) continue
      if (ants.caste[i] === Caste.Queen) continue
      // Winged queens and males on the sand are leaving on a flight, not foraging.
      if (ants.caste[i] === Caste.Alate || ants.caste[i] === Caste.Male) continue

      if (ants.domain[i] === Domain.Surface) {
        // Caught out by rain, a forager gives up the search and heads home, still carrying
        // any seed she has found.
        if (raining && ants.burden[i] !== Burden.Seed) {
          ants.ruleId[i] = RULE.forageShelterFromRain
          returnHome(sim, state, i)
          continue
        }
        stepOnSurface(sim, state, i)
        continue
      }

      // Inside, and due to go out. Everything else about this ant is excavation's or
      // demography's business.
      if (ants.task[i] !== Task.Forager) continue
      if (!forageable) continue
      if (ants.burden[i] !== Burden.Nothing) continue
      if (!sim.prng.chance(params.foraging.departureChancePerTick.value)) continue

      depart(sim, state, i)
    }

    if (sim.clock.tick % params.pheromones.diffusionIntervalTicks.value === 0) {
      const interval = params.pheromones.diffusionIntervalTicks.value
      let decay = 1
      for (let i = 0; i < interval; i += 1)
        decay *= params.pheromones.recruitment.decayPerTick.value
      surface.decayRecruitment(decay, params.pheromones.recruitment.diffusion.value)
    }

    // Rain washes trail pheromone off the ground, a little every tick while it falls.
    if (raining) {
      const ticksPerHour = sim.clock.ticksPerDay / HOURS_IN_DAY
      surface.decayRecruitment(
        pow(params.climate.rainTrailRetentionPerHour.value, 1 / ticksPerHour),
        0,
      )
    }
  }
}

/** Sends a forager out of the entrance and onto the ground. */
function depart(sim: Simulation, state: ForagingState, slot: number): void {
  const { ants, prng, params } = sim
  const { surface } = state

  ants.domain[slot] = Domain.Surface
  ants.x[slot] = 0
  ants.y[slot] = 0
  // The homing vector is the ant's own running estimate of where home is relative to it.
  // It starts at the entrance, so it starts at zero, and it is maintained by the ant's own
  // steps rather than read off the world.
  ants.homeVecX[slot] = 0
  ants.homeVecY[slot] = 0
  ants.timer[slot] = 0
  state.totalTripsStarted += 1
  state.antsOnSurface += 1

  // Where to head. A remembered site first, then the strongest trail smelled at the
  // entrance, and a trunk trail direction if it has neither.
  if (ants.fidelityX[slot] !== 0 || ants.fidelityY[slot] !== 0) {
    ants.heading[slot] = headingOf(ants.fidelityX[slot]!, ants.fidelityY[slot]!)
    ants.ruleId[slot] = RULE.forageSiteFidelity
    return
  }

  const spread = (prng.nextFloat() - 0.5) * params.foraging.trunkTrailAngularSpreadTurns.value
  const recruited = entranceTrailTurns(sim, state)
  if (recruited !== null) {
    ants.heading[slot] = headingFromTurns(recruited + spread)
    ants.ruleId[slot] = RULE.forageRecruitmentTrail
    return
  }

  const trailTurns = surface.trunkTrailTurns
  const pick = trailTurns[prng.nextInt(trailTurns.length)]!
  ants.heading[slot] = headingFromTurns(pick + spread)
  ants.ruleId[slot] = RULE.forageTrunkTrail
}

/** Directions smelled round the entrance by a forager choosing a trail. */
const ENTRANCE_TRAIL_DIRECTIONS = 12

/**
 * The direction of a recruitment trail a forager with no remembered site takes from the
 * entrance, or null if she takes none.
 *
 * She smells a ring a short walk out and picks among the directions with the same non-linear
 * response the searching ants use, so a strong trail wins most of the new foragers and a
 * faint one few. Whether she follows a trail at all saturates with its strength: half the
 * time for a trail as strong as one step's deposit, nearly always for a well-used one, and
 * never for the remnant that decay leaves everywhere. Before this, the comment above promised
 * it and the code sent every such forager down a trunk trail at random, so trails were laid
 * and followed only by ants that happened across them, and they made no measurable difference
 * to what a colony found (VALIDATION.md G4b).
 */
function entranceTrailTurns(sim: Simulation, state: ForagingState): number | null {
  const { params, prng } = sim
  const { surface } = state
  if (params.foraging.trailFollowingStrength.value <= 0) return null
  const radius = params.foraging.entranceTrailSniffRadiusM.value
  const exponent = params.pheromones.recruitment.responseNonLinearity.value

  let strongest = 0
  let total = 0
  const weights = new Array<number>(ENTRANCE_TRAIL_DIRECTIONS)
  for (let k = 0; k < ENTRANCE_TRAIL_DIRECTIONS; k += 1) {
    const turns = k / ENTRANCE_TRAIL_DIRECTIONS
    const col = surface.recruitment.colOf(cosTurns(turns) * radius)
    const row = surface.recruitment.rowOf(sinTurns(turns) * radius)
    const strength = surface.inBounds(col, row) ? surface.recruitment.get(col, row) : 0
    if (strength > strongest) strongest = strength
    weights[k] = pow(strength, exponent)
    total += weights[k]!
  }
  const deposit = params.foraging.recruitmentDepositPerStep.value
  if (total <= 0 || !prng.chance(strongest / (strongest + deposit))) return null

  let pick = prng.nextFloat() * total
  for (let k = 0; k < ENTRANCE_TRAIL_DIRECTIONS; k += 1) {
    pick -= weights[k]!
    if (pick <= 0) return k / ENTRANCE_TRAIL_DIRECTIONS
  }
  return (ENTRANCE_TRAIL_DIRECTIONS - 1) / ENTRANCE_TRAIL_DIRECTIONS
}

/** One tick of an ant that is above ground. */
function stepOnSurface(sim: Simulation, state: ForagingState, slot: number): void {
  const { ants, params } = sim
  ants.timer[slot] = ants.timer[slot]! + 1

  if (ants.burden[slot] === Burden.Seed) {
    returnHome(sim, state, slot)
    return
  }

  // Out of time. Give up and use the same homing vector a laden ant would.
  if (ants.timer[slot]! > params.foraging.maxTripTicks.value) {
    ants.ruleId[slot] = RULE.foragePathIntegration
    returnHome(sim, state, slot)
    return
  }

  search(sim, state, slot)
}

/**
 * Searching.
 *
 * The ant keeps its heading, turns a little each step, and is pulled towards recruitment
 * pheromone where there is any. The pull is deliberately weak relative to the turn noise:
 * a trail that recruits every forager the moment it exists is a trail that never gets
 * tested against alternatives, and the winner-take-all behaviour the literature reports is
 * a property of the non-linear *response*, not of an irresistible attraction.
 */
function search(sim: Simulation, state: ForagingState, slot: number): void {
  const { ants, prng, params } = sim
  const { surface } = state

  const turns = turnsFromHeading(ants.heading[slot]!)
  const wander = prng.nextNormal() * params.foraging.searchTurnSdTurns.value

  // The trail gradient, sampled by nose length rather than by reading the whole grid: the
  // ant compares what it smells a little to its left with a little to its right, which is
  // all a real ant with two antennae can do.
  const sense = params.foraging.trailSensingDistanceM.value
  const left = trailStrength(
    sim,
    state,
    slot,
    turns + params.foraging.trailSensingTurns.value,
    sense,
  )
  const right = trailStrength(
    sim,
    state,
    slot,
    turns - params.foraging.trailSensingTurns.value,
    sense,
  )

  // Non-linear response: the difference between two trails matters far more than their
  // absolute strength, which is what produces winner-take-all selection between them.
  const exponent = params.pheromones.recruitment.responseNonLinearity.value
  const l = pow(left, exponent)
  const r = pow(right, exponent)
  const total = l + r
  const bias = total > 0 ? ((l - r) / total) * params.foraging.trailFollowingStrength.value : 0

  const heading = headingFromTurns(turns + wander + bias)
  ants.heading[slot] = heading
  if (bias !== 0) ants.ruleId[slot] = RULE.forageRecruitmentTrail

  if (!advance(sim, state, slot, heading)) return

  // Is there anything here?
  const col = surface.seeds.colOf(ants.x[slot]!)
  const row = surface.seeds.rowOf(ants.y[slot]!)
  if (!surface.inBounds(col, row)) return
  const here = surface.seeds.get(col, row)
  if (here < 1) return
  if (!prng.chance(params.foraging.encounterChancePerTick.value)) return

  surface.seeds.set(col, row, here - 1)
  ants.burden[slot] = Burden.Seed
  state.totalSeedsCollected += 1

  // Which size of seed it is. Drawn from the mix foragers were measured bringing home, and
  // from nothing about the forager: worker size predicts nothing about seed size (HARD
  // RULE), so neither caste nor body length is read here.
  const shares = params.seeds.collectedFractionByClass.value
  let pick = prng.nextFloat()
  let sizeClass = 0
  while (sizeClass < shares.length - 1 && pick >= shares[sizeClass]!) {
    pick -= shares[sizeClass]!
    sizeClass += 1
  }
  ants.seedClass[slot] = sizeClass

  // Site fidelity: remember where this came from, and come back to within half a metre of
  // it next time. Stored as the position rather than as a heading, so a remembered site
  // stays put when the ant does not.
  ants.fidelityX[slot] = ants.x[slot]!
  ants.fidelityY[slot] = ants.y[slot]!
  ants.ruleId[slot] = RULE.forageSiteFidelity
}

/** Walks home along the homing vector, laying recruitment pheromone if carrying. */
function returnHome(sim: Simulation, state: ForagingState, slot: number): void {
  const { ants, params } = sim
  const { surface } = state

  // The homing vector points from the ant to home, so the heading is simply its direction.
  const hx = ants.homeVecX[slot]!
  const hy = ants.homeVecY[slot]!
  const distanceM = Math.sqrt(hx * hx + hy * hy)

  if (distanceM <= params.foraging.speedMetresPerTick.value) {
    arriveHome(sim, state, slot)
    return
  }

  const heading = headingOf(hx, hy)
  ants.heading[slot] = heading
  if (ants.burden[slot] !== Burden.Seed) ants.ruleId[slot] = RULE.foragePathIntegration

  if (ants.burden[slot] === Burden.Seed) {
    // Deposited on the return leg only, and more of it near the food than near the nest,
    // and more for a distant find than a near one. Both modulations are generalised from
    // Lasius rather than measured in badius.
    //
    // Both are measured against how far from the entrance the food was, which the ant
    // knows because it is the site it just memorised. "Near the food" is therefore how
    // much of that distance it still has to walk, and it falls to nothing as the ant
    // reaches home; "distant food" is that distance itself.
    const siteDistanceM = Math.sqrt(
      ants.fidelityX[slot]! * ants.fidelityX[slot]! + ants.fidelityY[slot]! * ants.fidelityY[slot]!,
    )
    const near =
      params.pheromones.depositMoreNearFood.value && siteDistanceM > 0
        ? Math.min(1, distanceM / siteDistanceM)
        : 1
    const far = params.pheromones.depositMoreForDistantFood.value
      ? 1 + siteDistanceM / params.foraging.foragingRangeMetres.value
      : 1
    const amount = params.foraging.recruitmentDepositPerStep.value * near * far
    const col = surface.recruitment.colOf(ants.x[slot]!)
    const row = surface.recruitment.rowOf(ants.y[slot]!)
    if (surface.inBounds(col, row)) surface.recruitment.add(col, row, amount)
    ants.ruleId[slot] = RULE.forageRecruitmentTrail
  }

  advance(sim, state, slot, heading)
}

/** Puts the ant back underground and banks whatever it brought. */
function arriveHome(sim: Simulation, state: ForagingState, slot: number): void {
  const { ants } = sim
  if (ants.burden[slot] === Burden.Seed) {
    state.totalTripsSuccessful += 1
    // The seed stays in her mandibles. She carries it in and puts it down in the topmost
    // chamber she comes to, which is the interior system's business and is where the store
    // actually comes from — see systems/interior.ts and docs/SCIENCE.md section 6.
  } else {
    // A fruitless trip costs the ant its memory of the site: it went back and found
    // nothing, so next time it looks somewhere else.
    ants.fidelityX[slot] = 0
    ants.fidelityY[slot] = 0
  }

  state.totalTripTicks += ants.timer[slot]!
  state.completedTrips += 1
  state.antsOnSurface -= 1

  ants.domain[slot] = Domain.Nest
  ants.x[slot] = 0
  ants.y[slot] = 0
  ants.homeVecX[slot] = 0
  ants.homeVecY[slot] = 0
  ants.timer[slot] = 0
}

/**
 * Moves one step and updates the homing vector by the step just taken.
 *
 * Path integration is done here and nowhere else, and it is done by *subtracting the step
 * the ant took* rather than by recomputing the vector from the ant's position. That is the
 * structural claim: the ant is not reading its coordinates off the world, it is
 * accumulating its own movement.
 *
 * Note what is **not** modelled. A real ant's accumulated vector drifts, and it drifts more
 * the longer and more tortuous the outbound path; this one does not, because the same `dx`
 * that moves the ant is the one subtracted from its estimate, so the estimate stays exact.
 * Adding drift would need an error term nobody has measured in this species, and a homing
 * error that is invented is worse than one that is absent and said to be absent. Returns
 * false when the step would leave the modelled ground.
 */
function advance(sim: Simulation, state: ForagingState, slot: number, heading: number): boolean {
  const { ants, params } = sim
  const speed = params.foraging.speedMetresPerTick.value
  const turns = turnsFromHeading(heading)
  const dx = cosTurns(turns) * speed
  const dy = sinTurns(turns) * speed

  const nx = ants.x[slot]! + dx
  const ny = ants.y[slot]! + dy
  if (!state.surface.contains(nx, ny)) {
    // The edge of the world. Turn back rather than walk off it.
    ants.heading[slot] = headingFromTurns(turns + 0.5)
    return false
  }

  ants.x[slot] = nx
  ants.y[slot] = ny
  ants.homeVecX[slot] = ants.homeVecX[slot]! - dx
  ants.homeVecY[slot] = ants.homeVecY[slot]! - dy
  return true
}

/** Recruitment pheromone a nose-length away along a heading. */
function trailStrength(
  sim: Simulation,
  state: ForagingState,
  slot: number,
  turns: number,
  distanceM: number,
): number {
  const { ants } = sim
  const { surface } = state
  const x = ants.x[slot]! + cosTurns(turns) * distanceM
  const y = ants.y[slot]! + sinTurns(turns) * distanceM
  const col = surface.recruitment.colOf(x)
  const row = surface.recruitment.rowOf(y)
  return surface.inBounds(col, row) ? surface.recruitment.get(col, row) : 0
}

/** Mean completed trip duration in ticks, or zero before any trip has finished. */
export function meanTripTicks(state: ForagingState): number {
  return state.completedTrips === 0 ? 0 : state.totalTripTicks / state.completedTrips
}
