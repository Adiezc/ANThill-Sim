/**
 * The threshold: what a reader meets before anything runs.
 *
 * It exists because this software has two audiences who want incompatible things from it.
 * One wants to watch a colony. The other wants thirty of them, with a methods file at the
 * end. Dropping both into the same running simulation and hoping they work out which one
 * they are is how a model gets cited carelessly by the second and abandoned by the first.
 *
 * So the choice is made explicitly, on the way in, and the honest limits of each path are
 * stated there rather than discovered later. A browser tab runs one colony well. It cannot
 * run a study, and the panel says so and hands over the command that can.
 *
 * The picture on the left is not a screenshot and not stock photography. It is the same
 * renderer and the same core, running a seeded colony while the reader reads.
 */

import { NestView } from '../render/nest-view.js'
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
 * The opening text, from the build brief. It is the one piece of prose in the application
 * that is allowed to be a paragraph, because it is doing the job an abstract does.
 */
const OPENING = `In the sandhills of northern Florida a single mated queen lands, breaks off her wings and digs a shaft into the sand. She will seal herself in and raise her first daughters on nothing but her own flight muscles. If they live, they will build a nest three metres deep with no architect, no blueprint and no ant that has ever seen the whole thing. You are not in charge of them.`

/**
 * Renders the threshold into a container and returns a teardown function.
 *
 * Teardown matters: the demonstration colony behind the text keeps digging on an animation
 * frame, and leaving it running once a reader has gone through a door would spend the whole
 * frame budget of the actual simulation on a nest nobody is looking at.
 */
export function mountThreshold(root: HTMLElement, options: ThresholdOptions): () => void {
  const { params, counts } = options

  root.innerHTML = `
    <main class="threshold">
      <section class="threshold-stage">
        <canvas id="threshold-slice"></canvas>
        <p class="threshold-caption">
          A colony digging, right now, in this tab. The same core that runs headless on a
          cluster, drawn as a vertical slice with a centimetre ruler.
        </p>
      </section>
      <section class="threshold-body">
        <h1>
          A nest with no architect
          <span class="binomial">Pogonomyrmex badius, the Florida harvester ant</span>
        </h1>
        <blockquote>${OPENING}</blockquote>
        <div class="doors">
          <button class="door door--primary" id="door-watch" type="button">
            <span class="door-title">Watch a colony</span>
            <span class="door-note">
              One colony, from the founding queen to the end of the run. Roughly ten minutes
              to see a nest built, longer for the years that follow.
            </span>
          </button>
          <button class="door" id="door-instrument" type="button">
            <span class="door-title">Use it as an instrument</span>
            <span class="door-note">
              Replicate runs, a seeded and reproducible core, and a methods file written at
              the end. A browser tab runs one colony; a study runs on your machine.
            </span>
          </button>
          <button class="door" id="door-sources" type="button">
            <span class="door-title">Sources, provenance, and what this refuses to model</span>
            <span class="door-note">
              ${counts.A} values measured in this species, ${counts.B} generalised from
              another ant, ${counts.C} invented. Every one of them is labelled.
            </span>
          </button>
        </div>
        <p class="threshold-foot">
          The biology is the field work of Walter R. Tschinkel and Christina L. Kwapich.
          Cite them, not this software, for any biological claim.
        </p>
      </section>
    </main>
  `

  const canvas = root.querySelector<HTMLCanvasElement>('#threshold-slice')!
  const view = new NestView(canvas)

  // A fixed seed, so every reader meets the same nest and a screenshot of this page is
  // reproducible. Small enough that it digs visibly while somebody reads three paragraphs.
  const harness = createNestHarness({ seed: 7, params, workers: 240 })
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
    const viewport = NestView.frameNest(harness.nest, rect.height)
    view.draw(harness.nest, harness.soil, harness.sim.ants, viewport, rect.width, rect.height)
  }

  const tick = (): void => {
    if (!running) return
    // A small, fixed number of steps per frame. The point is a nest that visibly deepens,
    // not a race: a reader should be able to look up and see that something moved.
    harness.run(90)
    // Stop once the nest is past the depth an incipient nest reaches, so the demonstration
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
