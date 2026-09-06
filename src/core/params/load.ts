/**
 * Loading a species parameter file.
 *
 * `/core` cannot read a file: it has no `fetch` and no `node:fs`. The caller supplies the
 * parsed JSON — the browser via a bundled import, the headless runner via `readFile` — and
 * this turns it into a validated, typed parameter set together with the provenance index
 * the UI needs.
 */

import { buildParams } from './params.js'
import type { Params } from './params.js'
import { validateParams } from './validate.js'
import type { TaggedEntry, ValidationResult } from './validate.js'
import { ParamError } from './schema.js'
import type { Tag } from './schema.js'

export interface LoadedSpecies {
  readonly params: Params
  /** Every tagged value in the file, for the "how do we know this?" panel. */
  readonly provenance: readonly TaggedEntry[]
  readonly counts: Readonly<Record<Tag, number>>
}

/** The schema version this build understands. */
export const SUPPORTED_SCHEMA_VERSION = 1

export function loadSpecies(raw: unknown): LoadedSpecies {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new ParamError('A species parameter file must be a JSON object')
  }
  const root = raw as Record<string, unknown>

  const version = root['schemaVersion']
  if (version !== SUPPORTED_SCHEMA_VERSION) {
    throw new ParamError(
      `Species file schemaVersion is ${JSON.stringify(version)}, but this build understands ${SUPPORTED_SCHEMA_VERSION}`,
    )
  }

  const validation: ValidationResult = validateParams(root)
  const params = buildParams(root)

  checkHardRules(params)

  return { params, provenance: validation.entries, counts: validation.counts }
}

/**
 * The HARD RULE parameters are behaviours that were tested in this species and rejected.
 * A parameter file that flips one is not a variant run, it is a factual error, and the
 * intuitive version of each of these is exactly what a well-meaning contributor would
 * "fix". Loading fails rather than silently producing a colony that is not *P. badius*.
 * See docs/SCIENCE.md section 11 and CONTRIBUTING.md.
 */
function checkHardRules(params: Params): void {
  const violations: string[] = []

  if (params.labour.taskReversionAllowed.value) {
    violations.push(
      'labour.taskReversionAllowed is true. Foragers do not revert to inside work; raising forager number, body fat or the larva-to-forager ratio induces no reversion (Kwapich & Tschinkel 2016).',
    )
  }
  if (params.labour.backfillFromOtherCastes.value) {
    violations.push(
      'labour.backfillFromOtherCastes is true. Removing half the foragers draws no replacements from other castes; larval survival suffers instead (Kwapich & Tschinkel 2013).',
    )
  }
  if (params.foraging.workerSizePredictsSeedSize.value) {
    violations.push(
      'foraging.workerSizePredictsSeedSize is true. Tested by Ferster & Traniello 1995 and rejected: worker size predicts neither seed size nor foraging distance.',
    )
  }
  if (params.foraging.workerSizePredictsForagingDistance.value) {
    violations.push(
      'foraging.workerSizePredictsForagingDistance is true. Tested by Ferster & Traniello 1995 and rejected.',
    )
  }
  if (params.seeds.majorsWidenOpenableSizeRange.value) {
    violations.push(
      'seeds.majorsWidenOpenableSizeRange is true. Majors raise the RATE at which small and medium seeds are opened; they do not widen the range of openable sizes (Tschinkel & Kwapich 2016).',
    )
  }
  if (params.colony.queens.value !== 1) {
    violations.push(
      `colony.queens is ${params.colony.queens.value}. P. badius is monogynous; mature wild colonies are never truly polygynous.`,
    )
  }

  if (violations.length > 0) {
    throw new ParamError(
      `This parameter file violates ${violations.length} HARD RULE(s) — behaviours that were experimentally tested in P. badius and rejected. Implementing the intuitive version would be a factual error, not a variant run.\n  - ${violations.join('\n  - ')}`,
    )
  }
}

/**
 * Cross-checks between parameters that are each individually valid but cannot both hold.
 * These are reported rather than thrown, because the values are what the papers say and
 * the papers are not going to be edited to suit the model. See docs/DECISIONS.md D5.
 */
export function consistencyWarnings(params: Params): string[] {
  const warnings: string[] = []

  // Chamber area does not fall geometrically with depth. Tschinkel 2004 regresses the
  // decile-to-decile proportional decrease directly, and it rises with depth:
  //
  //   decrease(d) = slope * d + intercept
  //
  // running from about 10 percent between deciles 1 and 2 to about 90 percent between 9
  // and 10. The flat "25 to 40 percent per decile" the paper's abstract gives is a
  // compression of that line, and the two are not the same claim. See docs/DECISIONS.md D5.
  const slope = params.nest.chamberAreaDecreaseSlope.value
  const intercept = params.nest.chamberAreaDecreaseIntercept.value
  const areas: number[] = [1]
  for (let d = 2; d <= 10; d += 1) {
    areas.push(areas[d - 2]! * (1 - (slope * d + intercept)))
  }
  let totalArea = 0
  for (const a of areas) totalArea += a
  // The top quarter of the nest is two deciles and half of a third.
  const topQuarter = (areas[0]! + areas[1]! + 0.5 * areas[2]!) / totalArea
  const reportedTopQuarter = params.nest.topQuarterAreaFraction.value

  if (Math.abs(topQuarter - reportedTopQuarter) > 0.15) {
    warnings.push(
      `The chamber area decrease regression gives a top-quarter share of ${topQuarter.toFixed(2)}, against the reported nest.topQuarterAreaFraction of ${reportedTopQuarter}. Both come from Tschinkel 2004. See docs/DECISIONS.md D5.`,
    )
  }

  // Tschinkel 2004 states the deep shaft angle twice and inconsistently: 45-60 degrees in
  // the body, about 70 in the abstract. The model uses the body text. Reported rather than
  // resolved, so that a reader can see the source disagreeing with itself.
  const deepAngle = params.nest.shaftAngleDegDeep
  const abstractDeepAngle = 70
  if (abstractDeepAngle < deepAngle.min || abstractDeepAngle > deepAngle.max) {
    warnings.push(
      `Shaft angle below ${params.nest.shaftSteepeningDepthCm.value} cm is ${deepAngle.min}-${deepAngle.max} degrees in the body of Tschinkel 2004 and about ${abstractDeepAngle} degrees in its abstract. The model uses the body text. Both are tagged [A]. See docs/DECISIONS.md D10.`,
    )
  }

  if (
    params.foraging.maxCollectableSeedWidthMm.value <= params.foraging.maxOpenableSeedWidthMm.value
  ) {
    warnings.push(
      'foraging.maxCollectableSeedWidthMm is not greater than maxOpenableSeedWidthMm, so no seed can accumulate unopened and the germination mechanic has nothing to act on. See docs/DECISIONS.md D2.',
    )
  }

  if (!params.relocation.causeKnown.value && params.relocation.candidateSitesDiffer.value) {
    warnings.push(
      'relocation.candidateSitesDiffer is true while relocation.causeKnown is false. This is the deliberate departure recorded in docs/DECISIONS.md D3: no measured site property is known to explain relocation, and the simulator must say so wherever it offers the choice.',
    )
  }

  return warnings
}
