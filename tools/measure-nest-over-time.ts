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
 * The chamber cells the measurement keeps and the shaft cells it drops.
 *
 * Reported side by side because the gap between them is what D48 is about: the old statistic
 * counted the second group as chamber and averaged the height of a whole shaft into the height
 * of a chamber.
 */
function classify(
  nest: NestGrid,
  params: Params,
): { chamberCells: number; shaftCells: number; shaftMeanClearanceCm: number } {
  const threshold = chamberThresholdCm(params)
  let chamberCells = 0
  let shaftCells = 0
  let shaftClearance = 0
  for (let row = 0; row < nest.rows; row += 1) {
    for (let col = 0; col < nest.cols; col += 1) {
      const { chamber, runCm, clearanceCm } = isChamberVoidCm(nest, col, row, threshold)
      if (chamber) {
        chamberCells += 1
      } else if (runCm > threshold) {
        shaftCells += 1
        shaftClearance += clearanceCm
      }
    }
  }
  return {
    chamberCells,
    shaftCells,
    shaftMeanClearanceCm: shaftCells === 0 ? 0 : shaftClearance / shaftCells,
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
    const counts = classify(subject.nest, params)
    const workers = options.colony ? (subject as Colony).summary().workers : options.harnessWorkers
    const deepestBranch =
      m.branchDepthsCm.length === 0 ? 0 : Math.max(...(m.branchDepthsCm as number[]))
    process.stdout.write(
      `${label} day ${String(day).padStart(4)} ` +
        `workers=${String(workers).padStart(4)} ` +
        `depth=${m.maxDepthCm.toFixed(1).padStart(6)}cm ` +
        `dug=${String(m.excavatedCells).padStart(5)} ` +
        `height=${m.meanChamberHeightCm.toFixed(2)}cm ` +
        `(shallow ${m.chamberHeightShallowCm.toFixed(2)} / deep ${m.chamberHeightDeepCm.toFixed(2)}) ` +
        `top-quarter=${m.topQuarterShare.toFixed(3)} ` +
        `spacing=${m.verticalSpacingShallowCm.toFixed(2)}/${m.verticalSpacingDeepCm.toFixed(2)}cm ` +
        `width-ratio=${m.chamberSizeSurfaceToBottomRatio.toFixed(2)} ` +
        `branch=${deepestBranch.toFixed(1)}cm series=${m.shaftSeriesCount} ` +
        `| chamber-cells=${counts.chamberCells} ` +
        `shaft-cells-excluded=${counts.shaftCells} at ${counts.shaftMeanClearanceCm.toFixed(1)}cm\n`,
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
