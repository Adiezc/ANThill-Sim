/**
 * The shape of a parameter and the rules for reading one.
 *
 * Every biological constant in this simulation arrives through here, carrying its own
 * provenance tag. The tag travels with the number rather than living in a separate table,
 * which is what stops the two drifting apart: a value cannot be used without its tag being
 * available at the point of use, and the inspector's citation line reads the same object
 * the system read.
 */

import type { Prng } from '../math/prng.js'

/** [A] documented for *P. badius*, [B] generalised from another ant, [C] invented. */
export type Tag = 'A' | 'B' | 'C'

export const TAGS: readonly Tag[] = ['A', 'B', 'C']

export function isTag(value: unknown): value is Tag {
  return value === 'A' || value === 'B' || value === 'C'
}

/** A single value with its provenance. */
export interface Param<T> {
  readonly value: T
  readonly tag: Tag
  /** Dotted path in the species file, e.g. `labour.foragerFatThreshold`. */
  readonly path: string
  readonly note?: string
}

/**
 * A value the literature reports as a range rather than a point. Resolving one is a
 * deliberate act — either `midpoint` for a fixed representative value, or `sample` to draw
 * a colony-specific value from the seeded PRNG — so that a range is never silently
 * collapsed to its minimum by accident.
 */
export interface RangeParam {
  readonly min: number
  readonly max: number
  readonly tag: Tag
  readonly path: string
  readonly note?: string
}

export class ParamError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ParamError'
  }
}

type Raw = Record<string, unknown>

function at(root: Raw, path: string): unknown {
  let node: unknown = root
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) {
      throw new ParamError(`No parameter at "${path}": "${key}" has no parent object`)
    }
    node = (node as Raw)[key]
  }
  if (node === undefined) throw new ParamError(`No parameter at "${path}"`)
  return node
}

function tagOf(node: unknown, path: string): Tag {
  const tag = (node as Raw).tag
  if (!isTag(tag)) {
    throw new ParamError(
      `Parameter "${path}" has tag ${JSON.stringify(tag)}. Every parameter must be tagged A, B or C. If it cannot be cited it is C, and C values must be exposed as tunable. See CONTRIBUTING.md.`,
    )
  }
  return tag
}

function noteOf(node: unknown): { note?: string } {
  const note = (node as Raw).note
  return typeof note === 'string' ? { note } : {}
}

/** Reads a tagged scalar number. */
export function readScalar(root: Raw, path: string): Param<number> {
  const node = at(root, path)
  const value = (node as Raw).value
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ParamError(`Parameter "${path}" is not a finite number: ${JSON.stringify(value)}`)
  }
  return { value, tag: tagOf(node, path), path, ...noteOf(node) }
}

/** Reads a tagged boolean. Used for the HARD RULE switches, among others. */
export function readFlag(root: Raw, path: string): Param<boolean> {
  const node = at(root, path)
  const value = (node as Raw).value
  if (typeof value !== 'boolean') {
    throw new ParamError(`Parameter "${path}" is not a boolean: ${JSON.stringify(value)}`)
  }
  return { value, tag: tagOf(node, path), path, ...noteOf(node) }
}

/** Reads a tagged `{ min, max }` pair. */
export function readRange(root: Raw, path: string): RangeParam {
  const node = at(root, path)
  const min = (node as Raw).min
  const max = (node as Raw).max
  if (
    typeof min !== 'number' ||
    typeof max !== 'number' ||
    !Number.isFinite(min) ||
    !Number.isFinite(max)
  ) {
    throw new ParamError(`Parameter "${path}" is not a { min, max } pair`)
  }
  if (min > max) throw new ParamError(`Parameter "${path}" has min ${min} above max ${max}`)
  return { min, max, tag: tagOf(node, path), path, ...noteOf(node) }
}

/** Reads a tagged array of numbers, such as the months of the relocation window. */
export function readNumberList(root: Raw, path: string): Param<readonly number[]> {
  const node = at(root, path)
  const value = (node as Raw).value
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'number')) {
    throw new ParamError(`Parameter "${path}" is not an array of numbers`)
  }
  return { value: value as number[], tag: tagOf(node, path), path, ...noteOf(node) }
}

/** Reads a tagged array of strings, such as the relocation burden priority. */
export function readStringList(root: Raw, path: string): Param<readonly string[]> {
  const node = at(root, path)
  const value = (node as Raw).value
  if (!Array.isArray(value) || value.some((v) => typeof v !== 'string')) {
    throw new ParamError(`Parameter "${path}" is not an array of strings`)
  }
  return { value: value as string[], tag: tagOf(node, path), path, ...noteOf(node) }
}

/**
 * Reads a numeric field from a node whose tag covers several fields at once, such as a
 * pheromone channel. The tag still travels with the value.
 */
export function readFieldOf(root: Raw, path: string, field: string): Param<number> {
  const node = at(root, path)
  const value = (node as Raw)[field]
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ParamError(`Parameter "${path}.${field}" is not a finite number`)
  }
  return { value, tag: tagOf(node, path), path: `${path}.${field}`, ...noteOf(node) }
}

/** The midpoint of a range. Use when one representative value is wanted, deterministically. */
export function midpoint(range: RangeParam): number {
  return (range.min + range.max) / 2
}

/**
 * Draws a value uniformly from a range using the run's PRNG. Use when the literature
 * reports variation between colonies and this colony should have its own value — nest
 * depth, trunk trail count, relocation duration.
 */
export function sample(range: RangeParam, prng: Prng): number {
  return prng.nextRange(range.min, range.max)
}
