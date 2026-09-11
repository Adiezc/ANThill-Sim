/**
 * The page.
 *
 * Two screens: the threshold a reader meets on arrival, and the simulator itself. Nothing
 * here contains any biology. It reads core state and draws it, and the one thing it may
 * write is the brood investment lever, one of the two decisions a person is allowed to make
 * about this colony.
 *
 * **The simulation runs on the main thread, time-sliced.** A colony of a few hundred costs
 * about a tenth of a second per simulated day, so at the speeds offered here the frame budget
 * below is rarely spent. A mature colony of several thousand at the highest speed will spend
 * it, and the picture will slow rather than the simulation losing fidelity. That is the right
 * trade, and it is why speed is expressed as simulated days per real second and never as a
 * step size. Moving the core into a Worker is the next step and changes nothing about the
 * model, because `/core` already imports no DOM.
 *
 * **Drawing and stepping are separate clocks.** The ants are eased toward their simulated
 * positions every frame (see render/ant-motion.ts), so the picture stays continuous even
 * when the model takes one step a second. That is a property of the drawing only. Delete it
 * and the run is identical.
 */

import species from '../species/pogonomyrmex-badius.json'
import { loadSpecies } from './core/params/index.js'
import { Colony } from './core/sim/colony.js'
import { BroodInvestment } from './core/systems/demography.js'
import { measureNest } from './core/state/nest.js'
import { Burden, Caste, Domain, Task } from './core/state/ants.js'
import { ruleById } from './core/provenance/rules.js'
import { NestView } from './render/nest-view.js'
import { SurfaceView } from './render/surface-view.js'
import { AntMotion } from './render/ant-motion.js'
import { CASTE_COLOURS, BURDEN_COLOURS, coloursFor } from './render/ant-sprite.js'
import { DEFAULT_THEME } from './render/nest-view.js'
import {
  colonyReadings,
  describePhase,
  formatDate,
  nestReadings,
  renderHud,
  seedReadings,
} from './ui/hud.js'
import { createSourcesSheet } from './ui/sources.js'
import { createInstrumentSheet } from './ui/instrument.js'
import { mountThreshold } from './ui/threshold.js'
import type { NestViewport } from './render/nest-view.js'
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

/**
 * Simulated days per real second. Speed changes how many steps run, never their size.
 *
 * Labelled in days rather than multipliers. "16x" says nothing about what a reader is about
 * to see. "16 days/s" says the first workers are about three seconds away.
 */
const SPEEDS: readonly { label: string; title: string; daysPerSecond: number }[] = [
  { label: '1 day/min', title: 'One simulated day every real minute', daysPerSecond: 1 / 60 },
  { label: '1 day/4 s', title: 'One simulated day every four seconds', daysPerSecond: 0.25 },
  { label: '1 day/s', title: 'One simulated day every second', daysPerSecond: 1 },
  { label: '4 days/s', title: 'Four simulated days every second', daysPerSecond: 4 },
  { label: '16 days/s', title: 'Sixteen simulated days every second', daysPerSecond: 16 },
]

/**
 * The speed a visitor starts at.
 *
 * A day a second. The queen seals herself in, digs her founding shaft over the next few
 * seconds and lays, and her first daughters hatch about forty seconds in. That is roughly
 * how long somebody will watch before deciding whether this is worth their time. Slower,
 * and the first minute is a still picture. Faster, and the founding is over before anyone
 * sees it.
 */
const DEFAULT_SPEED = 2

/** Milliseconds of simulation allowed per frame. Past this the picture slows, not the model. */
const FRAME_BUDGET_MS = 9

const INVESTMENTS: readonly {
  label: string
  value: BroodInvestmentValue
  note: string
}[] = [
  {
    label: 'Workers',
    value: BroodInvestment.Workers,
    note: 'Every egg becomes a worker. The colony grows as fast as its food allows and raises almost no queens or males.',
  },
  {
    label: 'Balanced',
    value: BroodInvestment.Balanced,
    note: 'Most eggs become workers. Once the colony passes 700 workers, part of each spring brood becomes winged queens and males.',
  },
  {
    label: 'Queens and males',
    value: BroodInvestment.Alates,
    note: 'As much of the spring brood as the season allows becomes winged queens and males, paid for with fat the workers stored last autumn.',
  },
]

/** Plain words for the three evidence labels, used wherever a rule is shown. */
const TAG_WORDS: Readonly<Record<'A' | 'B' | 'C', string>> = {
  A: 'Measured in this species',
  B: 'Borrowed from another ant',
  C: 'Invented',
}

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

/** Camera modes for the slice. "Free" is wherever the reader has zoomed or dragged to. */
type Camera = 'work' | 'nest' | 'free'

function startSimulator(): void {
  // A colony seed drawn once per visit, so two people who open the page do not watch the
  // same nest. It is printed in the panel, so any run a person likes can be repeated here or
  // handed to the headless runner and reproduced exactly.
  const seed = Math.floor(Math.random() * 2 ** 31) || 1
  const colony = new Colony({ seed, params })
  const motion = new AntMotion(colony.sim.ants.capacity)
  const totalValues = counts.A + counts.B + counts.C

  app!.innerHTML = `
    <main class="layout">
      <section class="stage">
        <div class="views">
          <div class="view view--nest">
            <canvas id="slice" aria-label="The nest, as a vertical slice through the sand"></canvas>
            <p class="view-label">The nest, as a slice through the sand</p>
            <div class="view-tools" id="cameras"></div>
          </div>
          <div class="view view--surface">
            <canvas id="ground" aria-label="The ground around the nest, from above"></canvas>
            <p class="view-label">The ground, from above</p>
          </div>
        </div>
        <p class="stage-note">
          Scroll to zoom and drag to move. Click an ant to see what it is doing and which
          study says so.
        </p>
      </section>
      <aside class="panel">
        <header class="panel-head">
          <h1>Anthill</h1>
          <p class="subtitle"><i>Pogonomyrmex badius</i>. ${params.species.habitat}.</p>
          <div class="clock">
            <div>
              <p class="date" id="date"></p>
              <p class="phase" id="phase"></p>
            </div>
            <button class="control-pause" id="pause" type="button">Pause</button>
          </div>
        </header>
        <section class="panel-section">
          <h2 class="panel-label">Speed</h2>
          <div class="controls controls--segmented" id="speeds"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-label">What the queen's eggs become</h2>
          <div class="controls" id="levers"></div>
          <p class="control-note" id="lever-note"></p>
        </section>
        <div class="inspector" id="inspector" hidden></div>
        <details class="legend" id="legend">
          <summary>What am I looking at?</summary>
          <div class="legend-body" id="legend-body"></div>
        </details>
        <div class="readouts">
          <p class="readouts-intro">
            The grey note under each figure is what real colonies show. A figure turns red
            when the model is outside that.
          </p>
          <div id="hud"></div>
        </div>
        <footer class="panel-foot">
          <p class="provenance">
            This run uses seed <code>${seed}</code>, so it can be repeated exactly. Of the
            model's ${totalValues} values, ${counts.A} are measured in this species,
            ${counts.B} are borrowed from other ants and ${counts.C} are invented.
          </p>
          <button class="linkish" id="show-sources" type="button">Sources and evidence</button>
          <button class="linkish" id="show-instrument" type="button">Run your own study</button>
        </footer>
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
  const leverNote = app!.querySelector<HTMLParagraphElement>('#lever-note')!
  const cameraBar = app!.querySelector<HTMLDivElement>('#cameras')!
  const inspector = app!.querySelector<HTMLDivElement>('#inspector')!

  const nestView = new NestView(sliceCanvas)
  const surfaceView = new SurfaceView(groundCanvas)

  let speedIndex = DEFAULT_SPEED
  let paused = false
  let camera: Camera = 'work'
  /**
   * How much depth the slice shows. Starts at ant scale: a founding chamber is 1 cm high and
   * a worker 6.35 mm long, so this is about forty body lengths of nest.
   */
  let spanCm = 26
  let freeTopCm = 0
  let freeCentreCm = 0
  let selected = -1
  const startedAtMs = performance.now()

  // Pause sits beside the date, where a person looks when they want the colony to stop.
  const pauseButton = app!.querySelector<HTMLButtonElement>('#pause')!
  pauseButton.addEventListener('click', () => {
    paused = !paused
    pauseButton.textContent = paused ? 'Resume' : 'Pause'
    pauseButton.ariaPressed = String(paused)
  })

  const speedButtons: HTMLButtonElement[] = []
  SPEEDS.forEach((speed, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = speed.label
    button.title = speed.title
    button.addEventListener('click', () => {
      speedIndex = index
      for (const [i, b] of speedButtons.entries()) b.ariaPressed = String(i === index)
    })
    speedButtons.push(button)
    speedBar.append(button)
  })
  speedButtons[speedIndex]!.ariaPressed = 'true'

  // Camera. The default is ant scale, around the queen. One click shows the whole nest.
  const cameraButtons: HTMLButtonElement[] = []
  const CAMERAS: readonly { label: string; value: Camera; title: string }[] = [
    { label: 'Follow the ants', value: 'work', title: 'Close up, around the queen and her brood' },
    { label: 'Whole nest', value: 'nest', title: 'Everything dug so far, to scale' },
  ]
  CAMERAS.forEach((option) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = option.label
    button.title = option.title
    button.addEventListener('click', () => {
      camera = option.value
      if (option.value === 'work') spanCm = 26
      syncCameraButtons()
    })
    cameraButtons.push(button)
    cameraBar.append(button)
  })

  function syncCameraButtons(): void {
    for (const [i, b] of cameraButtons.entries()) {
      b.ariaPressed = String(CAMERAS[i]!.value === camera)
    }
  }
  syncCameraButtons()

  // The one lever a person is given. It biases what the queen's eggs are raised into and
  // acts on development only. It cannot reassign an adult, and nothing in the UI may ever
  // offer to: foragers in this species never go back inside and the colony never backfills.
  const leverButtons: HTMLButtonElement[] = []
  INVESTMENTS.forEach((investment) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = investment.label
    button.addEventListener('click', () => {
      colony.demography.investment = investment.value
      syncLever()
    })
    leverButtons.push(button)
    leverBar.append(button)
  })

  function syncLever(): void {
    const chosen = INVESTMENTS.find((i) => i.value === colony.demography.investment)!
    for (const [i, b] of leverButtons.entries())
      b.ariaPressed = String(INVESTMENTS[i]!.value === colony.demography.investment)
    leverNote.textContent = `${chosen.note} Adults keep their jobs whatever you choose, because a forager in this species never goes back to work inside.`
  }
  syncLever()

  buildLegend(app!.querySelector<HTMLDivElement>('#legend-body')!)

  app!.querySelector('#show-sources')!.addEventListener('click', () => openSources('sources'))
  app!.querySelector('#show-instrument')!.addEventListener('click', () => openInstrument())

  // ---- Zooming, dragging and picking an ant ----

  let lastViewport: NestViewport = { topCm: 0, spanCm, centreCm: 0 }
  let lastSliceSize = { width: 1, height: 1 }

  sliceCanvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      // Zoom about the pointer, so the thing being looked at stays under the cursor.
      const rect = sliceCanvas.getBoundingClientRect()
      const at = NestView.unproject(
        lastViewport,
        rect.width,
        rect.height,
        event.clientX - rect.left,
        event.clientY - rect.top,
      )
      const factor = Math.exp(event.deltaY * 0.0015)
      const next = Math.min(400, Math.max(3, spanCm * factor))
      const fraction = (at.depthCm - lastViewport.topCm) / lastViewport.spanCm
      freeTopCm = at.depthCm - fraction * next
      freeCentreCm = lastViewport.centreCm
      spanCm = next
      camera = 'free'
      syncCameraButtons()
    },
    { passive: false },
  )

  let dragging = false
  let dragX = 0
  let dragY = 0
  let dragged = false
  sliceCanvas.addEventListener('pointerdown', (event) => {
    dragging = true
    dragged = false
    dragX = event.clientX
    dragY = event.clientY
    sliceCanvas.setPointerCapture(event.pointerId)
  })
  sliceCanvas.addEventListener('pointermove', (event) => {
    if (!dragging) return
    const dx = event.clientX - dragX
    const dy = event.clientY - dragY
    if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true
    dragX = event.clientX
    dragY = event.clientY
    const pxPerCm = lastSliceSize.height / lastViewport.spanCm
    freeTopCm = lastViewport.topCm - dy / pxPerCm
    freeCentreCm = lastViewport.centreCm - dx / pxPerCm
    camera = 'free'
    syncCameraButtons()
  })
  sliceCanvas.addEventListener('pointerup', (event) => {
    dragging = false
    sliceCanvas.releasePointerCapture(event.pointerId)
    if (dragged) return
    // A click, not a drag: pick the nearest ant to the pointer.
    const rect = sliceCanvas.getBoundingClientRect()
    const at = NestView.unproject(
      lastViewport,
      rect.width,
      rect.height,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
    selected = nearestAnt(at.offsetCm, at.depthCm)
  })

  function nearestAnt(offsetCm: number, depthCm: number): number {
    const { ants } = colony.sim
    // Within a centimetre or so of the click, scaled with the zoom so a wide view is not
    // impossible to hit and a close one is not sloppy.
    const reach = Math.max(0.4, lastViewport.spanCm * 0.03)
    let best = -1
    let bestDistance = reach * reach
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const dx = motion.drawnX(i) - offsetCm
      const dy = motion.drawnY(i) - depthCm
      const d = dx * dx + dy * dy
      if (d < bestDistance) {
        bestDistance = d
        best = i
      }
    }
    return best
  }

  // ---- Drawing ----

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

  function viewportFor(): NestViewport {
    if (camera === 'nest') return NestView.frameNest(colony.nest)
    if (camera === 'work') {
      return NestView.frameWork(colony.nest, colony.sim.ants, spanCm, colony.demography.queenSlot)
    }
    return { topCm: freeTopCm, spanCm, centreCm: freeCentreCm }
  }

  function redraw(): void {
    const timeSeconds = (performance.now() - startedAtMs) / 1000
    const brood = colony.demography.brood
    const sliceSize = fit(sliceCanvas)
    if (sliceSize !== null) {
      lastSliceSize = sliceSize
      lastViewport = viewportFor()
      nestView.draw(
        colony.nest,
        colony.soil,
        colony.sim.ants,
        lastViewport,
        sliceSize.width,
        sliceSize.height,
        {
          motion,
          timeSeconds,
          selected,
          broodMix: {
            eggs: brood.eggCount,
            larvae: brood.larvaCount,
            pupae: brood.pupaCount,
          },
        },
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
        { motion, timeSeconds },
      )
    }

    const summary = colony.summary()
    const measurement = measureNest(colony.nest, params)
    renderHud(hud, [
      { title: 'The colony', readings: colonyReadings(summary, params) },
      { title: 'Seeds', readings: seedReadings(summary, params) },
      {
        title: 'The nest',
        readings: nestReadings(measurement, params, summary.phase !== 'founding'),
      },
    ])
    dateEl.textContent = formatDate(colony.sim.clock.date())
    phaseEl.textContent = describePhase(summary)
    renderInspector()
  }

  /** The card that appears when a reader clicks an ant. The citation is the point of it. */
  function renderInspector(): void {
    const { ants } = colony.sim
    if (selected < 0 || selected >= ants.count || !ants.isAlive(selected)) {
      inspector.hidden = true
      return
    }
    inspector.hidden = false
    const rule = ruleById(ants.ruleId[selected]!)
    const depth = ants.y[selected]!
    const carrying = BURDEN_NAMES[ants.burden[selected]!] ?? ''
    inspector.replaceChildren()

    const title = document.createElement('p')
    title.className = 'inspector-title'
    const swatch = document.createElement('span')
    swatch.className = 'swatch'
    swatch.style.background = coloursFor(ants.caste[selected]!).body
    title.append(
      swatch,
      document.createTextNode(
        `${CASTE_NAMES[ants.caste[selected]!] ?? 'Ant'}, ${TASK_NAMES[ants.task[selected]!] ?? 'no job yet'}`,
      ),
    )

    const where = document.createElement('p')
    where.className = 'inspector-where'
    where.textContent =
      `${depth.toFixed(1)} cm down` +
      (carrying === '' ? '' : `, carrying ${carrying}`) +
      `, ${(ants.ageTicks[selected]! / colony.sim.clock.ticksPerDay).toFixed(0)} days old`

    const doing = document.createElement('p')
    doing.className = 'inspector-rule'
    doing.textContent = rule.summary

    const cite = document.createElement('p')
    cite.className = 'inspector-cite'
    cite.textContent = `${TAG_WORDS[rule.tag]} [${rule.tag}]. ${rule.citation}. Details in SCIENCE.md, section ${rule.section}.`

    const close = document.createElement('button')
    close.type = 'button'
    close.className = 'linkish'
    close.textContent = 'Stop following'
    close.addEventListener('click', () => {
      selected = -1
    })

    inspector.append(title, where, doing, cite)
    if (rule.caveat !== undefined && rule.caveat !== '—') {
      const caveat = document.createElement('p')
      caveat.className = 'inspector-caveat'
      caveat.textContent = rule.caveat
      inspector.append(caveat)
    }
    inspector.append(close)
  }

  let lastFrameMs = performance.now()
  let owedTicks = 0

  function frame(): void {
    // The clock is read here rather than taken from the animation frame's own timestamp.
    // That timestamp is when the frame began, which can be several milliseconds in the past
    // by the time this callback runs. Measuring a nine-millisecond budget from it meant the
    // budget was often spent before the first step, and the colony never moved.
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

    // The ants keep walking even while the model is paused mid-step, which is what makes a
    // slow speed watchable rather than a slideshow.
    motion.update(colony.sim.ants, elapsedSeconds)
    redraw()
    window.requestAnimationFrame(frame)
  }

  window.addEventListener('resize', redraw)
  redraw()
  window.requestAnimationFrame(frame)

  // A handle on the running colony, for the development server only. Vite removes this whole
  // block from a production build. It lets the simulation be driven and inspected from a
  // console during development without the page growing a debug surface that ships.
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

const CASTE_NAMES: Record<number, string> = {
  [Caste.Queen]: 'The queen',
  [Caste.Alate]: 'Winged queen',
  [Caste.Male]: 'Male',
  [Caste.MinorWorker]: 'Minor worker',
  [Caste.MajorWorker]: 'Major worker',
  [Caste.Callow]: 'Callow (newly hatched)',
}

const TASK_NAMES: Record<number, string> = {
  [Task.None]: 'no job yet',
  [Task.BroodCare]: 'caring for brood',
  [Task.Transfer]: 'moving seeds and brood',
  [Task.Excavator]: 'digging',
  [Task.Forager]: 'foraging',
}

const BURDEN_NAMES: Record<number, string> = {
  [Burden.SoilPellet]: 'a pellet of sand',
  [Burden.Seed]: 'a seed',
  [Burden.Brood]: 'a piece of brood',
  [Burden.Charcoal]: 'a fragment of charcoal',
  [Burden.Corpse]: 'a dead nestmate',
}

/**
 * The key to the picture.
 *
 * A reader cannot be expected to infer that a pale blob is a callow and a cream oval is a
 * larva. Where the drawing makes a distinction the model does not, the key says so: the
 * brood stages and the queen's size are both conventions of the renderer.
 */
function buildLegend(container: HTMLElement): void {
  const entries: readonly { colour: string; label: string }[] = [
    {
      colour: coloursFor(Caste.Queen).body,
      label: 'The queen. A colony has one, and never gets another.',
    },
    {
      colour: CASTE_COLOURS[Caste.MinorWorker]!.body,
      label: 'Minor worker, 6.35 mm long. Most of the colony.',
    },
    {
      colour: CASTE_COLOURS[Caste.MajorWorker]!.body,
      label: 'Major worker, 9.52 mm long. About one in 14, and they crack seeds.',
    },
    {
      colour: CASTE_COLOURS[Caste.Callow]!.body,
      label: 'Callow, a newly hatched worker. It darkens over its first days.',
    },
    {
      colour: BURDEN_COLOURS[Burden.SoilPellet]!,
      label: 'A pellet of sand on its way up and out.',
    },
    { colour: BURDEN_COLOURS[Burden.Seed]!, label: 'A seed. Harvester ants live on seeds.' },
    { colour: DEFAULT_THEME.egg, label: 'Eggs, larvae and pupae, kept in the deep chambers.' },
    { colour: DEFAULT_THEME.seed, label: 'The seed store, in chambers 20 to 80 cm down.' },
    {
      colour: '#3f7d6a',
      label: 'Trail scent on the ground, laid by foragers walking home. Nobody draws the trails.',
    },
  ]

  const list = document.createElement('ul')
  list.className = 'legend-list'
  for (const entry of entries) {
    const item = document.createElement('li')
    const swatch = document.createElement('span')
    swatch.className = 'swatch'
    swatch.style.background = entry.colour
    item.append(swatch, document.createTextNode(entry.label))
    list.append(item)
  }

  const slice = document.createElement('p')
  slice.className = 'legend-caveat'
  slice.textContent =
    'Real shafts spiral down and are 4 to 6 cm wide. The left-hand view cuts through one like a knife through a cake, so you see a slice of the nest rather than a flattened map of it.'

  const caveat = document.createElement('p')
  caveat.className = 'legend-caveat'
  caveat.textContent =
    'Three things here are drawing conventions, not model output. Ants on the ground are drawn far larger than life, because at true scale a worker would be a fiftieth of a pixel, so use the scale bar for distance. The queen is drawn larger than her workers, but nobody has published her body length. And brood is counted per chamber rather than tracked one by one, so which dot is an egg and which a larva follows the colony’s overall mix. Where each ant is, what it carries and how many seeds a chamber holds all come straight from the model.'

  container.replaceChildren(list, slice, caveat)
}

startThreshold()
