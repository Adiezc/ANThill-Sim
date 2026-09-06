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

  // Chamber area falls geometrically with depth, so if each decile retains a fraction r
  // of the one above, the shallowest quarter of the nest — two deciles and half of a
  // third — holds (1 + r + r**2 / 2) of a total of sum(r**k, k = 0..9).
  const topQuarterShare = (retain: number): number => {
    let total = 0
    let term = 1
    for (let i = 0; i < 10; i += 1) {
      total += term
      term *= retain
    }
    return (1 + retain + (retain * retain) / 2) / total
  }

  // The decay that would actually produce the authored top-quarter share. Bisection
  // rather than an inverse, because the share is monotonic in r and this needs no algebra
  // for a reader to check.
  const decay = params.nest.chamberAreaDecayPerDepthDecile
  const target = params.nest.topQuarterAreaFraction.value
  let lo = 0.01
  let hi = 0.99
  for (let i = 0; i < 60; i += 1) {
    const mid = (lo + hi) / 2
    if (topQuarterShare(mid) > target) lo = mid
    else hi = mid
  }
  const impliedDecay = 1 - (lo + hi) / 2

  if (impliedDecay < decay.min || impliedDecay > decay.max) {
    warnings.push(
      `nest.topQuarterAreaFraction (${target}) implies a chamber area decay of about ${impliedDecay.toFixed(2)} per depth decile, which lies outside the authored nest.chamberAreaDecayPerDepthDecile range of ${decay.min} to ${decay.max}. Over ten deciles that range gives a top-quarter share of ${topQuarterShare(1 - decay.min).toFixed(2)} down to ${topQuarterShare(1 - decay.max).toFixed(2)}. Both values are tagged [A] and cannot both hold; the shallow end of the decay range is much the closer. See docs/DECISIONS.md D5.`,
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
