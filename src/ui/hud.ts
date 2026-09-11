/**
 * The readouts.
 *
 * Every number here is in the units the source papers use, centimetres for depth and square
 * centimetres for chamber area, so what is on screen can be held against Tschinkel's
 * measurements without conversion. Where the model is outside the range the papers report,
 * the readout says so rather than presenting the figure bare.
 *
 * Each reading carries a short note written for somebody who has never read the papers.
 * The note says what a real colony shows, not what the model is doing, so a reader can see
 * the comparison without being told how to feel about it.
 */

import type { ColonySummary } from '../core/sim/colony.js'
import type { NestMeasurement } from '../core/state/nest.js'
import type { Params } from '../core/params/params.js'
import type { CalendarDate } from '../core/sim/clock.js'

export interface HudReading {
  readonly label: string
  readonly value: string
  /** What real colonies show, in plain words. */
  readonly expected?: string
  /** True when the value sits outside what the papers report. */
  readonly outOfRange?: boolean
  readonly tag?: 'A' | 'B' | 'C'
}

/** A titled group of readings: the colony, its seeds, its nest. */
export interface HudGroup {
  readonly title: string
  readonly readings: readonly HudReading[]
  /**
   * Tiles for the few figures a reader checks at a glance, rows for everything else. Rows by
   * default, because most readings need their note beside them more than they need size.
   */
  readonly layout?: 'tiles' | 'rows'
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/**
 * `compareToMature` is false while the queen is still sinking her founding shaft. A
 * half-dug nest is not outside what the papers report, it is unfinished, and flagging it
 * red before the colony has done anything teaches a reader to ignore the flag by the time it
 * means something.
 */
export function nestReadings(
  measurement: NestMeasurement,
  params: Params,
  compareToMature = true,
): HudReading[] {
  const depth = measurement.maxDepthCm
  const matureDepth = params.nest.matureDepthCm

  // Chamber cross-section in the slice, converted to the area it stands for, so the readout
  // is in the units Tschinkel reports.
  const chamberAreaCm2 =
    measurement.chamberRunPerDecile.reduce((a, b) => a + b, 0) *
    params.discretisation.sliceThicknessCm.value

  return [
    {
      label: 'Depth',
      value: `${depth.toFixed(0)} cm`,
      expected: `A mature nest is ${matureDepth.min} to ${matureDepth.max} cm deep`,
      outOfRange: compareToMature && depth > 0 && depth < params.nest.incipientDepthCm.min,
      tag: 'A',
    },
    {
      label: 'Chamber height',
      value: `${measurement.meanChamberHeightCm.toFixed(2)} cm`,
      expected: `Real chambers are about ${params.nest.chamberHeightCm.value.toFixed(1)} cm high, whatever their size`,
      outOfRange:
        compareToMature &&
        measurement.meanChamberHeightCm > 0 &&
        Math.abs(measurement.meanChamberHeightCm - params.nest.chamberHeightCm.value) > 0.5,
      tag: 'A',
    },
    {
      label: 'Chamber floor area',
      value: `${chamberAreaCm2.toFixed(0)} cm²`,
      expected: 'A large nest has about 10,000 cm²',
      tag: 'A',
    },
    {
      label: 'Chamber area in the top quarter',
      value: `${(measurement.topQuarterShare * 100).toFixed(0)}%`,
      expected: `About ${(params.nest.topQuarterAreaFraction.value * 100).toFixed(0)}% in real nests, which are top-heavy`,
      outOfRange:
        compareToMature && measurement.topQuarterShare > 0 && measurement.topQuarterShare < 0.35,
      tag: 'A',
    },
    {
      label: 'Shafts',
      value: `${measurement.shaftSeriesCount}`,
      expected: `Real nests have 1 to ${params.nest.maxShaftChamberSeries.value}, each with chambers along it`,
      outOfRange:
        compareToMature && measurement.shaftSeriesCount > params.nest.maxShaftChamberSeries.value,
      tag: 'A',
    },
    {
      label: 'Chamber spacing',
      value: `${measurement.verticalSpacingShallowCm.toFixed(1)} cm top, ${measurement.verticalSpacingDeepCm.toFixed(1)} cm deep`,
      expected: 'About 3 to 4 cm apart near the top and 12 cm two-thirds of the way down',
      outOfRange:
        compareToMature && measurement.verticalSpacingDeepCm < measurement.verticalSpacingShallowCm,
      tag: 'A',
    },
    {
      label: 'Sand moved',
      value: `${(
        (measurement.excavatedCells *
          params.discretisation.nestCellSizeCm.value ** 2 *
          params.discretisation.sliceThicknessCm.value *
          params.soil.bulkDensityKgPerM3.value) /
        1000
      ).toFixed(0)} g`,
      expected: 'About 40 g for a new nest and up to 40 kg for the largest',
      tag: 'A',
    },
  ]
}

export function formatDate(date: CalendarDate): string {
  return `${date.dayOfMonth} ${MONTHS[date.month - 1]}, year ${date.colonyYear + 1}`
}

/** Renders the groups into a container, one titled section each. */
export function renderHud(container: HTMLElement, groups: readonly HudGroup[]): void {
  container.replaceChildren(
    ...groups.map((group) => {
      const section = document.createElement('section')
      section.className = 'hud-group'

      const title = document.createElement('h2')
      title.textContent = group.title

      const tiles = group.layout === 'tiles'
      const body = document.createElement('div')
      body.className = tiles ? 'hud-grid' : 'hud-rows'
      const itemClass = tiles ? 'hud-tile' : 'hud-row'

      for (const reading of group.readings) {
        const item = document.createElement('div')
        item.className = itemClass + (reading.outOfRange === true ? ` ${itemClass}--out` : '')

        const label = document.createElement('span')
        label.className = 'hud-label'
        label.textContent = reading.label

        const value = document.createElement('span')
        value.className = 'hud-value'
        value.textContent = reading.value

        item.append(label, value)

        if (reading.expected !== undefined) {
          const expected = document.createElement('span')
          expected.className = 'hud-expected'
          expected.textContent = reading.expected
          item.append(expected)
        }
        body.append(item)
      }
      section.append(title, body)
      return section
    }),
  )
}

/**
 * The colony readings: what the demographic engine and the foragers are doing.
 *
 * Held against the same measured ranges as the nest and flagged the same way. The share of
 * workers foraging comes out low, and the note says what it should be rather than leaving a
 * reader to find out.
 */
export function colonyReadings(summary: ColonySummary, params: Params): HudReading[] {
  const proportionForaging = summary.workers > 0 ? summary.foragers / summary.workers : 0
  const measured = params.labour.maxProportionForaging

  return [
    {
      label: 'Workers',
      value: `${summary.workers}`,
      expected: `A mature colony has about ${params.colony.meanMatureWorkers.value}`,
      tag: 'A',
    },
    {
      label: 'Brood',
      value: `${Math.round(summary.brood)}`,
      expected: 'Eggs, larvae and pupae',
      tag: 'A',
    },
    {
      label: 'Foragers',
      value: `${summary.foragers} of ${summary.workers}`,
      expected: `At the summer peak, ${(measured.min * 100).toFixed(0)} to ${(measured.max * 100).toFixed(0)}% of workers forage`,
      outOfRange: summary.workers > 0 && proportionForaging > measured.max,
      tag: 'A',
    },
    {
      label: 'Out foraging now',
      value: `${summary.foragersOnSurface}`,
      expected: 'Only in daylight, and not in the midday heat',
      tag: 'B',
    },
    {
      label: 'Average trip',
      value: summary.meanTripTicks > 0 ? `${summary.meanTripTicks.toFixed(0)} min` : 'No trips yet',
      expected: 'Set by how long a forager searches, not how far it walks',
      tag: 'B',
    },
    {
      label: 'Largest workforce so far',
      value: `${summary.peakWorkers}`,
      expected: `Colonies start raising queens and males at about ${params.colony.sexualMaturityWorkers.value} workers`,
      tag: 'A',
    },
    {
      label: 'Larvae starved',
      value: `${Math.round(summary.totalLarvaeStarved)}`,
      expected: 'A food shortage kills larvae. It never sends extra workers out to forage.',
      tag: 'A',
    },
  ]
}

/** The seed readings: what the foragers bring home and where it goes. */
export function seedReadings(summary: ColonySummary, params: Params): HudReading[] {
  return [
    {
      label: 'Seeds in store',
      value: `${Math.round(summary.seedsStored)}`,
      expected: `Kept in chambers ${params.seeds.seedChamberDepthCm.min} to ${params.seeds.seedChamberDepthCm.max} cm down`,
      tag: 'A',
    },
    {
      label: 'Seeds being carried',
      value: `${summary.seedsInTransit}`,
      expected: 'Foragers drop seeds near the top, and other workers carry them down',
      tag: 'A',
    },
    {
      label: 'Seeds brought home',
      value: `${summary.totalSeedsCollected}`,
      expected: 'Every seed collected so far',
      tag: 'C',
    },
  ]
}

/** The colony phase, in words a reader can use. */
export function describePhase(summary: ColonySummary): string {
  switch (summary.phase) {
    case 'founding':
      return 'Founding: the queen alone, living on her reserves'
    case 'growing':
      return 'Growing'
    case 'mature':
      return 'Mature, raising queens and males'
    case 'queenless':
      return 'The queen has died'
    case 'dead':
      return 'The colony has died'
    default:
      return summary.phase
  }
}
