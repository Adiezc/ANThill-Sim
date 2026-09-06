/**
 * The vertical slice, drawn.
 *
 * Reads core state. Never writes to it.
 *
 * The one thing this view has to get right is scale. Every dimension in the model is in
 * centimetres and every dimension in the source papers is in centimetres, so the drawing
 * carries a centimetre ruler down its left edge and the reader can hold it against a
 * plaster cast. If a chamber looks 40 cm across it is because the model built one, not
 * because the renderer stretched it.
 *
 * This is honestly a slice, and the UI says so: real *badius* shafts are helices, and what
 * is drawn is a plane cut through one.
 */

import type { NestGrid } from '../core/state/nest.js'
import type { SoilModel } from '../core/systems/soil.js'
import type { AntStore } from '../core/state/ants.js'
import { Domain } from '../core/state/ants.js'

export interface NestViewTheme {
  readonly sky: string
  readonly soilTop: string
  readonly soilDeep: string
  readonly voidFill: string
  readonly voidRoof: string
  readonly voidFloor: string
  readonly ant: string
  readonly rule: string
  readonly ruleText: string
}

export const DEFAULT_THEME: NestViewTheme = {
  sky: '#b9c7cf',
  soilTop: '#cbab7a',
  soilDeep: '#8a6a41',
  voidFill: '#241a10',
  voidRoof: '#e2c793',
  voidFloor: '#5c4526',
  ant: '#20120a',
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

/** Width of the depth ruler gutter, in device-independent pixels. */
const RULER_WIDTH = 54

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
   * Chooses a viewport that frames the nest as it grows, so that a colony of a dozen
   * nanitics is drawn large and a mature nest is drawn whole. Level of detail follows from
   * scale rather than from a mode switch.
   */
  static frameNest(nest: NestGrid, canvasHeightPx: number): NestViewport {
    const dug = Math.max(nest.maxDepthCm, 12)
    const spanCm = Math.max(24, dug * 1.25)
    void canvasHeightPx
    return { topCm: -spanCm * 0.06, spanCm, centreCm: 0 }
  }

  draw(
    nest: NestGrid,
    soil: SoilModel,
    ants: AntStore,
    viewport: NestViewport,
    widthPx: number,
    heightPx: number,
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

    // The excavated void. Drawn cell by cell at true scale — one cell is
    // discretisation.nestCellSizeCm across, and nothing here rounds that up to look neater.
    const cell = nest.cellSizeCm
    const cellPx = Math.max(1, cell * pxPerCm)
    const firstRow = Math.max(0, nest.rowOfDepth(viewport.topCm))
    const lastRow = Math.min(nest.rows - 1, nest.rowOfDepth(viewport.topCm + viewport.spanCm) + 1)

    for (let row = firstRow; row <= lastRow; row += 1) {
      const depth = nest.depthOf(row)
      const y = yOf(depth - cell / 2)
      for (let col = 0; col < nest.cols; col += 1) {
        if (!nest.isVoid(col, row)) continue
        const x = xOf(nest.offsetOf(col) - cell / 2)
        if (x < RULER_WIDTH - cellPx || x > widthPx) continue

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

    // Ants, drawn at their real body length so the nest is legibly to scale beside them.
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const x = xOf(ants.x[i]!)
      const y = yOf(ants.y[i]!)
      if (x < RULER_WIDTH || x > widthPx || y < 0 || y > heightPx) continue
      const lengthPx = Math.max(1.5, (ants.lengthMm[i]! / 10) * pxPerCm)
      ctx.fillStyle = theme.ant
      ctx.fillRect(x - lengthPx / 2, y - lengthPx / 4, lengthPx, Math.max(1, lengthPx / 2))
    }

    this.drawRuler(viewport, heightPx, pxPerCm, widthPx)
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
    const steps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 500]
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
      ctx.fillText(depth === 0 ? '0' : `${depth}`, RULER_WIDTH - 11, y)
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
