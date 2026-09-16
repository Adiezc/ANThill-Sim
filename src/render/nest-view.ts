/**
 * The vertical slice, drawn.
 *
 * Reads core state. Never writes to it.
 *
 * The one thing this view has to get right is scale. Every dimension in the model is in
 * centimetres and every dimension in the source papers is in centimetres or millimetres, so
 * the drawing carries a centimetre ruler down its left edge and the reader can hold it against
 * a plaster cast. If a chamber looks 40 cm across it is because the model built one, not
 * because the renderer stretched it.
 *
 * Everything in the nest is drawn at its real size, from the species file (see body-sizes.ts):
 * ants by caste with their measured head widths, and eggs, larvae, pupae and seeds. A 6.35 mm
 * worker in a 9 mm shaft fills most of its width, because a real one does. At a zoom where the
 * whole nest fits on screen she is correctly a speck. That is what the zoom is for.
 *
 * This is honestly a slice, and the UI says so: real *badius* shafts are helices, and what is
 * drawn is a plane cut through one.
 *
 * What is in the picture that the model does not decide:
 *
 * - The shapes. An egg is drawn as an egg, but how many there are and in which chamber is the
 *   model's. The brood grid holds a total, so which glyph is an egg and which a larva follows
 *   the colony's current egg:larva:pupa proportions, and a larva's size within its stage is
 *   chosen for variety.
 * - The outline of the burrows. The model digs in 5 mm squares; the picture traces one smooth
 *   outline round them (see cavity.ts), so a chamber reads as a rounded pocket in the sand
 *   rather than a row of bricks. Straight walls stay where the model's cells end.
 * - Where in its cell an ant stands, and which way up. The model puts every ant on the centre
 *   of a 5 mm cell and gives her no posture. The picture draws each ant from the side, as the
 *   slice is seen, standing on the nearest floor or holding on to the nearest shaft wall, and
 *   spreads out ants that share a cell. Ants climbing a shaft and ants going down it end up on
 *   opposite walls, so they visibly pass. That is a drawing convention, like the walking in
 *   ant-motion.ts. It never puts an ant in sand, and no system reads it.
 */

import { Burden, Caste, Domain } from '../core/state/ants.js'
import { coloursFor, drawAntSide, drawBrood, drawSeed, sideStandHeight } from './ant-sprite.js'
import { antBodyFor } from './body-sizes.js'
import { CavityOutline } from './cavity.js'
import { pheromoneColour } from './pheromones.js'
import type { AntStore } from '../core/state/ants.js'
import type { NestGrid } from '../core/state/nest.js'
import type { SoilModel } from '../core/systems/soil.js'
import type { AntMotion } from './ant-motion.js'
import type { BodySizes } from './body-sizes.js'
import type { SurfaceGrid } from '../core/state/surface.js'

export interface NestViewTheme {
  readonly sky: string
  readonly soilTop: string
  readonly soilDeep: string
  readonly voidFill: string
  readonly voidRoof: string
  readonly voidFloor: string
  readonly seed: string
  readonly egg: string
  readonly larva: string
  readonly pupa: string
  /** The bare disc of excavated sand round the entrance. */
  readonly disc: string
  readonly charcoal: string
  readonly grass: string
  readonly rule: string
  readonly ruleText: string
}

export const DEFAULT_THEME: NestViewTheme = {
  sky: '#b9c7cf',
  soilTop: '#cbab7a',
  soilDeep: '#8a6a41',
  // The void is a lit cavity rather than a black hole. Ants used to be drawn in #20120a on
  // a #241a10 background, which is the same colour: every ant underground was invisible.
  voidFill: '#3b2a1a',
  voidRoof: '#e2c793',
  voidFloor: '#241a10',
  seed: '#b07a34',
  egg: '#f6ecd6',
  larva: '#f0dcb4',
  pupa: '#d9c08e',
  disc: '#dcc393',
  charcoal: '#2b2622',
  grass: '#6f8a4a',
  rule: 'rgba(255,255,255,0.55)',
  ruleText: 'rgba(255,255,255,0.85)',
}

export interface NestViewport {
  /** Depth in centimetres at the top of the drawn area. */
  topCm: number
  /** Centimetres of depth visible. Set from this and the canvas height. */
  spanCm: number
  /** Horizontal centre, in centimetres from the nest entrance. */
  centreCm: number
}

/** What the brood grid's totals should be drawn as, in the colony's current proportions. */
export interface BroodMix {
  readonly eggs: number
  readonly larvae: number
  readonly pupae: number
}

export interface NestDrawOptions {
  readonly motion: AntMotion
  readonly broodMix: BroodMix
  /** Real sizes of everything drawn, from the species file. */
  readonly sizes: BodySizes
  /** Seconds since the page opened, for the walking animation. */
  readonly timeSeconds: number
  /** Slot of the ant the reader has clicked on, or -1. */
  readonly selected: number
  /** Whether to tint the nest with the building pheromone. */
  readonly showDiggingScent: boolean
  /** The ground, for the seeds and foragers above the nest. Absent in a demonstration nest. */
  readonly surface?: SurfaceGrid
  /** Diameter of the bare disc of sand round the entrance, in centimetres. */
  readonly discDiameterCm: number
  /** Whether to put name tags on the queen, the brood and the seed store. */
  readonly labels?: boolean
  /** The weather over the nest. Absent in a demonstration nest. */
  readonly weather?: {
    readonly raining: boolean
    readonly overcast: boolean
    /** Draw the rain without movement, for readers who asked for reduced motion. */
    readonly still: boolean
  }
}

/** Width of the depth ruler gutter, in device-independent pixels. */
const RULER_WIDTH = 54

/** Below this many pixels per cell, contents are a tint rather than countable objects. */
const GLYPH_MIN_CELL_PX = 5

/** Below this many pixels per cell the picture is too small for name tags to point at anything. */
const LABEL_MIN_CELL_PX = 2

/** Most brood and seed glyphs drawn in one cell. Past this a cell reads as a pile anyway. */
const MAX_BROOD_GLYPHS = 16
const MAX_SEED_GLYPHS = 14

/**
 * Building pheromone weaker than this share of one fresh deposit is not drawn.
 *
 * The species file authors the pheromone as a lifetime, and the decay constant is derived so
 * that a deposit falls to one percent at the end of it. So this floor draws the scent for
 * exactly its stated lifetime and not after.
 */
const SCENT_FLOOR = 0.01

/**
 * How far the middle of the disc rises above the ground round it. The disc is described as very
 * slight and flattened; the height is appearance.
 */
const DISC_RISE_CM = 0.6

/** Charcoal pieces drawn per centimetre of disc. Colonies carry thousands; this is appearance. */
const CHARCOAL_PER_CM = 1

/**
 * Ants and seeds on the ground within this many metres either side of the slice are drawn above
 * it, seen from the side. Anything further out is left to the map, because drawing it at the
 * entrance would show an ant ten metres away as if it were walking into the nest.
 */
const GROUND_SLAB_M = 1

/** Most seeds drawn lying in one column of ground cells. */
const MAX_GROUND_SEEDS_PER_CELL = 30

/** Height of the band that shows the ground when the camera is too deep to see it. */
const GROUND_BAND_PX = 84

/** How many disc diameters of ground the band shows across its width. */
const GROUND_BAND_DISCS = 2.2

/**
 * Below this many pixels per cell the burrows are drawn as plain cells, not traced outlines. At
 * three pixels a cell, a whole shaft seen at mid zoom was a jagged staircase; under one and a
 * half, a cell is too small for its corners to show either way.
 */
const BURROW_DETAIL_MIN_CELL_PX = 1.5

/** Centimetres of sand one texel of the grain texture stands for: a grain about 0.3 mm across. */
const GRAIN_CM_PER_TEXEL = 0.03

/**
 * Damp sand is darkened towards this colour by its moisture fraction times the strength, up to a
 * ceiling. The soil model's moisture runs from about 0.3 at depth to about 0.5 near the surface,
 * so the darkening stays a tint and the sand still reads as sand.
 */
const DAMP_RGB = '58, 38, 18'
const DAMP_STRENGTH = 0.3
const DAMP_MAX_ALPHA = 0.18

/** Colour stops in the moisture gradient. Moisture changes slowly with depth; this is plenty. */
const DAMP_STOPS = 24

/** How far from its cell's centre an ant may be drawn, as a fraction of the cell. */
const SPREAD_FRACTION = 0.42

/** How quickly an ant slides to its place among others, as a fraction of the gap per second. */
const SPREAD_EASE_PER_SECOND = 6

/** How quickly an ant turns to lie along her floor or wall, as a fraction of the turn per second. */
const TURN_EASE_PER_SECOND = 10

/**
 * A turn sharper than this, in radians, is taken at once. An ant turning round on a floor is
 * drawn facing the other way, rather than swung head over heels to get there.
 */
const SNAP_TURN_RADIANS = 2.4

/** An ant heading more steeply than this, as the vertical share of her heading, climbs a wall. */
const CLIMB_FACING = 0.6

/**
 * How far, in cells, an ant looks for a floor under her or a wall beside her. Two cells is a
 * centimetre: the height of a chamber, and a little more than the width of a shaft.
 */
const SURFACE_SEARCH_CELLS = 2

const MM_PER_CM = 10

/**
 * Lengths of carried things that have no parameter. A pellet of sand is drawn a millimetre
 * long, a fragment of charcoal one and a half. Appearance only.
 */
const SAND_PELLET_MM = 1
const CHARCOAL_MM = 1.5

export class NestView {
  private readonly ctx: CanvasRenderingContext2D
  private theme: NestViewTheme

  /** Where each ant is drawn relative to its simulated position, in centimetres. Not state. */
  private spreadX = new Float32Array(0)
  private spreadY = new Float32Array(0)
  private spreadId = new Uint32Array(0)
  /** The way each ant is drawn facing, in radians, and which side of her body her feet are on. */
  private poseAngle = new Float32Array(0)
  private poseSide = new Int8Array(0)
  private lastTimeSeconds = 0

  /** The smooth outline of the burrows, traced a patch at a time and kept. */
  private readonly cavity = new CavityOutline()

  /** The tiled sand grain, made once. Undefined until first asked for. */
  private grain: CanvasPattern | null | undefined

  constructor(canvas: HTMLCanvasElement, theme: NestViewTheme = DEFAULT_THEME) {
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Canvas 2D is not available in this browser')
    this.ctx = context
    this.theme = theme
  }

  /** Swaps the colours when the page theme changes. The next draw uses them. */
  setTheme(theme: NestViewTheme): void {
    this.theme = theme
  }

  /** How far an ant is drawn from its simulated position, in centimetres. For clicking. */
  spreadOf(slot: number): { x: number; y: number } {
    return { x: this.spreadX[slot] ?? 0, y: this.spreadY[slot] ?? 0 }
  }

  /**
   * A viewport that frames the whole nest, so a colony of a dozen nanitics is drawn large
   * and a mature nest is drawn whole.
   */
  static frameNest(nest: NestGrid): NestViewport {
    const dug = Math.max(nest.maxDepthCm, 12)
    const spanCm = Math.max(24, dug * 1.25)
    return { topCm: -spanCm * 0.06, spanCm, centreCm: 0 }
  }

  /**
   * A viewport at the scale of an ant, centred on the queen.
   *
   * This is the default, and the reason is worth stating: at the scale that fits a
   * three-metre nest on a screen, a 6 mm ant is a fifth of a pixel. A reader who wants the
   * whole nest can have it in one click; a reader who wants to watch ants has to start here.
   *
   * The queen, because she is where the brood is and the brood is where the colony is. Two
   * other focus points were tried and both were worse. The deepest ant put the window on the
   * empty bottom of a three-metre shaft. The mean position of all the ants put it halfway down
   * that shaft, in the middle of nothing.
   *
   * It follows where she is drawn, not where the model has her. The model moves her half a
   * centimetre at a time, and a camera that followed that jumped half a centimetre with every
   * step she took. main.ts eases the viewport on top of this.
   */
  static frameWork(
    ants: AntStore,
    motion: AntMotion,
    spanCm: number,
    queenSlot: number,
  ): NestViewport {
    let focusX = 0
    let focusY = 0
    if (queenSlot >= 0 && ants.isAlive(queenSlot) && ants.domain[queenSlot] === Domain.Nest) {
      focusX = motion.drawnX(queenSlot)
      focusY = motion.drawnY(queenSlot)
    } else {
      // Queenless, or she is not yet underground. Fall back to the middle of the workforce.
      let sumX = 0
      let sumY = 0
      let counted = 0
      for (let i = 0; i < ants.count; i += 1) {
        if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
        sumX += motion.drawnX(i)
        sumY += motion.drawnY(i)
        counted += 1
      }
      if (counted === 0) return { topCm: -spanCm * 0.1, spanCm, centreCm: 0 }
      focusX = sumX / counted
      focusY = sumY / counted
    }
    return {
      topCm: Math.max(-spanCm * 0.1, focusY - spanCm * 0.5),
      spanCm,
      centreCm: focusX,
    }
  }

  /** The depth and offset a point on the canvas corresponds to. For clicking on ants. */
  static unproject(
    viewport: NestViewport,
    widthPx: number,
    heightPx: number,
    px: number,
    py: number,
  ): { offsetCm: number; depthCm: number } {
    const pxPerCm = heightPx / viewport.spanCm
    const plotWidth = widthPx - RULER_WIDTH
    return {
      offsetCm: (px - RULER_WIDTH - plotWidth / 2) / pxPerCm + viewport.centreCm,
      depthCm: py / pxPerCm + viewport.topCm,
    }
  }

  draw(
    nest: NestGrid,
    soil: SoilModel,
    ants: AntStore,
    viewport: NestViewport,
    widthPx: number,
    heightPx: number,
    options: NestDrawOptions,
  ): void {
    const { ctx, theme } = this
    const plotWidth = widthPx - RULER_WIDTH
    const pxPerCm = heightPx / viewport.spanCm

    ctx.clearRect(0, 0, widthPx, heightPx)

    const yOf = (depthCm: number): number => (depthCm - viewport.topCm) * pxPerCm
    const xOf = (offsetCm: number): number =>
      RULER_WIDTH + plotWidth / 2 + (offsetCm - viewport.centreCm) * pxPerCm

    // Sky above the ground line, then the sand: a tone that deepens with depth, the model's
    // soil moisture, and the grain.
    const groundY = yOf(0)
    ctx.fillStyle = theme.sky
    ctx.fillRect(RULER_WIDTH, 0, plotWidth, Math.max(0, groundY))
    if (groundY > 0) this.drawWeather(RULER_WIDTH, plotWidth, groundY, options)

    const gradient = ctx.createLinearGradient(0, Math.max(0, groundY), 0, heightPx)
    gradient.addColorStop(0, theme.soilTop)
    gradient.addColorStop(1, theme.soilDeep)
    ctx.fillStyle = gradient
    ctx.fillRect(RULER_WIDTH, Math.max(0, groundY), plotWidth, heightPx)

    const cell = nest.cellSizeCm
    const cellPx = Math.max(1, cell * pxPerCm)
    const view: CellWindow = {
      firstRow: Math.max(0, nest.rowOfDepth(viewport.topCm)),
      lastRow: Math.min(nest.rows - 1, nest.rowOfDepth(viewport.topCm + viewport.spanCm) + 1),
      firstCol: Math.max(0, nest.colOfOffset(viewport.centreCm - plotWidth / 2 / pxPerCm) - 1),
      lastCol: Math.min(
        nest.cols - 1,
        nest.colOfOffset(viewport.centreCm + plotWidth / 2 / pxPerCm) + 1,
      ),
    }

    this.drawSand(soil, xOf, yOf, pxPerCm, view, plotWidth, heightPx, groundY)
    if (cellPx >= BURROW_DETAIL_MIN_CELL_PX) {
      this.drawBurrows(nest, xOf, yOf, pxPerCm, view, groundY, heightPx, plotWidth)
    } else {
      this.drawBurrowsFlat(nest, xOf, yOf, cellPx, view)
    }

    const plot = { left: RULER_WIDTH, top: 0, width: plotWidth, height: heightPx }
    if (groundY > 0) this.drawGround(nest, ants, xOf, groundY, pxPerCm, plot, options)
    if (options.showDiggingScent) this.drawDiggingScent(nest, xOf, yOf, cellPx, view)
    this.drawContents(nest, xOf, yOf, pxPerCm, cellPx, view, options)
    this.drawAnts(nest, ants, xOf, yOf, pxPerCm, widthPx, heightPx, options)
    if (options.labels === true) {
      this.drawLabels(nest, ants, xOf, yOf, cellPx, view, widthPx, heightPx, options)
    }
    if (groundY <= 0) this.drawGroundBand(nest, ants, plotWidth, heightPx, options)
    this.drawRuler(viewport, heightPx, pxPerCm, widthPx)
  }

  /**
   * The sand round the nest: how damp it is, and its grain.
   *
   * The damp is the model's. Soil moisture by depth, read from the soil model under the
   * entrance, darkens the sand where it is wetter, which is where the colony keeps its seeds.
   * The grain is appearance: a texture scaled with the zoom, so a grain stays about a grain's
   * size and the sand moves with the camera rather than sliding under it.
   */
  private drawSand(
    soil: SoilModel,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    pxPerCm: number,
    view: CellWindow,
    plotWidth: number,
    heightPx: number,
    groundY: number,
  ): void {
    const { ctx } = this
    const top = Math.max(0, groundY)
    if (top >= heightPx) return

    // One vertical gradient, sampled down the column under the entrance. A band per row drew a
    // faint seam wherever two bands overlapped.
    const moisture = soil.moisture
    const underEntrance = Math.floor(moisture.width / 2)
    const y0 = yOf(view.firstRow * moisture.cellSize)
    const y1 = yOf((view.lastRow + 1) * moisture.cellSize)
    if (y1 > y0) {
      const damp = ctx.createLinearGradient(0, y0, 0, y1)
      const rows = view.lastRow - view.firstRow
      const stops = Math.max(2, Math.min(DAMP_STOPS, rows + 1))
      for (let s = 0; s < stops; s += 1) {
        const f = s / (stops - 1)
        const row = Math.round(view.firstRow + f * rows)
        const alpha = Math.min(DAMP_MAX_ALPHA, moisture.get(underEntrance, row) * DAMP_STRENGTH)
        damp.addColorStop(f, `rgba(${DAMP_RGB}, ${alpha.toFixed(3)})`)
      }
      ctx.fillStyle = damp
      ctx.fillRect(RULER_WIDTH, top, plotWidth, heightPx - top)
    }

    const pattern = this.grainPattern()
    if (pattern !== null) {
      const scale = Math.min(2, Math.max(0.6, pxPerCm * GRAIN_CM_PER_TEXEL))
      pattern.setTransform(new DOMMatrix().translate(xOf(0), yOf(0)).scale(scale))
      ctx.fillStyle = pattern
      ctx.fillRect(RULER_WIDTH, top, plotWidth, heightPx - top)
    }
  }

  /** A small tile of light and dark sand grains, made once and repeated. Appearance only. */
  private grainPattern(): CanvasPattern | null {
    if (this.grain !== undefined) return this.grain
    const size = 96
    const tile = document.createElement('canvas')
    tile.width = size
    tile.height = size
    const g = tile.getContext('2d')
    if (g === null) {
      this.grain = null
      return null
    }
    // A fixed generator, so the sand looks the same on every load.
    let state = 0x2f6b4d
    const next = (): number => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0
      return state / 4294967296
    }
    for (let k = 0; k < 1100; k += 1) {
      const light = next() < 0.5
      const alpha = light ? 0.06 + next() * 0.14 : 0.05 + next() * 0.12
      g.fillStyle = light ? `rgba(255, 240, 212, ${alpha})` : `rgba(64, 40, 16, ${alpha})`
      const s = next() < 0.8 ? 1 : 2
      g.fillRect(Math.floor(next() * size), Math.floor(next() * size), s, s)
    }
    this.grain = this.ctx.createPattern(tile, 'repeat')
    return this.grain
  }

  /**
   * The excavated void, as one smooth outline round the cells the model dug.
   *
   * Drawn square by square, a chamber the ants shaped looked built from bricks, which is the one
   * thing a nest is not. So the outline is traced through a smooth field over the dug cells
   * (cavity.ts). A straight wall still sits where the model's cells end, to within a tenth of a
   * millimetre, a dead-end tunnel keeps its last cell, and two cells that touch only at a corner,
   * which the ants do walk between, stay joined. What changes is the corners, which are rounded
   * the way sand falls away from a pocket dug in it. The top of the entrance is open to the air.
   *
   * Inside, the cavity darkens towards its walls, the way light falls off under a sand overhang,
   * and a thin lit rim of packed sand runs round every wall. Both are appearance.
   */
  private drawBurrows(
    nest: NestGrid,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    pxPerCm: number,
    view: CellWindow,
    groundY: number,
    heightPx: number,
    plotWidth: number,
  ): void {
    const { ctx, theme } = this
    const { fill, walls } = this.cavity.paths(nest, view)

    ctx.save()
    const clipTop = Math.max(0, groundY)
    ctx.beginPath()
    ctx.rect(RULER_WIDTH, clipTop, plotWidth, heightPx - clipTop)
    ctx.clip()

    // The outline is kept in centimetres, so it is drawn through the camera, and every line
    // width is divided by the zoom so it stays the same number of pixels.
    ctx.translate(xOf(0), yOf(0))
    ctx.scale(pxPerCm, pxPerCm)
    const px = 1 / pxPerCm

    ctx.fillStyle = theme.voidFill
    ctx.fill(fill)

    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.save()
    ctx.clip(fill)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.lineWidth = Math.max(3 * px, 0.36)
    ctx.stroke(walls)
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = Math.max(1.5 * px, 0.14)
    ctx.stroke(walls)
    ctx.restore()

    ctx.strokeStyle = theme.voidRoof
    ctx.globalAlpha = 0.5
    ctx.lineWidth = Math.max(px, 0.05)
    ctx.stroke(walls)
    ctx.globalAlpha = 1
    ctx.restore()
  }

  /** The void cell by cell, for zooms where a cell is too small to trace. */
  private drawBurrowsFlat(
    nest: NestGrid,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    cellPx: number,
    view: CellWindow,
  ): void {
    const { ctx, theme } = this
    const cell = nest.cellSizeCm
    ctx.fillStyle = theme.voidFill
    for (let row = view.firstRow; row <= view.lastRow; row += 1) {
      const y = yOf(nest.depthOf(row) - cell / 2)
      for (let col = view.firstCol; col <= view.lastCol; col += 1) {
        if (!nest.isVoid(col, row)) continue
        ctx.fillRect(xOf(nest.offsetOf(col) - cell / 2), y, cellPx + 0.5, cellPx + 0.5)
      }
    }
  }

  /**
   * The ground above the nest, seen from the side: the bare disc of sand round the entrance,
   * charcoal on it, grass beyond it, seeds lying on the surface, and the ants out on it.
   *
   * The disc, the charcoal and the grass are drawn, not modelled. The model builds no mound, and
   * the species file's disc diameter is used only here. The seeds and the ants are the model's.
   * The ground is a plan with no depth to show in a slice, so what is drawn is everything within
   * GROUND_SLAB_M either side of the plane of the slice, side on. The map inset shows the rest.
   */
  private drawGround(
    nest: NestGrid,
    ants: AntStore,
    xOf: (cm: number) => number,
    groundY: number,
    pxPerCm: number,
    clip: { left: number; top: number; width: number; height: number },
    options: NestDrawOptions,
  ): void {
    const { ctx, theme } = this
    const { sizes, motion, surface } = options
    const pxPerMm = pxPerCm / 10
    const radiusCm = options.discDiameterCm / 2
    const entranceX = xOf(0)
    const leftCm = (clip.left - entranceX) / pxPerCm
    const rightCm = (clip.left + clip.width - entranceX) / pxPerCm

    ctx.save()
    ctx.beginPath()
    ctx.rect(clip.left, clip.top, clip.width, clip.height)
    ctx.clip()

    // Where the entrance opens, read from the void along the top row of the nest.
    let openLeftCm = 0
    let openRightCm = 0
    if (nest.isVoid(nest.entranceCol, 0)) {
      let col = nest.entranceCol
      while (nest.isVoid(col - 1, 0)) col -= 1
      openLeftCm = nest.offsetOf(col) - nest.cellSizeCm / 2
      col = nest.entranceCol
      while (nest.isVoid(col + 1, 0)) col += 1
      openRightCm = nest.offsetOf(col) + nest.cellSizeCm / 2
    }

    // Grass beyond the disc, in tufts at stable spacing. The disc itself is bare.
    ctx.strokeStyle = theme.grass
    ctx.lineCap = 'round'
    ctx.lineWidth = Math.max(0.6, 0.12 * pxPerCm)
    const tuftSpacingCm = 4
    const skyPx = groundY - clip.top
    for (
      let t = Math.floor(leftCm / tuftSpacingCm) - 1;
      t <= Math.ceil(rightCm / tuftSpacingCm) + 1;
      t += 1
    ) {
      const baseCm = (t + hash(t * 7 + 3)) * tuftSpacingCm
      if (Math.abs(baseCm) < radiusCm * 1.05 || hash(t * 13 + 1) < 0.35) continue
      const blades = 3 + Math.floor(hash(t * 5 + 2) * 4)
      const tuftCm = 4 + hash(t * 11 + 4) * 14
      const x = xOf(baseCm)
      for (let k = 0; k < blades; k += 1) {
        const lean = (hash(t * 17 + k) - 0.5) * 0.9
        const h = Math.min(tuftCm * (0.55 + 0.45 * hash(t * 19 + k)) * pxPerCm, skyPx * 0.9)
        const bx = x + k * 0.15 * pxPerCm
        ctx.beginPath()
        ctx.moveTo(bx, groundY)
        ctx.quadraticCurveTo(
          bx + lean * h * 0.3,
          groundY - h * 0.6,
          bx + lean * h * 0.6,
          groundY - h,
        )
        ctx.stroke()
      }
    }

    // The disc: a very slight, flattened rise of excavated sand with the entrance open in it.
    const riseCm = (cm: number): number => {
      const u = cm / radiusCm
      return Math.abs(u) >= 1 ? 0 : DISC_RISE_CM * (1 - u * u)
    }
    ctx.fillStyle = theme.disc
    const halves: [number, number][] = [
      [-radiusCm, openLeftCm],
      [openRightCm, radiusCm],
    ]
    for (const [from, to] of halves) {
      if (to <= from) continue
      ctx.beginPath()
      ctx.moveTo(xOf(from), groundY)
      for (let s = 0; s <= 24; s += 1) {
        const cm = from + ((to - from) * s) / 24
        ctx.lineTo(xOf(cm), groundY - riseCm(cm) * pxPerCm)
      }
      ctx.lineTo(xOf(to), groundY)
      ctx.closePath()
      ctx.fill()
    }

    // Charcoal carried onto the disc, a few millimetres a piece.
    ctx.fillStyle = theme.charcoal
    const pieces = Math.round(options.discDiameterCm * CHARCOAL_PER_CM)
    for (let k = 0; k < pieces; k += 1) {
      const cm = (hash(k * 31 + 5) * 2 - 1) * radiusCm
      if (cm > openLeftCm - 0.3 && cm < openRightCm + 0.3) continue
      if (cm < leftCm - 1 || cm > rightCm + 1) continue
      const lengthPx = (1.5 + hash(k * 37 + 6) * 2.5) * pxPerMm
      ctx.beginPath()
      ctx.ellipse(
        xOf(cm),
        groundY - riseCm(cm) * pxPerCm - lengthPx * 0.15,
        Math.max(0.6, lengthPx / 2),
        Math.max(0.5, lengthPx * 0.28),
        hash(k * 41 + 7) * 0.6 - 0.3,
        0,
        Math.PI * 2,
      )
      ctx.fill()
    }

    // Seeds lying on the ground in line with the slice.
    if (surface !== undefined) {
      const grid = surface.seeds
      const firstCol = Math.max(0, grid.colOf(leftCm / 100))
      const lastCol = Math.min(surface.cols - 1, grid.colOf(rightCm / 100))
      const firstRow = Math.max(0, grid.rowOf(-GROUND_SLAB_M))
      const lastRow = Math.min(surface.rows - 1, grid.rowOf(GROUND_SLAB_M))
      ctx.fillStyle = theme.seed
      for (let col = firstCol; col <= lastCol; col += 1) {
        let count = 0
        for (let row = firstRow; row <= lastRow; row += 1) count += grid.get(col, row)
        const n = Math.min(MAX_GROUND_SEEDS_PER_CELL, Math.floor(count))
        const cellLeftCm = (grid.xOf(col) - surface.cellSizeM / 2) * 100
        for (let k = 0; k < n; k += 1) {
          const cm = cellLeftCm + fract(col, 0, k + 1200) * surface.cellSizeM * 100
          if (cm > openLeftCm && cm < openRightCm) continue
          drawSeed(
            ctx,
            xOf(cm),
            groundY - riseCm(cm) * pxPerCm - sizes.seedWidthMm * pxPerMm * 0.5,
            sizes.seedLengthMm * pxPerMm,
            sizes.seedWidthMm * pxPerMm,
            fract(col, 0, k + 1300) * 0.6,
          )
        }
      }
    }

    // The ants out on the ground, walking one way or the other along it.
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Surface) continue
      if (Math.abs(motion.drawnY(i)) > GROUND_SLAB_M) continue
      const cm = motion.drawnX(i) * 100
      if (cm < leftCm - 2 || cm > rightCm + 2) continue
      const caste = ants.caste[i]!
      const body = antBodyFor(caste, ants.lengthMm[i]!, sizes, pxPerMm)
      const burden = ants.burden[i]!
      // Seen from the side, with her feet on the ground rather than in it.
      drawAntSide(
        ctx,
        xOf(cm),
        groundY - riseCm(cm) * pxPerCm - sideStandHeight(body),
        body,
        motion.facingX(i) >= 0 ? 1 : -1,
        0,
        0,
        1,
        coloursFor(caste),
        burden,
        options.timeSeconds * 9 + i * 1.7,
        burdenLengthMm(burden, sizes) * pxPerMm,
      )
    }

    ctx.restore()
  }

  /**
   * When the camera is too deep to see the ground, a band across the top shows it anyway, at a
   * smaller scale, so the foragers going out and the seeds coming in are always in the picture.
   * The band prints how much ground it shows, because it is not at the depth ruler's scale.
   */
  /**
   * Cloud and rain over the strip of sky above the ground. Cloud greys the sky; rain greys it
   * further and falls as thin slanted streaks, which hold still for reduced motion.
   */
  private drawWeather(
    left: number,
    width: number,
    skyHeight: number,
    options: NestDrawOptions,
  ): void {
    const weather = options.weather
    if (weather === undefined || skyHeight <= 0) return
    if (!weather.overcast && !weather.raining) return
    const { ctx } = this
    ctx.fillStyle = weather.raining ? 'rgba(52, 60, 68, 0.42)' : 'rgba(70, 78, 86, 0.24)'
    ctx.fillRect(left, 0, width, skyHeight)
    if (!weather.raining) return

    ctx.save()
    ctx.beginPath()
    ctx.rect(left, 0, width, skyHeight)
    ctx.clip()
    ctx.strokeStyle = 'rgba(214, 226, 236, 0.55)'
    ctx.lineWidth = 1
    const spacing = 14
    const length = 9
    const fall = weather.still ? 0 : (options.timeSeconds * 260) % (spacing * 3)
    ctx.beginPath()
    for (let x = left - skyHeight; x < left + width + spacing; x += spacing) {
      // Offset each column so the streaks read as rain rather than a grid.
      const phase = ((x * 7919) % 37) + fall
      for (let y = (phase % (spacing * 3)) - spacing * 3; y < skyHeight; y += spacing * 3) {
        ctx.moveTo(x + y * 0.25, y)
        ctx.lineTo(x + (y + length) * 0.25, y + length)
      }
    }
    ctx.stroke()
    ctx.restore()
  }

  private drawGroundBand(
    nest: NestGrid,
    ants: AntStore,
    plotWidth: number,
    heightPx: number,
    options: NestDrawOptions,
  ): void {
    const { ctx, theme } = this
    const bandPx = Math.min(GROUND_BAND_PX, heightPx * 0.22)
    const spanCm = options.discDiameterCm * GROUND_BAND_DISCS
    const pxPerCm = plotWidth / spanCm
    const groundY = bandPx * 0.7
    const xOf = (cm: number): number => RULER_WIDTH + plotWidth / 2 + cm * pxPerCm

    ctx.fillStyle = theme.sky
    ctx.fillRect(RULER_WIDTH, 0, plotWidth, groundY)
    this.drawWeather(RULER_WIDTH, plotWidth, groundY, options)
    ctx.fillStyle = theme.soilTop
    ctx.fillRect(RULER_WIDTH, groundY, plotWidth, bandPx - groundY)
    ctx.fillStyle = theme.voidFill
    ctx.fillRect(
      xOf(0) - Math.max(1, nest.cellSizeCm * pxPerCm),
      groundY,
      Math.max(2, nest.cellSizeCm * 2 * pxPerCm),
      bandPx - groundY,
    )

    const band = { left: RULER_WIDTH, top: 0, width: plotWidth, height: bandPx }
    this.drawGround(nest, ants, xOf, groundY, pxPerCm, band, options)

    ctx.strokeStyle = 'rgba(40, 28, 16, 0.5)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(RULER_WIDTH, bandPx + 0.5)
    ctx.lineTo(RULER_WIDTH + plotWidth, bandPx + 0.5)
    ctx.stroke()

    ctx.font = "11px 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = 'right'
    ctx.textBaseline = 'bottom'
    ctx.fillStyle = 'rgba(40, 28, 16, 0.85)'
    ctx.fillText(
      `The ground above, ${Math.round(spanCm)} cm across`,
      RULER_WIDTH + plotWidth - 8,
      bandPx - 4,
    )
  }

  /**
   * The building pheromone, as a tint over the cells that hold it.
   *
   * Scaled to one fresh deposit, which is what a single dug cell adds, so the tint means the
   * same thing on every screen: full strength is sand dug moments ago, and it fades as the
   * scent decays. Scaling to the strongest cell on screen instead turned a floating-point
   * remnant a billion times weaker into a solid violet nest whenever nobody had dug lately.
   * The square root lifts old scent enough to be seen next to new.
   */
  private drawDiggingScent(
    nest: NestGrid,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    cellPx: number,
    view: CellWindow,
  ): void {
    const { ctx } = this
    const bounds = nest.pheromoneBounds()
    const firstRow = Math.max(view.firstRow, bounds.minRow)
    const lastRow = Math.min(view.lastRow, bounds.maxRow)
    const firstCol = Math.max(view.firstCol, bounds.minCol)
    const lastCol = Math.min(view.lastCol, bounds.maxCol)
    if (firstRow > lastRow || firstCol > lastCol) return

    const cell = nest.cellSizeCm
    ctx.fillStyle = pheromoneColour('building')
    for (let row = firstRow; row <= lastRow; row += 1) {
      const y = yOf(nest.depthOf(row) - cell / 2)
      for (let col = firstCol; col <= lastCol; col += 1) {
        const v = nest.building.get(col, row)
        if (v < SCENT_FLOOR) continue
        const alpha = 0.55 * Math.sqrt(Math.min(1, v))
        ctx.globalAlpha = alpha
        ctx.fillRect(xOf(nest.offsetOf(col) - cell / 2), y, cellPx + 0.5, cellPx + 0.5)
      }
    }
    ctx.globalAlpha = 1
  }

  /**
   * Seeds and brood, where the colony actually put them, at their real sizes.
   *
   * Zoomed in they are counted objects: one glyph per seed, one per piece of brood, up to a
   * cap. Zoomed out they are a tint over the cell, because forty seeds in a half centimetre
   * cell cannot be forty distinguishable dots and pretending otherwise would make a full store
   * look identical to an empty one.
   */
  private drawContents(
    nest: NestGrid,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    pxPerCm: number,
    cellPx: number,
    view: CellWindow,
    options: NestDrawOptions,
  ): void {
    const { ctx, theme } = this
    const { sizes } = options
    const pxPerMm = pxPerCm / 10
    const glyphs = cellPx >= GLYPH_MIN_CELL_PX
    const mix = options.broodMix
    const broodTotal = Math.max(1e-9, mix.eggs + mix.larvae + mix.pupae)
    const eggShare = mix.eggs / broodTotal
    const larvaShare = (mix.eggs + mix.larvae) / broodTotal

    for (let row = view.firstRow; row <= view.lastRow; row += 1) {
      const cy = yOf(nest.depthOf(row))
      for (let col = view.firstCol; col <= view.lastCol; col += 1) {
        const seeds = nest.seeds.get(col, row)
        const brood = nest.brood.get(col, row)
        if (seeds < 0.05 && brood < 0.05) continue
        const cx = xOf(nest.offsetOf(col))
        // Seeds and brood lie on the floor of a chamber rather than float in the middle of it.
        const onFloor = nest.isSoil(col, row + 1)
        const settle = (dy: number): number => (onFloor ? cellPx * 0.4 - Math.abs(dy) * 0.8 : dy)

        if (!glyphs) {
          // Too small to count. Tint the cell by how full it is.
          if (seeds >= 0.05) {
            ctx.globalAlpha = Math.min(0.95, 0.3 + seeds / 40)
            ctx.fillStyle = theme.seed
            ctx.fillRect(cx - cellPx / 2, cy - cellPx / 2, cellPx + 0.5, cellPx + 0.5)
          }
          if (brood >= 0.05) {
            ctx.globalAlpha = Math.min(0.95, 0.35 + brood / 20)
            ctx.fillStyle = theme.egg
            ctx.fillRect(cx - cellPx / 2, cy - cellPx / 2, cellPx + 0.5, cellPx + 0.5)
          }
          ctx.globalAlpha = 1
          continue
        }

        // Countable. Positions and angles come from a hash of the cell, so nothing jitters
        // from frame to frame and two runs of the same seed draw alike.
        if (seeds >= 0.5) {
          ctx.fillStyle = theme.seed
          const n = Math.min(MAX_SEED_GLYPHS, Math.round(seeds))
          for (let k = 0; k < n; k += 1) {
            const [ox, oy] = scatter(col, row, k, cellPx)
            drawSeed(
              ctx,
              cx + ox,
              cy + settle(oy),
              sizes.seedLengthMm * pxPerMm,
              sizes.seedWidthMm * pxPerMm,
              fract(col, row, k + 333) * Math.PI,
            )
          }
        }

        if (brood >= 0.5) {
          const n = Math.min(MAX_BROOD_GLYPHS, Math.round(brood))
          // Eggs are kept in a clump, so they are drawn around one point in the cell.
          const eggX = cx + (fract(col, row, 501) - 0.5) * cellPx * 0.4
          const eggDy = (fract(col, row, 502) - 0.5) * cellPx * 0.4
          for (let k = 0; k < n; k += 1) {
            const r = fract(col, row, k + 128)
            const stage = r < eggShare ? 0 : r < larvaShare ? 1 : 2
            const angle = fract(col, row, k + 700) * Math.PI * 2
            if (stage === 0) {
              ctx.fillStyle = theme.egg
              const [ox, oy] = scatter(col, row, k + 64, cellPx * 0.4)
              drawBrood(
                ctx,
                eggX + ox,
                cy + settle(eggDy + oy),
                0,
                sizes.eggLengthMm * pxPerMm,
                sizes.eggWidthMm * pxPerMm,
                angle,
              )
            } else if (stage === 1) {
              ctx.fillStyle = theme.larva
              const [ox, oy] = scatter(col, row, k + 64, cellPx)
              const grown = 0.35 + 0.65 * fract(col, row, k + 900)
              const length = sizes.matureLarvaLengthMm * grown * pxPerMm
              drawBrood(ctx, cx + ox, cy + settle(oy), 1, length, length * 0.45, angle)
            } else {
              ctx.fillStyle = theme.pupa
              const [ox, oy] = scatter(col, row, k + 64, cellPx)
              drawBrood(
                ctx,
                cx + ox,
                cy + settle(oy),
                2,
                sizes.pupaLengthMm * pxPerMm,
                sizes.minorHeadwidthMm * pxPerMm,
                angle,
              )
            }
          }
        }
      }
    }
  }

  /** Every ant that is underground and on screen, at her real size. */
  private drawAnts(
    nest: NestGrid,
    ants: AntStore,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    pxPerCm: number,
    widthPx: number,
    heightPx: number,
    options: NestDrawOptions,
  ): void {
    const { ctx } = this
    const { motion, sizes } = options
    this.spreadAnts(nest, ants, motion, sizes, options.timeSeconds)

    const pxPerMm = pxPerCm / 10
    const drawOne = (i: number): void => {
      const x = xOf(motion.drawnX(i) + this.spreadX[i]!)
      const y = yOf(motion.drawnY(i) + this.spreadY[i]!)
      if (x < RULER_WIDTH - 20 || x > widthPx + 20 || y < -20 || y > heightPx + 20) return

      const caste = ants.caste[i]!
      const body = antBodyFor(caste, ants.lengthMm[i]!, sizes, pxPerMm)
      const burden = ants.burden[i]!
      // The walking phase is per-ant, so a chamber full of workers is not a chorus line.
      const phase = options.timeSeconds * 9 + i * 1.7
      const fx = Math.cos(this.poseAngle[i]!)
      const fy = Math.sin(this.poseAngle[i]!)
      const side = this.poseSide[i]!
      drawAntSide(
        ctx,
        x,
        y,
        body,
        fx,
        fy,
        -fy * side,
        fx * side,
        coloursFor(caste),
        burden,
        phase,
        burdenLengthMm(burden, sizes) * pxPerMm,
      )

      if (i === options.selected) {
        ctx.strokeStyle = '#f4d58d'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, Math.max(6, body.lengthPx * 0.7), 0, Math.PI * 2)
        ctx.stroke()
      }
    }

    // The queen last, so she is never hidden under the workers crowding round her.
    let queen = -1
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      if (ants.caste[i] === Caste.Queen) {
        queen = i
        continue
      }
      drawOne(i)
    }
    if (queen >= 0) drawOne(queen)
  }

  /**
   * Where each ant is drawn, and which way up. A drawing convention; see the top of this file.
   *
   * Ants are drawn from the side, so each needs something to stand on. An ant with sand under
   * her within a centimetre, the height of a chamber, stands on that floor. An ant heading up or
   * down, or with no floor near, holds on to a wall instead. Which wall follows which way up she
   * already was: an ant that walks off the edge of a floor goes down the side of the hole she
   * stepped off rather than flipping over, and in a shaft the ants climbing and the ants going
   * down settle on opposite walls, which is how two ants pass in a tunnel under a centimetre
   * wide. Ants sharing a cell are spread out along the floor or wall. Each one slides and turns
   * to her place rather than jumping there, and a place that would stand her in sand is dropped.
   */
  private spreadAnts(
    nest: NestGrid,
    ants: AntStore,
    motion: AntMotion,
    sizes: BodySizes,
    timeSeconds: number,
  ): void {
    if (this.spreadX.length < ants.capacity) {
      this.spreadX = new Float32Array(ants.capacity)
      this.spreadY = new Float32Array(ants.capacity)
      this.spreadId = new Uint32Array(ants.capacity)
      this.poseAngle = new Float32Array(ants.capacity)
      this.poseSide = new Int8Array(ants.capacity).fill(1)
    }
    const dt = Math.min(0.25, Math.max(0, timeSeconds - this.lastTimeSeconds))
    this.lastTimeSeconds = timeSeconds
    const ease = 1 - Math.exp(-SPREAD_EASE_PER_SECOND * dt)
    const turn = 1 - Math.exp(-TURN_EASE_PER_SECOND * dt)
    const cell = nest.cellSizeCm
    const cols = nest.cols

    const groups = new Map<number, number[]>()
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      if (this.spreadId[i] !== ants.id[i]) {
        // A reused slot is a different ant. She starts in the middle of her cell, feet down.
        const left = motion.facingX(i) < 0
        this.spreadId[i] = ants.id[i]!
        this.spreadX[i] = 0
        this.spreadY[i] = 0
        this.poseAngle[i] = left ? Math.PI : 0
        this.poseSide[i] = left ? -1 : 1
      }
      const key = nest.rowOfDepth(motion.drawnY(i)) * cols + nest.colOfOffset(motion.drawnX(i))
      const group = groups.get(key)
      if (group === undefined) groups.set(key, [i])
      else group.push(i)
    }

    for (const [key, group] of groups) {
      const col = key % cols
      const row = (key - col) / cols
      const floorRow = soilBelow(nest, col, row)
      const leftCol = soilBeside(nest, col, row, -1)
      const rightCol = soilBeside(nest, col, row, 1)

      group.sort(
        (a, b) =>
          Math.sign(motion.facingY(a)) - Math.sign(motion.facingY(b)) || ants.id[a]! - ants.id[b]!,
      )

      const n = group.length
      for (let k = 0; k < n; k += 1) {
        const slot = group[k]!
        const id = ants.id[slot]!
        // From one side of the cell to the other, along the floor or the wall. A lone ant stands
        // a little off centre, so a line of single ants does not look like beads on a string.
        const along =
          (n === 1 ? (hash(id) - 0.5) * 0.5 : k / (n - 1) - 0.5) * 2 * SPREAD_FRACTION * cell
        const fx = motion.facingX(slot)
        const fy = motion.facingY(slot)
        const x0 = motion.drawnX(slot)
        const y0 = motion.drawnY(slot)
        const body = antBodyFor(ants.caste[slot]!, ants.lengthMm[slot]!, sizes, 1)
        const standCm = sideStandHeight(body) / MM_PER_CM

        let targetX = along
        let targetY = 0
        let angle = Math.atan2(fy, fx)
        let downX = 0
        let downY = 1

        // Which wall, if any. Climbing, her feet stay on the side of her body they were on;
        // going down, the same wall is on her other side.
        let wall = 0
        if (floorRow < 0 || Math.abs(fy) > CLIMB_FACING) {
          const keep = fy < 0 ? this.poseSide[slot]! : -this.poseSide[slot]!
          if ((keep < 0 ? leftCol : rightCol) >= 0) wall = keep
          else if ((keep < 0 ? rightCol : leftCol) >= 0) wall = -keep
        }

        if (wall !== 0) {
          const wallX = nest.offsetOf(wall < 0 ? leftCol : rightCol) - (wall * cell) / 2
          targetX = wallX - wall * standCm - x0
          targetY = along * 0.6
          angle = fy < 0 ? -Math.PI / 2 : Math.PI / 2
          downX = wall
          downY = 0
        } else if (floorRow >= 0) {
          targetY = nest.depthOf(floorRow) - cell / 2 - standCm - y0
          const facingLeft = Math.abs(fx) > 0.05 ? fx < 0 : Math.cos(this.poseAngle[slot]!) < 0
          angle = facingLeft ? Math.PI : 0
        }

        if (!nest.isVoid(nest.colOfOffset(x0 + targetX), nest.rowOfDepth(y0 + targetY))) {
          targetX = 0
          targetY = 0
        }

        const current = this.poseAngle[slot]!
        const diff = wrapAngle(angle - current)
        this.poseAngle[slot] =
          Math.abs(diff) > SNAP_TURN_RADIANS ? angle : wrapAngle(current + diff * turn)
        this.poseSide[slot] = -Math.sin(angle) * downX + Math.cos(angle) * downY < 0 ? -1 : 1
        this.spreadX[slot] = this.spreadX[slot]! + (targetX - this.spreadX[slot]!) * ease
        this.spreadY[slot] = this.spreadY[slot]! + (targetY - this.spreadY[slot]!) * ease
      }
    }
  }

  /**
   * Name tags on the queen, the biggest pile of brood and the biggest store of seeds in view.
   *
   * For a reader who does not yet know an egg from a seed. Each tag points at what the model has
   * in that place; "biggest" is only the single cell holding the most.
   */
  private drawLabels(
    nest: NestGrid,
    ants: AntStore,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    cellPx: number,
    view: CellWindow,
    widthPx: number,
    heightPx: number,
    options: NestDrawOptions,
  ): void {
    if (cellPx < LABEL_MIN_CELL_PX) return
    const { ctx } = this
    const tags: { x: number; y: number; text: string; above: boolean }[] = []

    let broodMost = 0.5
    let seedMost = 0.5
    let broodAt = -1
    let seedAt = -1
    for (let row = view.firstRow; row <= view.lastRow; row += 1) {
      for (let col = view.firstCol; col <= view.lastCol; col += 1) {
        const brood = nest.brood.get(col, row)
        const seeds = nest.seeds.get(col, row)
        if (brood >= broodMost) {
          broodMost = brood
          broodAt = row * nest.cols + col
        }
        if (seeds >= seedMost) {
          seedMost = seeds
          seedAt = row * nest.cols + col
        }
      }
    }
    const at = (index: number): { x: number; y: number } => {
      const col = index % nest.cols
      const row = (index - col) / nest.cols
      return { x: xOf(nest.offsetOf(col)), y: yOf(nest.depthOf(row)) }
    }
    if (broodAt >= 0) {
      const mix = options.broodMix
      const text = mix.larvae + mix.pupae < 0.5 ? 'Eggs' : 'Brood'
      tags.push({ ...at(broodAt), text, above: false })
    }
    if (seedAt >= 0) tags.push({ ...at(seedAt), text: 'Seed store', above: true })
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      if (ants.caste[i] !== Caste.Queen) continue
      tags.push({
        x: xOf(options.motion.drawnX(i) + this.spreadX[i]!),
        y: yOf(options.motion.drawnY(i) + this.spreadY[i]!),
        text: 'Queen',
        above: true,
      })
    }

    ctx.save()
    ctx.font = "500 11px 'Geist', ui-sans-serif, system-ui, sans-serif"
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.lineWidth = 1
    const height = 19
    const gap = Math.max(16, cellPx * 1.5)
    for (const tag of tags) {
      const centreY = tag.above ? tag.y - gap - height / 2 : tag.y + gap + height / 2
      const width = ctx.measureText(tag.text).width + 16
      if (tag.x < RULER_WIDTH + width / 2 || tag.x > widthPx - width / 2) continue
      if (centreY < height || centreY > heightPx - height) continue
      ctx.strokeStyle = 'rgba(236, 232, 223, 0.5)'
      ctx.beginPath()
      ctx.moveTo(tag.x, tag.above ? tag.y - 5 : tag.y + 5)
      ctx.lineTo(tag.x, tag.above ? centreY + height / 2 : centreY - height / 2)
      ctx.stroke()
      ctx.beginPath()
      ctx.roundRect(tag.x - width / 2, centreY - height / 2, width, height, height / 2)
      ctx.fillStyle = 'rgba(18, 17, 15, 0.8)'
      ctx.fill()
      ctx.strokeStyle = 'rgba(255, 244, 225, 0.18)'
      ctx.stroke()
      ctx.fillStyle = '#ece8df'
      ctx.fillText(tag.text, tag.x, centreY + 0.5)
    }
    ctx.restore()
  }

  /**
   * The centimetre ruler. Chooses a step that keeps roughly six to twelve labels on screen
   * whatever the zoom, so the scale is readable at a nanitic's nest and at three metres.
   */
  private drawRuler(
    viewport: NestViewport,
    heightPx: number,
    pxPerCm: number,
    widthPx: number,
  ): void {
    const { ctx, theme } = this
    const steps = [0.5, 1, 2, 5, 10, 20, 25, 50, 100, 200, 500]
    const target = viewport.spanCm / 9
    const step = steps.find((s) => s >= target) ?? 500

    ctx.fillStyle = 'rgba(0,0,0,0.28)'
    ctx.fillRect(0, 0, RULER_WIDTH, heightPx)

    ctx.font = "11px 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, monospace"
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const first = Math.ceil(viewport.topCm / step) * step
    for (let depth = first; depth <= viewport.topCm + viewport.spanCm; depth += step) {
      const y = (depth - viewport.topCm) * pxPerCm
      ctx.strokeStyle = theme.rule
      ctx.lineWidth = depth === 0 ? 1.5 : 0.5
      ctx.beginPath()
      ctx.moveTo(RULER_WIDTH - 8, y)
      ctx.lineTo(depth === 0 ? widthPx : RULER_WIDTH, y)
      ctx.stroke()

      ctx.fillStyle = theme.ruleText
      const label = step < 1 ? depth.toFixed(1) : String(Math.round(depth))
      ctx.fillText(depth === 0 ? '0' : label, RULER_WIDTH - 11, y)
    }

    ctx.save()
    ctx.translate(13, heightPx / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = 'center'
    ctx.fillStyle = theme.ruleText
    ctx.fillText('depth (cm)', 0, 0)
    ctx.restore()
  }
}

/** The rows and columns of the nest grid currently on screen. */
interface CellWindow {
  readonly firstRow: number
  readonly lastRow: number
  readonly firstCol: number
  readonly lastCol: number
}

/** The first row of sand under a cell, within reach of an ant standing there, or -1. */
function soilBelow(nest: NestGrid, col: number, row: number): number {
  for (let d = 1; d <= SURFACE_SEARCH_CELLS; d += 1) {
    if (nest.isSoil(col, row + d)) return row + d
  }
  return -1
}

/** The first column of sand to one side of a cell, within reach, or -1. */
function soilBeside(nest: NestGrid, col: number, row: number, direction: -1 | 1): number {
  for (let d = 1; d <= SURFACE_SEARCH_CELLS; d += 1) {
    if (nest.isSoil(col + direction * d, row)) return col + direction * d
  }
  return -1
}

/** An angle brought into the range from minus pi to pi. */
function wrapAngle(radians: number): number {
  return radians - Math.PI * 2 * Math.round(radians / (Math.PI * 2))
}

/** The length of whatever an ant is carrying, in millimetres. */
function burdenLengthMm(burden: number, sizes: BodySizes): number {
  switch (burden) {
    case Burden.Seed:
      return sizes.seedLengthMm
    case Burden.Brood:
      return sizes.matureLarvaLengthMm * 0.6
    case Burden.Corpse:
      return sizes.minorLengthMm
    case Burden.Charcoal:
      return CHARCOAL_MM
    case Burden.SoilPellet:
      return SAND_PELLET_MM
    default:
      return 0
  }
}

/** A stable pseudo-random number in [0, 1) for an integer. Not the model's PRNG. */
function hash(n: number): number {
  const h = Math.sin(n * 12.9898 + 78.233) * 43758.5453
  return h - Math.floor(h)
}

/** A stable pseudo-random number in [0, 1) for a cell and an index. Not the model's PRNG. */
function fract(col: number, row: number, k: number): number {
  const h = Math.sin(col * 127.1 + row * 311.7 + k * 74.7) * 43758.5453
  return h - Math.floor(h)
}

/** An offset inside a cell, stable across frames. */
function scatter(col: number, row: number, k: number, cellPx: number): [number, number] {
  return [
    (fract(col, row, k) - 0.5) * cellPx * 0.8,
    (fract(col, row, k + 999) - 0.5) * cellPx * 0.8,
  ]
}
