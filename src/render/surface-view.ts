/**
 * The ground, drawn from above.
 *
 * Reads core state. Never writes to it.
 *
 * The scale bar down the bottom edge is the counterpart of the nest slice's centimetre
 * ruler: everything here is in metres, the foraging range is about 20 m, and a reader
 * should be able to hold the picture against Harrison and Gentry's figures without
 * converting anything.
 *
 * Nothing in this file draws a trail. The lines that appear running out from the entrance
 * are the recruitment pheromone grid, which exists only because foragers walked home along
 * those lines and laid it. If the trails look drawn, they are not; they are the residue of
 * the walking, and a colony whose foragers stop finding anything loses them within a day.
 */

import { Domain } from '../core/state/ants.js'
import type { AntStore } from '../core/state/ants.js'
import type { SurfaceGrid } from '../core/state/surface.js'

export interface SurfaceViewTheme {
  readonly ground: string
  readonly seed: string
  readonly trail: string
  readonly entrance: string
  readonly ant: string
  readonly antLaden: string
  readonly rule: string
  readonly ruleText: string
}

export const DEFAULT_SURFACE_THEME: SurfaceViewTheme = {
  ground: '#c8b48c',
  seed: '#6f6034',
  trail: '#3c2d1a',
  entrance: '#20120a',
  ant: '#2a1a0e',
  antLaden: '#7a4a18',
  rule: 'rgba(32,18,10,0.45)',
  ruleText: 'rgba(32,18,10,0.75)',
}

export class SurfaceView {
  private readonly ctx: CanvasRenderingContext2D
  private readonly theme: SurfaceViewTheme

  constructor(canvas: HTMLCanvasElement, theme: SurfaceViewTheme = DEFAULT_SURFACE_THEME) {
    const ctx = canvas.getContext('2d')
    if (ctx === null) throw new Error('This browser did not give us a 2D context')
    this.ctx = ctx
    this.theme = theme
  }

  /**
   * Draws the ground centred on the entrance.
   *
   * `spanM` is how much ground is visible across the shorter axis, so the view can be
   * pulled back as a colony's range grows without the drawing code knowing anything about
   * colony size.
   */
  draw(
    surface: SurfaceGrid,
    ants: AntStore,
    widthPx: number,
    heightPx: number,
    spanM: number,
  ): void {
    const { ctx, theme } = this
    ctx.clearRect(0, 0, widthPx, heightPx)
    ctx.fillStyle = theme.ground
    ctx.fillRect(0, 0, widthPx, heightPx)

    const pxPerM = Math.min(widthPx, heightPx) / spanM
    const cx = widthPx / 2
    const cy = heightPx / 2
    const toPxX = (xM: number): number => cx + xM * pxPerM
    const toPxY = (yM: number): number => cy + yM * pxPerM

    const cell = surface.cellSizeM
    const cellPx = Math.max(1, cell * pxPerM)

    // Seeds first, so trails and ants sit on top of them.
    let peakSeed = 0
    for (let i = 0; i < surface.seedCeiling.data.length; i += 1) {
      if (surface.seedCeiling.data[i]! > peakSeed) peakSeed = surface.seedCeiling.data[i]!
    }
    if (peakSeed > 0) {
      ctx.fillStyle = theme.seed
      for (let row = 0; row < surface.rows; row += 1) {
        for (let col = 0; col < surface.cols; col += 1) {
          const amount = surface.seeds.get(col, row)
          if (amount <= 0) continue
          const alpha = Math.min(0.5, (amount / peakSeed) * 0.5)
          if (alpha < 0.02) continue
          ctx.globalAlpha = alpha
          ctx.fillRect(
            toPxX(surface.seeds.xOf(col)) - cellPx / 2,
            toPxY(surface.seeds.yOf(row)) - cellPx / 2,
            cellPx,
            cellPx,
          )
        }
      }
      ctx.globalAlpha = 1
    }

    // Recruitment pheromone. Scaled to the strongest cell present rather than to a fixed
    // maximum, because the units are arbitrary: no deposition constant is published for
    // this species and only the ratios between cells mean anything.
    let peakTrail = 0
    for (let i = 0; i < surface.recruitment.data.length; i += 1) {
      if (surface.recruitment.data[i]! > peakTrail) peakTrail = surface.recruitment.data[i]!
    }
    if (peakTrail > 0) {
      ctx.fillStyle = theme.trail
      for (let row = 0; row < surface.rows; row += 1) {
        for (let col = 0; col < surface.cols; col += 1) {
          const amount = surface.recruitment.get(col, row)
          if (amount <= 0) continue
          const alpha = Math.min(0.85, (amount / peakTrail) * 0.85)
          if (alpha < 0.03) continue
          ctx.globalAlpha = alpha
          ctx.fillRect(
            toPxX(surface.recruitment.xOf(col)) - cellPx / 2,
            toPxY(surface.recruitment.yOf(row)) - cellPx / 2,
            cellPx,
            cellPx,
          )
        }
      }
      ctx.globalAlpha = 1
    }

    // Ants. Drawn at a legible minimum rather than at body length: a 6 mm ant at this scale
    // is a fraction of a pixel, and a dot that cannot be seen is not an honest rendering of
    // an ant that is there.
    const antPx = Math.max(1.6, 0.006 * pxPerM)
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i)) continue
      if (ants.domain[i] !== Domain.Surface) continue
      ctx.fillStyle = ants.burden[i] === 2 ? theme.antLaden : theme.ant
      ctx.beginPath()
      ctx.arc(toPxX(ants.x[i]!), toPxY(ants.y[i]!), antPx, 0, Math.PI * 2)
      ctx.fill()
    }

    // The entrance: the one point the two domains share.
    ctx.strokeStyle = theme.entrance
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, Math.max(3, 0.12 * pxPerM), 0, Math.PI * 2)
    ctx.stroke()

    this.drawScaleBar(widthPx, heightPx, pxPerM)
  }

  /** A bar of a round number of metres, so distances can be read straight off the picture. */
  private drawScaleBar(widthPx: number, heightPx: number, pxPerM: number): void {
    const { ctx, theme } = this
    const candidates = [1, 2, 5, 10, 20]
    let metres = candidates[candidates.length - 1]!
    for (const c of candidates) {
      if (c * pxPerM >= widthPx * 0.18) {
        metres = c
        break
      }
    }
    const lengthPx = metres * pxPerM
    const x = 14
    const y = heightPx - 16

    ctx.strokeStyle = theme.rule
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + lengthPx, y)
    ctx.moveTo(x, y - 4)
    ctx.lineTo(x, y + 4)
    ctx.moveTo(x + lengthPx, y - 4)
    ctx.lineTo(x + lengthPx, y + 4)
    ctx.stroke()

    ctx.fillStyle = theme.ruleText
    ctx.font =
      '11px ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${metres} m`, x, y - 6)
  }
}
