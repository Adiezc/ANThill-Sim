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

import { Burden, Domain } from '../core/state/ants.js'
import { coloursFor, drawAnt } from './ant-sprite.js'
import { antBodyFor } from './body-sizes.js'
import { pheromoneColour } from './pheromones.js'
import type { AntStore } from '../core/state/ants.js'
import type { SurfaceGrid } from '../core/state/surface.js'
import type { AntMotion } from './ant-motion.js'
import type { BodySizes } from './body-sizes.js'

export interface SurfaceViewTheme {
  readonly ground: string
  readonly seed: string
  readonly trail: string
  readonly entrance: string
  readonly ant: string
  readonly antLaden: string
  readonly rule: string
  readonly ruleText: string
  readonly alarm: string
}

export const DEFAULT_SURFACE_THEME: SurfaceViewTheme = {
  ground: '#c8b48c',
  // Seeds are what these ants eat, so they are drawn as food rather than as a faint stain:
  // a warm husk colour against the sand.
  seed: '#8a6a2c',
  // The trail is deliberately not a shade of sand. It is the one thing on this picture that
  // is a signal rather than a substance, and a reader should be able to see at a glance
  // which way the colony is currently pointing.
  trail: pheromoneColour('recruitment'),
  entrance: '#20120a',
  ant: '#2a1a0e',
  antLaden: '#7a4a18',
  rule: 'rgba(32,18,10,0.45)',
  ruleText: 'rgba(32,18,10,0.75)',
  alarm: pheromoneColour('alarm'),
}

/**
 * Recruitment pheromone weaker than this is not drawn.
 *
 * One step of a laden forager lays about one unit. Decay never quite reaches zero in floating
 * point, so every cell of the range holds a remnant around 1e-44, and scaling the tint to the
 * strongest cell turned that remnant into a green field before any ant had foraged.
 */
const TRAIL_FLOOR = 0.01

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
    options: {
      motion: AntMotion
      timeSeconds: number
      sizes: BodySizes
      /** Whether to draw the recruitment pheromone. */
      showTrails: boolean
      /**
       * While the colony is moving house, where the nest it left is, in metres from the new
       * entrance. The carriers walking between the two are ants like any other on this map.
       */
      movedFromM: { readonly x: number; readonly y: number } | undefined
      /**
       * A disturbance on the ground and the reach within which foragers answer it, in metres,
       * and which ants are answering it (ant id plus one per slot). Undefined draws no alarm.
       */
      alarm:
        | {
            readonly intruder: { readonly x: number; readonly y: number } | undefined
            readonly responseRadiusM: number
            readonly alarmedIds: Uint32Array
          }
        | undefined
    },
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
          const alpha = Math.min(0.85, 0.1 + (amount / peakSeed) * 0.75)
          if (alpha < 0.03) continue
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
    if (peakTrail >= TRAIL_FLOOR && options.showTrails) {
      ctx.fillStyle = theme.trail
      for (let row = 0; row < surface.rows; row += 1) {
        for (let col = 0; col < surface.cols; col += 1) {
          const amount = surface.recruitment.get(col, row)
          if (amount < TRAIL_FLOOR) continue
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

    // The nest the colony is leaving, and the way it went: the old entrance as a faint ring
    // struck through, and a dotted line to the new one.
    const from = options.movedFromM
    if (from !== undefined) {
      const fx = toPxX(from.x)
      const fy = toPxY(from.y)
      const r = Math.max(3, 0.12 * pxPerM)
      ctx.save()
      ctx.strokeStyle = theme.entrance
      ctx.globalAlpha = 0.55
      ctx.lineWidth = 1.5
      ctx.setLineDash([2, 4])
      ctx.lineCap = 'round'
      ctx.beginPath()
      const length = Math.hypot(cx - fx, cy - fy)
      if (length > 2 * r) {
        const ux = (cx - fx) / length
        const uy = (cy - fy) / length
        ctx.moveTo(fx + ux * r * 1.6, fy + uy * r * 1.6)
        ctx.lineTo(cx - ux * r * 1.6, cy - uy * r * 1.6)
      }
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(fx, fy, r, 0, Math.PI * 2)
      ctx.moveTo(fx - r * 0.7, fy - r * 0.7)
      ctx.lineTo(fx + r * 0.7, fy + r * 0.7)
      ctx.stroke()
      ctx.restore()
    }

    // A disturbance, and the reach of the alarm round it: a red ring, filled faintly.
    const alarm = options.alarm
    if (alarm?.intruder !== undefined) {
      const ax = toPxX(alarm.intruder.x)
      const ay = toPxY(alarm.intruder.y)
      const reach = Math.max(10, alarm.responseRadiusM * pxPerM)
      const pulse = 0.5 + 0.5 * Math.sin(options.timeSeconds * 4)
      ctx.save()
      ctx.fillStyle = theme.alarm
      ctx.globalAlpha = 0.12 + 0.08 * pulse
      ctx.beginPath()
      ctx.arc(ax, ay, reach, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = 0.85
      ctx.strokeStyle = theme.alarm
      ctx.lineWidth = 1.5
      ctx.stroke()
      ctx.fillStyle = theme.entrance
      ctx.globalAlpha = 1
      ctx.beginPath()
      ctx.arc(ax, ay, Math.max(2, reach * 0.18), 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // Ants, drawn far larger than life.
    //
    // This is the one deliberate exaggeration in either view and it should be said plainly.
    // At a scale that fits a 20 m foraging range on screen, a 6.35 mm worker is a fiftieth
    // of a pixel. Drawn truthfully she is invisible, and a picture in which the ants cannot
    // be seen is not a more honest picture of ants — it is a picture of sand. So this view
    // is a map: the ants are symbols at a legible size, the scale bar gives the reader the
    // real distances, and the caption says the trails are pheromone rather than drawing.
    // The nest slice is where body length is true, and that is where a reader who wants to
    // compare an ant to a chamber should look.
    //
    // The symbols keep the castes' real proportions to one another: a minor is drawn antPx long
    // and everything else is scaled by the same factor, so a major is still half again her
    // length and the seed she carries is still a seed's size beside her.
    const { sizes } = options
    const antPx = Math.max(9, 0.02 * pxPerM)
    const pxPerMm = antPx / sizes.minorLengthMm
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i)) continue
      if (ants.domain[i] !== Domain.Surface) continue
      const burden = ants.burden[i]!
      drawAnt(
        ctx,
        toPxX(options.motion.drawnX(i)),
        toPxY(options.motion.drawnY(i)),
        antBodyFor(ants.caste[i]!, ants.lengthMm[i]!, sizes, pxPerMm),
        options.motion.facingX(i),
        options.motion.facingY(i),
        coloursFor(ants.caste[i]!),
        burden,
        options.timeSeconds * 9 + i * 1.7,
        (burden === Burden.Seed ? sizes.seedLengthMm : sizes.minorLengthMm * 0.2) * pxPerMm,
      )
      // An ant answering the alarm wears a small red ring.
      if (alarm !== undefined && alarm.alarmedIds[i] === ants.id[i]! + 1) {
        ctx.save()
        ctx.strokeStyle = theme.alarm
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(
          toPxX(options.motion.drawnX(i)),
          toPxY(options.motion.drawnY(i)),
          antPx * 0.8,
          0,
          Math.PI * 2,
        )
        ctx.stroke()
        ctx.restore()
      }
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
      '11px "Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText(`${metres} m`, x, y - 6)
  }
}
