/**
 * Drawing one ant, and the things an ant carries.
 *
 * Shared by both views so that the same animal is recognisable above ground and below it.
 * Everything here is appearance: colour by caste, size from the body length the model gave
 * the ant, and a walking wiggle in the legs driven by the wall clock. No number in this
 * file is biological, and the renderer is exempt from the hard-coded-constant rule for
 * exactly that reason — a leg is two thirds of a body long because that looks like an ant,
 * not because anybody measured one.
 *
 * The one number that *is* borrowed from the model is body length: a major really is half
 * again the length of a minor, and drawing them the same size would hide a caste difference
 * the model tracks. The queen is the exception and is drawn to a convention — her body
 * length is not in the species file, because no source in the bibliography gives one — so
 * the legend says she is drawn larger rather than measured larger.
 */

import { Burden, Caste } from '../core/state/ants.js'

export interface AntColours {
  readonly body: string
  readonly head: string
  readonly limb: string
}

/**
 * Colour by caste. Callows really are pale — a newly eclosed worker is almost white and
 * darkens over days — so that one is a fact rather than a decision.
 */
export const CASTE_COLOURS: Record<number, AntColours> = {
  // The queen is in QUEEN below, because she also needs a size convention.
  [Caste.Alate]: { body: '#4a2a14', head: '#38200f', limb: '#5c3a20' },
  [Caste.Male]: { body: '#33241c', head: '#241812', limb: '#463228' },
  [Caste.MinorWorker]: { body: '#7c4a22', head: '#5e3517', limb: '#8a5c31' },
  [Caste.MajorWorker]: { body: '#8f4a1c', head: '#6b3110', limb: '#a05f2a' },
  [Caste.Callow]: { body: '#e6cfa8', head: '#d8bd8f', limb: '#e9d7b6' },
}

/** The queen, whose colours the table above cannot express in one line. */
const QUEEN: AntColours = { body: '#2f1a0c', head: '#1d0f06', limb: '#4a2a14' }

/** How much larger than a major the queen is drawn. Appearance, not measurement. */
export const QUEEN_DRAW_SCALE = 1.4

export function coloursFor(caste: number): AntColours {
  if (caste === Caste.Queen) return QUEEN
  return CASTE_COLOURS[caste] ?? CASTE_COLOURS[Caste.MinorWorker]!
}

/** What is in the ant's mandibles, drawn as a small shape in front of its head. */
export const BURDEN_COLOURS: Record<number, string> = {
  [Burden.SoilPellet]: '#c9a86f',
  [Burden.Seed]: '#a9762f',
  [Burden.Brood]: '#f6ecd6',
  [Burden.Charcoal]: '#2a2622',
  [Burden.Corpse]: '#6b5a46',
}

/**
 * Draws one ant, centred at (x, y), `lengthPx` long, facing (fx, fy).
 *
 * Below about six pixels there is no room for a body plan and the ant is drawn as a dot:
 * an ant that is there should be visible even when it cannot be detailed, and a dot that
 * reads as an ant is more honest than three sub-pixel ellipses that read as fuzz.
 */
export function drawAnt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lengthPx: number,
  fx: number,
  fy: number,
  colours: AntColours,
  burden: number,
  phase: number,
): void {
  if (lengthPx < 6) {
    ctx.fillStyle = colours.body
    const r = Math.max(0.9, lengthPx / 2.6)
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    if (burden !== Burden.Nothing && lengthPx >= 3) {
      ctx.fillStyle = BURDEN_COLOURS[burden] ?? '#ffffff'
      ctx.beginPath()
      ctx.arc(x + fx * r * 1.6, y + fy * r * 1.6, r * 0.8, 0, Math.PI * 2)
      ctx.fill()
    }
    return
  }

  const angle = Math.atan2(fy, fx)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  const L = lengthPx
  const halfWidth = L * 0.17

  // Legs first, so the body sits on top of them. Three pairs, swinging out of phase, which
  // is the whole of the walking animation.
  ctx.strokeStyle = colours.limb
  ctx.lineWidth = Math.max(0.6, L * 0.045)
  ctx.lineCap = 'round'
  for (let pair = 0; pair < 3; pair += 1) {
    const alongBody = L * (0.02 + pair * 0.13)
    const swing = Math.sin(phase + pair * 2.1) * L * 0.09
    const reach = L * (0.3 + pair * 0.02)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(alongBody, side * halfWidth * 0.5)
      ctx.lineTo(alongBody + swing * side, side * reach)
    }
    ctx.stroke()
  }

  // Gaster, waist, mesosoma, head — the four-part silhouette that makes an ant an ant
  // rather than a beetle.
  ctx.fillStyle = colours.body
  ellipse(ctx, -L * 0.3, 0, L * 0.24, halfWidth * 1.15)
  ellipse(ctx, L * 0.02, 0, L * 0.17, halfWidth * 0.85)
  ctx.fillStyle = colours.head
  ellipse(ctx, L * 0.32, 0, L * 0.16, halfWidth)

  // Antennae, elbowed, which is the other half of looking like an ant.
  ctx.strokeStyle = colours.limb
  ctx.lineWidth = Math.max(0.5, L * 0.035)
  for (const side of [-1, 1]) {
    const wave = Math.sin(phase * 1.7 + side) * L * 0.05
    ctx.beginPath()
    ctx.moveTo(L * 0.4, side * halfWidth * 0.4)
    ctx.lineTo(L * 0.5, side * halfWidth * 1.1 + wave)
    ctx.lineTo(L * 0.62, side * halfWidth * 0.6 + wave)
    ctx.stroke()
  }

  if (burden !== Burden.Nothing) {
    ctx.fillStyle = BURDEN_COLOURS[burden] ?? '#ffffff'
    const size = burden === Burden.Brood ? L * 0.2 : L * 0.16
    ellipse(ctx, L * 0.56, 0, size, size * 0.72)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = Math.max(0.4, L * 0.02)
    ctx.stroke()
  }

  ctx.restore()
}

function ellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.4, rx), Math.max(0.4, ry), 0, 0, Math.PI * 2)
  ctx.fill()
}

/** A stored seed, drawn where the colony put it. */
export function drawSeed(ctx: CanvasRenderingContext2D, x: number, y: number, size: number): void {
  ctx.beginPath()
  ctx.ellipse(x, y, size, size * 0.66, Math.PI * 0.15, 0, Math.PI * 2)
  ctx.fill()
}

/** Brood: an egg, a larva or a pupa, told apart by shape as well as by colour. */
export function drawBrood(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  stage: 0 | 1 | 2,
): void {
  if (stage === 0) {
    // Egg: a small, tidy, almost round thing.
    ctx.beginPath()
    ctx.ellipse(x, y, size * 0.72, size * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (stage === 1) {
    // Larva: a fat comma, wider at one end.
    ctx.beginPath()
    ctx.ellipse(x, y, size * 1.05, size * 0.62, 0.5, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  // Pupa: longer, with the outline of an ant already in it.
  ctx.beginPath()
  ctx.ellipse(x, y, size * 1.15, size * 0.55, 0, 0, Math.PI * 2)
  ctx.fill()
}
