/**
 * The threshold: what a reader meets before anything runs.
 *
 * It exists because this software has two audiences who want incompatible things from it.
 * One wants to watch a colony. The other wants thirty of them, with a methods file at the
 * end. The choice is made on the way in: one action for each, and the evidence behind the
 * model one click away.
 *
 * The picture on the right is not a screenshot. It is the same renderer and the same core,
 * running a seeded colony while the reader reads.
 */

import { NestView } from '../render/nest-view.js'
import { AntMotion } from '../render/ant-motion.js'
import { createNestHarness } from '../core/sim/nest-harness.js'
import { measureNest } from '../core/state/nest.js'
import { bodySizesFor } from '../render/body-sizes.js'
import {
  currentTheme,
  nestThemeFor,
  onThemeChange,
  themeToggleLabel,
  toggleTheme,
} from './theme.js'
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
      <section class="threshold-body">
        <header>
          <h1>A nest with no architect</h1>
          <p class="binomial"><i>Pogonomyrmex badius</i>, the Florida harvester ant</p>
        </header>
        <p class="lede">${OPENING}</p>
        <div class="actions">
          <button class="btn btn--primary" id="door-watch" type="button">
            Watch a colony
            <span class="btn-icon" aria-hidden="true">→</span>
          </button>
          <button class="btn btn--secondary" id="door-instrument" type="button">
            Run your own study
            <span class="btn-icon" aria-hidden="true">↗</span>
          </button>
        </div>
        <p class="actions-note">
          One founding queen to start. Her first workers hatch within about a minute.
        </p>
        <button class="facts" id="door-sources" type="button">
          <span class="facts-grid">
            <span class="fact">
              <span class="fact-value">${counts.A}</span>
              <span class="fact-label">values measured in this species</span>
            </span>
            <span class="fact">
              <span class="fact-value">${counts.B}</span>
              <span class="fact-label">borrowed from related ants</span>
            </span>
            <span class="fact">
              <span class="fact-value">${counts.C}</span>
              <span class="fact-label">invented, and labelled as such</span>
            </span>
          </span>
          <span class="facts-caption">See where every number comes from</span>
        </button>
        <footer class="threshold-foot">
          <p>
            The biology comes from three decades of field work by Walter R. Tschinkel and
            Christina L. Kwapich. Cite them, not this software, for any claim about the ants.
          </p>
          <button class="linkish" id="theme-toggle" type="button"></button>
        </footer>
      </section>
      <section class="threshold-stage" aria-label="A colony digging">
        <canvas id="threshold-slice" aria-hidden="true"></canvas>
        <p class="threshold-caption">
          A colony digging in your browser right now, seen as a slice through the sand. The
          ruler is in centimetres.
        </p>
      </section>
    </main>
  `

  const canvas = root.querySelector<HTMLCanvasElement>('#threshold-slice')!
  const view = new NestView(canvas, nestThemeFor(currentTheme()))
  const themeButton = root.querySelector<HTMLButtonElement>('#theme-toggle')!
  themeButton.textContent = themeToggleLabel()
  themeButton.addEventListener('click', () => toggleTheme())

  // A fixed seed, so every reader meets the same nest and a screenshot of this page is
  // reproducible. Small enough to dig visibly while somebody reads a paragraph.
  const harness = createNestHarness({ seed: 7, params, workers: 240 })
  const motion = new AntMotion(harness.sim.ants.capacity)
  const sizes = bodySizesFor(options.params, harness.sim.ants.count)
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
      sizes,
      showDiggingScent: true,
      discDiameterCm:
        (options.params.nest.surfaceDiscDiameterCm.min +
          options.params.nest.surfaceDiscDiameterCm.max) /
        2,
      // The demonstration is a nest dug by a synthetic workforce. It has no queen and no
      // brood, so there is no mix to draw.
      broodMix: { eggs: 0, larvae: 0, pupae: 0 },
    })
  }

  const stopListening = onThemeChange((theme) => {
    view.setTheme(nestThemeFor(theme))
    themeButton.textContent = themeToggleLabel()
    draw()
  })

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
    stopListening()
  }
}
