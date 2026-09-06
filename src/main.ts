/**
 * The page.
 *
 * A first, deliberately plain shell: the vertical slice, a centimetre ruler, and the
 * readouts. It exists now, ahead of its place in the order of work, because the numbers in
 * this model are centimetres and the only way to know whether a nest is the right shape is
 * to look at it beside the plaster casts it is meant to resemble.
 *
 * The simulation runs on the main thread here. It moves into a Worker with the rest of the
 * UI at step 10.
 */

import species from '../species/pogonomyrmex-badius.json'
import { loadSpecies } from './core/params/index.js'
import { createNestHarness } from './core/sim/nest-harness.js'
import { measureNest } from './core/state/nest.js'
import { NestView } from './render/nest-view.js'
import { formatDate, nestReadings, renderHud } from './ui/hud.js'

/**
 * Deliberately smaller than a mature colony. The simulation still runs on the main thread
 * in this shell, so a click has to finish in well under a second; the core moves into a
 * Worker at step 10 and this cap goes with it.
 */
const WORKERS = 600

const { params, counts } = loadSpecies(species as unknown as Record<string, unknown>)
const harness = createNestHarness({ seed: 1, params, workers: WORKERS })

const app = document.querySelector<HTMLDivElement>('#app')
if (app === null) throw new Error('#app is missing from the page')

app.innerHTML = `
  <main class="layout">
    <section class="stage">
      <canvas id="slice"></canvas>
      <p class="slice-note">
        A vertical slice. Real <i>Pogonomyrmex badius</i> shafts are helices 4–6 cm across;
        what you see is a plane cut through one, not a flattened nest.
      </p>
    </section>
    <aside class="panel">
      <h1>Anthill</h1>
      <p class="subtitle"><i>Pogonomyrmex badius</i> — ${params.species.habitat}</p>
      <p class="date" id="date"></p>
      <div id="hud"></div>
      <p class="provenance">
        ${counts.A} values documented for this species [A] ·
        ${counts.B} generalised from another ant [B] ·
        ${counts.C} invented [C]
      </p>
      <div class="controls">
        <button id="run" type="button">Run a day</button>
        <button id="run10" type="button">Run five days</button>
      </div>
    </aside>
  </main>
`

const canvas = document.querySelector<HTMLCanvasElement>('#slice')!
const hud = document.querySelector<HTMLDivElement>('#hud')!
const dateEl = document.querySelector<HTMLParagraphElement>('#date')!
const view = new NestView(canvas)

function redraw(): void {
  const rect = canvas.getBoundingClientRect()
  const dpr = window.devicePixelRatio || 1
  canvas.width = Math.round(rect.width * dpr)
  canvas.height = Math.round(rect.height * dpr)
  const ctx = canvas.getContext('2d')
  if (ctx !== null) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const viewport = NestView.frameNest(harness.nest, rect.height)
  view.draw(harness.nest, harness.soil, harness.sim.ants, viewport, rect.width, rect.height)

  const measurement = measureNest(harness.nest, params)
  renderHud(hud, nestReadings(measurement, params, WORKERS))
  dateEl.textContent = formatDate(harness.sim.clock.date())
}

function advance(days: number): void {
  harness.run(harness.sim.clock.ticksPerDay * days)
  redraw()
}

document.querySelector('#run')!.addEventListener('click', () => advance(1))
document.querySelector('#run10')!.addEventListener('click', () => advance(5))
window.addEventListener('resize', redraw)
redraw()
