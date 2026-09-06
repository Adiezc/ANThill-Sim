import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * The standing rule of the project: no biological constant may be hard-coded. It comes
 * from the species file or it does not exist.
 *
 * This is enforced by taking every number the species file contains and looking for it as
 * a literal in the simulation source. A contributor who types 4300 rather than reading
 * `colony.meanMatureWorkers` gets a failing build naming the parameter they should have
 * used. That is the mistake CONTRIBUTING.md says is most likely, and it is the one that
 * would quietly cost the model its provenance: a number with no tag cannot be cited, and
 * an uncitable number in a simulator whose entire purpose is citation is worse than a
 * missing feature.
 */

const ROOT = join(import.meta.dirname, '..')
const SPECIES = join(ROOT, 'species', 'pogonomyrmex-badius.json')

/**
 * Directories exempt because their numbers are mathematical rather than biological: series
 * coefficients, a calendar, bit masks. They contain no ant.
 */
const EXEMPT_DIRS = [
  'src/core/math',
  'src/core/params',
  // The renderer and the UI display the model; they do not model. Their numbers are ruler
  // tick steps, gutter widths and colour stops, and several collide with biological values
  // by coincidence — a 20 cm ruler step is not the foraging range. Every biological
  // quantity they show is read from the parameters and passed in.
  'src/render',
  'src/ui',
  'src/main.ts',
]

/**
 * The one exempt file. It holds the Gregorian month lengths, which collide with a summer
 * temperature and a beetle count, and holds nothing else so that the exemption stays this
 * small.
 */
const EXEMPT_FILES = ['src/core/sim/calendar.ts']

/**
 * Values too common to attribute. A 1 in the source is not the queen count, and a 12 is
 * more likely a month index than a parameter. Excluding these costs a little coverage and
 * buys the test its credibility; every value with two or more significant figures is still
 * checked.
 */
function isTooCommonToAttribute(n: number): boolean {
  if (!Number.isFinite(n)) return true
  if (Number.isInteger(n) && Math.abs(n) <= 12) return true
  return [0.5, 0.25, 0.75, 100, 1000].includes(n)
}

function collectNumbers(node: unknown, path: string, into: Map<number, string[]>): void {
  if (typeof node === 'number') {
    if (!isTooCommonToAttribute(node)) {
      const paths = into.get(node) ?? []
      paths.push(path)
      into.set(node, paths)
    }
    return
  }
  if (Array.isArray(node)) {
    node.forEach((child, i) => collectNumbers(child, `${path}[${i}]`, into))
    return
  }
  if (typeof node === 'object' && node !== null) {
    for (const [key, child] of Object.entries(node)) {
      if (key.startsWith('$') || key === 'note') continue
      collectNumbers(child, path === '' ? key : `${path}.${key}`, into)
    }
  }
}

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) out.push(...sourceFiles(path))
    else if (entry.endsWith('.ts')) out.push(path)
  }
  return out
}

function stripCommentsAndStrings(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``')
}

describe('no biological constant is hard-coded', () => {
  it('finds none of the species file’s values as literals in the source', () => {
    const species = JSON.parse(readFileSync(SPECIES, 'utf8')) as unknown
    const numbers = new Map<number, string[]>()
    collectNumbers(species, '', numbers)
    expect(numbers.size).toBeGreaterThan(40) // the test is not vacuous

    const files = sourceFiles(join(ROOT, 'src')).filter((file) => {
      const rel = relative(ROOT, file).replaceAll('\\', '/')
      return !EXEMPT_DIRS.some((dir) => rel.startsWith(dir)) && !EXEMPT_FILES.includes(rel)
    })

    const offences: string[] = []
    for (const file of files) {
      const code = stripCommentsAndStrings(readFileSync(file, 'utf8'))
      for (const [value, paths] of numbers) {
        // Word boundaries alone would match 700 inside 1700, so the literal must not be
        // flanked by a digit, a dot or an identifier character.
        const literal = String(value).replace('.', '\\.')
        if (new RegExp(`(?<![\\w.\\d])${literal}(?![\\d.\\w])`).test(code)) {
          offences.push(
            `${relative(ROOT, file)} contains the literal ${value}, which is ${paths.join(' and ')} in the species file. Read it from the parameters instead. See CONTRIBUTING.md.`,
          )
        }
      }
    }

    expect(offences).toEqual([])
  })

  it('would catch one', () => {
    // Guards against the check above quietly becoming vacuous, by running the same match
    // against a line that does hard-code a parameter.
    const code = stripCommentsAndStrings('const mature = 4300\n')
    expect(/(?<![\w.\d])4300(?![\d.\w])/.test(code)).toBe(true)
    // ...and not against a number that merely contains it.
    expect(/(?<![\w.\d])4300(?![\d.\w])/.test('const x = 143005')).toBe(false)
  })
})
