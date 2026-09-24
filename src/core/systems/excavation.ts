/**
 * Excavation.
 *
 * No ant here has a map, a plan, or any knowledge of the nest as a whole. Each one knows
 * only: whether it digs at all, how often it has bumped into a nestmate lately, how much
 * load the grain in front of it is carrying, how wet the sand is, how strong the building
 * pheromone is where it stands, how far it is from open space — and, as an admitted
 * invention, how deep it is.
 *
 * Everything Tschinkel measured — top-heaviness, helical shafts, chambers a centimetre
 * high whatever their area, branching only above 40 cm, spacing that widens with depth — is
 * meant to fall out of those local rules. Where it does not, that is a finding about the
 * model, not a licence to place structure directly.
 *
 * ## The depth cue, stated plainly
 *
 * Several rules below read the ant's own depth. **No real ant knows its depth.** Tschinkel
 * 2004 proposed a carbon dioxide gradient as the template, having measured a fivefold rise
 * from surface to nest bottom that mirrors the chamber-area distribution almost exactly;
 * Tschinkel 2013 then vented that gradient away and reversed it, and the architecture was
 * unchanged. The hypothesis is dead and nothing has replaced it. Handing an ant its depth
 * is the largest invented element in this model, it is tagged [C], and it is surfaced in
 * the honesty panel. See docs/SCIENCE.md sections 3 and 11.
 */

import { exp, pow } from '../math/approx.js'
import { DEGREES_PER_TURN, cosTurns, sinTurns } from '../math/trig.js'
import { RULE } from '../provenance/rules.js'
import { Burden, Caste, Domain, Task } from '../state/ants.js'
import type { Simulation } from '../sim/simulation.js'
import { type NestGrid } from '../state/nest.js'
import type { SoilModel } from './soil.js'
import type { Params } from '../params/params.js'
import type { Prng } from '../math/prng.js'
import type { AntStore } from '../state/ants.js'

/** State the excavation system needs that outlives a tick, owned by the Simulation. */
export interface ExcavationState {
  readonly nest: NestGrid
  readonly soil: SoilModel
  /** Pellets that have reached the surface, in cells. Feeds the crater and the spoil cue. */
  surfacePellets: number
  /** Pellets dropped underground rather than carried out. About one in forty. */
  redepositedPellets: number
  /**
   * While a colony is founding, the depth its queen is digging to, in centimetres, or 0.
   *
   * A claustral queen sinks a shaft and one chamber to 29-37 cm on her own and then stops.
   * That is a documented behaviour rather than something crowding produces — she has no
   * nestmates to collide with, and the collision rule correctly says a solitary ant has
   * little reason to dig. So founding excavation is its own rule, and it ends when the
   * nest reaches the depth the species digs to.
   */
  foundingTargetDepthCm: number
  /**
   * Ticks a founding queen has spent able to dig: the clock her measured pace is read against.
   * Ticks when the sand in front of her cannot be worked do not count, so a day of saturated
   * sand after rain holds her up rather than letting her make it up in a sprint.
   */
  foundingDigTicks: number
  /**
   * The cell at the bottom of a founding queen's finished shaft, where her chamber opens, or -1
   * until the shaft is finished. Fixed once. Found afresh each tick as the deepest dug cell, it
   * slid sideways with every cell of chamber she opened, and the chamber never stopped growing.
   */
  foundingChamberCol: number
  foundingChamberRow: number
  /**
   * Per-cell ant counts, reused every tick. Allocated once: the hot path must not allocate,
   * and a Map here would also put host hashing between the simulation and its own results.
   */
  readonly occupants: Uint16Array
  /** Ants per density block, reused every tick. See NestGrid.blockVoidCount. */
  readonly blockAnts: Uint16Array
}

/**
 * Digs an incipient nest — a helical shaft to the species' incipient depth with one chamber a
 * centimetre high at its foot — with no ant to dig it.
 *
 * This exists for one caller: a colony that has just moved house. The digging rules cannot
 * start a nest from a single cell, which is why a founding queen has a rule of her own (D27),
 * and a relocating colony has no founding queen.
 *
 * Until D49, `relocation.ts` did that by driving a dead-straight vertical column of cells down
 * from the entrance. Nothing else in this model produces such a thing. Every other shaft here,
 * the founding queen's included, descends at the measured angle for its depth and spirals as it
 * goes (Tschinkel 2004), and the angle steepens from 20-30 degrees near the surface to 45-60 by
 * about 50 cm. A colony moves about once a year, so from its second year onward the nest a
 * reader watches began as a shaft unlike anything the species digs, and it kept that column
 * through everything the workers built around it. Feedback on the published build was that it
 * did not make cleanly stratified nests; this is one of the things behind that, and it is the
 * geometry rather than the digging.
 *
 * The chamber at the foot follows `stepFoundingQueen`: `chamberHeightCm` high, which is [A],
 * and `foundingChamberRunCm` wide, which is invented.
 */
export function digIncipientNest(
  nest: NestGrid,
  soil: SoilModel,
  params: Params,
  prng: Prng,
): void {
  const cell = nest.cellSizeCm
  const incipient = params.nest.incipientDepthCm
  const targetCm = (incipient.min + incipient.max) / 2

  const dig = (col: number, row: number): void => {
    if (!nest.inBounds(col, row)) return
    if (nest.excavate(col, row)) soil.applyVoid(nest, col, row)
  }

  let col = nest.entranceCol
  let row = 0
  let phase = 0
  dig(col, row)

  // Bounded rather than open: a sideways step does not deepen the shaft, so an unlucky run of
  // them must not be able to spin here forever, and a grid shallower than the incipient depth
  // must not hang. Four steps per cell of depth is generous for angles this steep.
  const maxSteps = Math.ceil(targetCm / cell) * 4
  for (let step = 0; step < maxSteps && nest.depthOf(row) < targetCm; step += 1) {
    const depthCm = nest.depthOf(row)
    const descent = descentTurnsAtDepth(depthCm, params, prng)
    const along = cosTurns(descent) * cosTurns(phase)
    let dRow = prng.chance(Math.abs(sinTurns(descent))) ? 1 : 0
    // At the surface she only goes down, or the shaft becomes a trench along the ground. The
    // same guard as the founding queen's.
    const dCol = row > 0 && prng.chance(Math.abs(along)) ? (along >= 0 ? 1 : -1) : 0
    if (dCol === 0) dRow = 1
    phase += helixTurnsPerCm(depthCm, params) * cell

    const nextCol = col + dCol
    const nextRow = row + dRow
    // Against the wall of the grid, carry on straight down rather than stopping.
    col = nest.inBounds(nextCol, nextRow) ? nextCol : col
    row = nest.inBounds(nextCol, nextRow) ? nextRow : Math.min(row + 1, nest.rows - 1)
    dig(col, row)
  }

  // The chamber, opened sideways from the foot of the shaft, on the side the helix points to.
  const direction = cosTurns(phase) >= 0 ? 1 : -1
  const run = Math.max(1, Math.round(params.excavation.foundingChamberRunCm.value / cell))
  const height = Math.max(1, Math.round(params.nest.chamberHeightCm.value / cell))
  for (let k = 1; k < run; k += 1) {
    for (let h = 0; h < height; h += 1) dig(col + direction * k, row - h)
  }
}

/**
 * Draws an individual's permanent digging propensity. Called once, at eclosion.
 *
 * See `AntStore.digger`. The value never changes; what changes is the participation rate it
 * is compared against, which rises with age.
 */
export function assignDiggerTrait(ants: AntStore, slot: number, prng: Prng): void {
  ants.digger[slot] = prng.nextInt(256)
}

/** The fraction of workers of this age that dig, from the penning experiments. */
function participationForAge(sim: Simulation, slot: number): number {
  const { params, ants, clock } = sim
  const p = params.excavation
  const ageDays = ants.ageTicks[slot]! / clock.ticksPerDay
  const old = params.labour.ageAtFirstForagingDaysSummerBorn.value
  const young = old / 3
  if (ageDays >= old) return p.diggingParticipationOld.value
  if (ageDays >= young) return p.diggingParticipationMiddle.value
  return p.diggingParticipationYoung.value
}

/** The sand one grid cell holds, in cubic centimetres: a cell of the slice, one slice thick. */
function cellVolumeCm3(sim: Simulation): number {
  const cell = sim.params.discretisation.nestCellSizeCm.value
  return cell * cell * sim.params.discretisation.sliceThicknessCm.value
}

/**
 * Whether this ant is one of the few diggers who go down to the deepest working face.
 *
 * The rest dig where they are resting, which widens chambers rather than driving the shaft
 * down. Without anybody going down, a growing colony never deepens its nest; with everybody
 * going down, a dozen nanitics sink two metres in their first year. Which ant is which is
 * drawn from her id and never changes, so no ant switches from one to the other. The share is
 * invented and fitted; see docs/DECISIONS.md D28.
 */
export function isDescender(sim: Simulation, slot: number): boolean {
  const hash = Math.imul(sim.ants.id[slot]!, 2654435761) >>> (Uint32Array.BYTES_PER_ELEMENT * 6)
  return hash / 256 < sim.params.excavation.descenderShare.value
}

/** Whether this ant stays where the interior system put her instead of walking to a face. */
function restsHere(sim: Simulation, slot: number): boolean {
  return sim.ants.preferredDepthCm[slot]! > 0 && !isDescender(sim, slot)
}

/** Whether this ant digs at all, right now. Persistent draw, age-dependent threshold. */
export function isDigging(sim: Simulation, slot: number): boolean {
  return sim.ants.digger[slot]! / 256 < participationForAge(sim, slot)
}

/**
 * The angle a shaft descends at, in turns below horizontal, at a given depth.
 *
 * Shallow shafts run at 20 to 30 degrees from horizontal and steepen to 45 to 60 by about
 * 50 cm. Both figures come from the body of Tschinkel 2004; its abstract says 15-20 and 70,
 * and the loader reports that the source disagrees with itself.
 *
 * Reads depth. See the note at the top of this file.
 */
function descentTurnsAtDepth(depthCm: number, params: Params, prng: Prng): number {
  const shallow = params.nest.shaftAngleDegShallow
  const deep = params.nest.shaftAngleDegDeep
  const steepenAt = params.nest.shaftSteepeningDepthCm.value
  const t = Math.min(1, depthCm / steepenAt)
  const lo = shallow.min + (deep.min - shallow.min) * t
  const hi = shallow.max + (deep.max - shallow.max) * t
  const degrees = prng.nextRange(lo, hi)
  return degrees / DEGREES_PER_TURN
}

/** Turns of helix per centimetre of shaft dug, from the measured pitch. */
function helixTurnsPerCm(depthCm: number, params: Params): number {
  const shallow = (params.nest.helixPitchShallowCm.min + params.nest.helixPitchShallowCm.max) / 2
  const deep = params.nest.helixPitchDeepCm.value
  const steepenAt = params.nest.shaftSteepeningDepthCm.value
  const t = Math.min(1, depthCm / steepenAt)
  const pitch = shallow + (deep - shallow) * t
  return 1 / pitch
}

/**
 * Vertical spacing between chambers at a given depth, in centimetres.
 *
 * Read from Figure 10 of Tschinkel 2004: about 3.5 cm between chambers in the first decile,
 * rising to a maximum near 12 cm in the seventh or eighth, then decreasing again in the
 * tenth. The body text of the same paper says 20 to 30 cm deep, which the figure does not
 * support except for one outlying nest, so the figure is used and the parameter file records
 * both.
 *
 * The ant is given its depth as a fraction of mature nest depth, which is a double
 * invention: no ant knows its depth, and none knows how deep the nest will end up. See the
 * note at the top of this file.
 */
function chamberSpacingAtDepth(depthCm: number, params: Params): number {
  const byDecile = params.nest.verticalSpacingByDecileCm.value
  const matureDepth = params.nest.matureDepthCm.max
  // Clamped just inside the last decile so the interpolation never indexes past the end.
  const fraction = Math.min(depthCm / matureDepth, (byDecile.length - 1) / byDecile.length)
  const position = fraction * byDecile.length
  const i = Math.floor(position)
  const t = position - i
  const a = byDecile[i] ?? byDecile[byDecile.length - 1]!
  const b = byDecile[i + 1] ?? a
  return a + (b - a) * t
}

/**
 * The widest a chamber gets at a given depth, in centimetres of horizontal run.
 *
 * Figure 9B gives mean chamber *area*: about 220 cm² in the uppermost deciles of a large
 * nest, falling to about 35 cm² at the bottom — the 5 to 6 fold ratio the text reports. A
 * chamber is roughly circular when small and lobed when large, so the width of an
 * equivalent circle, 2 sqrt(A / pi), is what a vertical slice through it would show: about
 * 17 cm near the surface and 7 cm deep.
 */
function maxChamberRunAtDepth(depthCm: number, params: Params): number {
  const shallow = params.nest.meanChamberAreaShallowCm2.value
  const deep = params.nest.meanChamberAreaDeepCm2.value
  const matureDepth = params.nest.matureDepthCm.max
  const t = Math.min(1, depthCm / matureDepth)
  const area = shallow + (deep - shallow) * t
  return 2 * Math.sqrt(area / Math.PI)
}

/** True when a chamber already sits within the spacing for this depth, above or below. */
function chamberNearby(
  nest: NestGrid,
  col: number,
  row: number,
  spacingCm: number,
  chamberThresholdCm: number,
): boolean {
  const reach = Math.round(spacingCm / nest.cellSizeCm)
  for (let dRow = -reach; dRow <= reach; dRow += 1) {
    if (dRow === 0) continue
    const r = row + dRow
    if (!nest.inBounds(col, r)) continue
    for (let dCol = -2; dCol <= 2; dCol += 1) {
      const c = col + dCol
      if (nest.isChamberCell(c, r, chamberThresholdCm)) return true
    }
  }
  return false
}

/**
 * How willing this ant is to remove the grain in front of it, in [0, 1].
 *
 * Every term is local to the ant. None of them is a plan.
 */
function digWillingness(
  sim: Simulation,
  state: ExcavationState,
  slot: number,
  col: number,
  row: number,
): number {
  const { ants, params } = sim
  const { soil, nest } = state

  // Sand that is too dry or too saturated cannot hold a tunnel at all.
  const workability = soil.workability(col, row)
  if (workability <= 0) return 0

  // Ants take grains that are carrying little load. Force chains arch over the void and
  // shield it; the ant is not sensing the network, only what comes away easily.
  const stress = soil.stressAt(nest, col, row)
  const easeOfRemoval = pow(Math.max(0, 1 - stress), params.excavation.stressSensitivity.value)

  // Each ant modulates its own effort by how often it has just collided with a nestmate,
  // and there is no global regulation of digging anywhere in this model.
  //
  // The direction matters and is easy to get backwards. Avinery et al. found that
  // collisions *agitate* ants into digging: a crowded nest gets enlarged, a roomy one does
  // not. Implementing it the other way round — crowding suppressing digging — let six
  // nanitics excavate a two-metre nest in their first year, because nothing was telling
  // them they already had room. This is also what makes total chamber area track worker
  // number without any ant knowing how many workers there are.
  // The response is non-linear, which matters more than it sounds. Avinery et al. describe
  // a curve that runs constant, then decays rapidly, then tails off — a threshold, not a
  // proportion. With a linear response, eleven nanitics at 1.4 percent occupancy still dug
  // enough over a year to sink a 2.3 m shaft, because 5 percent of a large number is a
  // large number. A Hill response separates a colony of eleven from one of four thousand
  // the way the nests themselves are separated.
  const agitation = ants.agitation[slot]! + params.excavation.collisionDigBaseline.value
  const n = params.excavation.collisionResponseExponent.value
  const half = params.excavation.collisionSaturationCount.value
  const a = pow(agitation, n)
  const crowding = a / (a + pow(half, n))

  // Ants dig less in a tunnel that is already long.
  const lengthFeedback = exp(
    -ants.tunnelLengthCm[slot]! / params.excavation.tunnelLengthFeedbackCm.value,
  )

  // Deposition is amplified where deposition has already happened. This is the parameter
  // Khuong et al. found dominates nest form, and it has no published value for this species.
  const pheromone = nest.building.get(col, row)
  const stigmergy = 1 + pheromone

  // Fresh pellets mark where digging is already under way and attract the next digger.
  const spoil = nest.spoil.get(col, row) * params.excavation.spoilCueWeight.value

  // An ant digs less the more sand she has moved herself. This is the change in the ants that
  // Rasse & Deneubourg 2001 found holding a nest to its colony, and it is what makes the volume
  // a colony digs track the number of ants without any ant knowing either quantity.
  const fatigue = exp(
    -(ants.dugCells[slot]! * cellVolumeCm3(sim)) / params.excavation.diggingFatigueSandCm3.value,
  )

  return workability * easeOfRemoval * crowding * lengthFeedback * stigmergy * (1 + spoil) * fatigue
}

/**
 * How deep a founding queen's nest should be after this many days of digging, in centimetres.
 *
 * The measured depths are joined by straight lines, from nothing at the moment she starts, and
 * after the last measured day the shaft goes on deepening at the last measured rate.
 */
function foundingDepthAllowedCm(days: number, params: Params): number {
  const byDay = params.excavation.foundingQueenDepthByDayCm.value
  if (days <= 0 || byDay.length === 0) return 0
  const whole = Math.floor(days)
  if (whole < byDay.length) {
    const from = whole === 0 ? 0 : byDay[whole - 1]!
    return from + (byDay[whole]! - from) * (days - whole)
  }
  const last = byDay[byDay.length - 1]!
  return last + params.excavation.foundingQueenLateRateCmPerDay.value * (days - byDay.length)
}

/**
 * A founding queen's tick: her shaft, then her one chamber, then nothing more.
 *
 * She digs from the day she lands. Enzmann & Nonacs (2010) watched fully claustral
 * *P. rugosus* queens dig in sand-filled frames: 9.3 cm down after one day, 14.3 after two,
 * 16.3 after three, by then about 5 cm a day. No such series exists for *badius*, so the
 * congener's is used and tagged [B]. Her shaft stops at this colony's incipient depth, which
 * is [A] for *badius* (Tschinkel 2004, 29 to 37 cm). The *rugosus* queens stopped at 17 cm,
 * but their frames held only 19 cm of soil, so that is not taken as a stopping depth.
 *
 * Her depth follows that measured course directly, rather than coming out of a rate of work,
 * for one reason. In this model an ant walks a cell a minute, and a queen alone has nobody to
 * hand a pellet to. Carrying each one to the surface herself, at 30 cm deep, the round trip
 * alone would hold her to a few centimetres a week: the walking pace, not the queen, would
 * set how deep she got. So while she founds, a pellet she digs is counted onto the surface at
 * once. That is an abstraction, and the rule she is shown following says so.
 *
 * The shaft keeps the angles and the helix every other shaft in this model has. The chamber
 * is opened sideways from the bottom of the shaft, a centimetre high, which is [A] for chambers
 * of this species, and as wide as foundingChamberRunCm, which is invented.
 */
function stepFoundingQueen(sim: Simulation, state: ExcavationState, slot: number): void {
  const { ants, params, prng, clock } = sim
  const { nest, soil } = state
  const cell = nest.cellSizeCm
  const col = nest.colOfOffset(ants.x[slot]!)
  const row = nest.rowOfDepth(ants.y[slot]!)
  if (!nest.inBounds(col, row)) return

  if (nest.maxDepthCm < state.foundingTargetDepthCm) {
    if (!soil.isDiggable(col, row + 1)) {
      ants.ruleId[slot] = RULE.digMoistureWindow
      return
    }
    ants.ruleId[slot] = RULE.digFoundingQueen
    state.foundingDigTicks += 1
    const allowed = foundingDepthAllowedCm(state.foundingDigTicks / clock.ticksPerDay, params)
    if (nest.maxDepthCm >= allowed) return

    // Down the helix, at the angle for this depth. At the surface she only goes down, or she
    // would dig a trench along the ground.
    const depthCm = nest.depthOf(row)
    const descent = descentTurnsAtDepth(depthCm, params, prng)
    const along = cosTurns(descent) * cosTurns(ants.helixPhase[slot]!)
    let dRow = prng.chance(Math.abs(sinTurns(descent))) ? 1 : 0
    const dCol = row > 0 && prng.chance(Math.abs(along)) ? (along >= 0 ? 1 : -1) : 0
    if (dCol === 0) dRow = 1
    ants.helixPhase[slot] = ants.helixPhase[slot]! + helixTurnsPerCm(depthCm, params) * cell

    let targetCol = col + dCol
    let targetRow = row + dRow
    if (!nest.isSoil(targetCol, targetRow)) {
      targetCol = col
      targetRow = row + 1
    }
    if (!nest.isSoil(targetCol, targetRow)) return
    foundingQueenDigs(state, ants, slot, targetCol, targetRow)
    return
  }

  // The shaft is done: open the chamber from its bottom, at the pace she was last digging at.
  ants.ruleId[slot] = RULE.digFoundingQueen
  const perTick = params.excavation.foundingQueenLateRateCmPerDay.value / cell / clock.ticksPerDay
  if (!prng.chance(Math.min(1, perTick))) return

  // She is standing in the cell that finished the shaft, which is where the chamber opens.
  if (state.foundingChamberRow < 0) {
    state.foundingChamberCol = col
    state.foundingChamberRow = row
  }
  const bottom = { col: state.foundingChamberCol, row: state.foundingChamberRow }
  const direction = cosTurns(ants.helixPhase[slot]!) >= 0 ? 1 : -1
  const run = Math.max(1, Math.round(params.excavation.foundingChamberRunCm.value / cell))
  const height = Math.max(1, Math.round(params.nest.chamberHeightCm.value / cell))
  for (let k = 1; k < run; k += 1) {
    for (let h = 0; h < height; h += 1) {
      const c = bottom.col + direction * k
      const r = bottom.row - h
      if (!nest.isSoil(c, r)) continue
      if (!soil.isDiggable(c, r)) {
        ants.ruleId[slot] = RULE.digMoistureWindow
        return
      }
      foundingQueenDigs(state, ants, slot, c, r)
      return
    }
  }
  // Nothing left to dig. She stays in her chamber until her daughters open the nest.
}

/** A founding queen removes one cell and stands in the space she made. See stepFoundingQueen. */
function foundingQueenDigs(
  state: ExcavationState,
  ants: AntStore,
  slot: number,
  col: number,
  row: number,
): void {
  const { nest, soil } = state
  if (!nest.excavate(col, row)) return
  soil.applyVoid(nest, col, row)
  nest.building.add(col, row, 1)
  state.surfacePellets += 1
  ants.x[slot] = nest.offsetOf(col)
  ants.y[slot] = nest.depthOf(row)
  ants.tunnelLengthCm[slot] = ants.tunnelLengthCm[slot]! + nest.cellSizeCm
}

/**
 * One excavator's tick.
 *
 * The ant is somewhere in the void. It walks, and where it meets soil it may dig. Which
 * direction it digs is what separates a shaft from a chamber, and that choice is made from
 * the geometry immediately around it.
 */
function stepExcavator(sim: Simulation, state: ExcavationState, slot: number): void {
  const { ants, params, prng } = sim
  const { nest } = state

  const col = nest.colOfOffset(ants.x[slot]!)
  const row = nest.rowOfDepth(ants.y[slot]!)
  if (!nest.inBounds(col, row)) return

  // Carrying a pellet: take it up and out, or drop it underground.
  if (ants.burden[slot] === Burden.SoilPellet) {
    carryPellet(sim, state, slot, col, row)
    return
  }

  // Standing on someone else's relay drop: take it on up.
  if (pickUpSpoil(sim, state, slot, col, row)) return

  const depthCm = nest.depthOf(row)

  // Not at a face: walk through the void, drawn by the building pheromone and by spoil.
  if (!nest.isDigFace(col, row)) {
    if (restsHere(sim, slot)) {
      ants.ruleId[slot] = RULE.digWhereSheRests
      return
    }
    walkInVoid(sim, state, slot, col, row)
    return
  }

  const willingness = digWillingness(sim, state, slot, col, row)
  if (willingness <= 0) {
    ants.ruleId[slot] = RULE.digMoistureWindow
    return
  }

  // Where to dig. A chamber is a lateral extension from the outside of the helix; a shaft
  // is the continuation of the descent. The ant chooses between them from what is around
  // it, not from a plan.
  const clearance = nest.verticalClearanceCm(col, row, params.nest.chamberHeightCm.value * 3)
  const roofHeight = params.nest.chamberHeightCm.value

  // The body-size template: once the ceiling is about a body height above the floor, this
  // ant will not raise it further. That is what holds chamber height near 1 cm however wide
  // the floor becomes.
  const canGrowUpward = clearance < roofHeight

  const phase = ants.helixPhase[slot]!
  const lateralPreference = Math.abs(cosTurns(phase))
  const chamberThreshold = params.nest.shaftBoreDiameterCm.value * 2
  const maxRunHere = maxChamberRunAtDepth(depthCm, params)
  const runHere = nest.horizontalRunCm(col, row, maxRunHere + nest.cellSizeCm)
  const superficial = depthCm <= params.nest.superficialChamberMaxDepthCm.value

  let dCol = 0
  let dRow = 0
  let ratePerTick = 0

  // Is this stretch of wall worth opening a chamber in? A chamber begins where there is not
  // already one within the spacing for this depth. That single rule is what turns a bare
  // shaft into a shaft with chambers along its whole length — and with it, into a nest with
  // hundreds of working faces rather than one at the tip. Without it the colony can never
  // reach the excavation rate Tschinkel measured, because almost nobody can get to work.
  const spacing = chamberSpacingAtDepth(depthCm, params)
  const maxRun = maxRunHere
  const onBareWall = runHere <= chamberThreshold
  const roomForChamber = onBareWall && !chamberNearby(nest, col, row, spacing, chamberThreshold)

  const wantsChamber = superficial
    ? prng.chance(params.excavation.superficialChamberChance.value)
    : roomForChamber
      ? prng.chance(params.excavation.chamberInitiationChance.value * lateralPreference)
      : runHere > chamberThreshold && runHere < maxRun && prng.chance(lateralPreference)

  // An ant in a chamber whose ceiling is still below a body height raises it before she
  // widens the floor. A lateral dig opens one cell, half a body height in this grid, and
  // until D50 the ceiling over it was raised only by chance, so most of every chamber a
  // worker dug stayed one cell high: 0.6 cm in the gate harness, where the species builds
  // 1 cm. The founding queen's chamber was the exception, because her rule digs it at the
  // measured height outright.
  const raiseCeilingFirst = runHere > chamberThreshold && canGrowUpward && nest.isSoil(col, row - 1)

  if (raiseCeilingFirst) {
    dRow = -1
    ratePerTick = cellsPerTickAtFace(sim, slot)
    ants.ruleId[slot] = RULE.digBodySizeTemplate
  } else if (wantsChamber && clearance <= roofHeight) {
    // Lateral: open or widen a chamber. Chambers begin on the outside of the helix, which
    // in a vertical slice is the side the projected lateral component points to.
    dCol = cosTurns(phase) >= 0 ? 1 : -1
    ratePerTick = cellsPerTickAtFace(sim, slot)
    ants.ruleId[slot] = roomForChamber ? RULE.digBodySizeTemplate : RULE.digBuildingPheromone
  } else if (canGrowUpward && prng.chance(params.excavation.ceilingRaiseChance.value)) {
    dRow = -1
    ratePerTick = cellsPerTickAtFace(sim, slot)
    ants.ruleId[slot] = RULE.digBodySizeTemplate
  } else {
    // Descend, at the angle for this depth, spiralling as it goes.
    const descent = descentTurnsAtDepth(depthCm, params, prng)
    const down = sinTurns(descent)
    const along = cosTurns(descent) * cosTurns(phase)
    dRow = prng.chance(Math.abs(down)) ? 1 : 0
    dCol = prng.chance(Math.abs(along)) ? (along >= 0 ? 1 : -1) : 0
    if (dRow === 0 && dCol === 0) dRow = 1
    ratePerTick = cellsPerTickAtFace(sim, slot)
    ants.ruleId[slot] = RULE.digShaftDescent
    ants.helixPhase[slot] = phase + helixTurnsPerCm(depthCm, params) * nest.cellSizeCm
  }

  const targetCol = col + dCol
  const targetRow = row + dRow
  if (!nest.isSoil(targetCol, targetRow)) {
    // The direction this ant chose is already open. It moves on rather than standing there.
    // Returning instead was the defect that pinned the whole colony at the entrance: every
    // ant was technically at a face, because the surface cell has soil either side of it,
    // chose to dig downward into the shaft that was already there, and did nothing — for
    // forty simulated days.
    if (restsHere(sim, slot)) {
      ants.ruleId[slot] = RULE.digWhereSheRests
      return
    }
    walkInVoid(sim, state, slot, col, row)
    return
  }

  // The body-size template, applied to the cell about to be removed. A lateral dig may not
  // raise a ceiling past about a body height above the floor. Shafts are exempt: a
  // descending shaft is a tall void by definition. This is what holds chamber height near
  // 1 cm however wide the floor becomes.
  // Descent is exempt only from a shaft tip. An ant standing on a chamber floor is not
  // sinking a shaft, it is deepening a chamber, and the template applies: a chamber is a
  // centimetre high whatever its floor area. Exempting every downward dig let chambers at
  // adjacent depths merge vertically and pushed the measured height to 1.7 cm.
  const inChamber = runHere > chamberThreshold
  const templateApplies = dRow <= 0 || inChamber

  if (
    templateApplies &&
    nest.clearanceIfExcavatedCm(targetCol, targetRow, roofHeight) > roofHeight
  ) {
    // The ceiling here is already a body height up, so this ant will not raise it. It does
    // not stand idle: it turns to the shaft instead. Returning here was a real defect —
    // four dig opportunities in five were chosen laterally in the superficial zone and then
    // thrown away against the roof rule, and the nest could not deepen past 8 cm.
    dCol = 0
    dRow = 1
    ratePerTick = cellsPerTickAtFace(sim, slot)
    ants.ruleId[slot] = RULE.digShaftDescent
    if (!nest.isSoil(col, row + 1)) {
      if (restsHere(sim, slot)) {
        ants.ruleId[slot] = RULE.digWhereSheRests
        return
      }
      walkInVoid(sim, state, slot, col, row)
      return
    }
    return digCell(sim, state, slot, col, row, col, row + 1, willingness, ratePerTick)
  }

  digCell(sim, state, slot, col, row, targetCol, targetRow, willingness, ratePerTick)
}

/**
 * Commits one dig, if the ant's rate of work allows it this tick.
 *
 * Tschinkel penned workers and weighed what they moved: 0.45 cm² of chamber and 0.13 cm of
 * shaft per old worker-day, a third of that for young ones. Without this an ant digs on
 * every tick it stands at a face, which is about a thousand times too fast and produces a
 * cavern rather than a nest — 134 cm of vertical clearance where the species builds 1 cm.
 * The local rules decide *where* an ant digs; this decides how often.
 */
function digCell(
  sim: Simulation,
  state: ExcavationState,
  slot: number,
  fromCol: number,
  fromRow: number,
  targetCol: number,
  targetRow: number,
  willingness: number,
  ratePerTick: number,
): void {
  const { ants, prng } = sim
  const { nest, soil } = state
  void fromCol
  void fromRow

  if (!prng.chance(Math.min(1, willingness * ratePerTick))) {
    // Which of the two brakes stopped her, so a reader who clicks on her is told the truth.
    const moved = ants.dugCells[slot]! * cellVolumeCm3(sim)
    ants.ruleId[slot] =
      moved > sim.params.excavation.diggingFatigueSandCm3.value
        ? RULE.digFatigue
        : RULE.digCollisionAgitation
    return
  }
  if (!soil.isDiggable(targetCol, targetRow)) {
    ants.ruleId[slot] = RULE.digMoistureWindow
    return
  }
  if (!nest.excavate(targetCol, targetRow)) return
  soil.applyVoid(nest, targetCol, targetRow)

  // Building pheromone goes into the material as it is moved, which is what amplifies
  // digging wherever digging has already happened.
  nest.building.add(targetCol, targetRow, 1)
  ants.burden[slot] = Burden.SoilPellet
  ants.carriedCm[slot] = 0
  ants.dugCells[slot] = ants.dugCells[slot]! + 1
  ants.x[slot] = nest.offsetOf(targetCol)
  ants.y[slot] = nest.depthOf(targetRow)
  ants.tunnelLengthCm[slot] = ants.tunnelLengthCm[slot]! + nest.cellSizeCm
}

/**
 * Cells this ant removes per tick, while it is actually standing at a face.
 *
 * This is not the per-worker-day figure from the penning experiments, and the difference
 * matters. Tschinkel's 0.45 cm² of chamber and 0.13 cm of shaft per worker-day are averages
 * over every penned worker, most of whom were not at a face at any given moment — the same
 * paper reports that only 82 percent of old workers and 19 percent of young ones ever came
 * up carrying sand. Applying that average to an ant that *is* at a face counts the queueing
 * twice. Doing exactly that is why the first version of this model reached 21 cm in forty
 * simulated days against a species that builds three metres.
 *
 * The physical rate is in the same paper: a worker moves 300 to 400 times its own weight in
 * sand per day while excavating. With a worker mass and the bulk density of sand that is a
 * volume, and with a slice thickness it is a number of cells.
 *
 * The colony-average figures are still the right check on the *result*, and G1 in
 * docs/VALIDATION.md holds the model to them.
 */
function cellsPerTickAtFace(sim: Simulation, slot: number): number {
  const { params, ants, clock } = sim
  const bodyWeights =
    (params.excavation.sandPerWorkerPerDayBodyWeights.min +
      params.excavation.sandPerWorkerPerDayBodyWeights.max) /
    2
  const massMg =
    ants.caste[slot] === Caste.MajorWorker
      ? params.colony.majorWorkerDryMassMg.value
      : params.colony.minorWorkerDryMassMg.value

  // Milligrams of sand per day, to cubic centimetres. Bulk density is kg per cubic metre,
  // which is the same number as grams per litre, so mg / density gives cm3 directly.
  const sandCm3PerDay = (bodyWeights * massMg) / params.soil.bulkDensityKgPerM3.value

  const cell = params.discretisation.nestCellSizeCm.value
  const cellVolumeCm3 = cell * cell * params.discretisation.sliceThicknessCm.value

  // Young workers dig at about a third the rate of old ones, in the same proportion the
  // penning experiment found between age groups.
  const ageScale = isOldWorker(sim, slot)
    ? 1
    : params.excavation.chamberAreaPerYoungWorkerDayCm2.value /
      params.excavation.chamberAreaPerOldWorkerDayCm2.value

  return (sandCm3PerDay / cellVolumeCm3 / clock.ticksPerDay) * ageScale
}

function isOldWorker(sim: Simulation, slot: number): boolean {
  const ageDays = sim.ants.ageTicks[slot]! / sim.clock.ticksPerDay
  return ageDays >= sim.params.labour.ageAtFirstForagingDaysSummerBorn.value
}

/**
 * Walks an unburdened ant through open space toward somewhere worth digging.
 *
 * Three local cues, and no map. Gravity, which every ant has and which is the only reason
 * a colony that starts at the surface ever gets to three metres. The building pheromone,
 * which concentrates work where work is already happening. And fresh spoil, which marks
 * where a face is being worked right now.
 *
 * Without the downward bias the first version of this model spread sideways into a pancake
 * and reached 17 cm in twenty simulated days: every ant stayed near the entrance because
 * that was where the pheromone was, and nobody ever walked down to the frontier.
 */
function walkInVoid(
  sim: Simulation,
  state: ExcavationState,
  slot: number,
  col: number,
  row: number,
): void {
  const { ants, prng, params } = sim
  const { nest } = state

  let bestCol = col
  let bestRow = row
  let bestScore = -Infinity
  const spoilWeight = params.excavation.spoilCueWeight.value

  for (let dRow = -1; dRow <= 1; dRow += 1) {
    for (let dCol = -1; dCol <= 1; dCol += 1) {
      if (dCol === 0 && dRow === 0) continue
      const c = col + dCol
      const r = row + dRow
      if (!nest.isVoid(c, r)) continue

      // Geotaxis. An unburdened digger heads down.
      let score = dRow * params.excavation.geotaxisWeight.value
      score += nest.building.get(c, r)
      score += nest.spoil.get(c, r) * spoilWeight
      // A face is somewhere it can actually work.
      if (nest.isDigFace(c, r)) score += params.excavation.digFaceAttraction.value
      // An ant will not push into a space that is already full of nestmates. This is the
      // same collision signal that regulates digging, applied to movement, and it is what
      // keeps a young nest from having its entire workforce jammed into ten cells: those
      // who cannot get in wait on the surface until there is room, and filter down as the
      // nest grows.
      score -= (state.occupants[nest.index(c, r)] ?? 0) * params.excavation.crowdAvoidance.value
      score += prng.nextFloat() * params.excavation.walkNoise.value

      if (score > bestScore) {
        bestScore = score
        bestCol = c
        bestRow = r
      }
    }
  }

  if (bestScore === -Infinity) return
  ants.x[slot] = nest.offsetOf(bestCol)
  ants.y[slot] = nest.depthOf(bestRow)
  ants.tunnelLengthCm[slot] = 0
  ants.ruleId[slot] =
    nest.spoil.get(bestCol, bestRow) > 0 ? RULE.digSpoilCue : RULE.digBuildingPheromone
}

/**
 * Moving a pellet out of the nest.
 *
 * Sand travels upward in stages, not with one ant carrying it face to surface. Tschinkel &
 * Seal 2015 established the staged transport for this species; Pielström & Roces described
 * the three-tier split of carriers in *Atta*. A carrier here takes a pellet a short way up,
 * puts it down, and someone else takes it on — which is both what the papers describe and
 * what makes the nest reachable at all. With every ant hauling its own pellet the full
 * depth, a three-metre round trip is ten simulated hours and excavation grinds to a stop.
 *
 * About one pellet in forty is never handed on at all and is dumped underground, mostly in
 * the top 30 to 40 cm.
 */
function carryPellet(
  sim: Simulation,
  state: ExcavationState,
  slot: number,
  col: number,
  row: number,
): void {
  const { ants, prng, params } = sim
  const { nest } = state

  if (row === 0) {
    ants.burden[slot] = Burden.Nothing
    state.surfacePellets += 1
    ants.ruleId[slot] = RULE.carryPelletLong
    ants.tunnelLengthCm[slot] = 0
    ants.carriedCm[slot] = 0
    walkInVoid(sim, state, slot, col, row)
    return
  }

  if (prng.chance(params.excavation.undergroundRedepositionFraction.value)) {
    nest.spoil.add(col, row, 1)
    ants.burden[slot] = Burden.Nothing
    ants.carriedCm[slot] = 0
    state.redepositedPellets += 1
    ants.ruleId[slot] = RULE.redepositUnderground
    walkInVoid(sim, state, slot, col, row)
    return
  }

  // Hand the pellet on: put it down as spoil for the next carrier to pick up, then step
  // off it. Without that step the same ant finds the pellet again on the next tick and
  // picks it up, and the whole colony ends up shuttling one heap back and forth instead of
  // digging — which is exactly what the first version did.
  if (ants.carriedCm[slot]! >= params.excavation.relayDistanceCm.value) {
    nest.spoil.add(col, row, 1)
    ants.burden[slot] = Burden.Nothing
    ants.carriedCm[slot] = 0
    ants.ruleId[slot] = RULE.carryPelletShort
    walkInVoid(sim, state, slot, col, row)
    return
  }

  // Upward, preferring open space.
  let bestCol = col
  let bestRow = row
  let found = false
  for (const dCol of [0, -1, 1]) {
    if (nest.isVoid(col + dCol, row - 1)) {
      bestCol = col + dCol
      bestRow = row - 1
      found = true
      break
    }
  }
  if (!found) {
    for (const dCol of [-1, 1]) {
      if (nest.isVoid(col + dCol, row)) {
        bestCol = col + dCol
        bestRow = row
        found = true
        break
      }
    }
  }
  if (!found) {
    // Nowhere to go with it. Put it down where it stands.
    nest.spoil.add(col, row, 1)
    ants.burden[slot] = Burden.Nothing
    ants.carriedCm[slot] = 0
    return
  }

  ants.x[slot] = nest.offsetOf(bestCol)
  ants.y[slot] = nest.depthOf(bestRow)
  ants.carriedCm[slot] = ants.carriedCm[slot]! + nest.cellSizeCm
  ants.ruleId[slot] = RULE.carryPelletShort
}

/**
 * An ant standing on spoil that is not carrying anything picks it up and takes it further.
 * This is the other half of staged transport: without it the relay drops would just pile up.
 */
function pickUpSpoil(
  sim: Simulation,
  state: ExcavationState,
  slot: number,
  col: number,
  row: number,
): boolean {
  const { ants, prng } = sim
  const { nest } = state
  if (nest.spoil.get(col, row) < 1) return false
  // Not everyone who walks over a pellet picks it up, or the colony would be all carriers
  // and no diggers. The rest read it as a cue that a face is being worked nearby.
  if (!prng.chance(sim.params.excavation.relayPickUpChance.value)) return false
  nest.spoil.add(col, row, -1)
  ants.burden[slot] = Burden.SoilPellet
  ants.carriedCm[slot] = 0
  ants.ruleId[slot] = RULE.carryPelletShort
  return true
}

/**
 * The excavation system. Registered once; runs every tick.
 *
 * Collisions are counted from cell co-occupancy, which is the only crowding signal an ant
 * has and the only thing regulating its digging effort.
 */
export function makeExcavationSystem(state: ExcavationState) {
  return (sim: Simulation): void => {
    const { ants, params } = sim
    const { nest } = state

    // Agitation decays toward zero with the measured half-life.
    const decay = exp(-Math.LN2 / params.excavation.collisionAgitationHalfLifeTicks.value)

    // Count how many ants occupy each cell, so collisions are a consequence of where ants
    // actually are rather than a global density term.
    const { occupants, blockAnts } = state
    occupants.fill(0)
    blockAnts.fill(0)
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const col = nest.colOfOffset(ants.x[i]!)
      const row = nest.rowOfDepth(ants.y[i]!)
      if (!nest.inBounds(col, row)) continue
      occupants[nest.index(col, row)]! += 1
      blockAnts[nest.blockIndex(col, row)]! += 1
    }

    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const col = nest.colOfOffset(ants.x[i]!)
      const row = nest.rowOfDepth(ants.y[i]!)
      // How crowded it is around this ant: nestmates per unit of open space, over a
      // neighbourhood a few centimetres across rather than over one grid cell. A cell is
      // smaller than an ant, so cell co-occupancy is a rounding artefact and reports every
      // narrow shaft as packed. The surface is open ground and nobody is crowded there.
      let density = 0
      if (nest.inBounds(col, row) && row > 0) {
        const block = nest.blockIndex(col, row)
        const space = nest.blockVoidCount[block]!
        if (space > 0) density = (blockAnts[block]! - 1) / space
      }

      // An exponential moving average, so this is a rate rather than a running total.
      // Accumulating instead made agitation reach tens of thousands within a day.
      ants.agitation[i] = ants.agitation[i]! * decay + density * (1 - decay)

      // Foragers are outside. Everyone else who digs, digs.
      if (ants.task[i] === Task.Forager) continue
      // An ant with a seed or a piece of brood in its mandibles is not digging with them.
      // Before this line existed, a worker carrying a seed down the shaft dug on the way and
      // the dig replaced the seed in its jaws with a pellet of sand: the seed simply ceased
      // to exist. Sand is the exception, because moving sand is what digging is.
      if (ants.burden[i] !== Burden.Nothing && ants.burden[i] !== Burden.SoilPellet) continue
      if (ants.caste[i] === Caste.Queen) {
        // A founding queen digs her own shaft and chamber. Once her daughters are working
        // she never digs again, and she belongs to the interior system: she sits deep in
        // the nest and lays. Before this guard existed she went on wandering and digging
        // for the whole life of the colony.
        if (state.foundingTargetDepthCm <= 0) continue
        stepFoundingQueen(sim, state, i)
        continue
      } else if (!isDigging(sim, i)) {
        continue
      }

      // Digging does not overwrite the ant's task. Task is its place in the one-way
      // age progression — brood care, transfer work, foraging — and excavation is something
      // workers of every age do; Tschinkel measured it across all three groups. Setting
      // task to Excavator here clobbered the demographic role every tick, which among other
      // things made the forager count read a third of its true value.
      stepExcavator(sim, state, i)
    }

    if (sim.clock.tick % params.pheromones.diffusionIntervalTicks.value === 0) {
      const interval = params.pheromones.diffusionIntervalTicks.value
      nest.decayPheromones(
        pow(params.pheromones.building.decayPerTick.value, interval),
        params.pheromones.building.diffusion.value,
        pow(params.pheromones.building.decayPerTick.value, interval),
      )
    }
  }
}
