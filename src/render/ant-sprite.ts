/**
 * Drawing one ant, and the things ants carry and tend.
 *
 * Shared by both views so that the same animal is recognisable above ground and below it.
 *
 * Sizes are not decided here. Body length and head width arrive in pixels from the caller,
 * which works them out from the species file (see body-sizes.ts): the body lengths of both
 * worker castes, the head widths of minors, which grow with the colony, of majors, queens and
 * males, and the sizes of the brood. So a major's head really is about twice as wide as a
 * young minor's, and a queen's thorax really is broader than any worker's.
 *
 * What is decided here is appearance: the proportions of head, thorax, waist and gaster, the
 * legs and their swing, the shine on the cuticle, the shadow underneath, and the colours. None
 * of that is biological, and the renderer is exempt from the hard-coded-constant rule for that
 * reason. Adults are drawn dark rust red, which is how the species is described. Callows are
 * pale because a newly eclosed worker is.
 *
 * The light comes from above the screen, whichever way the ant faces, so every highlight is
 * placed by turning "up" into the ant's own frame.
 *
 * Each ant is drawn two ways. From above, for the map of the foraging range, which is a plan.
 * From the side, for the slice through the nest and the ground over it, which are seen side on:
 * drawn from above there, half of each ant's legs landed in the sand of the floor or the wall.
 */

import { Burden, Caste } from '../core/state/ants.js'

export interface AntColours {
  readonly body: string
  readonly head: string
  readonly limb: string
}

export const CASTE_COLOURS: Record<number, AntColours> = {
  [Caste.Queen]: { body: '#5c2412', head: '#4a1c0d', limb: '#6e321a' },
  [Caste.Alate]: { body: '#6b2c15', head: '#57220f', limb: '#7d3c1f' },
  [Caste.Male]: { body: '#2a1c16', head: '#1d1310', limb: '#3e2e25' },
  [Caste.MinorWorker]: { body: '#8e3c1b', head: '#743014', limb: '#a04d28' },
  [Caste.MajorWorker]: { body: '#8a3818', head: '#5f240c', limb: '#9c4924' },
  [Caste.Callow]: { body: '#e6cb9e', head: '#d8b683', limb: '#ead5b1' },
}

export function coloursFor(caste: number): AntColours {
  return CASTE_COLOURS[caste] ?? CASTE_COLOURS[Caste.MinorWorker]!
}

/** What is in the ant's mandibles. */
export const BURDEN_COLOURS: Record<number, string> = {
  [Burden.SoilPellet]: '#c9a86f',
  [Burden.Seed]: '#a9762f',
  [Burden.Brood]: '#f6ecd6',
  [Burden.Charcoal]: '#2a2622',
  [Burden.Corpse]: '#6b5a46',
}

/**
 * The four body plans the picture tells apart. A major is a worker with a major's head width,
 * because that is what a major is; a callow is a worker in callow colours.
 */
export type AntForm = 'worker' | 'queen' | 'winged' | 'male'

export interface AntBody {
  /** Body length, mandibles to the tip of the gaster, in pixels. */
  readonly lengthPx: number
  /** Width of the head in pixels. The measured dimension that sets how heavily built it is. */
  readonly headWidthPx: number
  readonly form: AntForm
}

/**
 * A faint pale rim under every ant. A dark rust ant in a dark tunnel is the same value as the
 * tunnel, and at true scale there is no room to make her bigger.
 */
const RIM = 'rgba(255, 238, 210, 0.2)'

/** The soft shadow an ant casts on the floor she walks on. */
const SHADOW = 'rgba(0, 0, 0, 0.3)'

/** The shine on the cuticle. */
const SHINE = 'rgba(255, 226, 190, 0.26)'

/** Below this length there is no room for legs, and an ant is drawn as her silhouette. */
const DETAIL_MIN_PX = 8

/** Above this length the eyes, the bands on the gaster and the antenna clubs are drawn. */
const FINE_DETAIL_MIN_PX = 16

/** Draws one ant centred at (x, y), facing (fx, fy). `burdenPx` is the carried item's length. */
export function drawAnt(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  body: AntBody,
  fx: number,
  fy: number,
  colours: AntColours,
  burden: number,
  phase: number,
  burdenPx: number,
): void {
  const L = Math.max(2, body.lengthPx)
  const hw = Math.max(0.8, Math.min(body.headWidthPx, L * 0.45))
  const winged = body.form === 'winged' || body.form === 'male'
  const reproductive = body.form !== 'worker'
  const angle = Math.atan2(fy, fx)

  // Laid out from the front: mandibles, head, thorax, waist, gaster. The head is at least as
  // long as it is wide, as a harvester ant's is, so a major's broad head pushes the rest back.
  const mandible = L * 0.05
  const headRx = Math.max(L * 0.09, hw * 0.46)
  const headRy = hw / 2
  const headCx = L / 2 - mandible - headRx
  const thoraxRx = L * (reproductive ? 0.17 : 0.15)
  const thoraxCx = headCx - headRx - thoraxRx * 0.85
  const thoraxRy = Math.min(thoraxRx * 0.8, hw * (reproductive ? 0.46 : 0.32))
  const waistFront = thoraxCx - thoraxRx
  const waistBack = waistFront - L * 0.1
  const gasterRx = Math.max(L * 0.12, (waistBack + L / 2) / 2)
  const gasterCx = waistBack - gasterRx
  const gasterWidth = body.form === 'queen' || body.form === 'winged' ? 0.72 : winged ? 0.45 : 0.58
  const gasterRy = Math.min(gasterRx * 0.85, hw * gasterWidth)

  // Shadow first, in screen space, a little below the ant: the light is overhead.
  ctx.fillStyle = SHADOW
  ellipseRotated(
    ctx,
    x,
    y + Math.max(0.6, hw * 0.3),
    L * 0.46,
    Math.max(gasterRy, headRy) * 0.9,
    angle,
  )

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  // "Up" on the screen, expressed in the ant's own frame, for placing highlights.
  const upX = -Math.sin(angle)
  const upY = -Math.cos(angle)

  if (L < DETAIL_MIN_PX) {
    ctx.fillStyle = RIM
    ellipse(ctx, 0, 0, L / 2 + 0.6, Math.max(gasterRy, headRy) + 0.6)
    ctx.fillStyle = colours.body
    ellipse(ctx, gasterCx, 0, gasterRx, gasterRy)
    ellipse(ctx, thoraxCx, 0, thoraxRx, thoraxRy)
    ctx.fillStyle = colours.head
    ellipse(ctx, headCx, 0, headRx, headRy)
    drawBurden(ctx, L, burden, burdenPx)
    ctx.restore()
    return
  }

  // Legs, so the body sits on top. Three pairs from the thorax in an alternating tripod: front
  // and hind legs on one side swing with the middle leg on the other. A thicker femur out to the
  // knee, a finer tibia down to the foot.
  ctx.strokeStyle = colours.limb
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const femurWidth = Math.max(0.55, hw * 0.1)
  const tibiaWidth = Math.max(0.45, hw * 0.065)
  const reachForward = [0.55, 0.05, -0.5]
  for (let pair = 0; pair < 3; pair += 1) {
    const bx = thoraxCx + thoraxRx * (0.55 - pair * 0.55)
    for (const side of [-1, 1]) {
      const swing = Math.sin(phase + pair * Math.PI + (side > 0 ? 0 : Math.PI)) * L * 0.06
      const dir = reachForward[pair]!
      const kneeX = bx + dir * L * 0.12 + swing * 0.4
      const kneeY = side * (thoraxRy + L * 0.16)
      ctx.lineWidth = femurWidth
      ctx.beginPath()
      ctx.moveTo(bx, side * thoraxRy * 0.6)
      ctx.lineTo(kneeX, kneeY)
      ctx.stroke()
      ctx.lineWidth = tibiaWidth
      ctx.beginPath()
      ctx.moveTo(kneeX, kneeY)
      ctx.lineTo(bx + dir * L * 0.3 + swing, side * (thoraxRy + L * 0.25))
      ctx.stroke()
    }
  }

  // Antennae, elbowed: the scape runs back along the side of the head, the rest reaches forward
  // and ends in a slight club.
  ctx.lineWidth = Math.max(0.45, hw * 0.07)
  const fine = L >= FINE_DETAIL_MIN_PX
  for (const side of [-1, 1]) {
    const wave = Math.sin(phase * 1.7 + side) * L * 0.03
    const tipX = headCx + headRx + L * 0.14 + wave
    const tipY = side * (headRy + L * 0.1)
    ctx.beginPath()
    ctx.moveTo(headCx + headRx * 0.45, side * headRy * 0.55)
    ctx.lineTo(headCx - headRx * 0.1, side * (headRy + L * 0.06))
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    if (fine) {
      ctx.fillStyle = colours.limb
      ellipse(ctx, tipX, tipY, hw * 0.08, hw * 0.08)
    }
  }

  // The rim, then the body over it.
  ctx.fillStyle = RIM
  ellipse(ctx, gasterCx, 0, gasterRx + 0.5, gasterRy + 0.5)
  ellipse(ctx, thoraxCx, 0, thoraxRx + 0.5, thoraxRy + 0.5)
  ellipse(ctx, headCx, 0, headRx + 0.5, headRy + 0.5)

  ctx.fillStyle = colours.body
  ellipse(ctx, gasterCx, 0, gasterRx, gasterRy)
  ellipse(ctx, waistBack + L * 0.035, 0, L * 0.03, hw * 0.21)
  ellipse(ctx, waistFront - L * 0.03, 0, L * 0.028, hw * 0.17)
  ellipse(ctx, thoraxCx, 0, thoraxRx, thoraxRy)
  ctx.fillStyle = colours.head
  ellipse(ctx, headCx, 0, headRx, headRy)

  if (fine) {
    // Bands across the gaster, where the plates overlap.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.lineWidth = Math.max(0.5, hw * 0.05)
    for (const at of [0.45, 0.05, -0.35]) {
      const bx = gasterCx + gasterRx * at
      const span = gasterRy * Math.sqrt(Math.max(0, 1 - at * at)) * 0.92
      ctx.beginPath()
      ctx.moveTo(bx + gasterRx * 0.08, -span)
      ctx.quadraticCurveTo(bx - gasterRx * 0.1, 0, bx + gasterRx * 0.08, span)
      ctx.stroke()
    }
    // Eyes, set on the sides of the head.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    for (const side of [-1, 1])
      ellipse(ctx, headCx + headRx * 0.15, side * headRy * 0.72, hw * 0.09, hw * 0.07)
  }

  // Shine, placed towards the light.
  ctx.fillStyle = SHINE
  ellipse(
    ctx,
    gasterCx + upX * gasterRx * 0.25,
    upY * gasterRy * 0.38,
    gasterRx * 0.42,
    gasterRy * 0.3,
  )
  ellipse(
    ctx,
    thoraxCx + upX * thoraxRx * 0.25,
    upY * thoraxRy * 0.38,
    thoraxRx * 0.45,
    thoraxRy * 0.3,
  )
  ellipse(ctx, headCx + upX * headRx * 0.25, upY * headRy * 0.38, headRx * 0.42, headRy * 0.3)

  // Mandibles. Broad on a broad head, which is where a major's seed-cracking power shows.
  ctx.strokeStyle = colours.head
  ctx.lineWidth = Math.max(0.6, hw * 0.14)
  for (const side of [-1, 1]) {
    ctx.beginPath()
    ctx.moveTo(headCx + headRx * 0.8, side * headRy * 0.35)
    ctx.lineTo(L / 2, side * headRy * 0.08)
    ctx.stroke()
  }

  if (body.form === 'queen') {
    // A mated queen has broken off her wings. The scars stay on the thorax.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    for (const side of [-1, 1]) {
      ellipse(ctx, thoraxCx - thoraxRx * 0.2, side * thoraxRy * 0.72, hw * 0.1, hw * 0.07)
    }
  }

  if (winged) {
    // Wings folded back over the gaster, and longer than it.
    ctx.fillStyle = 'rgba(236, 236, 240, 0.3)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 0.6
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.ellipse(
        thoraxCx - thoraxRx - L * 0.2,
        side * thoraxRy * 0.35,
        L * 0.34,
        hw * 0.36,
        side * 0.08,
        0,
        Math.PI * 2,
      )
      ctx.fill()
      ctx.stroke()
    }
  }

  drawBurden(ctx, L, burden, burdenPx)
  ctx.restore()
}

/**
 * An ant's proportions seen from the side, shared by the drawing and by the code that stands her
 * on a floor or a wall. Appearance, like everything else in this file.
 */
interface SideShape {
  readonly L: number
  readonly hw: number
  readonly headRx: number
  readonly headRy: number
  readonly headCx: number
  readonly thoraxRx: number
  readonly thoraxRy: number
  readonly thoraxCx: number
  readonly nodeR: number
  readonly petioleCx: number
  readonly postCx: number
  readonly gasterRx: number
  readonly gasterRy: number
  readonly gasterCx: number
  /** From the line through the middle of her body to the soles of her feet. */
  readonly stand: number
}

function sideShape(body: AntBody): SideShape {
  const L = Math.max(2, body.lengthPx)
  const hw = Math.max(0.8, Math.min(body.headWidthPx, L * 0.45))
  const heavy = body.form === 'queen' || body.form === 'winged'
  const male = body.form === 'male'
  // Laid out from the front: mandibles, head, thorax, the two knots of the waist, gaster.
  const mandible = L * 0.06
  const headRx = Math.max(L * 0.1, hw * 0.5)
  const headRy = Math.max(L * 0.07, hw * 0.4)
  const headCx = L / 2 - mandible - headRx
  const thoraxRx = L * (heavy ? 0.175 : male ? 0.17 : 0.155)
  const thoraxCx = headCx - headRx - thoraxRx * 0.9
  const thoraxRy = L * (heavy ? 0.1 : male ? 0.085 : 0.072)
  const nodeR = L * 0.03
  const petioleCx = thoraxCx - thoraxRx - nodeR
  const postCx = petioleCx - nodeR * 1.6
  const gasterRx = Math.max(L * 0.1, (postCx - nodeR * 0.7 + L / 2) / 2)
  const gasterCx = -L / 2 + gasterRx
  const gasterRy = L * (heavy ? 0.15 : male ? 0.095 : 0.12)
  return {
    L,
    hw,
    headRx,
    headRy,
    headCx,
    thoraxRx,
    thoraxRy,
    thoraxCx,
    nodeR,
    petioleCx,
    postCx,
    gasterRx,
    gasterRy,
    gasterCx,
    stand: thoraxRy + L * 0.13,
  }
}

/**
 * How far from the middle of an ant's body her feet reach, seen from the side, in the same units
 * as her body length. The caller stands her this far from the floor or wall.
 */
export function sideStandHeight(body: AntBody): number {
  return sideShape(body).stand
}

/**
 * An ant seen from the side, which is how the slice sees her.
 *
 * Drawn in her own frame: (fwdX, fwdY) is the way she faces and (downX, downY) the way her feet
 * point, both unit vectors on the screen and at right angles to each other. Walking along a
 * floor, down is down the screen; holding on to a shaft wall, it points into the wall. (x, y) is
 * the middle of her body, which the caller places sideStandHeight() away from the surface.
 *
 * The outline is a harvester ant's: a head with heavy mandibles and, under it, the basket of long
 * hairs the genus carries sand in; a thorax humped at the front with a short spine at the back;
 * a waist of two knots; and the gaster.
 */
export function drawAntSide(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  body: AntBody,
  fwdX: number,
  fwdY: number,
  downX: number,
  downY: number,
  colours: AntColours,
  burden: number,
  phase: number,
  burdenPx: number,
): void {
  const shape = sideShape(body)
  const { L, hw, headRx, headRy, headCx, thoraxRx, thoraxRy, thoraxCx, nodeR, stand } = shape
  const { petioleCx, postCx, gasterRx, gasterRy, gasterCx } = shape
  const winged = body.form === 'winged' || body.form === 'male'
  const headCy = L * 0.01
  const gasterCy = -L * 0.015
  // "Up" on the screen, in her own frame, for placing highlights.
  const upX = -fwdY
  const upY = -downY

  ctx.save()
  ctx.transform(fwdX, fwdY, downX, downY, x, y)

  // Her shadow, on whatever she stands on.
  ctx.fillStyle = SHADOW
  ellipse(ctx, -L * 0.04, stand + Math.max(0.3, L * 0.012), L * 0.42, Math.max(0.5, L * 0.035))

  if (L < DETAIL_MIN_PX) {
    ctx.fillStyle = RIM
    ellipse(ctx, 0, 0, L / 2 + 0.6, Math.max(gasterRy, headRy) + 0.6)
    ctx.fillStyle = colours.body
    ellipse(ctx, gasterCx, gasterCy, gasterRx, gasterRy)
    ellipse(ctx, thoraxCx, 0, thoraxRx, thoraxRy)
    ctx.fillStyle = colours.head
    ellipse(ctx, headCx, headCy, headRx, headRy)
    drawSideBurden(ctx, L, headCy + headRy * 0.5, burden, burdenPx)
    ctx.restore()
    return
  }

  const fine = L >= FINE_DETAIL_MIN_PX
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // Three legs a side in an alternating tripod: front and hind legs on one side step with the
  // middle leg on the other. Each rises from under the thorax to the knee and comes down to the
  // foot, which lifts a little as it swings forward.
  const reach = [0.17, 0.02, -0.18]
  const legs = (far: boolean): void => {
    ctx.strokeStyle = colours.limb
    for (let pair = 0; pair < 3; pair += 1) {
      const step = phase + pair * Math.PI + (far ? Math.PI : 0)
      const r = reach[pair]!
      const hipX = thoraxCx + thoraxRx * (0.45 - pair * 0.45) + (far ? L * 0.015 : 0)
      const hipY = thoraxRy * 0.55
      const footX = hipX + r * L + Math.sin(step) * L * 0.045
      const footY = stand - Math.max(0, Math.cos(step)) * L * 0.025
      const kneeX = hipX + (footX - hipX) * 0.5 + r * L * 0.3
      const kneeY = -thoraxRy * 0.2
      ctx.lineWidth = Math.max(0.55, hw * 0.1)
      ctx.beginPath()
      ctx.moveTo(hipX, hipY)
      ctx.lineTo(kneeX, kneeY)
      ctx.stroke()
      ctx.lineWidth = Math.max(0.45, hw * 0.065)
      ctx.beginPath()
      ctx.moveTo(kneeX, kneeY)
      ctx.lineTo(footX, footY)
      ctx.lineTo(footX + (r >= 0 ? 1 : -1) * L * 0.05, Math.min(stand, footY + L * 0.01))
      ctx.stroke()
    }
  }

  // Antennae, elbowed: the first segment runs up and back from the front of the head, the rest
  // reaches forward and ends in a slight club.
  const antenna = (far: boolean): void => {
    const wave = Math.sin(phase * 1.7 + (far ? 1.3 : 0)) * L * 0.025
    const elbowX = headCx - headRx * 0.05 + (far ? L * 0.02 : 0)
    const elbowY = headCy - headRy - L * 0.08
    const tipX = headCx + headRx + L * 0.16 + wave
    const tipY = headCy - headRy * 0.2 + wave * 0.5
    ctx.strokeStyle = colours.limb
    ctx.lineWidth = Math.max(0.45, hw * 0.07)
    ctx.beginPath()
    ctx.moveTo(headCx + headRx * 0.5, headCy - headRy * 0.45)
    ctx.lineTo(elbowX, elbowY)
    ctx.lineTo(tipX, tipY)
    ctx.stroke()
    if (fine) {
      ctx.fillStyle = colours.limb
      ellipse(ctx, tipX, tipY, hw * 0.09, hw * 0.07)
    }
  }

  // The far side's legs and antenna, behind her and fainter.
  ctx.globalAlpha = 0.55
  legs(true)
  antenna(true)
  ctx.globalAlpha = 1

  // The rim, then the body over it.
  ctx.fillStyle = RIM
  ellipse(ctx, gasterCx, gasterCy, gasterRx + 0.5, gasterRy + 0.5)
  ellipse(ctx, thoraxCx, 0, thoraxRx + 0.5, thoraxRy + 0.5)
  ellipse(ctx, headCx, headCy, headRx + 0.5, headRy + 0.5)

  ctx.fillStyle = colours.body
  ellipse(ctx, gasterCx, gasterCy, gasterRx, gasterRy)
  ellipse(ctx, postCx, -nodeR * 0.15, nodeR, nodeR * 1.15)
  ellipse(ctx, petioleCx, -nodeR * 0.4, nodeR * 0.8, nodeR * 1.2)
  ellipse(ctx, (petioleCx + thoraxCx - thoraxRx) / 2, thoraxRy * 0.25, nodeR * 0.9, nodeR * 0.4)
  ellipse(ctx, thoraxCx, 0, thoraxRx, thoraxRy)
  // The front of the thorax rises in a hump behind the head.
  ellipse(ctx, thoraxCx + thoraxRx * 0.35, -thoraxRy * 0.15, thoraxRx * 0.55, thoraxRy)
  if (body.form === 'worker') {
    ctx.strokeStyle = colours.body
    ctx.lineWidth = Math.max(0.5, hw * 0.07)
    ctx.beginPath()
    ctx.moveTo(thoraxCx - thoraxRx * 0.7, -thoraxRy * 0.5)
    ctx.lineTo(thoraxCx - thoraxRx * 1.02, -thoraxRy * 1.25)
    ctx.stroke()
  }
  ctx.fillStyle = colours.head
  ellipse(ctx, headCx, headCy, headRx, headRy)

  if (fine) {
    // Bands across the gaster, where its plates overlap.
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)'
    ctx.lineWidth = Math.max(0.5, hw * 0.05)
    for (const at of [0.35, -0.05, -0.45]) {
      const bx = gasterCx + gasterRx * at
      const span = gasterRy * Math.sqrt(Math.max(0, 1 - at * at)) * 0.92
      ctx.beginPath()
      ctx.moveTo(bx + gasterRx * 0.06, gasterCy - span)
      ctx.quadraticCurveTo(bx - gasterRx * 0.08, gasterCy, bx + gasterRx * 0.06, gasterCy + span)
      ctx.stroke()
    }
    // The eye.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
    ellipse(ctx, headCx + headRx * 0.2, headCy - headRy * 0.2, hw * 0.12, hw * 0.09)
    // The basket of long hairs under the head.
    if (body.form === 'worker' || body.form === 'queen') {
      ctx.strokeStyle = colours.limb
      ctx.lineWidth = Math.max(0.35, hw * 0.03)
      for (let h = 0; h < 5; h += 1) {
        const hx = headCx - headRx * 0.35 + h * headRx * 0.22
        ctx.beginPath()
        ctx.moveTo(hx, headCy + headRy * 0.85)
        ctx.quadraticCurveTo(
          hx + L * 0.01,
          headCy + headRy + L * 0.025,
          hx + L * 0.025,
          headCy + headRy + L * 0.035,
        )
        ctx.stroke()
      }
    }
  }

  // Shine, placed towards the light.
  ctx.fillStyle = SHINE
  ellipse(
    ctx,
    gasterCx + upX * gasterRx * 0.25,
    gasterCy + upY * gasterRy * 0.4,
    gasterRx * 0.42,
    gasterRy * 0.28,
  )
  ellipse(
    ctx,
    thoraxCx + upX * thoraxRx * 0.25,
    upY * thoraxRy * 0.4,
    thoraxRx * 0.45,
    thoraxRy * 0.3,
  )
  ellipse(
    ctx,
    headCx + upX * headRx * 0.25,
    headCy + upY * headRy * 0.4,
    headRx * 0.42,
    headRy * 0.3,
  )

  // Mandibles. Broad on a broad head, which is where a major's seed-cracking power shows.
  ctx.strokeStyle = colours.head
  ctx.lineWidth = Math.max(0.6, hw * 0.16)
  ctx.beginPath()
  ctx.moveTo(headCx + headRx * 0.7, headCy + headRy * 0.35)
  ctx.lineTo(L / 2, headCy + headRy * 0.55)
  ctx.stroke()

  if (body.form === 'queen') {
    // A mated queen has broken off her wings. The scar stays on the thorax.
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
    ellipse(ctx, thoraxCx - thoraxRx * 0.1, -thoraxRy * 0.7, hw * 0.12, hw * 0.07)
  }

  legs(false)
  antenna(false)

  if (winged) {
    // Wings folded back along the top of the body, and longer than it.
    ctx.fillStyle = 'rgba(236, 236, 240, 0.3)'
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)'
    ctx.lineWidth = 0.6
    ctx.beginPath()
    ctx.ellipse(
      thoraxCx - thoraxRx * 0.2 - L * 0.2,
      -thoraxRy - L * 0.02,
      L * 0.34,
      Math.max(0.5, L * 0.055),
      0.06,
      0,
      Math.PI * 2,
    )
    ctx.fill()
    ctx.stroke()
  }

  drawSideBurden(ctx, L, headCy + headRy * 0.5, burden, burdenPx)
  ctx.restore()
}

/** Whatever is held in the mandibles, seen from the side, just in front of the head. */
function drawSideBurden(
  ctx: CanvasRenderingContext2D,
  L: number,
  y: number,
  burden: number,
  burdenPx: number,
): void {
  if (burden === Burden.Nothing) return
  const size = Math.max(1.2, burdenPx)
  ctx.fillStyle = BURDEN_COLOURS[burden] ?? '#ffffff'
  ellipse(ctx, L / 2 + size * 0.3, y, size / 2, size * 0.34)
  if (size >= 3) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

/** Whatever is held in the mandibles, at its own size, just in front of the head. */
function drawBurden(
  ctx: CanvasRenderingContext2D,
  L: number,
  burden: number,
  burdenPx: number,
): void {
  if (burden === Burden.Nothing) return
  const size = Math.max(1.2, burdenPx)
  ctx.fillStyle = BURDEN_COLOURS[burden] ?? '#ffffff'
  ellipse(ctx, L / 2 + size * 0.35, 0, size / 2, size * 0.34)
  if (size >= 3) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
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

function ellipseRotated(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number,
): void {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.4, rx), Math.max(0.4, ry), rotation, 0, Math.PI * 2)
  ctx.fill()
}

/** The edge drawn round each piece of brood. */
const BROOD_EDGE = 'rgba(110, 80, 40, 0.45)'

function strokeEllipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): void {
  ctx.beginPath()
  ctx.ellipse(cx, cy, Math.max(0.4, rx), Math.max(0.4, ry), 0, 0, Math.PI * 2)
  ctx.stroke()
}

/** A stored seed, drawn where the colony put it. Uses the current fill style. */
export function drawSeed(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  lengthPx: number,
  widthPx: number,
  angle: number,
): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.5, lengthPx / 2), Math.max(0.4, widthPx / 2), angle, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Brood: an egg, a larva or a pupa, told apart by shape as well as by colour. Uses the current
 * fill style.
 *
 * An egg is a small smooth oval. A larva of this genus is a fat grub with its front end bent
 * down, drawn as a body with a smaller head segment turned to one side. A pupa already has
 * the adult's outline: head, thorax and gaster, pale, with the legs folded under.
 */
export function drawBrood(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  stage: 0 | 1 | 2,
  lengthPx: number,
  widthPx: number,
  angle: number,
): void {
  const L = Math.max(1, lengthPx)
  const W = Math.max(0.8, widthPx)
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  // Brood is kept in piles, and pale things in a pile run together. A thin darker edge keeps
  // each egg, larva and pupa its own object once it is big enough on screen to have one.
  const edged = L >= 5
  ctx.strokeStyle = BROOD_EDGE
  ctx.lineWidth = 0.6

  if (stage === 0 || L < 3) {
    ellipse(ctx, 0, 0, L / 2, W / 2)
    if (edged) strokeEllipse(ctx, 0, 0, L / 2, W / 2)
  } else if (stage === 1) {
    ellipse(ctx, -L * 0.08, 0, L * 0.4, W / 2)
    ellipse(ctx, L * 0.3, W * 0.28, W * 0.3, W * 0.3)
    if (edged) {
      strokeEllipse(ctx, -L * 0.08, 0, L * 0.4, W / 2)
      strokeEllipse(ctx, L * 0.3, W * 0.28, W * 0.3, W * 0.3)
    }
  } else {
    ellipse(ctx, -L * 0.25, 0, L * 0.25, W * 0.55)
    ellipse(ctx, L * 0.06, 0, L * 0.15, W * 0.38)
    ellipse(ctx, L * 0.32, 0, L * 0.12, W * 0.44)
    if (edged) {
      strokeEllipse(ctx, -L * 0.25, 0, L * 0.25, W * 0.55)
      strokeEllipse(ctx, L * 0.06, 0, L * 0.15, W * 0.38)
      strokeEllipse(ctx, L * 0.32, 0, L * 0.12, W * 0.44)
    }
    if (L >= 8) {
      ctx.beginPath()
      ctx.moveTo(L * 0.2, W * 0.2)
      ctx.lineTo(-L * 0.3, W * 0.25)
      ctx.moveTo(L * 0.2, -W * 0.2)
      ctx.lineTo(-L * 0.3, -W * 0.25)
      ctx.stroke()
    }
  }

  // A soft sheen on anything large enough to show one: eggs and pupae are smooth and wet.
  if (edged && stage !== 1) {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
    ellipse(ctx, -L * 0.08, -W * 0.18, L * 0.14, W * 0.1)
  }
  ctx.restore()
}
