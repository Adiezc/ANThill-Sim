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

  constructor(params: Params) {
    const cell = params.discretisation.nestCellSizeCm.value
    const widthCm = params.discretisation.nestWidthCm.value
    this.cols = Math.round(widthCm / cell)
    this.rows = Math.round(params.discretisation.nestDepthCm.value / cell)
    this.cellSizeCm = cell
    this.occupancy = new Uint8Array(this.cols * this.rows)
    this.spoil = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.building = new Grid2D(this.cols, this.rows, cell, -widthCm / 2, 0)
    this.entranceCol = Math.floor(this.cols / 2)
    this.blockSize = Math.max(1, Math.round(params.excavation.crowdingRadiusCm.value / cell))
    this.blockCols = Math.ceil(this.cols / this.blockSize)
    this.blockRows = Math.ceil(this.rows / this.blockSize)
    this.blockVoidCount = new Uint16Array(this.blockCols * this.blockRows)
    this.scratch = new Float32Array(this.cols * this.rows)
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
    return true
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
    this.building.decayAndDiffuse(buildingDecay, buildingDiffusion, this.scratch)
    // Spoil does not diffuse. A pellet heap is where it was put.
    const spoil = this.spoil.data
    for (let i = 0; i < spoil.length; i += 1) spoil[i]! *= spoilDecay
  }

  buffers(): ArrayBufferView[] {
    return [this.occupancy, this.spoil.data, this.building.data]
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
function chamberThresholdCm(params: Params): number {
  return params.nest.shaftBoreDiameterCm.value * 2
}

export function measureNest(nest: NestGrid, params: Params): NestMeasurement {
  const threshold = chamberThresholdCm(params)
  const maxDepthCm = nest.maxDepthCm
  const decileRun = new Array<number>(10).fill(0)

  let chamberCells = 0
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
      if (!nest.isVoid(col, row)) continue
      const run = nest.horizontalRunCm(col, row)
      if (run <= threshold) continue

      decileRun[decile]! += nest.cellSizeCm
      chamberCells += 1
      const clearance = nest.verticalClearanceCm(col, row)
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
      if (nest.isChamberCell(col, row, threshold)) found = true
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
