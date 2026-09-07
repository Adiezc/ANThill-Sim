/**
 * A single environment layer.
 *
 * Every layer — soil occupancy, moisture, temperature, stress, and each pheromone channel
 * separately — is one of these: a flat `Float32Array` at a coarser resolution than the
 * display, with an explicit mapping from world coordinates to cell indices. They are never
 * collapsed into one array of structs, because they are read and written at different
 * rates and because a whole layer is then one contiguous buffer to hash, save or diffuse.
 *
 * Coordinates are world units — centimetres in the nest domain, metres on the surface —
 * and the grid knows its own cell size. Nothing outside converts by hand.
 */

/** A half-open-free, inclusive rectangle of cells. Both corners are inside it. */
export interface GridBounds {
  readonly minCol: number
  readonly minRow: number
  readonly maxCol: number
  readonly maxRow: number
}

export class Grid2D {
  readonly width: number
  readonly height: number
  readonly cellSize: number
  /** World coordinate of the left edge of column 0. */
  readonly originX: number
  /** World coordinate of the top edge of row 0. */
  readonly originY: number
  readonly data: Float32Array

  constructor(width: number, height: number, cellSize: number, originX = 0, originY = 0) {
    if (width <= 0 || height <= 0) throw new Error('A grid needs a positive width and height')
    this.width = width
    this.height = height
    this.cellSize = cellSize
    this.originX = originX
    this.originY = originY
    this.data = new Float32Array(width * height)
  }

  /** Cells in the layer. */
  get length(): number {
    return this.width * this.height
  }

  /** Column index for a world x. Not clamped; check with `contains` first. */
  colOf(x: number): number {
    return Math.floor((x - this.originX) / this.cellSize)
  }

  /** Row index for a world y. Not clamped; check with `contains` first. */
  rowOf(y: number): number {
    return Math.floor((y - this.originY) / this.cellSize)
  }

  /** World x of the centre of a column. */
  xOf(col: number): number {
    return this.originX + (col + 0.5) * this.cellSize
  }

  /** World y of the centre of a row. */
  yOf(row: number): number {
    return this.originY + (row + 0.5) * this.cellSize
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height
  }

  contains(x: number, y: number): boolean {
    return this.inBounds(this.colOf(x), this.rowOf(y))
  }

  index(col: number, row: number): number {
    return row * this.width + col
  }

  get(col: number, row: number): number {
    return this.data[row * this.width + col]!
  }

  set(col: number, row: number, value: number): void {
    this.data[row * this.width + col] = value
  }

  add(col: number, row: number, value: number): void {
    this.data[row * this.width + col]! += value
  }

  /** Reads out of bounds as `fallback` rather than throwing. Neighbourhood scans need this. */
  sample(col: number, row: number, fallback = 0): number {
    return this.inBounds(col, row) ? this.data[row * this.width + col]! : fallback
  }

  fill(value: number): void {
    this.data.fill(value)
  }

  /** Fills row by row from a function of depth, which is how the soil profiles are laid down. */
  fillByRow(f: (row: number, y: number) => number): void {
    for (let row = 0; row < this.height; row += 1) {
      const value = f(row, this.yOf(row))
      this.data.fill(value, row * this.width, (row + 1) * this.width)
    }
  }

  /**
   * Multiplies every cell by `factor`, then adds a share of each cell's four-neighbours.
   *
   * This is the decay-and-diffuse step every pheromone channel runs, and it is written
   * once here so that all of them decay identically and none can drift into its own
   * variant. It runs on a fixed sub-schedule rather than every tick, identically at every
   * playback speed. See docs/ARCHITECTURE.md.
   *
   * `bounds` restricts the sweep to a rectangle. This is not a shortcut: the cost of a
   * full sweep is the size of the grid, which has nothing to do with how much of it holds
   * any signal, and a young nest occupies about a four-hundredth of the cells it is
   * embedded in. The caller is responsible for passing a rectangle that contains every
   * cell it has ever written, grown by enough margin that what lies outside is negligible
   * rather than merely small; see `NestGrid.decayPheromones`. Edges reflect at the
   * rectangle exactly as they reflect at the grid, so signal is conserved inside it rather
   * than draining into cells nobody is sweeping.
   *
   * `scratch` is supplied by the caller so the hot path allocates nothing.
   */
  decayAndDiffuse(
    factor: number,
    diffusion: number,
    scratch: Float32Array,
    bounds?: GridBounds,
  ): void {
    const { width, height, data } = this
    if (scratch.length !== data.length) {
      throw new Error('Diffusion scratch buffer is the wrong size for this grid')
    }
    const minCol = bounds === undefined ? 0 : Math.max(0, bounds.minCol)
    const minRow = bounds === undefined ? 0 : Math.max(0, bounds.minRow)
    const maxCol = bounds === undefined ? width - 1 : Math.min(width - 1, bounds.maxCol)
    const maxRow = bounds === undefined ? height - 1 : Math.min(height - 1, bounds.maxRow)
    if (minCol > maxCol || minRow > maxRow) return

    for (let row = minRow; row <= maxRow; row += 1) {
      const base = row * width
      scratch.set(data.subarray(base + minCol, base + maxCol + 1), base + minCol)
    }

    const keep = 1 - diffusion
    for (let row = minRow; row <= maxRow; row += 1) {
      const base = row * width
      for (let col = minCol; col <= maxCol; col += 1) {
        const i = base + col
        const centre = scratch[i]!
        // Edges reflect rather than leak, so total signal is conserved at the boundary
        // instead of quietly draining out of the world.
        const left = col > minCol ? scratch[i - 1]! : centre
        const right = col < maxCol ? scratch[i + 1]! : centre
        const up = row > minRow ? scratch[i - width]! : centre
        const down = row < maxRow ? scratch[i + width]! : centre
        data[i] = factor * (keep * centre + (diffusion * (left + right + up + down)) / 4)
      }
    }
  }

  /** Multiplies every cell in `bounds` by `factor`. The decay half, for a layer that does
   * not diffuse. */
  decayWithin(factor: number, bounds: GridBounds): void {
    const { width, data } = this
    const minCol = Math.max(0, bounds.minCol)
    const minRow = Math.max(0, bounds.minRow)
    const maxCol = Math.min(width - 1, bounds.maxCol)
    const maxRow = Math.min(this.height - 1, bounds.maxRow)
    if (minCol > maxCol || minRow > maxRow) return
    for (let row = minRow; row <= maxRow; row += 1) {
      const base = row * width
      for (let i = base + minCol; i <= base + maxCol; i += 1) data[i]! *= factor
    }
  }
}
