/**
 * The readouts.
 *
 * Every number here is in the units the source papers use — centimetres for depth,
 * centimetres squared for chamber area — so that what is on screen can be held against
 * Tschinkel's measurements without conversion. Where the model is outside the range the
 * papers report, the readout says so rather than presenting the figure bare.
 */

import type { ColonySummary } from '../core/sim/colony.js'
import type { NestMeasurement } from '../core/state/nest.js'
import type { Params } from '../core/params/params.js'
import type { CalendarDate } from '../core/sim/clock.js'

export interface HudReading {
  readonly label: string
  readonly value: string
  /** The measured range from the literature, where one exists. */
  readonly expected?: string
  /** True when the value sits outside what the papers report. */
  readonly outOfRange?: boolean
  readonly tag?: 'A' | 'B' | 'C'
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
 * `compareToMature` is false while the queen is still sinking her founding shaft. A nest
 * that is half dug is not a nest outside what the papers report, it is an unfinished one,
 * and flagging it red before the colony has done anything teaches a reader to ignore the
 * flag when it starts meaning something.
 */
export function nestReadings(
  measurement: NestMeasurement,
  params: Params,
  workers: number,
  compareToMature = true,
): HudReading[] {
  const depth = measurement.maxDepthCm
  const matureDepth = params.nest.matureDepthCm

  // Chamber cross-section in the slice, converted to the volume it stands for, so the
  // readout is in the units Tschinkel reports.
  const cell = params.discretisation.nestCellSizeCm.value
  const chamberAreaCm2 =
    measurement.chamberRunPerDecile.reduce((a, b) => a + b, 0) *
    params.discretisation.sliceThicknessCm.value
  void cell

  return [
    {
      label: 'Nest depth',
      value: `${depth.toFixed(0)} cm`,
      expected: `mature ${matureDepth.min} to ${matureDepth.max} cm`,
      outOfRange: compareToMature && depth > 0 && depth < params.nest.incipientDepthCm.min,
      tag: 'A',
    },
    {
      label: 'Chamber height',
      value: `${measurement.meanChamberHeightCm.toFixed(2)} cm`,
      expected: `${params.nest.chamberHeightCm.value.toFixed(1)} cm, whatever the area`,
      outOfRange:
        compareToMature &&
        measurement.meanChamberHeightCm > 0 &&
        Math.abs(measurement.meanChamberHeightCm - params.nest.chamberHeightCm.value) > 0.5,
      tag: 'A',
    },
    {
      label: 'Chamber area',
      value: `${chamberAreaCm2.toFixed(0)} cm²`,
      expected: 'a large nest holds ~10 000 cm²',
      tag: 'A',
    },
    {
      label: 'Area in top quarter',
      value: `${(measurement.topQuarterShare * 100).toFixed(0)}%`,
      expected: `about ${(params.nest.topQuarterAreaFraction.value * 100).toFixed(0)}%`,
      outOfRange:
        compareToMature && measurement.topQuarterShare > 0 && measurement.topQuarterShare < 0.35,
      tag: 'A',
    },
    {
      label: 'Shaft series',
      value: `${measurement.shaftSeriesCount}`,
      expected: `1 to ${params.nest.maxShaftChamberSeries.value}`,
      outOfRange:
        compareToMature && measurement.shaftSeriesCount > params.nest.maxShaftChamberSeries.value,
      tag: 'A',
    },
    {
      label: 'Chamber spacing',
      value: `${measurement.verticalSpacingShallowCm.toFixed(1)} cm shallow, ${measurement.verticalSpacingDeepCm.toFixed(1)} cm deep`,
      expected: '3 to 4 cm shallow, about 12 cm at decile 7 to 8',
      outOfRange:
        compareToMature && measurement.verticalSpacingDeepCm < measurement.verticalSpacingShallowCm,
      tag: 'A',
    },
    {
      label: 'Workers',
      value: `${workers}`,
      expected: `mature colony ~${params.colony.meanMatureWorkers.value}`,
      tag: 'A',
    },
    {
      label: 'Soil moved',
      value: `${(
        (measurement.excavatedCells *
          params.discretisation.nestCellSizeCm.value ** 2 *
          params.discretisation.sliceThicknessCm.value *
          params.soil.bulkDensityKgPerM3.value) /
        1000
      ).toFixed(0)} g`,
      expected: '40 g incipient, up to 40 kg in the largest',
      tag: 'A',
    },
  ]
}

export function formatDate(date: CalendarDate): string {
  return `${date.dayOfMonth} ${MONTHS[date.month - 1]}, year ${date.colonyYear + 1}`
}

/** Renders the readings into a container as a definition list. */
export function renderHud(container: HTMLElement, readings: readonly HudReading[]): void {
  container.replaceChildren(
    ...readings.map((reading) => {
      const row = document.createElement('div')
      row.className = 'hud-row' + (reading.outOfRange === true ? ' hud-row--out' : '')

      const label = document.createElement('span')
      label.className = 'hud-label'
      label.textContent = reading.label

      const value = document.createElement('span')
      value.className = 'hud-value'
      value.textContent = reading.value

      row.append(label, value)

      if (reading.expected !== undefined) {
        const expected = document.createElement('span')
        expected.className = 'hud-expected'
        expected.textContent = reading.expected
        row.append(expected)
      }
      return row
    }),
  )
}

/**
 * The colony readings: what the demographic engine and the foragers are doing.
 *
 * Held against the same measured ranges the nest readings are, and flagged the same way
 * when the model is outside them. Two of these are deliberately unflattering. Peak
 * proportion foraging comes out low, and the seed store is a number nothing draws on yet.
 * Both are stated here rather than left for a reader to discover.
 */
export function colonyReadings(summary: ColonySummary, params: Params): HudReading[] {
  const proportionForaging = summary.workers > 0 ? summary.foragers / summary.workers : 0
  const measured = params.labour.maxProportionForaging

  return [
    {
      label: 'Workers',
      value: `${summary.workers}`,
      expected: `mature colony ~${params.colony.meanMatureWorkers.value}`,
      tag: 'A',
    },
    {
      label: 'Brood',
      value: `${Math.round(summary.brood)}`,
      expected: 'eggs, larvae and pupae together',
      tag: 'A',
    },
    {
      label: 'Foragers',
      value: `${summary.foragers} of ${summary.workers}`,
      expected: `summer peak ${(measured.min * 100).toFixed(0)} to ${(measured.max * 100).toFixed(0)}%`,
      outOfRange: summary.workers > 0 && proportionForaging > measured.max,
      tag: 'A',
    },
    {
      label: 'Above ground now',
      value: `${summary.foragersOnSurface}`,
      expected: 'daylight only, and not in the heat of the day',
      tag: 'B',
    },
    {
      label: 'Mean trip',
      value: summary.meanTripTicks > 0 ? `${summary.meanTripTicks.toFixed(0)} min` : 'no trips yet',
      expected: 'search time, not distance, sets this',
      tag: 'B',
    },
    {
      label: 'Seeds brought home',
      value: `${summary.totalSeedsCollected}`,
      expected: 'stored, but nothing draws on them yet',
      tag: 'C',
    },
    {
      label: 'Peak workers',
      value: `${summary.peakWorkers}`,
      expected: `sexual maturity near ${params.colony.sexualMaturityWorkers.value}`,
      tag: 'A',
    },
    {
      label: 'Larvae starved',
      value: `${Math.round(summary.totalLarvaeStarved)}`,
      expected: 'too few foragers is answered with larval death, never with replacements',
      tag: 'A',
    },
  ]
}

/** The colony phase, in words a reader can use. */
export function describePhase(summary: ColonySummary): string {
  switch (summary.phase) {
    case 'founding':
      return 'sealed in, living on her own reserves'
    case 'growing':
      return 'growing'
    case 'mature':
      return 'mature, producing alates'
    case 'queenless':
      return 'queenless'
    case 'dead':
      return 'dead'
    default:
      return summary.phase
  }
}
