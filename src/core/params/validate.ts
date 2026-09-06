/**
 * Whole-file validation of a species parameter set.
 *
 * The typed reads in `params.ts` check the values the simulation actually uses. This
 * checks the file itself, and it exists to catch the opposite failure: a number that was
 * added to the parameter file without a tag, which would then be usable by a future system
 * with no provenance attached. That is the one mistake a contributor is most likely to
 * make, so it is a load-time error rather than a review comment. See CONTRIBUTING.md.
 */

import { ParamError, isTag } from './schema.js'
import type { Tag } from './schema.js'

type Raw = Record<string, unknown>

/**
 * Paths whose numbers are not biological parameters and so carry no tag of their own.
 *
 * Two kinds appear here. Descriptive records — the study site's coordinates, the climate
 * normals table — are factual data about the place rather than modelled quantities, and
 * are covered by the tag on their containing section. Schema bookkeeping is not a
 * parameter at all. Nothing is added to this list to silence a warning; if a number
 * influences ant behaviour it gets a tag.
 */
const UNTAGGED_BY_DESIGN: readonly string[] = [
  'schemaVersion',
  'species',
  'climate.site',
  'climate.monthly',
  'climate.frostPossibleMonths',
  'events.kleptoparasiticBeetle.species',
  'events.predators',
  'events.pathogens',
  'events.competitors',
]

export interface TaggedEntry {
  readonly path: string
  readonly tag: Tag
  readonly note?: string
}

export interface ValidationResult {
  /** Every tagged node in the file, in path order. Feeds the "how do we know this?" panel. */
  readonly entries: readonly TaggedEntry[]
  readonly counts: Readonly<Record<Tag, number>>
}

function isPlainObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isExempt(path: string): boolean {
  return UNTAGGED_BY_DESIGN.some(
    (prefix) =>
      path === prefix ||
      path.startsWith(`${prefix}.`) ||
      // Array elements read as `climate.monthly[3].highC`, not `climate.monthly.3.highC`.
      path.startsWith(`${prefix}[`),
  )
}

/**
 * Walks the whole file. Every object that carries a `tag` is recorded and its tag checked.
 * Every numeric leaf that is neither under a tagged node nor explicitly exempt is an
 * error.
 */
export function validateParams(root: Raw): ValidationResult {
  const entries: TaggedEntry[] = []
  const counts: Record<Tag, number> = { A: 0, B: 0, C: 0 }
  const problems: string[] = []

  const walk = (node: unknown, path: string, covered: boolean): void => {
    if (Array.isArray(node)) {
      // An array under a tagged node is that node's value. An array elsewhere is data.
      if (!covered && !isExempt(path) && node.some((v) => typeof v === 'number')) {
        problems.push(`${path} is an array of numbers with no tag`)
      }
      node.forEach((child, i) => walk(child, `${path}[${i}]`, covered))
      return
    }

    if (isPlainObject(node)) {
      let coveredHere = covered
      if ('tag' in node) {
        if (!isTag(node.tag)) {
          problems.push(`${path} has tag ${JSON.stringify(node.tag)}, which is not A, B or C`)
        } else {
          const note = node.note
          entries.push({
            path,
            tag: node.tag,
            ...(typeof note === 'string' ? { note } : {}),
          })
          counts[node.tag] += 1
          coveredHere = true
        }
      }
      for (const [key, child] of Object.entries(node)) {
        if (key.startsWith('$')) continue // $comment and friends are documentation
        if (key === 'tag' || key === 'note') continue
        walk(child, path === '' ? key : `${path}.${key}`, coveredHere)
      }
      return
    }

    if (typeof node === 'number' && !covered && !isExempt(path)) {
      problems.push(`${path} = ${node} has no tag`)
    }
  }

  walk(root, '', false)

  if (problems.length > 0) {
    throw new ParamError(
      `The species parameter file has ${problems.length} untagged or mistagged constant(s). Every value that influences ant behaviour must carry a tag of A, B or C; if it cannot be cited it is C, and C values must be exposed as tunable. See CONTRIBUTING.md.\n  - ${problems.join('\n  - ')}`,
    )
  }

  entries.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
  return { entries, counts }
}
