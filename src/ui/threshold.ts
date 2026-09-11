/**
 * The threshold: what a reader meets before anything runs.
 *
 * It exists because this software has two audiences who want incompatible things from it.
 * One wants to watch a colony. The other wants thirty of them, with a methods file at the
 * end. The choice is made on the way in, and each door says plainly what it can and cannot
 * do. A browser tab runs one colony well. It cannot run a study, and the second door says
 * so and hands over the command that can.
 *
 * The picture on the left is not a screenshot. It is the same renderer and the same core,
 * running a seeded colony while the reader reads.
 */

import { NestView } from '../render/nest-view.js'
import { AntMotion } from '../render/ant-motion.js'
import { createNestHarness } from '../core/sim/nest-harness.js'
import { measureNest } from '../core/state/nest.js'
import type { Params } from '../core/params/params.js'

export type Door = 'watch' | 'instrument'

export interface ThresholdOptions {
  readonly params: Params
  readonly counts: Readonly<Record<'A' | 'B' | 'C', number>>
  readonly onEnter: (door: Door) => void
  readonly onSources: () => void
}

/**
 * The opening paragraph. It is the one piece of prose in the application allowed to run to
 * a paragraph, because it does the job an abstract does.
 */
const OPENING = `In the sandhills of north Florida a single mated queen lands, breaks off her wings and digs a shaft into the sand. She seals herself in and raises her first daughters on nothing but her own flight muscles. If they survive, they will build a nest three metres deep with no architect, no blueprint and no ant that has ever seen the whole thing. You are not in charge of them.`

/**
 * Renders the threshold into a container and returns a teardown function.
 *
 * Teardown matters. The demonstration colony keeps digging on an animation frame, and
 * leaving it running after a reader has gone through a door would spend the real
 * simulation's frame budget on a nest nobody is looking at.
 */
export function mountThreshold(root: HTMLElement, options: ThresholdOptions): () => void {
  const { params, counts } = options

  root.innerHTML = `
    <main class="threshold">
      <section class="threshold-stage" aria-label="A colony digging">
        <canvas id="threshold-slice" aria-hidden="true"></canvas>
        <p class="threshold-caption">
          A colony digging in your browser right now, seen as a slice through the sand. The
          ruler on the left is in centimetres.
        </p>
      </section>
      <section class="threshold-body">
        <header>
          <h1>A nest with no architect</h1>
          <p class="binomial"><i>Pogonomyrmex badius</i>, the Florida harvester ant</p>
        </header>
        <p class="lede">${OPENING}</p>
        <div class="doors">
          <button class="door door--primary" id="door-watch" type="button">
            <span class="door-title">Watch a colony</span>
            <span class="door-note">
              Follow one queen as her colony digs, forages and grows. Her first workers hatch
              within about a minute.
            </span>
          </button>
          <button class="door" id="door-instrument" type="button">
            <span class="door-title">Run your own study</span>
            <span class="door-note">
              Run dozens of colonies on your own computer and get a methods report at the end.
              The browser only runs one colony at a time.
            </span>
          </button>
          <button class="door" id="door-sources" type="button">
            <span class="door-title">Where the numbers come from</span>
            <span class="door-note">
              ${counts.A} values measured in this species, ${counts.B} borrowed from related ants
              and ${counts.C} invented. Every one is labelled.
            </span>
          </button>
        </div>
        <p class="threshold-foot">
          The biology comes from three decades of field work by Walter R. Tschinkel and
          Christina L. Kwapich. Cite them, not this software, for any claim about the ants.
        </p>
      </section>
    </main>
  `

  const canvas = root.querySelector<HTMLCanvasElement>('#threshold-slice')!
  const view = new NestView(canvas)

  // A fixed seed, so every reader meets the same nest and a screenshot of this page is
  // reproducible. Small enough to dig visibly while somebody reads a paragraph.
  const harness = createNestHarness({ seed: 7, params, workers: 240 })
  const motion = new AntMotion(harness.sim.ants.capacity)
  let lastDrawMs = performance.now()
  let frame = 0
  let running = true

  const draw = (): void => {
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (ctx !== null) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    const now = performance.now()
    motion.update(harness.sim.ants, (now - lastDrawMs) / 1000)
    lastDrawMs = now
    // Framed close enough to see the ants from the first frame, and widened as the nest
    // deepens. The simulator's whole-nest camera starts at 24 cm, which left this picture as
    // a speck at the surface above a screen of empty sand for the first minute.
    const dugCm = Math.max(harness.nest.maxDepthCm, 1)
    const spanCm = Math.max(7, dugCm * 1.5)
    const viewport = { topCm: -spanCm * 0.12, spanCm, centreCm: 0 }
    view.draw(harness.nest, harness.soil, harness.sim.ants, viewport, rect.width, rect.height, {
      motion,
      timeSeconds: now / 1000,
      selected: -1,
      // The demonstration is a nest dug by a synthetic workforce. It has no queen and no
      // brood, so there is no mix to draw.
      broodMix: { eggs: 0, larvae: 0, pupae: 0 },
    })
  }

  const tick = (): void => {
    if (!running) return
    // A small, fixed number of steps per frame. The point is a nest that visibly deepens,
    // not a race.
    harness.run(90)
    // Stop once the nest is well past the depth a new nest reaches, so the demonstration
    // does not run to the floor of the grid while somebody reads the reference list.
    if (measureNest(harness.nest, params).maxDepthCm > params.nest.incipientDepthCm.max * 2) {
      running = false
    }
    draw()
    frame = window.requestAnimationFrame(tick)
  }

  const onResize = (): void => draw()
  window.addEventListener('resize', onResize)

  root.querySelector('#door-watch')!.addEventListener('click', () => options.onEnter('watch'))
  root
    .querySelector('#door-instrument')!
    .addEventListener('click', () => options.onEnter('instrument'))
  root.querySelector('#door-sources')!.addEventListener('click', () => options.onSources())

  draw()
  frame = window.requestAnimationFrame(tick)

  return () => {
    running = false
    window.cancelAnimationFrame(frame)
    window.removeEventListener('resize', onResize)
  }
}
