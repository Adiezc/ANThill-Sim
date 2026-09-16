/**
 * Inside the nest: where everyone stands, and how brood and seeds reach the chambers they
 * are kept in.
 *
 * Until this system existed, the only ants that moved underground were the ones digging.
 * Everyone else was placed once, at eclosion, and never took another step, which made a
 * nest of four thousand workers a still photograph of a cloud of dots. It also meant the
 * two best-measured facts about the inside of a *badius* nest — that the colony is sorted
 * by task from top to bottom, and that seeds travel downward in stages — were not in the
 * model at all.
 *
 * ## What is measured and what is invented
 *
 * **Measured [A].** Tschinkel & Kwapich 2017 excavated whole nests and sorted them chamber
 * by chamber: foragers occupy the top 15 cm and only 5 percent are found below 20 cm;
 * transfer workers range widely, about 30 percent below 20 cm; below 70 cm, 90 percent of
 * the workers are brood-care workers. Tschinkel & Seal 2015 established the seed
 * partitioning: foragers deposit seeds only in the topmost chambers and a separate class of
 * workers carries them down, visible in a real nest as a wave travelling downward.
 * Tschinkel & Kwapich 2017 put the seed chambers at 20 to 80 cm.
 *
 * **Invented [C].** Everything about *how* an ant gets to its depth. It walks toward a
 * depth it is handed, which is the same admitted fiction as the depth cue in excavation and
 * carries the same caveat: no real ant knows how deep it is, and the one proposed mechanism
 * was tested and falsified. See docs/SCIENCE.md section 11.
 *
 * The distinction to hold onto is that the *distributions* here reproduce a measurement and
 * the *mechanism* producing them is a placeholder. If someone identifies the real cue, this
 * file changes and the measured distributions should not.
 *
 * ## Brood in two places at once
 *
 * The demography of the brood — how many of each stage, how old, what each cohort becomes —
 * lives in `BroodStore` and is authoritative. This system owns only *where* that brood is,
 * as counts in `nest.brood`. The two are reconciled once a day: eggs appear wherever the
 * queen is, losses are taken off the distribution in proportion, and nurses move what is
 * there downward. No brood is created or destroyed here.
 */

import { Burden, Caste, Domain, Task } from '../state/ants.js'
import { RULE } from '../provenance/rules.js'
import { isDescender, isDigging } from './excavation.js'
import { chamberThresholdCm } from '../state/nest.js'
import type { Simulation } from '../sim/simulation.js'
import type { NestGrid } from '../state/nest.js'
import type { DemographyState } from './demography.js'

/**
 * State the interior system owns.
 *
 * The counts are recounted from the grids and the ant store once a day rather than
 * maintained incrementally. Incremental counters and a population that dies while holding
 * things drift apart, and a store total that drifts is exactly the kind of number this
 * project cannot afford to report.
 */
export interface InteriorState {
  readonly nest: NestGrid
  readonly demography: DemographyState
  /**
   * Ants per cell, computed by the excavation system at the top of the same tick and
   * borrowed here rather than recomputed. It is a tick old by the time the last ant reads
   * it, which is equally true of the excavation system's own use of it.
   */
  readonly occupants: Uint16Array

  /**
   * Brood lying in chambers, and brood in an ant's mandibles.
   *
   * Kept up to date as things are picked up and put down, so a readout is live rather than
   * a day stale, and recounted from the grids once a day so it cannot drift — an ant that
   * dies holding a seed would otherwise take that seed out of the world and leave it in the
   * total.
   */
  broodInCells: number
  broodCarried: number
  /** Seeds lying in the store, and seeds being carried inside the nest. Recounted daily. */
  seedsInStore: number
  seedsCarried: number

  /** Running totals, for the readouts and the study output. */
  totalSeedsDeposited: number
  totalSeedsTakenDeeper: number
  totalBroodCarried: number
  /** Dead nestmates lying in the nest, recounted daily, and bodies carried out so far. */
  corpsesInNest: number
  totalCorpsesCarriedOut: number
}

export function createInteriorState(
  nest: NestGrid,
  demography: DemographyState,
  occupants: Uint16Array,
): InteriorState {
  return {
    nest,
    demography,
    occupants,
    broodInCells: 0,
    broodCarried: 0,
    seedsInStore: 0,
    seedsCarried: 0,
    totalSeedsDeposited: 0,
    totalSeedsTakenDeeper: 0,
    corpsesInNest: 0,
    totalCorpsesCarriedOut: 0,
    totalBroodCarried: 0,
  }
}

/**
 * The depth below which the colony keeps its brood, in centimetres.
 *
 * Measured against the nest's *current* depth rather than fixed at 70 cm, because a founding
 * nest is 30 cm deep and a mature one is three metres and the brood is at the bottom of
 * both. In a mature nest this returns the measured 70 cm; in a young one, the lower part of
 * what has actually been dug.
 */
export function broodBandTopCm(sim: Simulation, nest: NestGrid): number {
  const { params } = sim
  return Math.min(
    params.labour.stratificationDeepProbeCm.value,
    nest.maxDepthCm * params.interior.broodChamberDepthFraction.value,
  )
}

/** The band the seed store sits in: 20 to 80 cm, or the lower nest while it is shallower. */
export function seedBandCm(sim: Simulation, nest: NestGrid): { top: number; bottom: number } {
  const { params } = sim
  const band = params.seeds.seedChamberDepthCm
  const depth = nest.maxDepthCm
  return {
    top: Math.min(band.min, depth * params.seeds.storeBandFractionOfDepth.value),
    bottom: Math.min(band.max, depth),
  }
}

/**
 * Draws the depth this ant is heading for, from the distribution measured for its task.
 *
 * Every fraction and every probe depth here is [A], read straight from the species file: an
 * ant is put below the probe with the probability the excavations found and above it
 * otherwise. Nothing in it looks at what the colony needs.
 */
function drawPreferredDepth(sim: Simulation, state: InteriorState, slot: number): number {
  const { ants, params, prng } = sim
  const { nest } = state
  const depth = nest.maxDepthCm
  if (depth <= 0) return 0

  const shallow = Math.min(params.labour.stratificationShallowProbeCm.value, depth)
  const between = (lo: number, hi: number): number =>
    hi <= lo ? lo : prng.nextRange(lo, Math.min(hi, depth))

  switch (ants.task[slot]) {
    case Task.Forager: {
      // Foragers are surface workers even when they are indoors: the top 15 cm, and only
      // one in twenty below 20 cm.
      if (prng.chance(params.labour.foragerFractionBelow20cm.value)) return between(shallow, depth)
      return between(0, Math.min(params.labour.foragerDepthMaxCm.value, depth))
    }
    case Task.Transfer: {
      // The class that ranges widest, which is what makes it the one that moves things.
      if (prng.chance(params.labour.transferWorkerFractionBelow20cm.value)) {
        return between(shallow, depth)
      }
      return between(0, shallow)
    }
    default: {
      // Brood care, and anyone not yet assigned. Deep, with the measured nine in ten.
      const band = broodBandTopCm(sim, nest)
      if (prng.chance(params.labour.broodCareFractionBelow70cm.value)) return between(band, depth)
      return between(0, band)
    }
  }
}

/**
 * One step through open space toward the depth this ant is heading for.
 *
 * No path, no map, no knowledge of the nest: eight neighbouring cells scored on how much
 * closer to its depth they are, how many nestmates are already standing in them, and noise.
 */
function walkToward(
  sim: Simulation,
  state: InteriorState,
  slot: number,
  col: number,
  row: number,
  targetDepthCm: number,
  seeking: NestGrid['brood'] | null = null,
): boolean {
  const { ants, params, prng } = sim
  const { nest } = state

  let bestCol = col
  let bestRow = row
  let best = -Infinity

  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      if (dCol === 0 && dRow === 0) continue
      const c = col + dCol
      const r = row + dRow
      if (!nest.isVoid(c, r)) continue
      let score =
        -Math.abs(nest.depthOf(r) - targetDepthCm) * params.interior.depthPreferenceWeight.value
      score -= (state.occupants[nest.index(c, r)] ?? 0) * params.interior.crowdAvoidance.value
      // A worker goes where the thing it tends is: a nurse to the brood, a transfer worker
      // to seeds that are still in the top chambers. Without this a worker walks to its
      // preferred depth and never meets the pile it is supposed to be moving.
      if (seeking !== null && seeking.get(c, r) > 0)
        score += params.interior.tendingAttraction.value
      score += prng.nextFloat() * params.interior.walkNoise.value
      if (score > best) {
        best = score
        bestCol = c
        bestRow = r
      }
    }
  }

  if (best === -Infinity) return false
  ants.x[slot] = nest.offsetOf(bestCol)
  ants.y[slot] = nest.depthOf(bestRow)
  return bestCol !== col || bestRow !== row
}

/**
 * Whether this cell is chamber rather than shaft.
 *
 * The distinction is Tschinkel's own and the model already measures nests by it: a shaft is
 * a narrow corridor of near-constant bore and a chamber is a wide, flat-floored void. Brood
 * and seeds are found in chambers. Before this was checked, a clutch of eggs was laid in a
 * vertical stack down the shaft the queen happened to be standing in, which is a place no
 * excavation has ever found brood.
 */
function isChamber(sim: Simulation, nest: NestGrid, col: number, row: number): boolean {
  return nest.isChamberCell(col, row, chamberThresholdCm(sim.params))
}

/**
 * Whether there is anywhere deeper for this ant to take what it is carrying.
 *
 * The test that matters for putting something down. "Did my last step move me" is not it: a
 * founding nest is a shaft a centimetre long, and an ant carrying a seed toward a chamber
 * that does not exist yet can step up and down that shaft for ever, always moving and never
 * arriving. Sixty foraging trips in a row ended with the seed still in her mandibles, and a
 * forager holding a seed does not go out again, so the colony simply stopped foraging.
 */
function canGoDeeper(nest: NestGrid, col: number, row: number): boolean {
  return nest.isVoid(col - 1, row + 1) || nest.isVoid(col, row + 1) || nest.isVoid(col + 1, row + 1)
}

/** The fullest cell of something the ant can reach from where it stands, or null. */
function withinReach(
  state: InteriorState,
  grid: NestGrid['seeds'],
  col: number,
  row: number,
): { col: number; row: number } | null {
  const { nest } = state
  let bestCol = -1
  let bestRow = -1
  let best = 0
  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      const c = col + dCol
      const r = row + dRow
      if (!nest.isVoid(c, r)) continue
      const here = grid.get(c, r)
      if (here >= 1 && here > best) {
        best = here
        bestCol = c
        bestRow = r
      }
    }
  }
  return bestCol < 0 ? null : { col: bestCol, row: bestRow }
}

/** Puts something down here if there is room for it, spilling into neighbours if not. */
function placeInCell(
  nest: NestGrid,
  grid: NestGrid['seeds'],
  col: number,
  row: number,
  amount: number,
  capacity: number,
): boolean {
  if (grid.get(col, row) + amount <= capacity) {
    grid.add(col, row, amount)
    return true
  }
  // The cell is full. Spread onto the chamber floor rather than stacking, which is what a
  // heap of seeds or a pile of brood does. Nearest first, in a fixed order so that two runs
  // of the same seed spill the same way.
  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      const c = col + dCol
      const r = row + dRow
      if (!nest.isVoid(c, r)) continue
      if (grid.get(c, r) + amount > capacity) continue
      grid.add(c, r, amount)
      return true
    }
  }
  return false
}

/**
 * Puts one seed of a size class down here if the cell has room, spilling into a neighbour if
 * not. The same rule as `placeInCell`, written through the nest so that the per-class layers
 * and the all-class total move together.
 */
function placeSeed(
  nest: NestGrid,
  col: number,
  row: number,
  sizeClass: number,
  capacity: number,
): boolean {
  if (nest.seeds.get(col, row) + 1 <= capacity) {
    nest.addSeed(sizeClass, col, row, 1)
    return true
  }
  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      const c = col + dCol
      const r = row + dRow
      if (!nest.isVoid(c, r)) continue
      if (nest.seeds.get(c, r) + 1 > capacity) continue
      nest.addSeed(sizeClass, c, r, 1)
      return true
    }
  }
  return false
}

/** A returning forager, carrying a seed, looking for the topmost chamber to drop it in. */
function depositSeed(
  sim: Simulation,
  state: InteriorState,
  slot: number,
  col: number,
  row: number,
): void {
  const { ants, params } = sim
  const { nest } = state
  const depthCm = nest.depthOf(row)
  const maxDepth = params.seeds.foragerDepositMaxDepthCm.value
  const threshold = chamberThresholdCm(params)

  // A forager puts its seed down in the first chamber it comes to and goes back out. It
  // never takes one deeper: that is somebody else's job, and it is the finding that gives
  // the store its structure.
  const inAChamber = nest.isChamberCell(col, row, threshold)
  ants.ruleId[slot] = RULE.seedDepositTopChamber
  // The first chamber she comes to, the depth past which a forager does not go, or the
  // bottom of what has been dug — a founding nest has no chamber to put anything in.
  const arrived = (inAChamber && depthCm > 0) || depthCm >= maxDepth || !canGoDeeper(nest, col, row)
  if (!arrived) {
    walkToward(sim, state, slot, col, row, maxDepth)
    return
  }

  if (placeSeed(nest, col, row, ants.seedClass[slot]!, params.seeds.maxSeedsPerCell.value)) {
    ants.burden[slot] = Burden.Nothing
    state.seedsInStore += 1
    state.seedsCarried = Math.max(0, state.seedsCarried - 1)
    state.totalSeedsDeposited += 1
  }
}

/** A worker carrying a dead nestmate up and out of the entrance. */
function carryCorpseOut(
  sim: Simulation,
  state: InteriorState,
  slot: number,
  col: number,
  row: number,
): void {
  const { ants } = sim
  ants.ruleId[slot] = RULE.corpseRemoval
  if (row > 0) {
    walkToward(sim, state, slot, col, row, 0)
    return
  }
  // At the entrance. Where the body is left outside is not modelled.
  ants.burden[slot] = Burden.Nothing
  state.totalCorpsesCarriedOut += 1
}

/** A transfer worker taking a seed down toward the seed chambers. */
function carrySeedDown(
  sim: Simulation,
  state: InteriorState,
  slot: number,
  col: number,
  row: number,
): void {
  const { ants, params } = sim
  const { nest } = state
  const band = seedBandCm(sim, nest)
  const depthCm = nest.depthOf(row)

  ants.ruleId[slot] = RULE.seedCarryDown
  // On chamber floor inside the band, past the bottom of it, or at the deepest point there
  // is: nothing is carried for ever.
  const arrived =
    (depthCm >= band.top && (isChamber(sim, nest, col, row) || depthCm >= band.bottom)) ||
    !canGoDeeper(nest, col, row)
  if (!arrived) {
    walkToward(sim, state, slot, col, row, (band.top + band.bottom) / 2)
    return
  }

  if (placeSeed(nest, col, row, ants.seedClass[slot]!, params.seeds.maxSeedsPerCell.value)) {
    ants.burden[slot] = Burden.Nothing
    state.seedsInStore += 1
    state.seedsCarried = Math.max(0, state.seedsCarried - 1)
    state.totalSeedsTakenDeeper += 1
  }
}

/** A nurse carrying a piece of brood down to where the colony keeps it. */
function carryBroodDown(
  sim: Simulation,
  state: InteriorState,
  slot: number,
  col: number,
  row: number,
): void {
  const { ants, params } = sim
  const { nest } = state
  const band = broodBandTopCm(sim, nest)
  const depthCm = nest.depthOf(row)

  ants.ruleId[slot] = RULE.interiorTendBrood
  // Chamber floor below the band, the very bottom of the nest, or the deepest point there
  // is.
  const bottom = nest.maxDepthCm - sim.params.nest.chamberHeightCm.value
  const arrived =
    (depthCm >= band && (isChamber(sim, nest, col, row) || depthCm >= bottom)) ||
    !canGoDeeper(nest, col, row)
  if (!arrived) {
    walkToward(sim, state, slot, col, row, band)
    return
  }

  if (placeInCell(nest, nest.brood, col, row, 1, params.interior.maxBroodPerCell.value)) {
    ants.burden[slot] = Burden.Nothing
    state.broodInCells += 1
    state.broodCarried = Math.max(0, state.broodCarried - 1)
  }
}

/** The system. Registered after excavation, so diggers have already had their tick. */
export function makeInteriorSystem(state: InteriorState) {
  return (sim: Simulation): void => {
    const { ants, params, prng, clock } = sim
    const { nest } = state
    if (state.demography.phase === 'dead') return

    const redrawTicks = Math.max(
      1,
      Math.round(params.interior.preferredDepthRedrawDays.value * clock.ticksPerDay),
    )
    const seedBand = seedBandCm(sim, nest)
    const broodBand = broodBandTopCm(sim, nest)

    // Ants are considered in turn rather than all at once. An eight-neighbour scan for
    // every ant on every tick is the most expensive thing this model could do, and nothing
    // is gained by it: a nest of four thousand workers with a third of them stepping on any
    // given tick looks exactly the same and costs a third as much.
    const stride = Math.max(1, Math.round(params.interior.stepIntervalTicks.value))
    const phase = clock.tick % stride

    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      if (i % stride !== phase) continue
      const col = nest.colOfOffset(ants.x[i]!)
      const row = nest.rowOfDepth(ants.y[i]!)
      if (!nest.inBounds(col, row)) continue

      const caste = ants.caste[i]!
      const task = ants.task[i]!

      // The queen. While she is founding she is digging her own shaft and excavation owns
      // her; afterwards she sits deep in the nest and lays.
      if (caste === Caste.Queen) {
        // The guard the comment above promises. Without it she was walked back to her eggs at
        // the entrance on every pass, and never dug her founding nest.
        if (state.demography.phase === 'founding') continue
        // Into the brood chambers, not to the floor of the nest. Aiming her at the deepest
        // point put her and therefore every egg in the bottom cell of a three-metre shaft,
        // which is neither what the excavations found nor anywhere a reader can see.
        ants.ruleId[i] = RULE.queenLaying
        walkToward(sim, state, i, col, row, broodBand, nest.brood)
        continue
      }

      // A pellet of sand belongs to excavation, and so does the ant carrying it.
      if (ants.burden[i] === Burden.SoilPellet) continue

      if (ants.burden[i] === Burden.Seed) {
        if (task === Task.Forager) depositSeed(sim, state, i, col, row)
        else carrySeedDown(sim, state, i, col, row)
        continue
      }

      if (ants.burden[i] === Burden.Brood) {
        carryBroodDown(sim, state, i, col, row)
        continue
      }

      if (ants.burden[i] === Burden.Corpse) {
        carryCorpseOut(sim, state, i, col, row)
        continue
      }

      const depthCm = nest.depthOf(row)

      // A worker that is not a forager, finding a dead nestmate within reach, carries her out.
      if (task !== Task.Forager) {
        const from = withinReach(state, nest.corpses, col, row)
        if (from !== null && prng.chance(params.interior.corpsePickUpChancePerTick.value)) {
          nest.corpses.add(from.col, from.row, -1)
          if (nest.corpses.get(from.col, from.row) < 0) nest.corpses.set(from.col, from.row, 0)
          state.corpsesInNest = Math.max(0, state.corpsesInNest - 1)
          ants.burden[i] = Burden.Corpse
          ants.ruleId[i] = RULE.corpseRemoval
          continue
        }
      }

      // A worker that is not a forager, coming across seeds that are still too shallow,
      // takes one deeper. This is the whole of the downward wave: no ant is told where the
      // store is, and the store ends up in the measured band because nobody stops carrying
      // until it is. The prohibition is the part that is documented — the forager that
      // brought the seed home never takes it down — and it is enforced above.
      if (task !== Task.Forager && depthCm < seedBand.top) {
        const from = withinReach(state, nest.seeds, col, row)
        if (from !== null && prng.chance(params.seeds.downwardTransportChancePerTick.value)) {
          ants.seedClass[i] = nest.takeSeed(from.col, from.row, prng.nextFloat())
          ants.burden[i] = Burden.Seed
          state.seedsInStore = Math.max(0, state.seedsInStore - 1)
          state.seedsCarried += 1
          ants.ruleId[i] = RULE.seedCarryDown
          continue
        }
      }

      // A nurse at brood that is shallower than brood belongs picks a piece up. Within
      // reach rather than underfoot: a pile of eggs is one cell and forty nurses cannot all
      // stand on it, and requiring them to meant a clutch laid at the entrance sat there.
      if ((task === Task.BroodCare || task === Task.None) && depthCm < broodBand) {
        const from = withinReach(state, nest.brood, col, row)
        if (from !== null && prng.chance(params.interior.broodPickUpChancePerTick.value)) {
          nest.brood.add(from.col, from.row, -1)
          ants.burden[i] = Burden.Brood
          state.broodInCells = Math.max(0, state.broodInCells - 1)
          state.broodCarried += 1
          ants.ruleId[i] = RULE.interiorTendBrood
          state.totalBroodCarried += 1
          continue
        }
      }

      // An ant that digs has now had its chance to pick up something it was standing next
      // to, and the rest of its tick belongs to excavation. That an excavator carries a seed
      // it passes is not a documented behaviour and is not meant as one; it is the only way
      // this species' *documented* one — that seeds are moved down out of the top chambers
      // by workers who are not the foragers that brought them — can happen at all in a model
      // where four workers in five are at a dig face. See docs/DECISIONS.md.
      // Only the few diggers who go down to the working faces belong to excavation. The rest
      // are placed here like everyone else and dig the wall beside them, which is what widens
      // chambers instead of driving the shaft deeper. See docs/DECISIONS.md D28.
      if (task !== Task.Forager && isDigging(sim, i) && isDescender(sim, i)) continue

      // Otherwise it is going about its business at its own depth. The depth is redrawn
      // every few days: redrawn every tick and the population is right but each individual
      // jitters; never redrawn and each ant is stuck on one shelf for life.
      if (ants.preferredDepthCm[i] === 0 || (clock.tick + i) % redrawTicks === 0) {
        ants.preferredDepthCm[i] = drawPreferredDepth(sim, state, i)
      }
      if (ants.ruleId[i] === RULE.idle) ants.ruleId[i] = RULE.interiorStratification
      const nurse = task === Task.BroodCare || task === Task.None
      // A nurse is drawn to brood wherever it is, which is also what makes a nursery look
      // like one: the workers pile onto the brood rather than standing about near it. A
      // transfer worker is drawn to seeds only while they are above the store, because
      // below it there is nothing left to do with them.
      const seeking = nurse
        ? nest.brood
        : task === Task.Transfer && depthCm < seedBand.top
          ? nest.seeds
          : null
      walkToward(sim, state, i, col, row, ants.preferredDepthCm[i]!, seeking)
    }

    if (clock.isDayBoundary) {
      recount(sim, state)
      reconcileBrood(sim, state)
    }
  }
}

/**
 * Recounts everything from the grids and the ant store.
 *
 * Once a day, over the excavated region only. This is what keeps the reported store honest
 * when an ant dies with a seed in its mandibles.
 */
function recount(sim: Simulation, state: InteriorState): void {
  const { ants } = sim
  const { nest } = state

  let carriedSeeds = 0
  let carriedBrood = 0
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    if (ants.domain[i] !== Domain.Nest) continue
    if (ants.burden[i] === Burden.Seed) carriedSeeds += 1
    else if (ants.burden[i] === Burden.Brood) carriedBrood += 1
  }
  state.seedsCarried = carriedSeeds
  state.broodCarried = carriedBrood

  const bounds = nest.pheromoneBounds()
  let seeds = 0
  let brood = 0
  let corpses = 0
  for (let row = Math.max(0, bounds.minRow); row <= Math.min(nest.rows - 1, bounds.maxRow); row++) {
    for (
      let col = Math.max(0, bounds.minCol);
      col <= Math.min(nest.cols - 1, bounds.maxCol);
      col++
    ) {
      seeds += nest.seeds.get(col, row)
      brood += nest.brood.get(col, row)
      corpses += nest.corpses.get(col, row)
    }
  }
  state.seedsInStore = seeds
  state.broodInCells = brood
  state.corpsesInNest = corpses
}

/**
 * Lays `amount` of brood around a cell, filling each to the packing limit before moving out.
 *
 * A clutch spreads across the floor around the queen rather than stacking in one cell. The
 * search is a widening square in a fixed order, so two runs of the same seed lay it out the
 * same way. If the nest is too small to hold it at the packing limit, the remainder goes in
 * the last cell found: brood is never destroyed here, whatever the geometry.
 */
function spreadBrood(
  sim: Simulation,
  state: InteriorState,
  col: number,
  row: number,
  amount: number,
  capacity: number,
): void {
  const { nest } = state
  let left = amount
  let lastCol = col
  let lastRow = row

  // Chambers first, over a wider search than the fallback: a clutch belongs on a chamber
  // floor, and the queen may be standing in the shaft between two of them. Then anywhere
  // void, so that a nest too young to have a chamber still keeps its brood somewhere.
  const reach = Math.max(
    1,
    Math.round(sim.params.interior.broodSearchRadiusCm.value / nest.cellSizeCm),
  )
  for (const chambersOnly of [true, false]) {
    for (let radius = 0; radius <= reach && left > 0; radius += 1) {
      for (let dRow = -radius; dRow <= radius && left > 0; dRow += 1) {
        for (let dCol = -radius; dCol <= radius && left > 0; dCol += 1) {
          // Only the shell of this radius; the inside was filled on an earlier pass.
          if (radius > 0 && Math.abs(dRow) !== radius && Math.abs(dCol) !== radius) continue
          const c = col + dCol
          const r = row + dRow
          if (!nest.isVoid(c, r)) continue
          if (chambersOnly && !isChamber(sim, nest, c, r)) continue
          const room = capacity - nest.brood.get(c, r)
          if (room <= 0) continue
          const put = Math.min(room, left)
          nest.brood.add(c, r, put)
          left -= put
          lastCol = c
          lastRow = r
        }
      }
    }
  }
  if (left > 0) nest.brood.add(lastCol, lastRow, left)
}

/**
 * Makes the brood *distribution* agree with the brood *demography*, once a day.
 *
 * `BroodStore` decides how many eggs, larvae and pupae exist; this decides nothing about
 * that. New brood appears where the queen is, and losses — mortality, starvation, eclosion,
 * the winter clear-out — are taken off the existing distribution in proportion, because
 * nothing in the demographic engine says which chamber a dead larva was in.
 */
function reconcileBrood(sim: Simulation, state: InteriorState): void {
  const { ants, params } = sim
  const { nest, demography } = state
  const target = demography.brood.total
  const wantedInCells = Math.max(0, target - state.broodCarried)

  if (wantedInCells > state.broodInCells) {
    // Eggs, laid where she is. If she is dead, at the bottom of the nest, where the last
    // brood of a queenless colony is being tended out.
    const gained = wantedInCells - state.broodInCells
    const queen = demography.queenSlot
    let col = nest.entranceCol
    let row = nest.deepestRow
    if (queen >= 0 && ants.isAlive(queen)) {
      col = nest.colOfOffset(ants.x[queen]!)
      row = nest.rowOfDepth(ants.y[queen]!)
    }
    if (!nest.isVoid(col, row)) {
      const where = nest.deepestVoid()
      col = where.col
      row = where.row
    }
    spreadBrood(sim, state, col, row, gained, params.interior.maxBroodPerCell.value)
  } else if (wantedInCells < state.broodInCells && state.broodInCells > 0) {
    const factor = wantedInCells / state.broodInCells
    const bounds = nest.pheromoneBounds()
    for (
      let row = Math.max(0, bounds.minRow);
      row <= Math.min(nest.rows - 1, bounds.maxRow);
      row++
    ) {
      for (
        let col = Math.max(0, bounds.minCol);
        col <= Math.min(nest.cols - 1, bounds.maxCol);
        col++
      ) {
        const here = nest.brood.get(col, row)
        if (here > 0) nest.brood.set(col, row, here * factor)
      }
    }
  }
  state.broodInCells = wantedInCells
}
