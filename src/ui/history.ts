/**
 * The colony's history: workers, brood and stored seed, one reading a simulated day, drawn as
 * three small charts that share a time axis.
 *
 * Three charts rather than one, because the three are counted in different units and differ
 * tenfold in size: on one axis the brood would be a flat line under the seed store. Each is
 * a single line, so each is named by its own title and needs no legend. Pointing at any of the
 * three reads out all three on that day, and the same readings are in the table under them.
 *
 * It reads the colony's summary and writes nothing to the model.
 */

import { formatDate } from './hud.js'
import type { Colony, ColonySummary } from '../core/sim/colony.js'

const SVG = 'http://www.w3.org/2000/svg'

/** Height of one chart's plot, in CSS pixels. */
const PLOT_HEIGHT = 46

/** Real milliseconds between redraws. The model can add sixteen days a second; the eye cannot. */
const REDRAW_MS = 400

/** Most points drawn per line. Past this, days are thinned evenly; the table keeps every month. */
const MAX_POINTS = 360

interface Sample {
  readonly day: number
  readonly date: string
  readonly month: number
  /** The first reading in its month, for the table. */
  readonly monthStart: boolean
  /** The colony year this day falls in, for the axis. */
  readonly colonyYear: number
  readonly values: readonly number[]
}

interface Series {
  readonly label: string
  readonly read: (summary: ColonySummary) => number
}

const SERIES: readonly Series[] = [
  { label: 'Workers', read: (s) => s.workers },
  { label: 'Brood', read: (s) => Math.round(s.brood) },
  { label: 'Seeds in store', read: (s) => Math.round(s.seedsStored) },
]

interface Row {
  readonly value: HTMLSpanElement
  readonly svg: SVGSVGElement
  readonly base: SVGLineElement
  readonly area: SVGPathElement
  readonly line: SVGPathElement
  readonly top: SVGTextElement
  readonly cross: SVGLineElement
  readonly dot: SVGCircleElement
  /** The value at the top of the plot, as last drawn. */
  topValue: number
}

/** Where a value sits in a plot whose top is `top`: 2 px of air above, the baseline below. */
function plotY(value: number, top: number): number {
  return PLOT_HEIGHT - 1.5 - (value / top) * (PLOT_HEIGHT - 6)
}

export class ColonyHistory {
  private readonly samples: Sample[] = []
  private readonly rows: Row[] = []
  private readonly years: HTMLDivElement
  private readonly tip: HTMLDivElement
  private readonly table: HTMLTableSectionElement
  private readonly tableHolder: HTMLDetailsElement
  private lastDrawMs = -Infinity
  private lastTableLength = -1
  /** Index into `samples` the reader is pointing at, or -1. */
  private hover = -1

  constructor(container: HTMLElement) {
    const charts = document.createElement('div')
    charts.className = 'history-charts'
    charts.tabIndex = 0
    charts.setAttribute(
      'aria-label',
      'Workers, brood and seeds in store over time. Use the left and right arrow keys to read a day.',
    )

    for (const series of SERIES) {
      const row = document.createElement('div')
      row.className = 'history-row'
      const head = document.createElement('p')
      head.className = 'history-head'
      const label = document.createElement('span')
      label.className = 'history-label'
      label.textContent = series.label
      const value = document.createElement('span')
      value.className = 'history-value'
      head.append(label, value)

      const svg = document.createElementNS(SVG, 'svg')
      svg.classList.add('history-plot')
      svg.setAttribute('aria-hidden', 'true')
      svg.setAttribute('height', String(PLOT_HEIGHT))
      const base = svgEl('line', 'history-base')
      const area = svgEl('path', 'history-area')
      const line = svgEl('path', 'history-line')
      const top = svgEl('text', 'history-tick')
      const cross = svgEl('line', 'history-cross')
      const dot = svgEl('circle', 'history-dot')
      dot.setAttribute('r', '4')
      base.setAttribute('x1', '0')
      base.setAttribute('y1', String(PLOT_HEIGHT - 1.5))
      base.setAttribute('y2', String(PLOT_HEIGHT - 1.5))
      top.setAttribute('x', '0')
      top.setAttribute('y', '8')
      cross.setAttribute('y1', '0')
      cross.setAttribute('y2', String(PLOT_HEIGHT))
      svg.append(base, area, line, top, cross, dot)
      row.append(head, svg)
      charts.append(row)
      this.rows.push({ value, svg, base, area, line, top, cross, dot, topValue: 1 })
    }

    this.years = document.createElement('div')
    this.years.className = 'history-years'
    this.years.setAttribute('aria-hidden', 'true')
    charts.append(this.years)

    this.tip = document.createElement('div')
    this.tip.className = 'history-tip'
    this.tip.hidden = true
    charts.append(this.tip)

    this.tableHolder = document.createElement('details')
    this.tableHolder.className = 'history-table'
    const summary = document.createElement('summary')
    summary.textContent = 'As a table, month by month'
    const table = document.createElement('table')
    const thead = document.createElement('thead')
    const headRow = document.createElement('tr')
    for (const text of ['Date', ...SERIES.map((s) => s.label)]) {
      const th = document.createElement('th')
      th.scope = 'col'
      th.textContent = text
      headRow.append(th)
    }
    thead.append(headRow)
    this.table = document.createElement('tbody')
    table.append(thead, this.table)
    this.tableHolder.append(summary, table)

    container.replaceChildren(charts, this.tableHolder)

    charts.addEventListener('pointermove', (event) => {
      const rect = this.rows[0]!.svg.getBoundingClientRect()
      this.pointAt((event.clientX - rect.left) / Math.max(1, rect.width))
    })
    charts.addEventListener('pointerleave', () => this.setHover(-1))
    charts.addEventListener('blur', () => this.setHover(-1))
    charts.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const last = this.samples.length - 1
      const from = this.hover < 0 ? last : this.hover
      const step = Math.max(1, Math.round(this.samples.length / 60))
      const next = from + (event.key === 'ArrowLeft' ? -step : step)
      this.setHover(Math.min(last, Math.max(0, next)))
    })
    this.tableHolder.addEventListener('toggle', () => this.renderTable())
  }

  /**
   * Takes a reading if a new simulated day has begun, and redraws now and then, or now if
   * `force` is set.
   */
  update(colony: Colony, force = false): void {
    const { clock } = colony.sim
    const day = clock.daysElapsed
    const last = this.samples.at(-1)
    if (last === undefined || last.day !== day) {
      const summary = colony.summary()
      const date = clock.date()
      this.samples.push({
        day,
        date: formatDate(date),
        month: date.month,
        monthStart: last === undefined || last.month !== date.month,
        colonyYear: date.colonyYear,
        values: SERIES.map((s) => s.read(summary)),
      })
    }
    const now = performance.now()
    if (!force && now - this.lastDrawMs < REDRAW_MS) return
    this.lastDrawMs = now
    this.draw()
  }

  private draw(): void {
    const n = this.samples.length
    if (n === 0) return
    const width = this.rows[0]!.svg.getBoundingClientRect().width
    if (width < 1) return
    const first = this.samples[0]!.day
    const span = Math.max(1, this.samples[n - 1]!.day - first)
    const x = (day: number): number => ((day - first) / span) * width
    const stride = Math.max(1, Math.ceil(n / MAX_POINTS))

    SERIES.forEach((_, s) => {
      const row = this.rows[s]!
      let max = 0
      for (const sample of this.samples) max = Math.max(max, sample.values[s]!)
      const top = niceCeiling(max)
      row.topValue = top
      const point = (i: number): string => {
        const sample = this.samples[i]!
        return `${x(sample.day).toFixed(1)},${plotY(sample.values[s]!, top).toFixed(1)}`
      }
      const points: string[] = []
      for (let i = 0; i < n; i += stride) points.push(point(i))
      if ((n - 1) % stride !== 0) points.push(point(n - 1))
      // A single reading is drawn as a level line, not a point nobody can see.
      if (n === 1)
        points.push(`${width.toFixed(1)},${plotY(this.samples[0]!.values[s]!, top).toFixed(1)}`)
      const d = 'M' + points.join('L')
      const floor = PLOT_HEIGHT - 1.5
      row.line.setAttribute('d', d)
      row.area.setAttribute('d', `${d}L${width.toFixed(1)},${floor}L0,${floor}Z`)
      row.svg.setAttribute('viewBox', `0 0 ${width} ${PLOT_HEIGHT}`)
      row.base.setAttribute('x2', String(width))
      row.top.textContent = top.toLocaleString('en-GB')
    })

    // Year marks along the bottom, at the first day of each colony year after the first.
    const marks: HTMLSpanElement[] = []
    let year = this.samples[0]!.colonyYear
    for (const sample of this.samples) {
      if (sample.colonyYear === year) continue
      year = sample.colonyYear
      const mark = document.createElement('span')
      mark.textContent = 'Year ' + String(year + 1)
      mark.style.left = `${((x(sample.day) / width) * 100).toFixed(2)}%`
      marks.push(mark)
    }
    if (marks.length === 0) {
      const mark = document.createElement('span')
      mark.textContent = this.samples[0]!.date + ' to now'
      mark.style.left = '0'
      marks.push(mark)
    }
    this.years.replaceChildren(...marks)

    this.showValues()
    if (this.tableHolder.open) this.renderTable()
  }

  private pointAt(fraction: number): void {
    const n = this.samples.length
    if (n === 0) return
    const first = this.samples[0]!.day
    const span = Math.max(1, this.samples[n - 1]!.day - first)
    const target = first + Math.min(1, Math.max(0, fraction)) * span
    // Days are recorded in order, but a slow frame can skip one, so the nearest is searched for.
    let lo = 0
    let hi = n - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (this.samples[mid]!.day < target) lo = mid + 1
      else hi = mid
    }
    const before = Math.max(0, lo - 1)
    const nearer =
      Math.abs(this.samples[before]!.day - target) < Math.abs(this.samples[lo]!.day - target)
        ? before
        : lo
    this.setHover(nearer)
  }

  private setHover(index: number): void {
    this.hover = index
    this.showValues()
  }

  /** The headline values: today's, or the day being pointed at, with the crosshair on it. */
  private showValues(): void {
    const n = this.samples.length
    if (n === 0) return
    const index = this.hover >= 0 && this.hover < n ? this.hover : n - 1
    const sample = this.samples[index]!
    const width = this.rows[0]!.svg.getBoundingClientRect().width
    const first = this.samples[0]!.day
    const span = Math.max(1, this.samples[n - 1]!.day - first)
    const cx = ((sample.day - first) / span) * width
    const pointing = this.hover >= 0

    SERIES.forEach((_, s) => {
      const row = this.rows[s]!
      row.value.textContent = sample.values[s]!.toLocaleString('en-GB')
      const cy = plotY(sample.values[s]!, row.topValue)
      row.cross.setAttribute('x1', String(cx))
      row.cross.setAttribute('x2', String(cx))
      row.cross.style.visibility = pointing ? 'visible' : 'hidden'
      row.dot.setAttribute('cx', String(cx))
      row.dot.setAttribute('cy', String(cy))
      row.dot.style.visibility = pointing ? 'visible' : 'hidden'
    })

    this.tip.hidden = !pointing
    if (pointing) {
      this.tip.textContent = sample.date
      this.tip.style.left = `${((cx / Math.max(1, width)) * 100).toFixed(2)}%`
    }
  }

  private renderTable(): void {
    if (!this.tableHolder.open) return
    const rows = this.samples.filter((s) => s.monthStart)
    if (rows.length === this.lastTableLength) return
    this.lastTableLength = rows.length
    this.table.replaceChildren(
      ...rows.reverse().map((sample) => {
        const tr = document.createElement('tr')
        const th = document.createElement('th')
        th.scope = 'row'
        th.textContent = sample.date
        tr.append(th)
        for (const value of sample.values) {
          const td = document.createElement('td')
          td.textContent = value.toLocaleString('en-GB')
          tr.append(td)
        }
        return tr
      }),
    )
  }
}

function svgEl<K extends keyof SVGElementTagNameMap>(
  name: K,
  className: string,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS(SVG, name)
  el.classList.add(className)
  return el
}

/** A round number at or above `value`, for the top of an axis: 1, 2 or 5 times a power of ten. */
export function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const power = 10 ** Math.floor(Math.log10(value))
  for (const step of [1, 2, 5, 10]) {
    if (step * power >= value) return step * power
  }
  return 10 * power
}
