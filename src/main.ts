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
import { antBodyFor, bodySizesFor } from './render/body-sizes.js'
import { PHEROMONES } from './render/pheromones.js'
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
import { Timelapse, WATCH_SECONDS_PER_DAY } from './ui/pace.js'
import { ColonyDiary } from './ui/diary.js'
import { Moments } from './ui/moments.js'
import { intruderPresent } from './core/systems/alarm.js'
import { ColonyHistory } from './ui/history.js'
import type { Moment, MomentTarget } from './ui/moments.js'
import type { DiaryEntry } from './ui/diary.js'
import type { ColonySummary } from './core/sim/colony.js'
import {
  currentTheme,
  initTheme,
  nestThemeFor,
  onThemeChange,
  themeToggleLabel,
  toggleTheme,
} from './ui/theme.js'
import type { NestViewport } from './render/nest-view.js'
import type { BodySizes } from './render/body-sizes.js'
import type { PheromoneId } from './render/pheromones.js'
import type { BroodInvestmentValue } from './core/systems/demography.js'

initTheme()

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
 * How fast the colony runs. Speed changes how many steps run, never their size.
 *
 * The first is the time-lapse (ui/pace.ts), which has no fixed rate. The rest are simulated
 * days per real second, labelled in days rather than multipliers, because "16x" says nothing
 * about what a reader is about to see.
 */
const SPEEDS: readonly { label: string; title: string; daysPerSecond: number | null }[] = [
  {
    label: 'Time-lapse',
    title: 'A day takes 30 seconds while something is happening, and skips ahead while nothing is',
    daysPerSecond: null,
  },
  { label: '1 day/30 s', title: 'One simulated day every 30 seconds', daysPerSecond: 1 / 30 },
  { label: '1 day/5 s', title: 'One simulated day every 5 seconds', daysPerSecond: 0.2 },
  { label: '1 day/s', title: 'One simulated day every second', daysPerSecond: 1 },
  { label: '16 days/s', title: 'Sixteen simulated days every second', daysPerSecond: 16 },
]

/**
 * The speed a visitor starts at: the time-lapse.
 *
 * Somebody who opens "Watch a colony" wants to see a colony begin, the way they would watch an
 * ant farm: the queen digging her shaft over about a week, laying, her brood growing, her first
 * daughters hatching and starting to dig and forage. At a fixed day a second the digging is over
 * in seconds; at a fixed thirty seconds a day the first worker is nearly half an hour away.
 */
const DEFAULT_SPEED = 0

/** Milliseconds of simulation allowed per frame. Past this the picture slows, not the model. */
const FRAME_BUDGET_MS = 9

/** How quickly the camera catches up with where it has been told to look, per second. */
const CAMERA_EASE_PER_SECOND = 5

/**
 * Centimetres of depth the ant-scale camera shows. About twenty body lengths of a worker, close
 * enough to watch the queen dig and see her eggs, with her chamber in the same picture.
 */
const WORK_SPAN_CM = 16

/** Centimetres of depth shown when watching the ground round the entrance, as for a flight. */
const ENTRANCE_SPAN_CM = 20

/**
 * Simulated days per real second while a short moment is watched: a simulated hour in about
 * twelve seconds. A mating flight is over within the hour, which the time-lapse's day in thirty
 * seconds would show for about a second.
 */
const WATCH_SLOW_DAYS_PER_SECOND = 1 / 300

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

/** Diary entries shown before the rest fold away under "Earlier entries". */
const DIARY_SHOWN = 6

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

/** Largest seed the colony's random streams take. */
const MAX_SEED = 2 ** 31 - 1

/**
 * The seed asked for in the address, as in `?watch&seed=123`, or null. Only a whole number from
 * 1 to MAX_SEED counts; anything else is ignored and a fresh colony is drawn.
 */
function seedFromAddress(): number | null {
  const raw = new URLSearchParams(window.location.search).get('seed')
  if (raw === null || !/^\d+$/.test(raw)) return null
  const seed = Number(raw)
  return seed >= 1 && seed <= MAX_SEED ? seed : null
}

/** The address that opens this colony again, from its first day. */
function colonyLink(seed: number): string {
  return `${window.location.origin}${window.location.pathname}?watch&seed=${seed}`
}

function startSimulator(): void {
  // A colony seed drawn once per visit, so two people who open the page do not watch the
  // same nest, unless the address names one. It is printed in the panel with a link that opens
  // the same colony again, and the headless runner reproduces it exactly.
  const seed = seedFromAddress() ?? (Math.floor(Math.random() * MAX_SEED) || 1)
  const colony = new Colony({ seed, params })
  const motion = new AntMotion(colony.sim.ants.capacity)
  const totalValues = counts.A + counts.B + counts.C

  app!.innerHTML = `
    <main class="layout">
      <section class="stage">
        <div class="stage-core">
        <div class="views">
          <div class="view view--nest">
            <canvas
              id="slice"
              aria-label="The nest, as a vertical slice through the sand, with the ground above it"
            ></canvas>
            <p class="view-label">The nest, with the ground above</p>
            <div class="moment" id="moment" role="status" hidden>
              <span class="moment-dot" aria-hidden="true"></span>
              <p class="moment-title" id="moment-title"></p>
              <button class="moment-watch" id="moment-watch" type="button">Watch</button>
              <button class="moment-close" id="moment-close" type="button" aria-label="Dismiss">
                <span aria-hidden="true">×</span>
              </button>
            </div>
            <figure class="map-inset">
              <canvas id="ground" aria-label="The foraging range, from above"></canvas>
              <figcaption class="map-inset-label">The foraging range, from above</figcaption>
            </figure>
          </div>
        </div>
        <div class="stage-bar">
          <div class="view-tools" id="cameras"></div>
          <p class="stage-note">
            <span class="note-pointer">
              Scroll to zoom and drag to move. Click an ant to follow her and see what she is
              doing and which study says so.
            </span>
            <span class="note-touch">Pinch to zoom, drag to move, tap an ant to follow her.</span>
          </p>
        </div>
        </div>
      </section>
      <aside class="panel">
        <div class="panel-core">
        <header class="panel-head">
          <h1>Anthill</h1>
          <p class="subtitle"><i>Pogonomyrmex badius</i>. ${params.species.habitat}.</p>
          <div class="clock">
            <div>
              <p class="date" id="date"></p>
              <p class="phase" id="phase"></p>
            </div>
            <button class="control-pause" id="pause" type="button" data-state="running">
              <span class="control-pause-label">Pause</span>
              <span class="control-pause-icon" aria-hidden="true"></span>
            </button>
          </div>
        </header>
        <section class="panel-section">
          <h2 class="panel-label">Right now</h2>
          <p class="now-weather" id="weather"></p>
          <p class="now-text" id="now"></p>
          <p class="now-food" id="food"></p>
        </section>
        <section class="panel-section">
          <h2 class="panel-label">Speed</h2>
          <div class="controls controls--segmented controls--auto" id="speeds"></div>
          <p class="control-note" id="pace"></p>
        </section>
        <section class="panel-section">
          <h2 class="panel-label">At a glance</h2>
          <div class="hud-grid glance" id="glance"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-label">Over time</h2>
          <div class="history" id="history"></div>
        </section>
        <div class="inspector" id="inspector" hidden></div>
        <section class="panel-section">
          <h2 class="panel-label">Colony diary</h2>
          <div id="diary" aria-live="polite"></div>
        </section>
        <section class="panel-section">
          <h2 class="panel-label">What the queen's eggs become</h2>
          <div class="controls controls--segmented controls--three" id="levers"></div>
          <p class="control-note" id="lever-note"></p>
        </section>
        <details class="legend" id="legend">
          <summary>What am I looking at?</summary>
          <div class="legend-body" id="legend-body"></div>
        </details>
        <details class="legend behind" id="behind">
          <summary>Behind the picture</summary>
          <div class="legend-body behind-body">
            <section>
              <h3 class="panel-label">Scents the ants follow</h3>
              <ul class="scent-list" id="scents"></ul>
            </section>
            <div class="readouts">
              <p class="readouts-intro">
                The grey note under each figure is what real colonies show. A figure turns red
                when the model is outside that.
              </p>
              <div id="hud"></div>
            </div>
            <p class="provenance">
              This run uses seed <code>${seed}</code>, so it can be repeated exactly:
              <a href="${colonyLink(seed)}">this link</a> opens the same colony from its first
              day, and it runs the same step for step unless the eggs lever is changed. Of the
              model's ${totalValues} values, ${counts.A} are measured in this species,
              ${counts.B} are borrowed from other ants and ${counts.C} are invented.
            </p>
            <div class="foot-links">
              <button class="linkish" id="show-sources" type="button">Sources and evidence</button>
              <button class="linkish" id="show-instrument" type="button">Run your own study</button>
            </div>
          </div>
        </details>
        <footer class="panel-foot">
          <div class="foot-links">
            <button class="linkish" id="copy-link" type="button">Copy a link to this colony</button>
            <button class="linkish" id="theme-toggle" type="button"></button>
          </div>
        </footer>
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
  const nowEl = app!.querySelector<HTMLParagraphElement>('#now')!
  const foodEl = app!.querySelector<HTMLParagraphElement>('#food')!
  const stillWeather = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const weatherEl = app!.querySelector<HTMLParagraphElement>('#weather')!
  const paceEl = app!.querySelector<HTMLParagraphElement>('#pace')!
  const glanceEl = app!.querySelector<HTMLDivElement>('#glance')!
  const diaryEl = app!.querySelector<HTMLDivElement>('#diary')!
  const behind = app!.querySelector<HTMLDetailsElement>('#behind')!
  const momentEl = app!.querySelector<HTMLDivElement>('#moment')!
  const momentTitle = app!.querySelector<HTMLParagraphElement>('#moment-title')!
  const momentWatch = app!.querySelector<HTMLButtonElement>('#moment-watch')!
  const momentClose = app!.querySelector<HTMLButtonElement>('#moment-close')!

  const nestView = new NestView(sliceCanvas, nestThemeFor(currentTheme()))
  const surfaceView = new SurfaceView(groundCanvas)

  // The slice draws its own sky and ruler, so it is told when the theme changes. The next
  // frame redraws it; nothing else needs to happen.
  const themeButton = app!.querySelector<HTMLButtonElement>('#theme-toggle')!
  themeButton.textContent = themeToggleLabel()
  themeButton.addEventListener('click', () => toggleTheme())

  // A link that opens this same colony, for sharing one worth watching.
  const copyButton = app!.querySelector<HTMLButtonElement>('#copy-link')!
  copyButton.addEventListener('click', () => {
    const link = colonyLink(seed)
    const say = (text: string): void => {
      copyButton.textContent = text
      window.setTimeout(() => (copyButton.textContent = 'Copy a link to this colony'), 2500)
    }
    // The clipboard is refused on some pages and in some browsers; the link is shown instead.
    if (navigator.clipboard === undefined) {
      say(link)
      return
    }
    navigator.clipboard
      .writeText(link)
      .then(() => say('Link copied'))
      .catch(() => say(link))
  })
  onThemeChange((theme) => {
    nestView.setTheme(nestThemeFor(theme))
    themeButton.textContent = themeToggleLabel()
  })

  // Which scents are drawn. Both start on, because they are half of what the colony is doing.
  let showDiggingScent = true
  let showTrails = true
  let showAlarm = true

  let speedIndex = DEFAULT_SPEED
  let paused = false
  let camera: Camera = 'work'
  /**
   * How much depth the slice shows. Starts at ant scale: a founding chamber is 1 cm high and
   * a worker 6.35 mm long, so this is about forty body lengths of nest.
   */
  let spanCm = WORK_SPAN_CM
  let freeTopCm = 0
  let freeCentreCm = 0
  let selected = -1
  const startedAtMs = performance.now()

  // Pause sits beside the date, where a person looks when they want the colony to stop.
  const pauseButton = app!.querySelector<HTMLButtonElement>('#pause')!
  const pauseLabel = pauseButton.querySelector<HTMLSpanElement>('.control-pause-label')!
  pauseButton.addEventListener('click', () => {
    paused = !paused
    pauseLabel.textContent = paused ? 'Resume' : 'Pause'
    pauseButton.dataset.state = paused ? 'paused' : 'running'
    pauseButton.ariaPressed = String(paused)
  })

  const speedThumb = addThumb(speedBar)
  const speedButtons: HTMLButtonElement[] = []
  SPEEDS.forEach((speed, index) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = speed.label
    button.title = speed.title
    button.addEventListener('click', () => {
      speedIndex = index
      for (const [i, b] of speedButtons.entries()) b.ariaPressed = String(i === index)
      syncThumb(speedThumb, button)
    })
    speedButtons.push(button)
    speedBar.append(button)
  })
  speedButtons[speedIndex]!.ariaPressed = 'true'
  syncThumb(speedThumb, speedButtons[speedIndex]!)

  // Camera. The default is ant scale, around the queen. One click shows the whole nest.
  const cameraButtons: HTMLButtonElement[] = []
  const CAMERAS: readonly { label: string; value: Camera; title: string }[] = [
    {
      label: 'Follow the ants',
      value: 'work',
      title: 'Close up, around the queen and her brood, or the ant you picked',
    },
    { label: 'Whole nest', value: 'nest', title: 'Everything dug so far, to scale' },
  ]
  CAMERAS.forEach((option) => {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = option.label
    button.title = option.title
    button.addEventListener('click', () => {
      camera = option.value
      if (option.value === 'work') spanCm = WORK_SPAN_CM
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
  const leverThumb = addThumb(leverBar)
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
    syncThumb(leverThumb, leverButtons[INVESTMENTS.indexOf(chosen)]!)
    leverNote.textContent = `${chosen.note} Adults keep their jobs whatever you choose, because a forager in this species never goes back to work inside.`
  }
  syncLever()

  buildScentKey(app!.querySelector<HTMLUListElement>('#scents')!, (id, on) => {
    if (id === 'building') showDiggingScent = on
    if (id === 'recruitment') showTrails = on
    if (id === 'alarm') showAlarm = on
  })
  buildLegend(app!.querySelector<HTMLDivElement>('#legend-body')!)

  // ---- The time-lapse, the diary and the "Right now" card ----

  const timelapse = new Timelapse()
  const history = new ColonyHistory(app!.querySelector<HTMLDivElement>('#history')!)
  const diary = new ColonyDiary(params)

  const diaryList = (entries: readonly DiaryEntry[], fresh: ReadonlySet<string>): HTMLElement => {
    const list = document.createElement('ol')
    list.className = 'diary'
    for (const entry of entries) {
      const item = document.createElement('li')
      if (fresh.has(entry.key)) item.className = 'is-new'
      const time = document.createElement('time')
      time.textContent = entry.date
      const text = document.createElement('p')
      text.textContent = entry.text
      item.append(time, text)
      list.append(item)
    }
    return list
  }

  let diaryKeysShown = new Set<string>()
  /** Newest first. Only entries not shown before get the arrival animation. */
  function renderDiary(): void {
    const newest = [...diary.entries].reverse()
    const fresh = new Set(newest.map((e) => e.key).filter((key) => !diaryKeysShown.has(key)))
    diaryKeysShown = new Set(newest.map((e) => e.key))
    const parts: HTMLElement[] = [diaryList(newest.slice(0, DIARY_SHOWN), fresh)]
    if (newest.length > DIARY_SHOWN) {
      const more = document.createElement('details')
      more.className = 'diary-more'
      more.open = diaryEl.querySelector('details')?.open === true
      const summary = document.createElement('summary')
      summary.textContent = 'Earlier entries (' + String(newest.length - DIARY_SHOWN) + ')'
      more.append(summary, diaryList(newest.slice(DIARY_SHOWN), fresh))
      parts.push(more)
    }
    diaryEl.replaceChildren(...parts)
  }
  diary.update(colony)
  renderDiary()

  function paceText(): string {
    if (paused) return 'Paused.'
    const chosen = SPEEDS[speedIndex]!
    if (chosen.daysPerSecond !== null) return chosen.title + '.'
    if (watching?.slow === true) {
      return 'Slowed right down while you watch. It speeds up again when this is over.'
    }
    return timelapse.skipping
      ? 'Skipping ahead, because nothing new is happening. It slows down again as soon as something does.'
      : 'A day takes ' +
          String(WATCH_SECONDS_PER_DAY) +
          ' seconds while something is happening, and skips ahead while nothing is.'
  }

  let nowShown = ''
  let foodShown = ''
  let weatherShown = ''
  let paceShown = ''
  let glanceShown = ''
  /** Text is only written when it changes, so the panel is not rebuilt sixty times a second. */
  function renderNow(summary: ColonySummary): void {
    const { now, food } = diary.describeNow(colony)
    if (now !== nowShown) nowEl.textContent = nowShown = now
    if (food !== foodShown) foodEl.textContent = foodShown = food
    const weather = diary.describeWeather(colony)
    if (weather !== weatherShown) weatherEl.textContent = weatherShown = weather
    const pace = paceText()
    if (pace !== paceShown) paceEl.textContent = paceShown = pace

    const tiles: readonly (readonly [string, string])[] = [
      ['Workers', String(summary.workers)],
      ['Brood', String(Math.round(summary.brood))],
      ['Seeds in store', String(Math.round(summary.seedsStored))],
      [
        'Nest depth',
        (summary.nestDepthCm < 10
          ? summary.nestDepthCm.toFixed(1)
          : String(Math.round(summary.nestDepthCm))) + ' cm',
      ],
    ]
    const glance = tiles.map((tile) => tile[1]).join('|')
    if (glance === glanceShown) return
    glanceShown = glance
    glanceEl.replaceChildren(
      ...tiles.map(([label, value]) => {
        const tile = document.createElement('div')
        tile.className = 'hud-tile'
        const labelEl = document.createElement('span')
        labelEl.className = 'hud-label'
        labelEl.textContent = label
        const valueEl = document.createElement('span')
        valueEl.className = 'hud-value'
        valueEl.textContent = value
        tile.append(labelEl, valueEl)
        return tile
      }),
    )
  }

  app!.querySelector('#show-sources')!.addEventListener('click', () => openSources('sources'))
  app!.querySelector('#show-instrument')!.addEventListener('click', () => openInstrument())

  // ---- Moments worth watching ----

  const moments = new Moments()
  /** The moment the banner is offering, or being watched. */
  let offered: Moment | null = null
  /** The moment the reader chose to watch, while it lasts. */
  let watching: Moment | null = null

  function syncMoment(): void {
    const shown = watching ?? offered
    momentEl.hidden = shown === null
    if (shown === null) return
    if (momentTitle.textContent !== shown.title) momentTitle.textContent = shown.title
    const label = watching === null ? 'Watch' : 'Stop watching'
    if (momentWatch.textContent !== label) momentWatch.textContent = label
    momentClose.hidden = watching !== null
  }

  function lookAt(target: MomentTarget): void {
    if (target.kind === 'map') return
    if (target.kind === 'ant') {
      selected = target.slot
      spanCm = WORK_SPAN_CM
      camera = 'work'
    } else if (target.kind === 'nest') {
      camera = 'nest'
    } else {
      selected = -1
      spanCm = ENTRANCE_SPAN_CM
      freeTopCm = -ENTRANCE_SPAN_CM * 0.45
      freeCentreCm = 0
      camera = 'free'
    }
    syncCameraButtons()
  }

  momentWatch.addEventListener('click', () => {
    if (watching !== null) {
      watching = null
    } else if (offered !== null) {
      watching = offered
      offered = null
      lookAt(watching.target)
    }
    syncMoment()
  })
  momentClose.addEventListener('click', () => {
    offered = null
    syncMoment()
  })

  /** Offers a new moment, and lets go of any that is over. Runs after the colony steps. */
  function updateMoments(): void {
    const fresh = moments.next(colony)
    if (fresh !== null && watching === null) offered = fresh
    if (offered !== null && !offered.live(colony)) offered = null
    if (watching !== null && !watching.live(colony)) watching = null
    syncMoment()
  }

  // ---- Zooming, dragging and picking an ant ----

  let lastViewport: NestViewport = { topCm: 0, spanCm, centreCm: 0 }
  let lastSliceSize = { width: 1, height: 1 }

  /** Zoom about a point on the screen, so the thing under it stays put. */
  function zoomAbout(clientX: number, clientY: number, factor: number): void {
    const rect = sliceCanvas.getBoundingClientRect()
    const at = NestView.unproject(
      lastViewport,
      rect.width,
      rect.height,
      clientX - rect.left,
      clientY - rect.top,
    )
    const next = Math.min(400, Math.max(3, spanCm * factor))
    const fraction = (at.depthCm - lastViewport.topCm) / lastViewport.spanCm
    freeTopCm = at.depthCm - fraction * next
    freeCentreCm = lastViewport.centreCm
    spanCm = next
    // The drag and the next pinch step read the viewport, so it is updated now rather than
    // on the next frame.
    lastViewport = { topCm: freeTopCm, spanCm, centreCm: freeCentreCm }
    camera = 'free'
    syncCameraButtons()
  }

  sliceCanvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault()
      zoomAbout(event.clientX, event.clientY, Math.exp(event.deltaY * 0.0015))
    },
    { passive: false },
  )

  // Every finger or mouse on the slice, by pointer. One pans; two pinch to zoom.
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchDistance = 0
  let dragged = false
  const fingerSpread = (): number => {
    const [a, b] = [...pointers.values()]
    return Math.hypot(a!.x - b!.x, a!.y - b!.y)
  }
  sliceCanvas.addEventListener('pointerdown', (event) => {
    if (pointers.size === 0) dragged = false
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2) {
      pinchDistance = fingerSpread()
      // A pinch is never a tap, whichever finger lifts first.
      dragged = true
    }
    sliceCanvas.setPointerCapture(event.pointerId)
  })
  sliceCanvas.addEventListener('pointermove', (event) => {
    const last = pointers.get(event.pointerId)
    if (last === undefined) return
    const dx = event.clientX - last.x
    const dy = event.clientY - last.y
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size >= 2) {
      const distance = fingerSpread()
      if (pinchDistance > 0 && distance > 0) {
        const [a, b] = [...pointers.values()]
        zoomAbout((a!.x + b!.x) / 2, (a!.y + b!.y) / 2, pinchDistance / distance)
      }
      pinchDistance = distance
      return
    }
    if (Math.abs(dx) + Math.abs(dy) > 3) dragged = true
    if (!dragged) return
    const pxPerCm = lastSliceSize.height / lastViewport.spanCm
    freeTopCm = lastViewport.topCm - dy / pxPerCm
    freeCentreCm = lastViewport.centreCm - dx / pxPerCm
    spanCm = lastViewport.spanCm
    lastViewport = { topCm: freeTopCm, spanCm, centreCm: freeCentreCm }
    camera = 'free'
    syncCameraButtons()
  })
  const release = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) return
    if (sliceCanvas.hasPointerCapture(event.pointerId)) {
      sliceCanvas.releasePointerCapture(event.pointerId)
    }
    if (pointers.size > 0 || dragged || event.type === 'pointercancel') return
    // A click, not a drag: pick the nearest ant to the pointer, and follow her.
    const rect = sliceCanvas.getBoundingClientRect()
    const at = NestView.unproject(
      lastViewport,
      rect.width,
      rect.height,
      event.clientX - rect.left,
      event.clientY - rect.top,
    )
    // A fingertip covers far more of the picture than a mouse pointer does.
    const reachPx = event.pointerType === 'touch' ? 24 : 0
    selected = nearestAnt(at.offsetCm, at.depthCm, reachPx)
    if (selected < 0) return
    camera = 'work'
    syncCameraButtons()
    redraw()
    inspector.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
  sliceCanvas.addEventListener('pointerup', release)
  sliceCanvas.addEventListener('pointercancel', release)

  function nearestAnt(offsetCm: number, depthCm: number, reachPx: number): number {
    const { ants } = colony.sim
    // Within a centimetre or so of the click, scaled with the zoom so a wide view is not
    // impossible to hit and a close one is not sloppy.
    const pxPerCm = lastSliceSize.height / lastViewport.spanCm
    const reach = Math.max(0.4, lastViewport.spanCm * 0.03, reachPx / pxPerCm)
    let best = -1
    let bestDistance = reach * reach
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i) || ants.domain[i] !== Domain.Nest) continue
      const spread = nestView.spreadOf(i)
      const dx = motion.drawnX(i) + spread.x - offsetCm
      const dy = motion.drawnY(i) + spread.y - depthCm
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
      // The ant a reader picked, while she is underground, and otherwise the queen.
      const { ants } = colony.sim
      const followed =
        selected >= 0 && ants.isAlive(selected) && ants.domain[selected] === Domain.Nest
          ? selected
          : colony.demography.queenSlot
      return NestView.frameWork(ants, motion, spanCm, followed)
    }
    return { topCm: freeTopCm, spanCm, centreCm: freeCentreCm }
  }

  /**
   * The viewport actually drawn: the one asked for, eased toward over a few frames.
   *
   * A camera that jumps to wherever it is told is the stutter this replaces. Free movement is
   * not eased, because a drag or a scroll that lags behind the hand feels broken, and a jump of
   * more than a screen is taken at once rather than swept through.
   */
  let easedViewport: NestViewport | null = null
  let lastEaseMs = performance.now()
  function easeViewport(target: NestViewport): NestViewport {
    const now = performance.now()
    const dt = Math.min(0.25, (now - lastEaseMs) / 1000)
    lastEaseMs = now
    const from = easedViewport
    if (
      camera === 'free' ||
      from === null ||
      Math.abs(target.topCm - from.topCm) > from.spanCm ||
      Math.abs(target.centreCm - from.centreCm) > from.spanCm * 2
    ) {
      easedViewport = target
      return target
    }
    const k = 1 - Math.exp(-CAMERA_EASE_PER_SECOND * dt)
    easedViewport = {
      topCm: from.topCm + (target.topCm - from.topCm) * k,
      spanCm: from.spanCm + (target.spanCm - from.spanCm) * k,
      centreCm: from.centreCm + (target.centreCm - from.centreCm) * k,
    }
    return easedViewport
  }

  function redraw(): void {
    const timeSeconds = (performance.now() - startedAtMs) / 1000
    const brood = colony.demography.brood
    const summary = colony.summary()
    const sizes = bodySizesFor(params, summary.workers)
    const sliceSize = fit(sliceCanvas)
    if (sliceSize !== null) {
      lastSliceSize = sliceSize
      lastViewport = easeViewport(viewportFor())
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
          sizes,
          showDiggingScent,
          labels: true,
          weather: {
            raining: colony.climate.isRaining(colony.sim.clock.date().dayFraction),
            overcast: colony.climate.day.sky !== 'clear',
            still: stillWeather,
          },
          surface: colony.surface,
          discDiameterCm:
            (params.nest.surfaceDiscDiameterCm.min + params.nest.surfaceDiscDiameterCm.max) / 2,
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
        {
          motion,
          timeSeconds,
          sizes,
          showTrails,
          alarm: showAlarm
            ? {
                intruder: intruderPresent(colony.sim, colony.alarm)
                  ? { x: colony.alarm.intruder[0]!, y: colony.alarm.intruder[1]! }
                  : undefined,
                responseRadiusM: params.alarm.responseRadiusM.value,
                alarmedIds: colony.alarm.alarmedIds,
              }
            : undefined,
          movedFromM:
            colony.relocation.moveStartDay >= 0
              ? {
                  x: -colony.relocation.moveDxCells * colony.surface.cellSizeM,
                  y: -colony.relocation.moveDyCells * colony.surface.cellSizeM,
                }
              : undefined,
        },
      )
    }

    // The readouts held against real colonies sit folded away under "Behind the picture", and
    // measuring the nest for them is not free, so they are only worked out while it is open.
    if (behind.open) {
      const measurement = measureNest(colony.nest, params)
      renderHud(hud, [
        { title: 'The colony', readings: colonyReadings(summary, params) },
        { title: 'Seeds', readings: seedReadings(summary, params) },
        {
          title: 'The nest',
          readings: nestReadings(measurement, params, summary.phase !== 'founding'),
        },
      ])
    }
    dateEl.textContent = formatDate(colony.sim.clock.date())
    phaseEl.textContent = describePhase(summary)
    renderNow(summary)
    renderInspector(sizes)
  }

  /** The card that appears when a reader clicks an ant. The citation is the point of it. */
  function renderInspector(sizes: BodySizes): void {
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
    // Her length in millimetres, at scale 1 pixel per millimetre.
    const lengthMm = antBodyFor(ants.caste[selected]!, ants.lengthMm[selected]!, sizes, 1).lengthPx
    where.textContent =
      `${lengthMm.toFixed(1)} mm long, ${depth.toFixed(1)} cm down` +
      (carrying === '' ? '' : `, carrying ${carrying}`) +
      `, ${(ants.ageTicks[selected]! / colony.sim.clock.ticksPerDay).toFixed(0)} days old`

    const doing = document.createElement('p')
    doing.className = 'inspector-rule'
    doing.textContent = rule.summary

    const cite = document.createElement('p')
    cite.className = 'inspector-cite'
    // The idle rule has no section, and "section —" reads as a bug.
    const detail = rule.section === '—' ? '' : ` Details in SCIENCE.md, section ${rule.section}.`
    cite.textContent = `${TAG_WORDS[rule.tag]} [${rule.tag}]. ${rule.citation}.${detail}`

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
      // The time-lapse watches every frame, even at a fixed speed, so switching back to it
      // picks up from what is happening now.
      const timelapseRate = timelapse.update(colony, elapsedSeconds)
      const watchRate = watching?.slow === true ? WATCH_SLOW_DAYS_PER_SECOND : timelapseRate
      const daysPerSecond = SPEEDS[speedIndex]!.daysPerSecond ?? watchRate
      owedTicks += daysPerSecond * elapsedSeconds * colony.sim.clock.ticksPerDay
      const deadline = now + FRAME_BUDGET_MS
      while (owedTicks >= 1 && performance.now() < deadline) {
        colony.step()
        owedTicks -= 1
        if (!colony.alive) break
      }
      // Whatever could not be afforded this frame is dropped rather than carried. Carrying
      // it turns one slow frame into a spiral of slower ones.
      if (owedTicks > colony.sim.clock.ticksPerDay) owedTicks = 0

      // A new diary entry is a moment worth seeing, so the time-lapse slows for it.
      if (diary.update(colony).length > 0) {
        timelapse.hold(colony)
        renderDiary()
      }
      updateMoments()
      history.update(colony)
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
        for (let d = 0; d < days; d += 1) {
          colony.run(colony.sim.clock.ticksPerDay)
          history.update(colony, d === days - 1)
        }
        redraw()
      },
      /** Centimetres of depth the ant-scale camera shows, for a screenshot at a chosen zoom. */
      zoom: (cm: number) => {
        spanCm = cm
        camera = 'work'
        syncCameraButtons()
        // Jump straight there. Easing runs on real time, which a hidden tab barely gives it.
        easedViewport = null
        redraw()
      },
      /** Points the camera at a place in the nest, for a screenshot of something specific. */
      lookAt: (offsetCm: number, depthCm: number, span: number) => {
        spanCm = span
        freeTopCm = depthCm - span / 2
        freeCentreCm = offsetCm
        camera = 'free'
        syncCameraButtons()
        easedViewport = null
        redraw()
      },
    }
    // ?watch&days=400 on the development server starts the colony that many days in, for
    // screenshots of a grown nest. Vite removes this with the rest of the block in production.
    const days = Number(new URLSearchParams(window.location.search).get('days') ?? 0)
    if (days > 0) {
      colony.run(colony.sim.clock.ticksPerDay * days)
      redraw()
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
  const { colony, brood, nest, seeds, discretisation } = params
  const young = bodySizesFor(params, 10)
  const mature = bodySizesFor(params, colony.meanMatureWorkers.value)
  const mm = (n: number): string => `${n.toFixed(n < 1 ? 2 : 1)} mm`

  const entries: readonly { colour: string; label: string }[] = [
    {
      colour: coloursFor(Caste.Queen).body,
      label: `The queen, ${colony.queenLengthMm.min} to ${colony.queenLengthMm.max} mm long, with a head ${colony.queenHeadwidthMm.value} mm wide and a broad thorax that still carries the scars of her wings. A colony has one, and never gets another.`,
    },
    {
      colour: CASTE_COLOURS[Caste.MinorWorker]!.body,
      label: `Minor worker, ${colony.minorWorkerLengthMm.value} mm long. Most of the colony. Her head is ${mm(young.minorHeadwidthMm)} wide in a young colony and ${mm(mature.minorHeadwidthMm)} in a mature one.`,
    },
    {
      colour: CASTE_COLOURS[Caste.MajorWorker]!.body,
      label: `Major worker, ${colony.majorWorkerLengthMm.value} mm long, with a head ${colony.majorHeadwidthMm.min} to ${colony.majorHeadwidthMm.max} mm wide. About one worker in ${Math.round(1 / colony.majorWorkerFraction.value)}. Majors speed up the opening of seeds.`,
    },
    {
      colour: CASTE_COLOURS[Caste.Callow]!.body,
      label: `Callow, a newly hatched worker. Pale, and not yet working, for her first ${brood.callowDurationDays.value} days.`,
    },
    {
      colour: CASTE_COLOURS[Caste.Male]!.body,
      label: `Male, winged, with a head ${colony.maleHeadwidthMm.value} mm wide. Raised in spring for the mating flight. Nobody has measured his length, so he is drawn at the queen's length scaled by head width.`,
    },
    {
      colour: CASTE_COLOURS[Caste.Alate]!.body,
      label: 'Winged queen, raised in spring for the mating flight. Drawn at the queen’s size.',
    },
    {
      colour: DEFAULT_THEME.egg,
      label: `Egg, about ${mm(young.eggLengthMm)} long, kept in clumps. Its size is borrowed from a related harvester ant.`,
    },
    {
      colour: DEFAULT_THEME.larva,
      label: `Larva, a curled grub up to about ${mm(young.matureLarvaLengthMm)} long when fully fed. Estimated: no one has measured one.`,
    },
    {
      colour: DEFAULT_THEME.pupa,
      label: `Pupa, already shaped like the ${mm(young.pupaLengthMm)} worker it will become.`,
    },
    {
      colour: DEFAULT_THEME.seed,
      label: `Stored seed, in chambers ${seeds.seedChamberDepthCm.min} to ${seeds.seedChamberDepthCm.max} cm down. Drawn ${mm(young.seedWidthMm)} wide, the widest seed a worker can open.`,
    },
    {
      colour: BURDEN_COLOURS[Burden.SoilPellet]!,
      label: 'A pellet of sand on its way up and out.',
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
  slice.textContent = `Real shafts spiral down in a helix ${nest.shaftHelixDiameterCm.min} to ${nest.shaftHelixDiameterCm.max} cm across, and the shaft itself is about ${nest.shaftBoreDiameterCm.value} cm wide. The left-hand view cuts through one like a knife through a cake, so you see a slice of the nest rather than a flattened map of it.`

  const caveat = document.createElement('p')
  caveat.className = 'legend-caveat'
  caveat.textContent = `In the nest, everything is drawn at its real size, so a worker fills most of a tunnel, as a real one does. Zoom in to see them. Several things are drawing conventions, not model output. The tunnels are traced as one smooth outline round the ${discretisation.nestCellSizeCm.value * 10} mm squares the model digs, so their corners are rounded, and the sand is darkened where the model says it is damp. The model puts each ant in the middle of a square and gives her no posture, so the picture draws each ant from the side, standing on the nearest floor or holding on to the nearest shaft wall, spreads out ants that share a square, and lets ants going up and ants going down pass on opposite walls of a shaft. The name tags on the queen, her brood and the seed store point at what the model has there. Brood is counted per chamber rather than one by one, so which dot is an egg and which a larva follows the colony’s overall mix. Above the nest the ground is seen from the side, showing the ants and seeds within a metre either side of the slice at their true size; the bare disc of sand, its charcoal and the grass round it are drawn, not modelled. When the camera is deep, a band across the top shows the ground at a smaller scale and says how much. In the map of the foraging range, ants are drawn far larger than life, because at true scale a worker would be a fiftieth of a pixel, so use its scale bar for distance. While the colony moves house, the map marks the nest it left and a dotted line along the trail to the new one, and the carriers on it walk in the model. Where each ant is, what it carries and how many seeds a chamber holds all come straight from the model.`

  container.replaceChildren(list, slice, caveat)
}

/**
 * The scent key: every chemical channel in SCIENCE.md section 8, in the colour it is drawn,
 * with a switch for each one the model simulates. The ones it does not simulate are listed
 * too, and say so.
 */
function buildScentKey(
  container: HTMLElement,
  onToggle: (id: PheromoneId, on: boolean) => void,
): void {
  container.replaceChildren(
    ...PHEROMONES.map((scent) => {
      const item = document.createElement('li')
      item.className = scent.simulated ? 'scent' : 'scent scent--absent'

      const swatch = document.createElement('span')
      swatch.className = 'scent-swatch'
      swatch.style.background = scent.colour

      const text = document.createElement('div')
      const name = document.createElement('p')
      name.className = 'scent-name'
      name.textContent = scent.name
      const where = document.createElement('span')
      where.className = 'scent-where'
      where.textContent = scent.where
      name.append(where)
      const what = document.createElement('p')
      what.className = 'scent-what'
      what.textContent = scent.what
      text.append(name, what)

      item.append(swatch, text)
      if (scent.simulated) {
        const toggle = document.createElement('input')
        toggle.type = 'checkbox'
        toggle.checked = true
        toggle.className = 'scent-toggle'
        toggle.ariaLabel = `Show the ${scent.name.toLowerCase()}`
        toggle.addEventListener('change', () => onToggle(scent.id, toggle.checked))
        item.append(toggle)
      }
      return item
    }),
  )
}

/**
 * The sliding selection behind a segmented control.
 *
 * One raised pill glides to the chosen option, rather than each option lighting up in place,
 * so a change of speed or of what the eggs become reads as one control moving. It follows the
 * chosen button's box whenever the control changes size.
 */
function addThumb(bar: HTMLElement): HTMLSpanElement {
  const thumb = document.createElement('span')
  thumb.className = 'seg-thumb'
  thumb.ariaHidden = 'true'
  bar.prepend(thumb)
  new ResizeObserver(() => {
    const chosen = bar.querySelector<HTMLButtonElement>('button[aria-pressed="true"]')
    if (chosen !== null) syncThumb(thumb, chosen)
  }).observe(bar)
  return thumb
}

function syncThumb(thumb: HTMLSpanElement, chosen: HTMLButtonElement): void {
  thumb.style.width = `${chosen.offsetWidth}px`
  thumb.style.transform = `translateX(${chosen.offsetLeft}px)`
  thumb.dataset.ready = 'true'
}

// A link that ends in ?watch opens straight onto a colony, for sharing and for screenshots.
if (new URLSearchParams(window.location.search).has('watch')) startSimulator()
else startThreshold()
