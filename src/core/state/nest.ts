/**
 * The nest: what has been dug, and the means to measure it.
 *
 * The nest is not a data structure of shafts and chambers. It is a grid of cells that are
 * either soil or void, and everything anyone would call a shaft or a chamber is a shape
 * that emerged in that grid. Nothing here builds architecture; this file only records what
 * was dug and knows how to measure it afterwards.
 *
 * The measurement half exists because the model has to be held to Tschinkel's numbers, and
 * those numbers are three-dimensional. See docs/VALIDATION.md for how a slice statistic is
 * mapped onto a measurement of a real nest.
 */

import { Grid2D } from './grid.js'
import type { GridBounds } from './grid.js'
import type { Params } from '../params/params.js'

export const SOIL = 0
export const VOID = 1

export class NestGrid {
  /** SOIL or VOID, one byte per cell. */
  readonly occupancy: Uint8Array
  /** Freshly excavated pellets dumped underground, which is where the next digger looks. */
  readonly spoil: Grid2D
  /** Building pheromone, added to excavated material. Its lifetime dominates nest form. */
  readonly building: Grid2D
  /**
   * Seeds in store, per cell, every size class together.
   *
   * The colony's food, where the colony actually put it. Foragers drop seeds in the
   * topmost chambers and transfer workers carry them down into the seed-chamber band, so
   * this grid is the record of that traffic rather than a granary anyone laid out.
   * See docs/SCIENCE.md section 6.
   *
   * It is the sum of `seedsByClass` in the same cell. Write through `addSeed` and
   * `takeSeed` rather than to either grid directly, so the two cannot come apart.
   */
  readonly seeds: Grid2D
  /** Seeds in store per cell, one layer per size class, in the order of `params.seeds.sizeClassNames`. */
  readonly seedsByClass: readonly Grid2D[]
  /**
   * Seeds that have germinated in the store and have not yet been found, per cell, and the
   * food they hold, in milligrams. A germinating seed splits its own husk, which is the only
   * way the ants ever eat a seed too large to open. See systems/seeds.ts.
   */
  readonly germinating: Grid2D
  readonly germinatingMg: Grid2D
  /**
   * Brood in the nest, per cell, as a count of eggs, larvae and pupae together.
   *
   * The *demography* of the brood — how many of each stage, how old, what each cohort is
   * destined to become — lives in BroodStore and is authoritative. This grid holds only
   * where that same brood is being kept, which is a separate question and one the ants
   * answer by carrying it. The two are reconciled once a day; see systems/interior.ts.
   */
  readonly brood: Grid2D
  /** Dead ants lying where they died, per cell, until a worker carries them out. */
  readonly corpses: Grid2D

  readonly cols: number
  readonly rows: number
  readonly cellSizeCm: number

  /** Column the nest entrance sits in. The only place the two spatial domains meet. */
  readonly entranceCol: number

  /** Cells excavated so far, for the excavation-volume relations. */
  excavatedCells = 0
  /** Deepest excavated row reached, so depth does not need a scan. */
  deepestRow = 0

  /**
   * Void cells per density block, maintained incrementally as cells are excavated.
   *
   * Crowding has to be measured over a neighbourhood an ant could actually walk, not over a
   * single grid cell: a cell is 5 mm across and a minor worker is 6.35 mm long, so two ants
   * in adjacent cells are touching. Counting co-occupancy of one cell reports a narrow
   * shaft as permanently crowded, which through the collision rule tells the colony to keep
   * digging — a runaway that had seven nanitics excavating a 2.7 m nest in their first year.
   */
  readonly blockVoidCount: Uint16Array
  readonly blockCols: number
  readonly blockRows: number
  readonly blockSize: number

  private readonly scratch: Float32Array

  /**
   * The rectangle of cells that has ever been excavated, and therefore the only region
   * that can hold pheromone or spoil: every deposit in the model happens at a cell an ant
   * is standing in, and an ant underground stands in a void.
   *
   * It is kept so that the decay sweep costs the size of the nest rather than the size of
   * the grid. Before it existed, a colony of eleven nanitics in a 1000-cell burrow paid
   * for 256 000 cells of diffusion every ten ticks, which was more than half the total
   * runtime of the simulation at every colony size. See docs/DECISIONS.md D19.
   *
   * Empty until the first cell is dug, which `minCol > maxCol` records.
   */
  private activeMinCol: number
  private activeMaxCol = -1
  private activeMinRow: number
  private activeMaxRow = -1

  /** How far past the excavated region the decay sweep reaches. See `activeMinCol`. */
  private readonly haloCells: number

  constructor(params: Params) {
    const cell = params.discretisation.nestCellSizeCm.value
    const widthCm = params.discretisation.nestWidthCm.value
    this.cols = Math.round(widthCm / cell)
    this.rows = Math.round(params.discretisation.nestDepthCm.value / cell)
    this.cellSizeCm = cell
    this.occupancy = new Uint8Array(this.cols * this.rows)
    this.spoil = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.building = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.seeds = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.seedsByClass = params.seeds.sizeClassNames.value.map(
      () => new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0),
    )
    this.germinating = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.germinatingMg = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.brood = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.corpses = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.entranceCol = Math.floor(this.cols / 2)
    this.blockSize = Math.max(1, Math.round(params.excavation.crowdingRadiusCm.value / cell))
    this.blockCols = Math.ceil(this.cols / this.blockSize)
    this.blockRows = Math.ceil(this.rows / this.blockSize)
    this.blockVoidCount = new Uint16Array(this.blockCols * this.blockRows)
    this.scratch = new Float32Array(this.cols * this.rows)
    this.activeMinCol = this.cols
    this.activeMinRow = this.rows
    this.haloCells = Math.max(1, Math.round(params.discretisation.pheromoneHaloCells.value))
  }

  /**
   * The excavated rectangle grown by the halo, which is the region the pheromone layers
   * are swept over. Outside it every cell is zero and stays zero.
   */
  pheromoneBounds(): GridBounds {
    return {
      minCol: this.activeMinCol - this.haloCells,
      minRow: this.activeMinRow - this.haloCells,
      maxCol: this.activeMaxCol + this.haloCells,
      maxRow: this.activeMaxRow + this.haloCells,
    }
  }

  index(col: number, row: number): number {
    return row * this.cols + col
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows
  }

  isVoid(col: number, row: number): boolean {
    return this.inBounds(col, row) && this.occupancy[row * this.cols + col] === VOID
  }

  isSoil(col: number, row: number): boolean {
    return this.inBounds(col, row) && this.occupancy[row * this.cols + col] === SOIL
  }

  /** Depth in centimetres of the centre of a row. */
  depthOf(row: number): number {
    return (row + 0.5) * this.cellSizeCm
  }

  rowOfDepth(depthCm: number): number {
    return Math.floor(depthCm / this.cellSizeCm)
  }

  /** Horizontal offset in centimetres from the entrance, for a column. */
  offsetOf(col: number): number {
    return (col - this.entranceCol) * this.cellSizeCm
  }

  colOfOffset(offsetCm: number): number {
    return this.entranceCol + Math.round(offsetCm / this.cellSizeCm)
  }

  /** Turns a soil cell into a void. Returns false if it was already void or out of bounds. */
  excavate(col: number, row: number): boolean {
    if (!this.isSoil(col, row)) return false
    this.occupancy[row * this.cols + col] = VOID
    this.excavatedCells += 1
    this.blockVoidCount[this.blockIndex(col, row)]! += 1
    if (row > this.deepestRow) this.deepestRow = row
    if (col < this.activeMinCol) this.activeMinCol = col
    if (col > this.activeMaxCol) this.activeMaxCol = col
    if (row < this.activeMinRow) this.activeMinRow = row
    if (row > this.activeMaxRow) this.activeMaxRow = row
    return true
  }

  /**
   * Bumped whenever the nest is filled back in, so anything that caches the shape of the
   * burrows can tell the new nest from the old one.
   */
  generation = 0

  /**
   * Fills the whole nest back in: solid sand everywhere, nothing stored, no pheromone. Used when
   * a colony moves and starts a new nest; the grid stays the same object so every system that
   * holds it keeps working.
   */
  clearToSoil(): void {
    this.occupancy.fill(SOIL)
    for (const grid of [
      this.spoil,
      this.building,
      this.seeds,
      ...this.seedsByClass,
      this.germinating,
      this.germinatingMg,
      this.brood,
      this.corpses,
    ]) {
      grid.data.fill(0)
    }
    this.excavatedCells = 0
    this.deepestRow = 0
    this.blockVoidCount.fill(0)
    this.activeMinCol = this.cols
    this.activeMaxCol = -1
    this.activeMinRow = this.rows
    this.activeMaxRow = -1
    this.generation += 1
  }

  /** Index of the density block a cell belongs to. */
  blockIndex(col: number, row: number): number {
    return Math.floor(row / this.blockSize) * this.blockCols + Math.floor(col / this.blockSize)
  }

  /**
   * The deepest excavated cell, where a newly eclosed worker belongs.
   *
   * Callows eclose in the bottom chambers of the nest *as it exists*, which is not the same
   * as the depth a mature nest will reach. Placing them at the mature depth put every new
   * adult inside solid sand, where it could neither move nor dig, and the colony grew to
   * five thousand workers without deepening its nest past three centimetres.
   */
  deepestVoid(): { col: number; row: number } {
    for (let row = this.deepestRow; row >= 0; row -= 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.isVoid(col, row)) return { col, row }
      }
    }
    return { col: this.entranceCol, row: 0 }
  }

  /**
   * A void cell somewhere in the lower part of the nest, chosen from the seeded stream.
   *
   * New adults have to be spread across the deep chambers rather than stacked in one cell.
   * Putting them all in the single deepest cell made every one of them permanently
   * overcrowded, which through the collision rule shut digging off across the whole colony:
   * five thousand workers and a nest three centimetres deep.
   */
  deepVoidNear(fraction: number, pick: number): { col: number; row: number } {
    const lowest = this.deepestRow
    const from = Math.floor(lowest * (1 - fraction))
    const candidates: { col: number; row: number }[] = []
    for (let row = lowest; row >= from && candidates.length < 256; row -= 1) {
      for (let col = 0; col < this.cols; col += 1) {
        if (this.isVoid(col, row)) candidates.push({ col, row })
      }
    }
    if (candidates.length === 0) return { col: this.entranceCol, row: 0 }
    return candidates[Math.min(candidates.length - 1, Math.floor(pick * candidates.length))]!
  }

  /** Maximum depth of the nest in centimetres. */
  get maxDepthCm(): number {
    return this.excavatedCells === 0 ? 0 : this.depthOf(this.deepestRow)
  }

  /**
   * Vertical clearance at a cell: how many contiguous void cells lie directly above and
   * below it, in centimetres.
   *
   * This is the quantity the body-size template acts on. An ant enlarging a chamber stops
   * digging upward once the ceiling is about a body height above the floor, which is what
   * makes chamber height roughly 1 cm no matter how large the chamber's floor becomes.
   */
  verticalClearanceCm(col: number, row: number, limitCm = Infinity): number {
    if (!this.isVoid(col, row)) return 0
    const limit = limitCm === Infinity ? this.rows : Math.ceil(limitCm / this.cellSizeCm) + 1
    let count = 1
    for (let r = row - 1; r >= 0 && count <= limit && this.isVoid(col, r); r -= 1) count += 1
    for (let r = row + 1; r < this.rows && count <= limit && this.isVoid(col, r); r += 1) count += 1
    return count * this.cellSizeCm
  }

  /**
   * Length in centimetres of the contiguous horizontal run of void through a cell.
   *
   * `limitCm` stops the scan early. Callers that only need to know whether a run exceeds a
   * threshold should pass it: this sits on the hottest path in the model and an unbounded
   * scan is O(chamber width) on every ant on every tick.
   */
  horizontalRunCm(col: number, row: number, limitCm = Infinity): number {
    if (!this.isVoid(col, row)) return 0
    const limit = limitCm === Infinity ? this.cols : Math.ceil(limitCm / this.cellSizeCm) + 1
    let count = 1
    for (let c = col - 1; c >= 0 && count <= limit && this.isVoid(c, row); c -= 1) count += 1
    for (let c = col + 1; c < this.cols && count <= limit && this.isVoid(c, row); c += 1) count += 1
    return count * this.cellSizeCm
  }

  /**
   * Whether this cell belongs to a chamber rather than a shaft: its horizontal run is wider
   * than `thresholdCm`. Tschinkel's own distinction, and cheap because the scan stops as
   * soon as the answer is known.
   */
  isChamberCell(col: number, row: number, thresholdCm: number): boolean {
    return this.horizontalRunCm(col, row, thresholdCm + this.cellSizeCm) > thresholdCm
  }

  /**
   * Vertical clearance a cell *would* have if it were dug out.
   *
   * The body-size template has to be applied to the cell about to be removed, not to the
   * one the ant is standing in. Checking the wrong cell lets a chamber grow to any height
   * as long as each individual dig started somewhere thin, which is exactly what happened
   * the first time: chambers came out 13 cm tall instead of 1 cm.
   */
  clearanceIfExcavatedCm(col: number, row: number, limitCm = Infinity): number {
    // The callers only ever ask whether the clearance exceeds a body height, so the scan
    // stops as soon as it does. Walking the full column instead made this O(nest depth) on
    // the hottest path in the model and dominated the run time.
    const limit = limitCm === Infinity ? this.rows : Math.ceil(limitCm / this.cellSizeCm) + 1
    let count = 1
    for (let r = row - 1; r >= 0 && count <= limit && this.isVoid(col, r); r -= 1) count += 1
    for (let r = row + 1; r < this.rows && count <= limit && this.isVoid(col, r); r += 1) count += 1
    return count * this.cellSizeCm
  }

  /** True when this void cell has at least one soil neighbour: somewhere an ant can dig. */
  isDigFace(col: number, row: number): boolean {
    if (!this.isVoid(col, row)) return false
    return (
      this.isSoil(col - 1, row) ||
      this.isSoil(col + 1, row) ||
      this.isSoil(col, row - 1) ||
      this.isSoil(col, row + 1)
    )
  }

  decayPheromones(buildingDecay: number, buildingDiffusion: number, spoilDecay: number): void {
    if (this.activeMinCol > this.activeMaxCol) return
    const bounds = this.pheromoneBounds()
    this.building.decayAndDiffuse(buildingDecay, buildingDiffusion, this.scratch, bounds)
    // Spoil does not diffuse. A pellet heap is where it was put.
    this.spoil.decayWithin(spoilDecay, bounds)
  }

  /** Adds seeds of one size class to a cell, keeping the all-class total in step. */
  addSeed(sizeClass: number, col: number, row: number, amount: number): void {
    this.seedsByClass[sizeClass]!.add(col, row, amount)
    this.seeds.add(col, row, amount)
  }

  /**
   * Takes one seed out of a cell and returns its size class.
   *
   * The class is chosen in proportion to what the cell holds, from `pick` in [0, 1), so an
   * ant reaching into a pile takes what the pile is mostly made of. Counts are fractional —
   * a day's germination and eating take a fraction of a cell — so a class holding less than
   * a whole seed gives what it has and the rest comes from the classes after it. The count
   * taken is the same either way; only which layer it comes out of differs.
   */
  takeSeed(col: number, row: number, pick: number): number {
    const layers = this.seedsByClass
    let held = 0
    for (const layer of layers) held += Math.max(0, layer.get(col, row))
    const taking = Math.min(1, this.seeds.get(col, row))
    this.seeds.add(col, row, -taking)
    if (held <= 0) return 0

    let target = pick * held
    let chosen = layers.length - 1
    for (let c = 0; c < layers.length; c += 1) {
      const here = Math.max(0, layers[c]!.get(col, row))
      if (target < here) {
        chosen = c
        break
      }
      target -= here
    }

    let left = taking
    for (let k = 0; k < layers.length && left > 0; k += 1) {
      const layer = layers[(chosen + k) % layers.length]!
      const taken = Math.min(Math.max(0, layer.get(col, row)), left)
      layer.add(col, row, -taken)
      left -= taken
    }
    return chosen
  }

  buffers(): ArrayBufferView[] {
    return [
      this.occupancy,
      this.spoil.data,
      this.building.data,
      this.seeds.data,
      ...this.seedsByClass.map((layer) => layer.data),
      this.germinating.data,
      this.germinatingMg.data,
      this.brood.data,
      this.corpses.data,
    ]
  }
}

// ---------------------------------------------------------------------------------------
// Measurement
// ---------------------------------------------------------------------------------------

export interface NestMeasurement {
  readonly maxDepthCm: number
  readonly excavatedCells: number
  /**
   * Chamber cross-section per depth decile, in centimetres of horizontal run.
   *
   * This is the slice-native stand-in for Tschinkel's chamber area per decile. A chamber in
   * a vertical slice is a horizontal run, not an area, so what is compared between model
   * and paper is the *shape* of the depth distribution rather than absolute area. Tagged
   * [C] as a mapping. See docs/VALIDATION.md.
   */
  readonly chamberRunPerDecile: readonly number[]
  /**
   * Void cells wide enough to look like chamber but taller than they are wide: the shaft
   * where it passes through a chamber. Excluded from every chamber statistic here, and
   * reported so that the exclusion is visible. See `isChamberVoidCm`.
   */
  readonly shaftCellsInChamberRuns: number
  /** Fraction of total chamber run lying in the shallowest quarter of the nest. */
  readonly topQuarterShare: number
  /** Proportional decrease in chamber run from each decile to the next. */
  readonly decileDecrease: readonly number[]
  /** Mean vertical clearance of chamber cells, in centimetres. Should sit near 1 cm. */
  readonly meanChamberHeightCm: number
  /** Mean vertical clearance in the shallowest and deepest thirds, to check independence. */
  readonly chamberHeightShallowCm: number
  readonly chamberHeightDeepCm: number
  /** Mean vertical gap between successive chambers, shallow and deep. */
  readonly verticalSpacingShallowCm: number
  readonly verticalSpacingDeepCm: number
  /** Number of separate descending shaft series, counted at 60 cm depth. */
  readonly shaftSeriesCount: number
  /** Depths at which a shaft first splits into two, in centimetres. */
  readonly branchDepthsCm: readonly number[]
  /** Mean chamber run in the shallowest third divided by that in the deepest third. */
  readonly chamberSizeSurfaceToBottomRatio: number
}

/**
 * A void cell counts as chamber rather than shaft when its horizontal run is wider than a
 * shaft bore. Tschinkel's own distinction is the same one — shafts are elongated voids of
 * roughly constant small diameter, chambers are horizontal-floored and much wider than they
 * are tall — so the threshold is read from the shaft bore rather than invented.
 */
export function chamberThresholdCm(params: Params): number {
  return params.nest.shaftBoreDiameterCm.value * 2
}

/**
 * Whether a void cell belongs to a chamber rather than to a shaft, for measurement.
 *
 * Width alone is not enough, and getting this wrong cost the project its headline number.
 * Where a chamber opens off a shaft, the shaft column passing through it is part of the
 * chamber's wide horizontal run, so it was counted as a chamber cell — and its vertical
 * clearance, which runs the whole height of the shaft, was then averaged into the chamber
 * height. That is what reported 1.58 cm where the species builds 1 cm, and it flattered
 * nothing: it made the model look worse than it is.
 *
 * Tschinkel's own distinction settles it. A chamber is horizontal-floored and much wider
 * than it is tall; a shaft is an elongated void of roughly constant small diameter. So a
 * cell counts as chamber when its horizontal run exceeds a shaft bore *and* exceeds its own
 * vertical clearance. Found after Walter Tschinkel reported that the published build did not
 * make 1 cm chambers. See docs/DECISIONS.md D48.
 *
 * This is a measurement rule, not a rule an ant follows. `NestGrid.isChamberCell` is what
 * the digging rules use on the hot path and is deliberately left as the cheap width test.
 */
export function isChamberVoidCm(
  nest: NestGrid,
  col: number,
  row: number,
  thresholdCm: number,
): { chamber: boolean; runCm: number; clearanceCm: number } {
  if (!nest.isVoid(col, row)) return { chamber: false, runCm: 0, clearanceCm: 0 }
  const runCm = nest.horizontalRunCm(col, row)
  if (runCm <= thresholdCm) return { chamber: false, runCm, clearanceCm: 0 }
  const clearanceCm = nest.verticalClearanceCm(col, row)
  return { chamber: clearanceCm < runCm, runCm, clearanceCm }
}

export function measureNest(nest: NestGrid, params: Params): NestMeasurement {
  const threshold = chamberThresholdCm(params)
  const maxDepthCm = nest.maxDepthCm
  const decileRun = new Array<number>(10).fill(0)

  let chamberCells = 0
  let shaftCellsInChamberRuns = 0
  let clearanceSum = 0
  let shallowClearance = 0
  let shallowCount = 0
  let deepClearance = 0
  let deepCount = 0
  let shallowRun = 0
  let deepRun = 0

  const shallowLimit = maxDepthCm / 3
  const deepStart = (2 * maxDepthCm) / 3

  for (let row = 0; row < nest.rows; row += 1) {
    const depth = nest.depthOf(row)
    if (depth > maxDepthCm) break
    const decile = Math.min(9, Math.floor((depth / maxDepthCm) * 10))

    for (let col = 0; col < nest.cols; col += 1) {
      const {
        chamber,
        runCm: run,
        clearanceCm: clearance,
      } = isChamberVoidCm(nest, col, row, threshold)
      if (!chamber) {
        // A cell wide enough to look like chamber but taller than it is wide is the shaft
        // passing through. Counted, so the gap between this measurement and the old one is
        // visible rather than silent.
        if (run > threshold) shaftCellsInChamberRuns += 1
        continue
      }

      decileRun[decile]! += nest.cellSizeCm
      chamberCells += 1
      clearanceSum += clearance
      if (depth <= shallowLimit) {
        shallowClearance += clearance
        shallowCount += 1
        shallowRun += run
      } else if (depth >= deepStart) {
        deepClearance += clearance
        deepCount += 1
        deepRun += run
      }
    }
  }

  let total = 0
  for (const run of decileRun) total += run
  const topQuarter = total === 0 ? 0 : (decileRun[0]! + decileRun[1]! + 0.5 * decileRun[2]!) / total

  const decileDecrease: number[] = []
  for (let d = 1; d < 10; d += 1) {
    const above = decileRun[d - 1]!
    decileDecrease.push(above === 0 ? 0 : (above - decileRun[d]!) / above)
  }

  return {
    maxDepthCm,
    excavatedCells: nest.excavatedCells,
    chamberRunPerDecile: decileRun,
    shaftCellsInChamberRuns,
    topQuarterShare: topQuarter,
    decileDecrease,
    meanChamberHeightCm: chamberCells === 0 ? 0 : clearanceSum / chamberCells,
    chamberHeightShallowCm: shallowCount === 0 ? 0 : shallowClearance / shallowCount,
    chamberHeightDeepCm: deepCount === 0 ? 0 : deepClearance / deepCount,
    ...measureSpacing(nest, params, maxDepthCm),
    shaftSeriesCount: countShaftSeries(nest, params),
    branchDepthsCm: findBranchDepths(nest, params),
    chamberSizeSurfaceToBottomRatio:
      deepCount === 0 || deepRun === 0 ? 0 : shallowRun / shallowCount / (deepRun / deepCount),
  }
}

/** Mean vertical gap between successive chambers, measured shallow and deep. */
function measureSpacing(
  nest: NestGrid,
  params: Params,
  maxDepthCm: number,
): { verticalSpacingShallowCm: number; verticalSpacingDeepCm: number } {
  const threshold = chamberThresholdCm(params)
  // A row counts as a chamber row when any cell in it belongs to a wide horizontal run.
  const chamberRow: boolean[] = []
  for (let row = 0; row < nest.rows; row += 1) {
    let found = false
    for (let col = 0; col < nest.cols && !found; col += 1) {
      // The same rule as the rest of the measurement: a shaft running through a chamber is
      // not itself a chamber row, or every row of a shaft counts as one and the spacing
      // between chambers collapses towards zero.
      if (isChamberVoidCm(nest, col, row, threshold).chamber) found = true
    }
    chamberRow.push(found)
  }

  const centres: number[] = []
  let runStart = -1
  for (let row = 0; row < nest.rows; row += 1) {
    if (chamberRow[row] && runStart < 0) runStart = row
    if (!chamberRow[row] && runStart >= 0) {
      centres.push(nest.depthOf((runStart + row - 1) / 2))
      runStart = -1
    }
  }

  const shallowGaps: number[] = []
  const deepGaps: number[] = []
  for (let i = 1; i < centres.length; i += 1) {
    const gap = centres[i]! - centres[i - 1]!
    if (centres[i]! <= maxDepthCm / 3) shallowGaps.push(gap)
    else if (centres[i]! >= (2 * maxDepthCm) / 3) deepGaps.push(gap)
  }

  const mean = (xs: number[]): number =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length

  return { verticalSpacingShallowCm: mean(shallowGaps), verticalSpacingDeepCm: mean(deepGaps) }
}

/**
 * Number of separate descending shaft series, counted below the depth at which branching
 * can still occur. Below 40 cm no new branch can start, so a horizontal scan there counts
 * the series the nest actually has.
 */
function countShaftSeries(nest: NestGrid, params: Params): number {
  const row = nest.rowOfDepth(params.excavation.seriesCountProbeDepthCm.value)
  if (row >= nest.rows) return 0
  let series = 0
  let inVoid = false
  for (let col = 0; col < nest.cols; col += 1) {
    const isVoid = nest.isVoid(col, row)
    if (isVoid && !inVoid) series += 1
    inVoid = isVoid
  }
  return series
}

/**
 * Depths at which a shaft splits into two shafts.
 *
 * Counting every increase in the number of separate voids per row does not measure this: a
 * chamber opening beside a shaft also adds a void group, and doing it that way reported 39
 * branches in a nest whose species rarely has more than two per shaft. A branch is counted
 * only where the number of *shaft-width* groups increases — narrow runs, chambers excluded.
 */
function findBranchDepths(nest: NestGrid, params: Params): number[] {
  const threshold = chamberThresholdCm(params)
  const depths: number[] = []
  let previous = 0

  const limitRow = Math.min(
    nest.rows,
    nest.rowOfDepth(params.excavation.seriesCountProbeDepthCm.value),
  )

  for (let row = 0; row < limitRow; row += 1) {
    let shafts = 0
    let inShaft = false
    for (let col = 0; col < nest.cols; col += 1) {
      // A cell belongs to a shaft when it is void and its horizontal run is narrow.
      const isShaft = nest.isVoid(col, row) && !nest.isChamberCell(col, row, threshold)
      if (isShaft && !inShaft) shafts += 1
      inShaft = isShaft
    }
    if (shafts > previous && previous > 0) depths.push(nest.depthOf(row))
    previous = shafts
  }
  return depths
}
