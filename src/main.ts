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
 *
 * **Drawing and stepping are separate clocks.** The ants are eased toward their simulated
 * positions every frame (see render/ant-motion.ts), so the picture is continuous even when
 * the model is taking one step a second. That is a property of the drawing only; delete it
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
import { colonyReadings, describePhase, formatDate, nestReadings, renderHud } from './ui/hud.js'
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
 * Labelled in days rather than in multipliers. "16x" says nothing about what a reader is
 * about to see; "16 days a second" says that the first workers are about three seconds
 * away.
 */
const SPEEDS: readonly { label: string; daysPerSecond: number }[] = [
  { label: '1 day/min', daysPerSecond: 1 / 60 },
  { label: '1 day/4s', daysPerSecond: 0.25 },
  { label: '1 day/s', daysPerSecond: 1 },
  { label: '4 days/s', daysPerSecond: 4 },
  { label: '16 days/s', daysPerSecond: 16 },
]

/**
 * The speed a visitor starts at.
 *
 * A day a second. The queen seals herself in, digs her founding shaft over the next few
 * seconds, lays, and her first daughters eclose about forty seconds in — which is roughly
 * how long someone will watch before deciding whether this is worth their time. Slower and
 * the first minute is a still picture; faster and the founding is over before it is seen.
 */
const DEFAULT_SPEED = 2

/** Milliseconds of simulation permitted per frame. Past this the picture slows, not the model. */
const FRAME_BUDGET_MS = 9

const INVESTMENTS: readonly {
  label: string
  value: BroodInvestmentValue
  note: string
}[] = [
  {
    label: 'Workers',
    value: BroodInvestment.Workers,
    note: 'Every egg is raised as a worker. The colony grows as fast as its foragers can feed the brood, and produces almost no winged reproductives.',
  },
  {
    label: 'Balanced',
    value: BroodInvestment.Balanced,
    note: 'Most eggs become workers. Once the colony is past 700 workers, a small share of the spring brood is raised into winged queens and males instead.',
  },
  {
    label: 'Alates',
    value: BroodInvestment.Alates,
    note: 'As much of the spring brood as the season allows is raised into winged queens and males. That is the colony reproducing, and it is paid for out of the fat its workers stored last autumn.',
  },
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

/** Camera modes for the slice. "Free" is whatever the reader has zoomed or dragged to. */
type Camera = 'work' | 'nest' | 'free'

function startSimulator(): void {
  // A colony seed drawn once per visit, so two people who open the page do not watch the
  // same nest. It is printed in the panel, so any run a person likes can be repeated here
  // or handed to the headless runner and reproduced exactly.
  const seed = Math.floor(Math.random() * 2 ** 31) || 1
  const colony = new Colony({ seed, params })
  const motion = new AntMotion(colony.sim.ants.capacity)

  app!.innerHTML = `
    <main class="layout">
      <section class="stage">
        <div class="views">
          <div class="view view--nest">
            <canvas id="slice"></canvas>
            <p class="view-label">nest, vertical slice</p>
            <div class="view-tools" id="cameras"></div>
          </div>
          <div class="view view--surface">
            <canvas id="ground"></canvas>
            <p class="view-label">ground, from above</p>
          </div>
        </div>
        <p class="stage-note">
          Scroll to zoom the slice, drag to move it. Click an ant to see the rule it is
          following. Real shafts are helices 4 to 6 cm across; the slice is a plane cut
          through one, not a flattened nest. The lines on the ground are not drawn: they are
          recruitment pheromone, left by foragers walking home.
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
        <p class="control-note" id="lever-note"></p>
        <div class="inspector" id="inspector" hidden></div>
        <details class="legend" id="legend">
          <summary>What am I looking at?</summary>
          <div class="legend-body" id="legend-body"></div>
        </details>
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
  const leverNote = app!.querySelector<HTMLParagraphElement>('#lever-note')!
  const cameraBar = app!.querySelector<HTMLDivElement>('#cameras')!
  const inspector = app!.querySelector<HTMLDivElement>('#inspector')!

  const nestView = new NestView(sliceCanvas)
  const surfaceView = new SurfaceView(groundCanvas)

  let speedIndex = DEFAULT_SPEED
  let paused = false
  let camera: Camera = 'work'
  /**
   * How much depth the slice shows. Starts at ant scale — a founding chamber is 1 cm high
   * and a worker 6.35 mm long, so this is about forty body lengths of nest.
   */
  let spanCm = 26
  let freeTopCm = 0
  let freeCentreCm = 0
  let selected = -1
  const startedAtMs = performance.now()

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

  // Camera. The default is ant scale, over the deepest work; one click gives the whole nest.
  const cameraButtons: HTMLButtonElement[] = []
  const CAMERAS: readonly { label: string; value: Camera; title: string }[] = [
    { label: 'Follow the ants', value: 'work', title: 'Ant scale, over the deepest digging' },
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
      syncLever()
    })
    leverButtons.push(button)
    leverBar.append(button)
  })

  function syncLever(): void {
    const chosen = INVESTMENTS.find((i) => i.value === colony.demography.investment)!
    for (const [i, b] of leverButtons.entries())
      b.ariaPressed = String(INVESTMENTS[i]!.value === colony.demography.investment)
    leverNote.textContent = `${chosen.note} It changes what the queen's eggs are raised into, and nothing else: a worker already alive is never reassigned, because in this species a forager never returns to inside work and no shortage recruits a replacement.`
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
      ...colonyReadings(summary, params),
      ...nestReadings(measurement, params, summary.workers, summary.phase !== 'founding'),
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
        `${CASTE_NAMES[ants.caste[selected]!] ?? 'ant'}, ${TASK_NAMES[ants.task[selected]!] ?? 'no task yet'}`,
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
    cite.textContent = `[${rule.tag}] ${rule.citation} · SCIENCE.md §${rule.section}`

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

    // The ants keep walking even while the model is paused mid-step, which is what makes a
    // slow speed watchable rather than a slideshow.
    motion.update(colony.sim.ants, elapsedSeconds)
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

const CASTE_NAMES: Record<number, string> = {
  [Caste.Queen]: 'The queen',
  [Caste.Alate]: 'Winged queen',
  [Caste.Male]: 'Male',
  [Caste.MinorWorker]: 'Minor worker',
  [Caste.MajorWorker]: 'Major worker',
  [Caste.Callow]: 'Callow, newly eclosed',
}

const TASK_NAMES: Record<number, string> = {
  [Task.None]: 'not yet working',
  [Task.BroodCare]: 'brood care',
  [Task.Transfer]: 'transfer work',
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
 * It exists because a reader cannot be expected to infer that a pale blob is a callow and a
 * cream oval is a larva. Where the drawing makes a distinction the model does not, this
 * says so — the brood stages and the queen's size are both conventions of the renderer.
 */
function buildLegend(container: HTMLElement): void {
  const entries: readonly { colour: string; label: string }[] = [
    {
      colour: coloursFor(Caste.Queen).body,
      label: 'The queen. One per colony, and there is never another.',
    },
    {
      colour: CASTE_COLOURS[Caste.MinorWorker]!.body,
      label: 'Minor worker, 6.35 mm. Most of the colony.',
    },
    {
      colour: CASTE_COLOURS[Caste.MajorWorker]!.body,
      label: 'Major worker, 9.52 mm. About one in fourteen; they crack seeds.',
    },
    {
      colour: CASTE_COLOURS[Caste.Callow]!.body,
      label: 'Callow: newly eclosed and still pale. It darkens over its first days.',
    },
    {
      colour: BURDEN_COLOURS[Burden.SoilPellet]!,
      label: 'A pellet of sand, on its way up and out.',
    },
    { colour: BURDEN_COLOURS[Burden.Seed]!, label: 'A seed. Seeds are what this species eats.' },
    { colour: DEFAULT_THEME.egg, label: 'Eggs, larvae and pupae, kept in the deep chambers.' },
    { colour: DEFAULT_THEME.seed, label: 'The seed store, in the chambers at 20 to 80 cm.' },
    {
      colour: '#3f7d6a',
      label: 'Recruitment pheromone on the ground. Not drawn: left by foragers walking home.',
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

  const caveat = document.createElement('p')
  caveat.className = 'legend-caveat'
  caveat.textContent =
    'Three things in this picture are the renderer’s doing rather than the model’s. On the ground, seen from above, the ants are drawn far larger than life: at a scale that fits a 20 metre foraging range on screen, a 6.35 mm worker is a fiftieth of a pixel. Use the scale bar for distances, and the nest slice — where body length is drawn true — for size. The queen is drawn larger than her daughters because she is larger, but no body length for a badius queen appears in the bibliography, so her size on screen is a convention. And the nest tracks brood as a count per chamber, not as individuals, so which glyph is an egg and which a larva is assigned in the colony’s current proportions. Everything else — where each ant is, what it carries, how many seeds are in that chamber — is the model’s.'

  container.replaceChildren(list, caveat)
}

startThreshold()
