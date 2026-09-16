/**
 * The outline of the burrows, traced smooth.
 *
 * The nest is a grid of 5 mm cells that are either sand or dug (state/nest.ts). Drawn cell by
 * cell, every chamber is a stack of bricks. This file traces one smooth outline round the dug
 * cells instead. It is drawing only: nothing in the model reads it.
 *
 * How. Every dug cell gives off a soft bump of openness that fades to nothing 1.3 cells from its
 * centre, the bumps add up, and the outline is drawn where the total crosses a fixed level
 * (marching squares, on a lattice of four samples per cell). With the reach and level below:
 *
 * - a straight wall lands 0.52 cells from the centre of the last dug cell, where the cell really
 *   ends at 0.5, so a wall is within a tenth of a millimetre of where the model put it;
 * - a dead-end tunnel, and a single dug cell on its own, reach 0.48 cells past their centre, so
 *   the last cell is kept. An earlier smoothed outline lost it, and the ant digging there was
 *   drawn in solid sand;
 * - two cells that touch only at a corner, which the ants walk between, stay joined;
 * - corners are rounded, which is the point.
 *
 * Tracing is not free, so it is done a patch of 32 by 32 cells at a time and kept. This model
 * never puts sand back, so a patch whose count of dug cells has not changed has not changed,
 * and that count is all that is checked each frame.
 *
 * The outline is in centimetres, offset from the entrance across and depth down. The caller
 * draws it through the camera's transform.
 */

import { VOID } from '../core/state/nest.js'
import type { NestGrid } from '../core/state/nest.js'

/** Cells along each side of a patch that is traced and kept as a unit. */
const PATCH_CELLS = 32

/** Samples per cell along each side of the lattice the outline is traced on. */
const SAMPLES_PER_CELL = 4

/** How far a dug cell's bump of openness reaches, in cells. */
const REACH_CELLS = 1.3

/** The total openness the outline is drawn at. See the top of this file for what it gives. */
const LEVEL = 0.65

/**
 * Rows above the ground counted as open over a dug top cell, so the entrance is traced as an
 * open mouth rather than a pocket with a roof. The caller clips everything above the ground.
 */
const OPEN_ABOVE_ROWS = 3

/** Cells looked at beyond a patch's edge when deciding whether it has changed. */
const PATCH_MARGIN_CELLS = 2

/** The rows and columns asked for, inclusive. */
export interface CellRange {
  readonly firstCol: number
  readonly lastCol: number
  readonly firstRow: number
  readonly lastRow: number
}

interface Patch {
  /** Dug cells in and round the patch when it was traced. */
  readonly dug: number
  readonly fill: Path2D
  readonly walls: Path2D
}

export class CavityOutline {
  private readonly patches = new Map<number, Patch>()
  private readonly field: Float32Array
  private readonly value = new Float32Array(4)
  private readonly inside = new Uint8Array(4)
  private readonly cornerX = new Float32Array(4)
  private readonly cornerY = new Float32Array(4)
  private readonly pointX = new Float32Array(8)
  private readonly pointY = new Float32Array(8)
  private readonly crossing = new Uint8Array(8)

  constructor() {
    const across = PATCH_CELLS * SAMPLES_PER_CELL + 1
    this.field = new Float32Array(across * (across + OPEN_ABOVE_ROWS * SAMPLES_PER_CELL))
  }

  /**
   * The inside of the burrows, to fill, and their walls, to stroke, over the cells asked for.
   * Both in centimetres.
   */
  private generation = 0

  paths(nest: NestGrid, range: CellRange): { fill: Path2D; walls: Path2D } {
    // A colony that moved has a new nest in the same grid; nothing traced from the old one holds.
    if (nest.generation !== this.generation) {
      this.patches.clear()
      this.generation = nest.generation
    }
    const fill = new Path2D()
    const walls = new Path2D()
    const dug = nest.pheromoneBounds()
    const firstCol = Math.max(0, range.firstCol, dug.minCol)
    const lastCol = Math.min(nest.cols - 1, range.lastCol, dug.maxCol)
    const firstRow = Math.max(0, range.firstRow, dug.minRow)
    const lastRow = Math.min(nest.rows - 1, range.lastRow, dug.maxRow)
    if (firstCol > lastCol || firstRow > lastRow) return { fill, walls }

    const lastPatchRow = Math.floor(lastRow / PATCH_CELLS)
    const lastPatchCol = Math.floor(lastCol / PATCH_CELLS)
    for (let py = Math.floor(firstRow / PATCH_CELLS); py <= lastPatchRow; py += 1) {
      for (let px = Math.floor(firstCol / PATCH_CELLS); px <= lastPatchCol; px += 1) {
        const patch = this.patch(nest, px, py)
        if (patch === null) continue
        fill.addPath(patch.fill)
        walls.addPath(patch.walls)
      }
    }
    return { fill, walls }
  }

  private patch(nest: NestGrid, px: number, py: number): Patch | null {
    const dug = countDug(nest, px * PATCH_CELLS, py * PATCH_CELLS)
    if (dug === 0) return null
    const key = py * 65536 + px
    const kept = this.patches.get(key)
    if (kept !== undefined && kept.dug === dug) return kept
    const traced = this.trace(nest, px, py, dug)
    this.patches.set(key, traced)
    return traced
  }

  private trace(nest: NestGrid, px: number, py: number, dug: number): Patch {
    const S = SAMPLES_PER_CELL
    const col0 = px * PATCH_CELLS
    const row0 = py * PATCH_CELLS
    // The top patch is traced a little way above the ground, for the mouth of the entrance.
    const lift = py === 0 ? OPEN_ABOVE_ROWS * S : 0
    const across = PATCH_CELLS * S + 1
    const down = PATCH_CELLS * S + lift + 1
    const field = this.field
    const reach2 = REACH_CELLS * REACH_CELLS
    const { cols, rows, occupancy } = nest

    // The openness at every sample, in cell units, where a cell's centre is a whole number.
    for (let j = 0; j < down; j += 1) {
      const v = row0 + (j - lift) / S
      const rowLo = Math.max(-OPEN_ABOVE_ROWS, Math.ceil(v - REACH_CELLS))
      const rowHi = Math.min(rows - 1, Math.floor(v + REACH_CELLS))
      for (let i = 0; i < across; i += 1) {
        const u = col0 + i / S
        const colLo = Math.max(0, Math.ceil(u - REACH_CELLS))
        const colHi = Math.min(cols - 1, Math.floor(u + REACH_CELLS))
        let sum = 0
        for (let row = rowLo; row <= rowHi; row += 1) {
          const dv = v - row
          // Above the ground, a column is open wherever its top cell has been dug.
          const base = Math.max(0, row) * cols
          for (let col = colLo; col <= colHi; col += 1) {
            if (occupancy[base + col] !== VOID) continue
            const du = u - col
            const d2 = du * du + dv * dv
            if (d2 >= reach2) continue
            const q = 1 - d2 / reach2
            sum += q * q * q
          }
        }
        field[j * across + i] = sum
      }
    }

    const fill = new Path2D()
    const walls = new Path2D()
    const cell = nest.cellSizeCm
    const step = cell / S
    const xOf = (i: number): number => (col0 + i / S - nest.entranceCol) * cell
    const yOf = (j: number): number => (row0 + (j - lift) / S + 0.5) * cell

    for (let j = 0; j < down - 1; j += 1) {
      const y = yOf(j)
      // Squares wholly inside are gathered into runs, so a big chamber is a few rectangles.
      let run = -1
      for (let i = 0; i < across - 1; i += 1) {
        const a = field[j * across + i]!
        const b = field[j * across + i + 1]!
        const c = field[(j + 1) * across + i + 1]!
        const d = field[(j + 1) * across + i]!
        const n =
          (a >= LEVEL ? 1 : 0) + (b >= LEVEL ? 1 : 0) + (c >= LEVEL ? 1 : 0) + (d >= LEVEL ? 1 : 0)
        if (n === 4) {
          if (run < 0) run = i
          continue
        }
        if (run >= 0) {
          fill.rect(xOf(run), y, (i - run) * step, step)
          run = -1
        }
        if (n === 0) continue
        this.square(fill, walls, xOf(i), y, step, a, b, c, d)
      }
      if (run >= 0) fill.rect(xOf(run), y, (across - 1 - run) * step, step)
    }

    return { dug, fill, walls }
  }

  /**
   * One lattice square the outline passes through: the part of it that is inside, walked round
   * clockwise from its top-left corner, and the stretch of wall across it.
   */
  private square(
    fill: Path2D,
    walls: Path2D,
    x: number,
    y: number,
    size: number,
    a: number,
    b: number,
    c: number,
    d: number,
  ): void {
    const { value, inside, cornerX, cornerY } = this
    value[0] = a
    value[1] = b
    value[2] = c
    value[3] = d
    for (let k = 0; k < 4; k += 1) inside[k] = value[k]! >= LEVEL ? 1 : 0
    cornerX[0] = x
    cornerY[0] = y
    cornerX[1] = x + size
    cornerY[1] = y
    cornerX[2] = x + size
    cornerY[2] = y + size
    cornerX[3] = x
    cornerY[3] = y + size

    // Two opposite corners inside and two outside. The middle of the square decides whether the
    // inside corners are one passage running through it or two walls passing close by.
    const saddle = inside[0] === inside[2] && inside[1] === inside[3] && inside[0] !== inside[1]
    if (saddle && (a + b + c + d) / 4 < LEVEL) {
      for (let k = 0; k < 4; k += 1) if (inside[k] === 1) this.corner(fill, walls, k)
      return
    }

    let n = 0
    for (let k = 0; k < 4; k += 1) {
      const next = (k + 1) % 4
      if (inside[k] === 1) n = this.push(n, cornerX[k]!, cornerY[k]!, 0)
      if (inside[k] !== inside[next]) n = this.pushCrossing(n, k, next)
    }
    this.emit(fill, walls, n)
  }

  /** A single inside corner of a square, cut off by the outline. */
  private corner(fill: Path2D, walls: Path2D, k: number): void {
    let n = this.push(0, this.cornerX[k]!, this.cornerY[k]!, 0)
    n = this.pushCrossing(n, k, (k + 1) % 4)
    n = this.pushCrossing(n, (k + 3) % 4, k)
    this.emit(fill, walls, n)
  }

  private push(n: number, x: number, y: number, crossing: 0 | 1): number {
    this.pointX[n] = x
    this.pointY[n] = y
    this.crossing[n] = crossing
    return n + 1
  }

  /** Where the outline crosses the edge between two corners, one inside and one out. */
  private pushCrossing(n: number, from: number, to: number): number {
    const t = (LEVEL - this.value[from]!) / (this.value[to]! - this.value[from]!)
    const x = this.cornerX[from]! + (this.cornerX[to]! - this.cornerX[from]!) * t
    const y = this.cornerY[from]! + (this.cornerY[to]! - this.cornerY[from]!) * t
    return this.push(n, x, y, 1)
  }

  /** Adds the inside to the fill, and each run between two crossings to the walls. */
  private emit(fill: Path2D, walls: Path2D, n: number): void {
    const { pointX, pointY, crossing } = this
    fill.moveTo(pointX[0]!, pointY[0]!)
    for (let m = 1; m < n; m += 1) fill.lineTo(pointX[m]!, pointY[m]!)
    fill.closePath()
    for (let m = 0; m < n; m += 1) {
      const next = (m + 1) % n
      if (crossing[m] === 1 && crossing[next] === 1) {
        walls.moveTo(pointX[m]!, pointY[m]!)
        walls.lineTo(pointX[next]!, pointY[next]!)
      }
    }
  }
}

/** Dug cells in a patch and the margin round it. */
function countDug(nest: NestGrid, col0: number, row0: number): number {
  const { cols, rows, occupancy } = nest
  const lastCol = Math.min(cols - 1, col0 + PATCH_CELLS + PATCH_MARGIN_CELLS)
  const lastRow = Math.min(rows - 1, row0 + PATCH_CELLS + PATCH_MARGIN_CELLS)
  let dug = 0
  for (let row = Math.max(0, row0 - PATCH_MARGIN_CELLS); row <= lastRow; row += 1) {
    const base = row * cols
    for (let col = Math.max(0, col0 - PATCH_MARGIN_CELLS); col <= lastCol; col += 1) {
      if (occupancy[base + col] === VOID) dug += 1
    }
  }
  return dug
}
