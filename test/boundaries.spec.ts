import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/**
 * These are the guarantees /core makes to anyone using this as an instrument. ESLint
 * enforces them too, but a lint config can be disabled by a comment and a test cannot be
 * disabled by accident. See docs/DETERMINISM.md.
 */

const CORE_DIR = join(import.meta.dirname, '..', 'src', 'core')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (entry.endsWith('.ts')) out.push(path)
  }
  return out
}

/** Files exempt because their whole job is to build the tables the rest of core uses. */
const EXEMPT = ['reference.ts']

function coreSources(): { path: string; text: string }[] {
  return sourceFiles(CORE_DIR)
    .filter((p) => !EXEMPT.some((e) => p.endsWith(e)))
    .map((path) => ({ path, text: readFileSync(path, 'utf8') }))
}

describe('/core purity', () => {
  it('never reaches for ambient randomness', () => {
    for (const { path, text } of coreSources()) {
      expect(text, `${path} calls Math.random`).not.toMatch(/Math\s*\.\s*random/)
    }
  })

  it('never calls a Math function that is not bit-identical across engines', () => {
    // ECMA-262 permits implementation-defined approximations for all of these, so a
    // seeded run would diverge silently between Chrome, Firefox and Node.
    const unspecified =
      /Math\s*\.\s*(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|asinh|acosh|atanh|exp|expm1|pow|log|log2|log10|log1p|cbrt|hypot)\b/
    for (const { path, text } of coreSources()) {
      expect(text, `${path} uses an unspecified Math function`).not.toMatch(unspecified)
    }
  })

  it('never touches the DOM, the wall clock or Node built-ins', () => {
    const banned = [
      /\bdocument\s*\./,
      /\bwindow\s*\./,
      /\bnavigator\s*\./,
      /\blocalStorage\b/,
      /\bprocess\s*\./,
      /\bperformance\s*\.\s*now\b/,
      /\bnew\s+Date\b/,
      /\bDate\s*\.\s*now\b/,
      /from\s+'node:/,
    ]
    for (const { path, text } of coreSources()) {
      for (const pattern of banned) {
        expect(text, `${path} matches ${pattern}`).not.toMatch(pattern)
      }
    }
  })

  it('never imports the renderer, the UI or the worker host', () => {
    for (const { path, text } of coreSources()) {
      expect(text, `${path} imports outside /core`).not.toMatch(
        /from\s+'[^']*\/(render|ui|worker)\//,
      )
    }
  })
})
