/**
 * The vertical slice, drawn.
 *
 * Reads core state. Never writes to it.
 *
 * The one thing this view has to get right is scale. Every dimension in the model is in
 * centimetres and every dimension in the source papers is in centimetres, so the drawing
 * carries a centimetre ruler down its left edge and the reader can hold it against a
 * plaster cast. If a chamber looks 40 cm across it is because the model built one, not
 * because the renderer stretched it. The ants are drawn at their real body length for the
 * same reason: a minor worker is 6.35 mm, and at a zoom where the whole nest fits on screen
 * she is correctly a speck. That is what the zoom is for.
 *
 * This is honestly a slice, and the UI says so: real *badius* shafts are helices, and what
 * is drawn is a plane cut through one.
 *
 * What is in the picture that the model does not decide: the shapes. An egg is drawn as an
 * egg and a seed as a seed, but *how many* of each are in that chamber, and which chamber,
 * is the model's. The one place the drawing invents a distinction is which brood glyph is an
 * egg and which a larva — the grid holds brood as a total, so glyphs are assigned to stages
 * in the colony's current egg:larva:pupa proportions. The legend says so.
 */

import { Domain } from '../core/state/ants.js'
import { drawAnt, drawBrood, drawSeed, coloursFor, QUEEN_DRAW_SCALE } from './ant-sprite.js'
import type { AntStore } from '../core/state/ants.js'
import type { NestGrid } from '../core/state/nest.js'
import type { SoilModel } from '../core/systems/soil.js'
import type { AntMotion } from './ant-motion.js'

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
  /** Seconds since the page opened, for the walking animation. */
  readonly timeSeconds: number
  /** Slot of the ant the reader has clicked on, or -1. */
  readonly selected: number
}

/** Width of the depth ruler gutter, in device-independent pixels. */
const RULER_WIDTH = 54

/** Below this many pixels per cell, contents are a tint rather than countable objects. */
const GLYPH_MIN_CELL_PX = 5

export class NestView {
  private readonly ctx: CanvasRenderingContext2D
  private readonly theme: NestViewTheme

  constructor(canvas: HTMLCanvasElement, theme: NestViewTheme = DEFAULT_THEME) {
    const context = canvas.getContext('2d')
    if (context === null) throw new Error('Canvas 2D is not available in this browser')
    this.ctx = context
    this.theme = theme
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
   * A viewport at the scale of an ant, centred on the deepest place work is happening.
   *
   * This is the default, and the reason is worth stating: at the scale that fits a
   * three-metre nest on a screen, a 6 mm ant is a fifth of a pixel. Every ant in the model
   * was faithfully drawn and none of them could be seen. A reader who wants the whole nest
   * can have it in one click; a reader who wants to watch ants has to start here.
   */
  static frameWork(
    nest: NestGrid,
    ants: AntStore,
    spanCm: number,
    queenSlot: number,
  ): NestViewport {
    // The queen, because she is where the brood is and the brood is where the colony is.
    //
    // Two other focus points were tried and both were worse. The deepest ant put the window
    // on the empty bottom of a three-metre shaft. The mean position of all the ants put it
    // halfway down that shaft, in the middle of nothing, because the diggers are strung out
    // along its whole length and the average of a nursery and a dig face is neither.
    let focusX = 0
    let focusY = 0
    if (queenSlot >= 0 && ants.isAlive(queenSlot) && ants.domain[queenSlot] === Domain.Nest) {
      focusX = ants.x[queenSlot]!
      focusY = ants.y[queenSlot]!
    } else {
      // Queenless, or she is not yet underground. Fall back to the middle of the workforce.
      let sumX = 0
      let sumY = 0
      let counted = 0
      for (let i = 0; i < ants.count; i += 1) {
        if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
        sumX += ants.x[i]!
        sumY += ants.y[i]!
        counted += 1
      }
      if (counted === 0) return { topCm: -spanCm * 0.1, spanCm, centreCm: 0 }
      focusX = sumX / counted
      focusY = sumY / counted
    }
    void nest
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

    // Sky above the ground line, then soil shading by depth.
    const groundY = yOf(0)
    ctx.fillStyle = theme.sky
    ctx.fillRect(RULER_WIDTH, 0, plotWidth, Math.max(0, groundY))

    const gradient = ctx.createLinearGradient(0, Math.max(0, groundY), 0, heightPx)
    gradient.addColorStop(0, theme.soilTop)
    gradient.addColorStop(1, theme.soilDeep)
    ctx.fillStyle = gradient
    ctx.fillRect(RULER_WIDTH, Math.max(0, groundY), plotWidth, heightPx)

    const cell = nest.cellSizeCm
    const cellPx = Math.max(1, cell * pxPerCm)
    const firstRow = Math.max(0, nest.rowOfDepth(viewport.topCm))
    const lastRow = Math.min(nest.rows - 1, nest.rowOfDepth(viewport.topCm + viewport.spanCm) + 1)
    const firstCol = Math.max(0, nest.colOfOffset(viewport.centreCm - plotWidth / 2 / pxPerCm) - 1)
    const lastCol = Math.min(
      nest.cols - 1,
      nest.colOfOffset(viewport.centreCm + plotWidth / 2 / pxPerCm) + 1,
    )

    // The excavated void. Drawn cell by cell at true scale — one cell is
    // discretisation.nestCellSizeCm across, and nothing here rounds that up to look neater.
    for (let row = firstRow; row <= lastRow; row += 1) {
      const depth = nest.depthOf(row)
      const y = yOf(depth - cell / 2)
      for (let col = firstCol; col <= lastCol; col += 1) {
        if (!nest.isVoid(col, row)) continue
        const x = xOf(nest.offsetOf(col) - cell / 2)

        ctx.fillStyle = theme.voidFill
        ctx.fillRect(x, y, cellPx + 0.5, cellPx + 0.5)

        // A lighter top edge and a darker floor imply volume. Cosmetic only: nothing in
        // /core knows this exists.
        if (cellPx >= 3) {
          if (!nest.isVoid(col, row - 1)) {
            ctx.fillStyle = theme.voidRoof
            ctx.fillRect(x, y, cellPx + 0.5, Math.max(1, cellPx * 0.22))
          }
          if (!nest.isVoid(col, row + 1)) {
            ctx.fillStyle = theme.voidFloor
            ctx.fillRect(x, y + cellPx * 0.78, cellPx + 0.5, Math.max(1, cellPx * 0.22))
          }
        }
      }
    }
    void soil

    this.drawContents(
      nest,
      viewport,
      xOf,
      yOf,
      cellPx,
      firstRow,
      lastRow,
      firstCol,
      lastCol,
      options,
    )
    this.drawAnts(ants, viewport, xOf, yOf, pxPerCm, widthPx, heightPx, options)
    this.drawRuler(viewport, heightPx, pxPerCm, widthPx)
  }

  /**
   * Seeds and brood, where the colony actually put them.
   *
   * Zoomed in they are counted objects: one glyph per seed, one per piece of brood, up to
   * what fits. Zoomed out they are a tint over the cell, because forty seeds in a half
   * centimetre cell cannot be forty distinguishable dots and pretending otherwise would
   * make a full store look identical to an empty one.
   */
  private drawContents(
    nest: NestGrid,
    viewport: NestViewport,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    cellPx: number,
    firstRow: number,
    lastRow: number,
    firstCol: number,
    lastCol: number,
    options: NestDrawOptions,
  ): void {
    const { ctx, theme } = this
    const cell = nest.cellSizeCm
    const glyphs = cellPx >= GLYPH_MIN_CELL_PX
    const mix = options.broodMix
    const broodTotal = Math.max(1e-9, mix.eggs + mix.larvae + mix.pupae)
    const eggShare = mix.eggs / broodTotal
    const larvaShare = (mix.eggs + mix.larvae) / broodTotal

    for (let row = firstRow; row <= lastRow; row += 1) {
      const cy = yOf(nest.depthOf(row))
      for (let col = firstCol; col <= lastCol; col += 1) {
        const seeds = nest.seeds.get(col, row)
        const brood = nest.brood.get(col, row)
        if (seeds < 0.05 && brood < 0.05) continue
        const cx = xOf(nest.offsetOf(col))

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

        // Countable. Positions inside the cell come from a hash of the cell, so a seed does
        // not jitter from frame to frame and two runs of the same seed draw alike.
        const glyphSize = Math.max(1, cellPx * 0.17)
        if (seeds >= 0.5) {
          ctx.fillStyle = theme.seed
          const n = Math.min(14, Math.round(seeds))
          for (let k = 0; k < n; k += 1) {
            const [ox, oy] = scatter(col, row, k, cellPx)
            drawSeed(ctx, cx + ox, cy + oy, glyphSize)
          }
        }
        if (brood >= 0.5) {
          const n = Math.min(12, Math.round(brood))
          for (let k = 0; k < n; k += 1) {
            const [ox, oy] = scatter(col, row, k + 64, cellPx)
            const r = fract(col, row, k + 128)
            const stage = r < eggShare ? 0 : r < larvaShare ? 1 : 2
            ctx.fillStyle = stage === 0 ? theme.egg : stage === 1 ? theme.larva : theme.pupa
            drawBrood(ctx, cx + ox, cy + oy, glyphSize * 1.15, stage)
          }
        }
      }
    }
    void cell
    void viewport
  }

  /** Every ant that is underground and on screen, at its real body length. */
  private drawAnts(
    ants: AntStore,
    viewport: NestViewport,
    xOf: (cm: number) => number,
    yOf: (cm: number) => number,
    pxPerCm: number,
    widthPx: number,
    heightPx: number,
    options: NestDrawOptions,
  ): void {
    const { ctx } = this
    const { motion } = options
    void viewport

    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const x = xOf(motion.drawnX(i))
      const y = yOf(motion.drawnY(i))
      if (x < RULER_WIDTH - 20 || x > widthPx + 20 || y < -20 || y > heightPx + 20) continue

      const bodyCm = ants.lengthMm[i]! / 10
      const isQueen = ants.caste[i] === 0
      // A queen with no recorded body length still has to be drawn. She is drawn against a
      // major, larger by a stated convention rather than by a measurement.
      const lengthPx = Math.max(
        1.5,
        (bodyCm > 0 ? bodyCm : 0.952) * pxPerCm * (isQueen ? QUEEN_DRAW_SCALE : 1),
      )

      // The walking phase is per-ant, so a chamber full of workers is not a chorus line.
      const phase = options.timeSeconds * 9 + i * 1.7
      drawAnt(
        ctx,
        x,
        y,
        lengthPx,
        motion.facingX(i),
        motion.facingY(i),
        coloursFor(ants.caste[i]!),
        ants.burden[i]!,
        phase,
      )

      if (i === options.selected) {
        ctx.strokeStyle = '#f4d58d'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(x, y, Math.max(6, lengthPx * 0.85), 0, Math.PI * 2)
        ctx.stroke()
      }
    }
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

    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace'
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
