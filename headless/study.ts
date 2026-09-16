/**
 * A replicate study, and the methods file that has to go with it.
 *
 * The report this writes is the point, not a courtesy. A number produced by a model is
 * worth what its provenance is worth, and a reader who receives a CSV of colony sizes with
 * no statement of which values were measured, which were borrowed from a different ant,
 * which were invented, and which of the model's own acceptance criteria it currently fails,
 * cannot tell whether they are looking at a result or at a plausible-looking artefact.
 *
 * So every run writes:
 *
 *   REPORT.md   methods, provenance, the validation gates met and unmet, and the exact
 *               command that reproduces the run
 *   runs.csv    one row per run-year, for reading straight into R or pandas
 *   runs.jsonl  the full per-run record, including the digest chain
 *   manifest.json  what was run, with the hash of the parameter file it was run against
 *
 * Replicates are independent and are sharded by seed, so a study that is too large for one
 * machine splits across several with `--seed-from` and `--seed-to` and the shards can be
 * concatenated without any coordination.
 *
 *   npm run study -- --replicates 30 --years 12 --out out/my-study
 */

import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { Colony } from '../src/core/sim/colony.js'
import { consistencyWarnings, loadSpecies } from '../src/core/params/index.js'
import {
  NOT_MODELLED,
  REFERENCES,
  SOURCES_NOTICE,
  formatReference,
} from '../src/core/provenance/index.js'
import type { TaggedEntry } from '../src/core/params/index.js'
import type { ColonySummary } from '../src/core/sim/colony.js'

interface Options {
  replicates: number
  seedFrom: number
  years: number
  species: string
  out: string
  progress: boolean
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    replicates: 10,
    seedFrom: 1,
    years: 5,
    species: 'species/pogonomyrmex-badius.json',
    out: 'out/study',
    progress: true,
  }
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    const next = (): string => {
      const value = argv[i + 1]
      if (value === undefined) throw new Error(`${arg} needs a value`)
      i += 1
      return value
    }
    switch (arg) {
      case '--replicates':
        options.replicates = Number(next())
        break
      case '--seed-from':
        options.seedFrom = Number(next())
        break
      case '--years':
        options.years = Number(next())
        break
      case '--species':
        options.species = next()
        break
      case '--out':
        options.out = next()
        break
      case '--quiet':
        options.progress = false
        break
      case '--help':
        process.stdout.write(
          [
            'Usage: npm run study -- [options]',
            '',
            '  --replicates N   independent colonies to run (default 10)',
            '  --seed-from N    first seed; seeds are consecutive from here (default 1)',
            '  --years N        simulated years per colony (default 5)',
            '  --species PATH   parameter file (default species/pogonomyrmex-badius.json)',
            '  --out DIR        where to write REPORT.md, runs.csv, runs.jsonl (default out/study)',
            '  --quiet          no per-run progress on stderr',
            '',
            'Replicates are independent. To split across machines, give each a disjoint',
            'seed range with --seed-from and --replicates, then concatenate the CSVs.',
            '',
          ].join('\n'),
        )
        process.exit(0)
        break
      default:
        throw new Error(`Unknown argument ${arg}`)
    }
  }
  if (!Number.isFinite(options.replicates) || options.replicates < 1) {
    throw new Error('--replicates must be at least 1')
  }
  if (!Number.isFinite(options.years) || options.years < 1) {
    throw new Error('--years must be at least 1')
  }
  return options
}

/** One year of one colony. The unit of the tidy CSV. */
interface YearRecord {
  seed: number
  year: number
  alive: boolean
  phase: string
  workers: number
  foragers: number
  brood: number
  peakWorkers: number
  totalEclosed: number
  totalLarvaeStarved: number
  totalForagersLost: number
  nestDepthCm: number
  soilMovedCells: number
  seedsCollected: number
  seedsStored: number
  /** Share of stored seed mass in sizes the ants cannot open. */
  unopenableShareOfStore: number
  seedsGerminated: number
  seedsOpened: number
  fedToLarvaeMg: number
  germinatedFedToLarvaeMg: number
  meanTripTicks: number
  nuptialFlights: number
  gynesFlown: number
  malesFlown: number
  digest: string
}

interface RunRecord {
  seed: number
  yearsRequested: number
  yearsSurvived: number
  diedInYear: number | null
  years: YearRecord[]
  finalDigest: string
  elapsedMs: number
}

/** Best effort. A study run from a tarball has no git, and that is not an error. */
function gitCommit(): string | null {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return null
  }
}

function gitDirty(): boolean | null {
  try {
    const status = execFileSync('git', ['status', '--porcelain'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    return status.trim().length > 0
  } catch {
    return null
  }
}

function csvEscape(value: string | number | boolean): string {
  const text = String(value)
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

function toCsv(rows: readonly YearRecord[]): string {
  if (rows.length === 0) return ''
  const columns = Object.keys(rows[0]!) as (keyof YearRecord)[]
  const lines = [columns.join(',')]
  for (const row of rows) lines.push(columns.map((c) => csvEscape(row[c])).join(','))
  return `${lines.join('\n')}\n`
}

function median(values: readonly number[]): number {
  if (values.length === 0) return NaN
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!
}

function summaryToYear(
  seed: number,
  year: number,
  s: ColonySummary,
  digest: string,
  alive: boolean,
): YearRecord {
  return {
    seed,
    year,
    alive,
    phase: s.phase,
    workers: s.workers,
    foragers: s.foragers,
    brood: Number(s.brood.toFixed(3)),
    peakWorkers: s.peakWorkers,
    totalEclosed: s.totalEclosed,
    totalLarvaeStarved: Number(s.totalLarvaeStarved.toFixed(3)),
    totalForagersLost: s.totalForagersLost,
    nestDepthCm: s.nestDepthCm,
    soilMovedCells: s.soilMovedCells,
    seedsCollected: s.totalSeedsCollected,
    seedsStored: Number(s.seedsStored.toFixed(1)),
    unopenableShareOfStore: Number(s.unopenableShareOfStore.toFixed(4)),
    seedsGerminated: Number(s.totalSeedsGerminated.toFixed(1)),
    seedsOpened: Number(s.totalSeedsOpened.toFixed(1)),
    fedToLarvaeMg: Number(s.totalFedToLarvaeMg.toFixed(1)),
    germinatedFedToLarvaeMg: Number(s.totalGerminatedFedToLarvaeMg.toFixed(1)),
    meanTripTicks: Number(s.meanTripTicks.toFixed(2)),
    nuptialFlights: s.nuptialFlights,
    gynesFlown: s.gynesFlown,
    malesFlown: s.malesFlown,
    digest,
  }
}

/**
 * The invented values a reader has to know about.
 *
 * Not all of them: there are ninety-odd, and a wall of them is as unreadable as none. These
 * are the ones a result actually rests on, named individually because "92 values are
 * invented" tells a reviewer nothing they can check.
 */
const LOAD_BEARING_INVENTED = [
  'excavation.buildingPheromoneLifetimeTicks',
  'discretisation.sliceThicknessCm',
  'discretisation.nestCellSizeCm',
  'foraging.standingSeedsPerSquareMetre',
  'foraging.seedPatchCount',
  'foraging.speedMetresPerTick',
  'foraging.departureChancePerTick',
  'seeds.inNestGerminationFactor',
  'brood.larvalSeedConversionEfficiency',
  'time.secondsPerTick',
]

/**
 * The value at a dotted path in the raw species file.
 *
 * `TaggedEntry` carries a path, a tag and a note but not the value, so the report reads the
 * value straight out of the file it hashed. That is the right source anyway: what a reader
 * needs to see is what the file said, not what the loader made of it.
 */
function rawValueAt(root: Record<string, unknown>, path: string): unknown {
  let node: unknown = root
  for (const key of path.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined
    node = (node as Record<string, unknown>)[key]
  }
  if (typeof node === 'object' && node !== null && 'value' in node) {
    return (node as { value: unknown }).value
  }
  return node
}

function report(
  options: Options,
  runs: readonly RunRecord[],
  paramsHash: string,
  raw: Record<string, unknown>,
  provenance: readonly TaggedEntry[],
  counts: Readonly<Record<'A' | 'B' | 'C', number>>,
  warnings: readonly string[],
  pipeline: readonly string[],
  hashedState: readonly string[],
): string {
  const commit = gitCommit()
  const dirty = gitDirty()
  const finalYears = runs.map((r) => r.years[r.years.length - 1]).filter((y) => y !== undefined)
  const survivors = runs.filter((r) => r.diedInYear === null)
  const finalWorkers = finalYears.map((y) => y!.workers)
  const peak = runs.map((r) => Math.max(0, ...r.years.map((y) => y.peakWorkers)))

  const invented = new Map<string, TaggedEntry>()
  for (const entry of provenance) {
    if (entry.tag === 'C') invented.set(entry.path, entry)
  }

  const lines: string[] = []
  const L = (s = ''): void => void lines.push(s)

  L('# Simulation report')
  L()
  L('Anthill: an agent-based model of *Pogonomyrmex badius*, the Florida harvester ant.')
  L()
  L('This file is written by the run that produced the data beside it. Read it before using')
  L('any number in `runs.csv`.')
  L()

  L('## 1. What was run')
  L()
  L('| | |')
  L('|---|---|')
  L(`| Replicates | ${options.replicates} |`)
  L(`| Seeds | ${options.seedFrom} to ${options.seedFrom + options.replicates - 1}, consecutive |`)
  L(`| Simulated years per replicate | ${options.years} |`)
  L(`| Parameter file | \`${options.species}\` |`)
  L(`| Parameter file SHA-256 | \`${paramsHash}\` |`)
  L(`| Source commit | ${commit === null ? 'not a git checkout' : `\`${commit}\``} |`)
  L(
    `| Working tree | ${dirty === null ? 'unknown' : dirty ? '**modified since that commit**' : 'clean'} |`,
  )
  L(`| Run at | ${new Date().toISOString()} |`)
  L(`| Node | ${process.version} |`)
  L(`| System order | ${pipeline.join(' → ')} |`)
  L(`| State covered by the digest | ants, ${hashedState.join(', ')} |`)
  L()
  L('### Reproducing this exactly')
  L()
  L('```bash')
  L(
    `npm run study -- --replicates ${options.replicates} --seed-from ${options.seedFrom} --years ${options.years} --species ${options.species} --out ${options.out}`,
  )
  L('```')
  L()
  L('The model is deterministic: one seeded generator, injected and never ambient, a fixed')
  L('timestep, a system order fixed at construction, and its own trigonometric and')
  L('exponential functions because the standard library’s are not specified to be')
  L('bit-identical between engines. The same seed and the same parameter file give a')
  L('byte-identical run in Node and in a browser. Each row of `runs.csv` carries the state')
  L('digest at the end of that year, so any single year of any single replicate can be')
  L('re-run and checked. If a digest differs, the runs differ, and the cause is a change to')
  L('the model or to the parameter file rather than to the machine.')
  L()

  L('## 2. Results')
  L()
  L('| | |')
  L('|---|---|')
  L(
    `| Colonies surviving all ${options.years} years | ${survivors.length} of ${runs.length} (${((survivors.length / runs.length) * 100).toFixed(0)}%) |`,
  )
  L(`| Median workers at the end | ${median(finalWorkers).toFixed(0)} |`)
  L(`| Median peak workers | ${median(peak).toFixed(0)} |`)
  L(
    `| Range of final worker number | ${Math.min(...finalWorkers)} to ${Math.max(...finalWorkers)} |`,
  )
  L()
  L('Colony failure is expected and is not a defect: the overwhelming majority of real')
  L('founding queens die before their first workers eclose.')
  L()
  L('Per-replicate detail is in `runs.csv`, one row per replicate-year.')
  L()

  L('## 3. Where the numbers come from')
  L()
  L(
    `Every biological constant lives in the parameter file and carries its own provenance tag. No biological constant is hard-coded anywhere in the source, and a test fails the build if one is. This run used **${counts.A}** values measured in *P. badius*, **${counts.B}** generalised from another ant, and **${counts.C}** invented.`,
  )
  L()
  L('- **[A]** documented for *Pogonomyrmex badius* specifically.')
  L('- **[B]** generalised from a different ant because no *badius* measurement exists.')
  L('- **[C]** invented for tractability or playability, with no evidential basis.')
  L()
  L('### The invented values these results rest on')
  L()
  L('A [C] value is not a research failure; it is a place where the literature is silent.')
  L('These are named individually because a count of ninety-odd tells a reviewer nothing')
  L('they can check.')
  L()
  L('| Parameter | Value | Why it is invented |')
  L('|---|---|---|')
  for (const path of LOAD_BEARING_INVENTED) {
    const entry = invented.get(path)
    if (entry === undefined) continue
    const note = (entry.note ?? 'No published value exists.').replace(/\|/g, '\\|')
    L(`| \`${path}\` | ${JSON.stringify(rawValueAt(raw, path))} | ${note} |`)
  }
  L()

  if (warnings.length > 0) {
    L('### Known tensions in the parameter set')
    L()
    L('Reported by the loader rather than hidden.')
    L()
    for (const warning of warnings) L(`- ${warning}`)
    L()
  }

  L('## 4. What this model does not do')
  L()
  L('**Read this before using any output.** These are the model’s own acceptance')
  L('criteria, and it fails some of them. They are recorded here in the same words as in')
  L('`docs/VALIDATION.md`, which is where the full table lives.')
  L()
  L('- **Nest size tracks worker number only roughly.** Tschinkel’s nests obey')
  L('  `log(depth) = 0.95 + 0.37 log(workers)`. Two local rules, a digging budget per ant')
  L('  and digging where she rests, both invented, hold depth within about a third of it in')
  L('  young colonies. A nest never shrinks when its colony does, so older ones run deep.')
  L('- **Germination in a chamber is calibrated, not measured.** The laboratory rates of')
  L('  Tschinkel & Kwapich 2016 are scaled down to reproduce the germinating seeds they')
  L('  counted in natural chambers the ants could not reach. What the larvae eat rests on')
  L('  that factor, and on an invented efficiency with which seed becomes ant.')
  L('- **Colonies grow too slowly on what their foragers bring home.** Larvae eat only')
  L('  what the store yields. Three colonies levelled off at 250 to 300 workers in their')
  L('  fourth and fifth years, where real colonies mature at about 700. Growth is capped by')
  L('  the invented seed density on the ground, and the laying rate is tuned. Colony')
  L('  size, brood and alate output from this build are not the species’.')
  L('- **No relocation.** Annual nest relocation is unbuilt, not merely unvalidated.')
  L('- **Path integration does not drift.** The homing vector is accumulated from the')
  L('  ant’s own steps rather than read off the world, but the accumulation is exact.')
  L('- Branch depth exceeds the 40 cm the papers report.')
  L()
  L('### Mechanics deliberately refused')
  L()
  L('Every one of these is intuitive and wrong for this species. Those marked as tested were')
  L('checked in the field and rejected.')
  L()
  for (const item of NOT_MODELLED) {
    L(
      `- **${item.assumption}**${item.experimentallyRejected ? ' *(tested and rejected)*' : ''} ${item.reason} (${item.citation})`,
    )
  }
  L()

  L('## 5. Sources')
  L()
  L('The biology in this model is not the author’s. It is overwhelmingly the field work')
  L('of Walter R. Tschinkel and Christina L. Kwapich in the Apalachicola National Forest,')
  L('north Florida. **Cite them, not this software, for any biological claim.**')
  L()
  L('### Primary sources')
  L()
  for (const ref of REFERENCES.filter((r) => r.primary === true)) {
    L(`- ${formatReference(ref)}`)
    if (ref.usedFor !== undefined) L(`  - ${ref.usedFor}`)
  }
  L()
  L('### Also cited')
  L()
  for (const ref of REFERENCES.filter((r) => r.primary !== true)) L(`- ${formatReference(ref)}`)
  L()
  L('### On the papers themselves')
  L()
  L(SOURCES_NOTICE)
  L()
  L('## 6. Citing this software')
  L()
  L('> Diez Cuadrado, A. *Anthill Simulator: an agent-based model of Pogonomyrmex badius.*')
  L()
  L('A `CITATION.cff` accompanies the source. Code is MIT; `docs/` and `species/` are')
  L('CC BY 4.0.')
  L()

  return lines.join('\n')
}

function main(): void {
  const options = parseArgs(process.argv.slice(2))
  const speciesPath = resolve(options.species)
  const rawText = readFileSync(speciesPath, 'utf8')
  const paramsHash = createHash('sha256').update(rawText).digest('hex')
  const raw = JSON.parse(rawText) as Record<string, unknown>
  const { params, counts, provenance } = loadSpecies(raw)
  const warnings = consistencyWarnings(params)

  const outDir = resolve(options.out)
  mkdirSync(outDir, { recursive: true })

  const runs: RunRecord[] = []
  const rows: YearRecord[] = []
  let pipeline: readonly string[] = []
  let hashedState: readonly string[] = []

  for (let r = 0; r < options.replicates; r += 1) {
    const seed = options.seedFrom + r
    const started = Date.now()
    const colony = new Colony({ seed, params })
    pipeline = colony.sim.pipeline
    hashedState = colony.sim.hashedState

    const ticksPerYear = colony.sim.clock.ticksPerDay * 365
    const years: YearRecord[] = []
    let diedInYear: number | null = null

    for (let year = 1; year <= options.years; year += 1) {
      colony.run(ticksPerYear)
      const alive = colony.alive
      const record = summaryToYear(seed, year, colony.summary(), colony.sim.digest(), alive)
      years.push(record)
      rows.push(record)
      if (!alive) {
        diedInYear = year
        // A dead colony is not stepped further. Its remaining years would be identical rows
        // and would weight every median towards whatever it died holding.
        break
      }
    }

    const run: RunRecord = {
      seed,
      yearsRequested: options.years,
      yearsSurvived: years.length,
      diedInYear,
      years,
      finalDigest: colony.sim.digest(),
      elapsedMs: Date.now() - started,
    }
    runs.push(run)

    if (options.progress) {
      const last = years[years.length - 1]
      process.stderr.write(
        `seed ${seed}: ${run.yearsSurvived} year(s), ${last?.workers ?? 0} workers, ${diedInYear === null ? 'alive' : `died in year ${diedInYear}`}, ${(run.elapsedMs / 1000).toFixed(1)}s\n`,
      )
    }
  }

  writeFileSync(join(outDir, 'runs.csv'), toCsv(rows))
  writeFileSync(join(outDir, 'runs.jsonl'), `${runs.map((r) => JSON.stringify(r)).join('\n')}\n`)
  writeFileSync(
    join(outDir, 'manifest.json'),
    `${JSON.stringify(
      {
        options,
        paramsSha256: paramsHash,
        commit: gitCommit(),
        workingTreeModified: gitDirty(),
        node: process.version,
        runAt: new Date().toISOString(),
        pipeline,
        hashedState,
        provenanceCounts: counts,
        warnings,
      },
      null,
      2,
    )}\n`,
  )
  writeFileSync(
    join(outDir, 'REPORT.md'),
    report(options, runs, paramsHash, raw, provenance, counts, warnings, pipeline, hashedState),
  )

  process.stdout.write(
    [
      '',
      `Wrote ${rows.length} replicate-years to ${outDir}`,
      '  REPORT.md      methods, provenance, and what this model fails to reproduce',
      '  runs.csv       one row per replicate-year',
      '  runs.jsonl     full per-run records, including the digest chain',
      '  manifest.json  what was run, and against which parameter file',
      '',
      'Read REPORT.md before using runs.csv.',
      '',
    ].join('\n'),
  )
}

main()
