/**
 * The page.
 *
 * Two screens: the threshold a reader meets on arrival, and the simulator itself. Nothing
 * here contains any biology. It reads core state and draws it, and the one thing it is
 * allowed to write is the brood investment lever, which is one of the two decisions a
 * person is permitted to make about this colony.
 *
 * **The simulation runs on the main thread, time-sliced.** A colony of a few hundred costs
 * about a tenth of a second per simulated day, so at the speeds offered here the frame
 * budget below is never spent; a mature colony of several thousand at the highest speed
 * will spend it and the picture will slow rather than the simulation losing fidelity. That
 * is the correct trade of the two, and it is the reason speed is expressed as simulated
 * days per real second and never as a step size. Moving the core into a Worker is the next
 * step and changes nothing about the model: `/core` already imports no DOM.
 */

import species from '../species/pogonomyrmex-badius.json'
import { loadSpecies } from './core/params/index.js'
import { Colony } from './core/sim/colony.js'
import { BroodInvestment } from './core/systems/demography.js'
import { measureNest } from './core/state/nest.js'
import { NestView } from './render/nest-view.js'
import { SurfaceView } from './render/surface-view.js'
import { colonyReadings, describePhase, formatDate, nestReadings, renderHud } from './ui/hud.js'
import { createSourcesSheet } from './ui/sources.js'
import { createInstrumentSheet } from './ui/instrument.js'
import { mountThreshold } from './ui/threshold.js'
import type { BroodInvestmentValue } from './core/systems/demography.js'

const { params, counts } = loadSpecies(species as unknown as Record<string, unknown>)

const app = document.querySelector<HTMLDivElement>('#app')
if (app === null) throw new Error('#app is missing from the page')

/**
 * Where the source lives.
 *
 * Derived from the address when this is served from a GitHub Pages project site, because
 * that is the one place the owner's name is already true rather than typed in twice and
 * left to rot.
 */
function repositoryUrl(): string {
  const host = window.location.hostname
  const match = /^([a-z0-9-]+)\.github\.io$/i.exec(host)
  const project = window.location.pathname.split('/').filter(Boolean)[0]
  if (match !== null && project !== undefined) {
    return `https://github.com/${match[1]}/${project}`
  }
  return 'https://github.com/'
}

const openSources = createSourcesSheet(counts)
const openInstrument = createInstrumentSheet(repositoryUrl())

/** Simulated days per real second. Speed changes how many steps run, never their size. */
const SPEEDS: readonly { label: string; daysPerSecond: number }[] = [
  { label: '1x', daysPerSecond: 1 / 60 },
  { label: '4x', daysPerSecond: 4 / 60 },
  { label: '16x', daysPerSecond: 16 / 60 },
  { label: '64x', daysPerSecond: 64 / 60 },
  { label: '256x', daysPerSecond: 256 / 60 },
]

/** Milliseconds of simulation permitted per frame. Past this the picture slows, not the model. */
const FRAME_BUDGET_MS = 9

const INVESTMENTS: readonly { label: string; value: BroodInvestmentValue }[] = [
  { label: 'Workers', value: BroodInvestment.Workers },
  { label: 'Balanced', value: BroodInvestment.Balanced },
  { label: 'Alates', value: BroodInvestment.Alates },
]

function startThreshold(): void {
  const teardown = mountThreshold(app!, {
    params,
    counts,
    onSources: () => openSources('sources'),
    onEnter: (door) => {
      if (door === 'instrument') {
        openInstrument()
        return
      }
      teardown()
      startSimulator()
    },
  })
}

function startSimulator(): void {
  // A colony seed drawn once per visit, so two people who open the page do not watch the
  // same nest. It is printed in the panel, so any run a person likes can be repeated here
  // or handed to the headless runner and reproduced exactly.
  const seed = Math.floor(Math.random() * 2 ** 31) || 1
  const colony = new Colony({ seed, params })

  app!.innerHTML = `
    <main class="layout">
      <section class="stage">
        <div class="views">
          <div class="view view--nest">
            <canvas id="slice"></canvas>
            <p class="view-label">nest, vertical slice</p>
          </div>
          <div class="view view--surface">
            <canvas id="ground"></canvas>
            <p class="view-label">ground, from above</p>
          </div>
        </div>
        <p class="stage-note">
          Real shafts are helices 4 to 6 cm across; the slice is a plane cut through one, not
          a flattened nest. The lines on the ground are not drawn: they are recruitment
          pheromone, left by foragers walking home.
        </p>
      </section>
      <aside class="panel">
        <div class="panel-head">
          <h1>Anthill</h1>
          <p class="subtitle">Pogonomyrmex badius, ${params.species.habitat}</p>
          <p class="clock">
            <span id="date"></span>
            <span class="phase" id="phase"></span>
          </p>
        </div>
        <div class="controls" id="speeds"></div>
        <div class="controls" id="levers"></div>
        <div class="readouts" id="hud"></div>
        <div class="panel-foot">
          <p class="provenance">
            seed ${seed}<br />
            ${counts.A} measured in this species [A]<br />
            ${counts.B} from another ant [B]<br />
            ${counts.C} invented [C]
          </p>
          <button class="linkish" id="show-sources" type="button">
            Sources, provenance, and what this refuses to model
          </button>
          <button class="linkish" id="show-instrument" type="button">
            Running this as an instrument
          </button>
        </div>
      </aside>
    </main>
  `

  const sliceCanvas = app!.querySelector<HTMLCanvasElement>('#slice')!
  const groundCanvas = app!.querySelector<HTMLCanvasElement>('#ground')!
  const hud = app!.querySelector<HTMLDivElement>('#hud')!
  const dateEl = app!.querySelector<HTMLElement>('#date')!
  const phaseEl = app!.querySelector<HTMLElement>('#phase')!
  const speedBar = app!.querySelector<HTMLDivElement>('#speeds')!
  const leverBar = app!.querySelector<HTMLDivElement>('#levers')!

  const nestView = new NestView(sliceCanvas)
  const surfaceView = new SurfaceView(groundCanvas)

  let speedIndex = 1
  let paused = false

  // Speed controls. Pause first, because it is the one a person reaches for in a hurry.
  const pauseButton = document.createElement('button')
  pauseButton.type = 'button'
  pauseButton.textContent = 'Pause'
  pauseButton.addEventListener('click', () => {
    paused = !paused
    pauseButton.textContent = paused ? 'Run' : 'Pause'
    pauseButton.ariaPressed = String(paused)
  })
  speedBar.append(pauseButton)

  const speedButtons: HTMLButtonElement[] = []
  SPEEDS.forEach((speed, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = speed.label
    button.addEventListener('click', () => {
      speedIndex = index
      for (const [i, b] of speedButtons.entries()) b.ariaPressed = String(i === index)
    })
    speedButtons.push(button)
    speedBar.append(button)
  })
  speedButtons[speedIndex]!.ariaPressed = 'true'

  // The one lever a person is given. It biases the queen's egg laying and acts on
  // developmental scheduling only. It cannot reassign an adult, and nothing in the UI may
  // ever offer to: foragers in this species do not revert and the colony does not backfill.
  const leverLabel = document.createElement('span')
  leverLabel.className = 'hud-expected'
  leverLabel.textContent = 'Brood investment'
  leverBar.append(leverLabel)

  const leverButtons: HTMLButtonElement[] = []
  INVESTMENTS.forEach((investment) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = investment.label
    button.addEventListener('click', () => {
      colony.demography.investment = investment.value
      for (const [i, b] of leverButtons.entries())
        b.ariaPressed = String(INVESTMENTS[i]!.value === investment.value)
    })
    leverButtons.push(button)
    leverBar.append(button)
  })
  leverButtons[colony.demography.investment]!.ariaPressed = 'true'

  app!.querySelector('#show-sources')!.addEventListener('click', () => openSources('sources'))
  app!.querySelector('#show-instrument')!.addEventListener('click', () => openInstrument())

  function fit(canvas: HTMLCanvasElement): { width: number; height: number } | null {
    const rect = canvas.getBoundingClientRect()
    if (rect.width < 1 || rect.height < 1) return null
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(rect.width * dpr)
    canvas.height = Math.round(rect.height * dpr)
    const ctx = canvas.getContext('2d')
    if (ctx !== null) ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    return { width: rect.width, height: rect.height }
  }

  function redraw(): void {
    const sliceSize = fit(sliceCanvas)
    if (sliceSize !== null) {
      const viewport = NestView.frameNest(colony.nest, sliceSize.height)
      nestView.draw(
        colony.nest,
        colony.soil,
        colony.sim.ants,
        viewport,
        sliceSize.width,
        sliceSize.height,
      )
    }

    const groundSize = fit(groundCanvas)
    if (groundSize !== null) {
      surfaceView.draw(
        colony.surface,
        colony.sim.ants,
        groundSize.width,
        groundSize.height,
        params.foraging.foragingRangeMetres.value * 2.2,
      )
    }

    const summary = colony.summary()
    const measurement = measureNest(colony.nest, params)
    renderHud(hud, [
      ...colonyReadings(summary, params),
      ...nestReadings(measurement, params, summary.workers, summary.phase !== 'founding'),
    ])
    dateEl.textContent = formatDate(colony.sim.clock.date())
    phaseEl.textContent = describePhase(summary)
  }

  let lastFrameMs = performance.now()
  let owedTicks = 0

  function frame(): void {
    // The clock is read here rather than taken from the animation frame's own timestamp.
    // That timestamp is when the frame began, which can already be several milliseconds in
    // the past by the time this callback runs, and measuring a nine millisecond budget from
    // it meant the budget was often spent before the first step and the colony never moved.
    const now = performance.now()
    const elapsedSeconds = Math.min(0.25, (now - lastFrameMs) / 1000)
    lastFrameMs = now

    if (!paused && colony.alive) {
      owedTicks += SPEEDS[speedIndex]!.daysPerSecond * elapsedSeconds * colony.sim.clock.ticksPerDay
      const deadline = now + FRAME_BUDGET_MS
      while (owedTicks >= 1 && performance.now() < deadline) {
        colony.step()
        owedTicks -= 1
        if (!colony.alive) break
      }
      // Whatever could not be afforded this frame is dropped rather than carried. Carrying
      // it turns one slow frame into a spiral of slower ones.
      if (owedTicks > colony.sim.clock.ticksPerDay) owedTicks = 0
    }

    redraw()
    window.requestAnimationFrame(frame)
  }

  window.addEventListener('resize', redraw)
  redraw()
  window.requestAnimationFrame(frame)

  // A handle on the running colony, for the development server only. Vite removes this
  // whole block from a production build. It exists so the simulation can be driven and
  // inspected from a console during development without the page growing a debug surface
  // that ships.
  if (import.meta.env.DEV) {
    ;(window as unknown as Record<string, unknown>).anthill = {
      colony,
      redraw,
      advanceDays: (days: number) => {
        colony.run(colony.sim.clock.ticksPerDay * days)
        redraw()
      },
    }
  }
}

startThreshold()
