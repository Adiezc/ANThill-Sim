/**
 * Measures a nest's architecture repeatedly over a run, so that the numbers in
 * `docs/DECISIONS.md` D48 and `docs/VALIDATION.md` G1 can be reproduced rather than taken on
 * trust.
 *
 * Two subjects, because the difference between them is the finding:
 *
 *   --harness N   The architecture gate's own subject: N workers of fixed age, no births, no
 *                 deaths, no interior system, no relocation. What `test/nest-signature.spec.ts`
 *                 measures, and what the acceptance table is written against.
 *
 *   --colony      A colony grown from one mated queen, as `src/main.ts` runs it. What a reader
 *                 actually watches, and a far smaller thing: these colonies hold tens to a few
 *                 hundred workers, where the gate is handed 600.
 *
 * Usage:
 *   npm run measure:nest -- --harness 600 --days 70,140,210,280,350
 *   npm run measure:nest -- --colony --seed 2 --days 180,365
 *
 * Long colony runs are slow — a colony simulates foraging, weather and the surface as well as
 * the digging — so pick the days you need rather than asking for five years by default.
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadSpecies } from '../src/core/params/index.js'
import { Colony } from '../src/core/sim/colony.js'
import { createNestHarness } from '../src/core/sim/nest-harness.js'
import { chamberThresholdCm, isChamberVoidCm, measureNest } from '../src/core/state/nest.js'
import type { NestGrid } from '../src/core/state/nest.js'
import type { Params } from '../src/core/params/params.js'

interface Options {
  readonly harnessWorkers: number
  readonly colony: boolean
  readonly seed: number
  readonly days: readonly number[]
  readonly species: string
  readonly picture: boolean
}

function parseArgs(argv: readonly string[]): Options {
  let harnessWorkers = 600
  let colony = false
  let seed = 1
  let days = [70]
  let species = 'species/pogonomyrmex-badius.json'
  let picture = false
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = (): string => {
      const value = argv[i + 1]
      if (value === undefined) throw new Error(`${arg} needs a value`)
      i += 1
      return value
    }
    switch (arg) {
      case '--harness':
        harnessWorkers = Number(next())
        break
      case '--colony':
        colony = true
        break
      case '--seed':
        seed = Number(next())
        break
      case '--days':
        days = next()
          .split(',')
          .map((d) => Number(d.trim()))
          .filter((d) => Number.isFinite(d) && d > 0)
          .sort((a, b) => a - b)
        break
      case '--species':
        species = next()
        break
      case '--picture':
        picture = true
        break
      case '--help':
        process.stdout.write(
          'Usage: npm run measure:nest -- [--harness N | --colony] [--seed N] ' +
            '[--days 70,140] [--species PATH] [--picture]\n',
        )
        process.exit(0)
        break
      default:
        throw new Error(`Unknown argument ${arg}`)
    }
  }
  if (days.length === 0) throw new Error('--days needs at least one positive day')
  return { harnessWorkers, colony, seed, days, species, picture }
}

/**
 * Chamber height as each version of the statistic measured it, on the same nest.
 *
 * Reported side by side because the gaps between them are what D48 and D50 are about.
 * Before D48 every cell wider than a shaft bore counted, at its full vertical clearance, so
 * the height of every shaft entering a chamber was averaged into the chamber's. D48 dropped
 * the cells taller than wide but kept the full clearance of the rest. Since D50 a chamber's
 * height is read from its own floor to its own ceiling.
 */
function heightsByVersion(
  nest: NestGrid,
  params: Params,
): { v100: number; v110: number; chamberCells: number; excludedCells: number } {
  const threshold = chamberThresholdCm(params)
  let wide = 0
  let wideClearance = 0
  let v110Cells = 0
  let v110Clearance = 0
  let chamberCells = 0
  let excludedCells = 0
  for (let row = 0; row < nest.rows; row += 1) {
    for (let col = 0; col < nest.cols; col += 1) {
      const { chamber, runCm } = isChamberVoidCm(nest, col, row, threshold)
      if (runCm <= threshold) continue
      if (chamber) chamberCells += 1
      else excludedCells += 1
      const clearanceCm = nest.verticalClearanceCm(col, row)
      wide += 1
      wideClearance += clearanceCm
      if (clearanceCm < runCm) {
        v110Cells += 1
        v110Clearance += clearanceCm
      }
    }
  }
  return {
    v100: wide === 0 ? 0 : wideClearance / wide,
    v110: v110Cells === 0 ? 0 : v110Clearance / v110Cells,
    chamberCells,
    excludedCells,
  }
}

/** The nest as text: `|` shaft by width, `#` chamber, `!` wide enough but taller than wide. */
function picture(nest: NestGrid, params: Params, rows: number): string {
  const threshold = chamberThresholdCm(params)
  let minCol = nest.cols
  let maxCol = 0
  const lastRow = Math.min(nest.rows, rows)
  for (let row = 0; row < lastRow; row += 1) {
    for (let col = 0; col < nest.cols; col += 1) {
      if (!nest.isVoid(col, row)) continue
      if (col < minCol) minCol = col
      if (col > maxCol) maxCol = col
    }
  }
  if (minCol > maxCol) return '(nothing dug yet)'
  const lines: string[] = []
  for (let row = 0; row < lastRow; row += 1) {
    let line = ''
    for (let col = minCol; col <= maxCol; col += 1) {
      if (!nest.isVoid(col, row)) {
        line += '.'
        continue
      }
      const { chamber, runCm } = isChamberVoidCm(nest, col, row, threshold)
      line += chamber ? '#' : runCm > threshold ? '!' : '|'
    }
    lines.push(`${String(Math.round(nest.depthOf(row))).padStart(4)} cm ${line}`)
  }
  return lines.join('\n')
}

function main(): void {
  const options = parseArgs(process.argv.slice(2))
  const raw = JSON.parse(readFileSync(resolve(options.species), 'utf8')) as Record<string, unknown>
  const { params } = loadSpecies(raw)

  const subject = options.colony
    ? new Colony({ seed: options.seed, params })
    : createNestHarness({ seed: options.seed, params, workers: options.harnessWorkers })
  const ticksPerDay = subject.sim.clock.ticksPerDay
  const label = options.colony ? `colony seed ${options.seed}` : `harness ${options.harnessWorkers}`

  let lastDay = 0
  for (const day of options.days) {
    subject.run((day - lastDay) * ticksPerDay)
    lastDay = day
    const m = measureNest(subject.nest, params)
    const counts = heightsByVersion(subject.nest, params)
    const workers = options.colony ? (subject as Colony).summary().workers : options.harnessWorkers
    const deepestBranch =
      m.branchDepthsCm.length === 0 ? 0 : Math.max(...(m.branchDepthsCm as number[]))
    process.stdout.write(
      `${label} day ${String(day).padStart(4)} ` +
        `workers=${String(workers).padStart(4)} ` +
        `depth=${m.maxDepthCm.toFixed(1).padStart(6)}cm ` +
        `dug=${String(m.excavatedCells).padStart(5)} ` +
        `height=${m.meanChamberHeightCm.toFixed(2)}cm ` +
        `(as 1.1.0 measured it ${counts.v110.toFixed(2)}, as 1.0.0 did ${counts.v100.toFixed(2)}) ` +
        `(shallow ${m.chamberHeightShallowCm.toFixed(2)} / deep ${m.chamberHeightDeepCm.toFixed(2)}) ` +
        `top-quarter=${m.topQuarterShare.toFixed(3)} ` +
        `spacing=${m.verticalSpacingShallowCm.toFixed(2)}/${m.verticalSpacingDeepCm.toFixed(2)}cm ` +
        `width-ratio=${m.chamberSizeSurfaceToBottomRatio.toFixed(2)} ` +
        `branch=${deepestBranch.toFixed(1)}cm series=${m.shaftSeriesCount} ` +
        `| chamber-cells=${counts.chamberCells} taller-than-wide=${counts.excludedCells}\n`,
    )
  }

  if (options.picture) {
    process.stdout.write(
      `\n${label}, day ${lastDay}: | shaft, # chamber, ! wider than a bore but taller than wide\n`,
    )
    process.stdout.write(`${picture(subject.nest, params, 80)}\n`)
  }
}

main()
