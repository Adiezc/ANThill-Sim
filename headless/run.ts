/**
 * Headless runner.
 *
 * `/core` cannot read a file — it has no `fetch` and no `node:fs` — so the entry point
 * does the reading and hands the parsed JSON in. That constraint is the reason the same
 * core runs unchanged in a browser Worker and here, which is in turn the reason a result
 * seen in the simulator can be reproduced on a cluster.
 *
 *   npm run headless -- --seed 42 --ticks 100000 --species species/pogonomyrmex-badius.json
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { Simulation } from '../src/core/sim/simulation.js'
import { consistencyWarnings, loadSpecies } from '../src/core/params/index.js'

interface Options {
  seed: number
  ticks: number
  species: string
  checkpointEvery: number
  json: boolean
}

function parseArgs(argv: readonly string[]): Options {
  const options: Options = {
    seed: 1,
    ticks: 1440,
    species: 'species/pogonomyrmex-badius.json',
    checkpointEvery: 0,
    json: false,
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
      case '--seed':
        options.seed = Number(next())
        break
      case '--ticks':
        options.ticks = Number(next())
        break
      case '--species':
        options.species = next()
        break
      case '--checkpoint-every':
        options.checkpointEvery = Number(next())
        break
      case '--json':
        options.json = true
        break
      case '--help':
        process.stdout.write(
          'Usage: npm run headless -- [--seed N] [--ticks N] [--species PATH] [--checkpoint-every N] [--json]\n',
        )
        process.exit(0)
        break
      default:
        throw new Error(`Unknown argument ${arg}`)
    }
  }
  return options
}

function main(): void {
  const options = parseArgs(process.argv.slice(2))
  const raw = JSON.parse(readFileSync(resolve(options.species), 'utf8')) as Record<string, unknown>
  const { params, counts, provenance } = loadSpecies(raw)

  const sim = new Simulation({ seed: options.seed, params, capacity: 8192 })

  const checkpoints: { tick: number; digest: string }[] = []
  const every = options.checkpointEvery > 0 ? options.checkpointEvery : options.ticks
  for (let done = 0; done < options.ticks; done += every) {
    sim.run(Math.min(every, options.ticks - done))
    checkpoints.push({ tick: sim.clock.tick, digest: sim.digest() })
  }

  const warnings = consistencyWarnings(params)
  const date = sim.clock.date()

  if (options.json) {
    process.stdout.write(
      `${JSON.stringify(
        {
          species: params.species.binomial,
          seed: options.seed,
          ticks: options.ticks,
          pipeline: sim.pipeline,
          provenanceCounts: counts,
          finalDate: date,
          digest: sim.digest(),
          checkpoints,
          warnings,
        },
        null,
        2,
      )}\n`,
    )
    return
  }

  const lines = [
    `${params.species.common} (${params.species.binomial})`,
    `${params.species.habitat}`,
    '',
    `seed        ${options.seed}`,
    `ticks       ${options.ticks} at ${params.time.secondsPerTick.value}s each`,
    `date        year ${date.colonyYear}, month ${date.month}, day ${date.dayOfMonth}`,
    `pipeline    ${sim.pipeline.length === 0 ? '(no systems registered yet)' : sim.pipeline.join(' -> ')}`,
    `digest      ${sim.digest()}`,
    '',
    `provenance  ${counts.A} values documented for this species [A]`,
    `            ${counts.B} generalised from another ant [B]`,
    `            ${counts.C} invented, tunable, uncited [C]`,
    `            ${provenance.length} tagged values in total`,
  ]
  if (warnings.length > 0) {
    lines.push('', 'Known tensions in the parameter set, reported rather than hidden:')
    for (const warning of warnings) lines.push(`  - ${warning}`)
  }
  process.stdout.write(`${lines.join('\n')}\n`)
}

main()
