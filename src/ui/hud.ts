/**
 * The readouts.
 *
 * Every number here is in the units the source papers use — centimetres for depth,
 * centimetres squared for chamber area — so that what is on screen can be held against
 * Tschinkel's measurements without conversion. Where the model is outside the range the
 * papers report, the readout says so rather than presenting the figure bare.
 */

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

export function nestReadings(
  measurement: NestMeasurement,
  params: Params,
  workers: number,
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
      expected: `mature ${matureDepth.min}–${matureDepth.max} cm`,
      outOfRange: depth > 0 && depth < params.nest.incipientDepthCm.min,
      tag: 'A',
    },
    {
      label: 'Chamber height',
      value: `${measurement.meanChamberHeightCm.toFixed(2)} cm`,
      expected: `${params.nest.chamberHeightCm.value.toFixed(1)} cm, whatever the area`,
      outOfRange:
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
      outOfRange: measurement.topQuarterShare > 0 && measurement.topQuarterShare < 0.35,
      tag: 'A',
    },
    {
      label: 'Shaft series',
      value: `${measurement.shaftSeriesCount}`,
      expected: `1–${params.nest.maxShaftChamberSeries.value}`,
      outOfRange: measurement.shaftSeriesCount > params.nest.maxShaftChamberSeries.value,
      tag: 'A',
    },
    {
      label: 'Chamber spacing',
      value: `${measurement.verticalSpacingShallowCm.toFixed(1)} cm shallow, ${measurement.verticalSpacingDeepCm.toFixed(1)} cm deep`,
      expected: '3–4 cm shallow, ~12 cm at decile 7–8',
      outOfRange: measurement.verticalSpacingDeepCm < measurement.verticalSpacingShallowCm,
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
