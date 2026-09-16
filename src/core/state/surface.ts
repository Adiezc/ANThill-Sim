/**
 * The surface: the second of the two spatial domains, seen from above.
 *
 * Where the nest is a vertical slice measured in centimetres, this is a plan view measured
 * in metres, and the two meet at exactly one point — the nest entrance, which is the origin
 * here. An ant is in one domain or the other and never in both. See docs/DECISIONS.md D1.
 *
 * Like the nest, this holds no behaviour. It records what is on the ground — how much seed,
 * how much recruitment pheromone — and knows how to answer the questions a forager asks of
 * it. Trails are not stored as paths: a trunk trail is a direction the colony favours, and
 * the trail a person sees on screen is the pheromone the foragers left, which is a
 * consequence of their walking rather than a thing that was drawn.
 */

import { Grid2D } from './grid.js'
import type { GridBounds } from './grid.js'
import type { Prng } from '../math/prng.js'
import type { Params } from '../params/params.js'

export class SurfaceGrid {
  /** Recruitment pheromone, laid on the return leg of a successful trip. */
  readonly recruitment: Grid2D
  /**
   * Seeds on the ground, in seeds per cell.
   *
   * A standing crop that is drawn down by foraging and replenished daily towards
   * `seedCeiling`. Nothing in the literature gives a seed rain for these sandhills, so the
   * crop, its patchiness and its replenishment are all invented and tagged as such; what
   * they are tuned against is the observation that a colony's range is used almost
   * exclusively by that colony and is not exhausted by it.
   */
  readonly seeds: Grid2D
  /**
   * What each cell replenishes towards: high inside a patch, low outside one.
   *
   * Patchiness is the point. With seeds spread evenly there is no searching in the model at
   * all — every ant finds one within a few steps of the entrance, every trip succeeds, and
   * site fidelity and recruitment trails become decorations on a conveyor belt. Patches are
   * what make a remembered site and a trail worth having.
   */
  readonly seedCeiling: Grid2D

  readonly cols: number
  readonly rows: number
  readonly cellSizeM: number
  readonly extentM: number

  /**
   * The headings of the colony's trunk trails, in turns.
   *
   * Harrison & Gentry found direction to be shaped by the position of neighbouring
   * colonies. No neighbours are modelled in v1, so the directions are drawn once from the
   * colony's own seed and then fixed — which reproduces the finding that direction is
   * effectively random at the population level, without pretending to model the cause.
   */
  readonly trunkTrailTurns: Float32Array

  private readonly scratch: Float32Array

  constructor(params: Params, prng: Prng) {
    const cell = params.discretisation.surfaceCellSizeM.value
    const extent = params.discretisation.surfaceExtentM.value
    this.cellSizeM = cell
    this.extentM = extent
    this.cols = Math.round((extent * 2) / cell)
    this.rows = this.cols
    this.recruitment = new Grid2D(this.cols, this.rows, cell, -extent, -extent)
    this.seeds = new Grid2D(this.cols, this.rows, cell, -extent, -extent)
    this.seedCeiling = new Grid2D(this.cols, this.rows, cell, -extent, -extent)
    this.scratch = new Float32Array(this.cols * this.rows)

    const count = Math.round(
      prng.nextRange(params.foraging.trunkTrailCount.min, params.foraging.trunkTrailCount.max),
    )
    this.trunkTrailTurns = new Float32Array(Math.max(1, count))
    // Spread around the compass with jitter, so a colony with three trails does not send
    // them all one way and does not space them with suspicious regularity either.
    const spacing = 1 / this.trunkTrailTurns.length
    const offset = prng.nextFloat()
    for (let i = 0; i < this.trunkTrailTurns.length; i += 1) {
      const jitter = (prng.nextFloat() - 0.5) * spacing * params.foraging.trunkTrailJitter.value
      this.trunkTrailTurns[i] = (offset + i * spacing + jitter + 1) % 1
    }

    this.scatterSeeds(params, prng)
  }

  /**
   * Lays down the standing crop: a thin background everywhere, and patches on top of it.
   *
   * Drawn once from the colony's seed and then fixed, so where the food is is a property of
   * the run rather than of the moment an ant looks. Patches may overlap, which is left
   * alone rather than rejected: clumps of clumps are what a real seed fall looks like.
   */
  private scatterSeeds(params: Params, prng: Prng): void {
    const cellArea = this.cellSizeM * this.cellSizeM
    const background = params.foraging.backgroundSeedsPerSquareMetre.value * cellArea
    const patchPeak = params.foraging.standingSeedsPerSquareMetre.value * cellArea
    const radiusM = params.foraging.seedPatchRadiusM.value
    const patches = Math.max(0, Math.round(params.foraging.seedPatchCount.value))

    this.seedCeiling.fill(background)

    for (let p = 0; p < patches; p += 1) {
      const cx = prng.nextRange(-this.extentM, this.extentM)
      const cy = prng.nextRange(-this.extentM, this.extentM)
      this.stampPatch(cx, cy, radiusM, patchPeak)
    }

    this.seeds.data.set(this.seedCeiling.data)
  }

  /**
   * Raises the ceiling to a patch centred on (cx, cy), denser at the middle and thinning to its
   * edge, so a patch has an inside worth staying in rather than a cliff at its rim.
   */
  private stampPatch(cx: number, cy: number, radiusM: number, peak: number): void {
    const minCol = Math.max(0, this.seedCeiling.colOf(cx - radiusM))
    const maxCol = Math.min(this.cols - 1, this.seedCeiling.colOf(cx + radiusM))
    const minRow = Math.max(0, this.seedCeiling.rowOf(cy - radiusM))
    const maxRow = Math.min(this.rows - 1, this.seedCeiling.rowOf(cy + radiusM))
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let col = minCol; col <= maxCol; col += 1) {
        const dx = this.seedCeiling.xOf(col) - cx
        const dy = this.seedCeiling.yOf(row) - cy
        const d = Math.sqrt(dx * dx + dy * dy)
        if (d > radiusM) continue
        const density = peak * (1 - d / radiusM)
        const i = this.seedCeiling.index(col, row)
        if (this.seedCeiling.data[i]! < density) this.seedCeiling.data[i] = density
      }
    }
  }

  /**
   * Moves the ground under a colony that has moved its nest.
   *
   * The entrance stays the origin, so a colony that moves (dx, dy) whole cells sees the ground
   * slide by the opposite amount. Seeds, the ceiling and trail pheromone come along; ground
   * newly brought into view gets background seed and its share of new patches, drawn from the
   * colony's own stream like the first ones.
   */
  shift(dxCells: number, dyCells: number, params: Params, prng: Prng): void {
    if (dxCells === 0 && dyCells === 0) return
    const { cols, rows } = this
    const cellArea = this.cellSizeM * this.cellSizeM
    const background = params.foraging.backgroundSeedsPerSquareMetre.value * cellArea
    const exposed = new Uint8Array(cols * rows)
    let exposedCount = 0
    for (const [grid, fill] of [
      [this.seeds, background],
      [this.seedCeiling, background],
      [this.recruitment, 0],
    ] as const) {
      const copy = grid.data.slice()
      for (let row = 0; row < rows; row += 1) {
        for (let col = 0; col < cols; col += 1) {
          const fromCol = col + dxCells
          const fromRow = row + dyCells
          const i = row * cols + col
          if (fromCol >= 0 && fromCol < cols && fromRow >= 0 && fromRow < rows) {
            grid.data[i] = copy[fromRow * cols + fromCol]!
          } else {
            grid.data[i] = fill
            if (grid === this.seeds) {
              exposed[i] = 1
              exposedCount += 1
            }
          }
        }
      }
    }

    // New ground gets patches at the same density as the ground first laid down.
    const patchesPerCell =
      Math.max(0, Math.round(params.foraging.seedPatchCount.value)) / (cols * rows)
    const newPatches = Math.round(patchesPerCell * exposedCount)
    const radiusM = params.foraging.seedPatchRadiusM.value
    const peak = params.foraging.standingSeedsPerSquareMetre.value * cellArea
    for (let p = 0; p < newPatches; p += 1) {
      let pick = Math.floor(prng.nextFloat() * exposedCount)
      for (let i = 0; i < exposed.length; i += 1) {
        if (exposed[i] === 0) continue
        if (pick === 0) {
          const col = i % cols
          const row = (i - col) / cols
          this.stampPatch(this.seedCeiling.xOf(col), this.seedCeiling.yOf(row), radiusM, peak)
          break
        }
        pick -= 1
      }
    }
    for (let i = 0; i < exposed.length; i += 1) {
      if (exposed[i] === 1) this.seeds.data[i] = this.seedCeiling.data[i]!
    }
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows
  }

  /** True while a position in metres is still on the modelled ground. */
  contains(xM: number, yM: number): boolean {
    return this.seeds.contains(xM, yM)
  }

  /**
   * Replenishes the standing crop towards its ceiling.
   *
   * Applied once a day rather than per tick, and over the whole grid because seed fall is
   * not a local event the way digging is.
   */
  replenishSeeds(fraction: number): void {
    const data = this.seeds.data
    const ceiling = this.seedCeiling.data
    for (let i = 0; i < data.length; i += 1) {
      const s = data[i]!
      const c = ceiling[i]!
      if (s < c) data[i] = s + (c - s) * fraction
    }
  }

  /** The whole grid. Foragers range everywhere, so there is no useful active rectangle. */
  bounds(): GridBounds {
    return { minCol: 0, minRow: 0, maxCol: this.cols - 1, maxRow: this.rows - 1 }
  }

  decayRecruitment(decay: number, diffusion: number): void {
    this.recruitment.decayAndDiffuse(decay, diffusion, this.scratch, this.bounds())
  }

  buffers(): ArrayBufferView[] {
    // The ceiling changes when the colony moves, so it is state as well.
    return [this.recruitment.data, this.seeds.data, this.seedCeiling.data, this.trunkTrailTurns]
  }
}
