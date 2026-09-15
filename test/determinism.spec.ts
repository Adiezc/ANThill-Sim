import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Simulation } from '../src/core/sim/simulation.js'
import type { System } from '../src/core/sim/simulation.js'
import { Caste, Domain, Task } from '../src/core/state/ants.js'
import { cosHeading, sinHeading } from '../src/core/math/trig.js'
import { loadSpecies } from '../src/core/params/index.js'

/**
 * The headline guarantee: the same seed and the same parameter file produce the same run.
 *
 * The systems exercised here are deliberately not biology. They are a stress test for the
 * kernel — they move ants, spawn and kill them, draw from the PRNG in data-dependent ways,
 * and turn headings — chosen because those are the operations that would expose a
 * divergence. The real mechanics arrive as their own systems and inherit this guarantee
 * rather than re-proving it.
 */

const SPECIES = loadSpecies(
  JSON.parse(
    readFileSync(join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json'), 'utf8'),
  ) as Record<string, unknown>,
).params

/** Wanders every living ant, drawing a variable number of times depending on state. */
const wander: System = (sim) => {
  const { ants, prng } = sim
  for (let i = 0; i < ants.count; i += 1) {
    if (!ants.isAlive(i)) continue
    ants.turn(i, prng.nextInt(21) - 10)
    const speed = prng.nextFloat() * 0.1
    ants.x[i] = ants.x[i]! + cosHeading(ants.heading[i]!) * speed
    ants.y[i] = ants.y[i]! + sinHeading(ants.heading[i]!) * speed
    // A data-dependent extra draw. If anything about iteration order or float arithmetic
    // differed between two runs, this is where they would fall out of step.
    if (ants.x[i]! > 0) ants.fat[i] = prng.nextFloat()
  }
}

/** Births and deaths, so slot reuse and the free list are exercised too. */
const turnover: System = (sim) => {
  const { ants, prng } = sim
  if (prng.chance(0.3)) {
    const slot = ants.spawn(prng.chance(0.07) ? Caste.MajorWorker : Caste.MinorWorker, Domain.Nest)
    if (slot >= 0) ants.task[slot] = Task.BroodCare
  }
  for (let i = 0; i < ants.count; i += 1) {
    if (ants.isAlive(i) && prng.chance(0.002)) ants.kill(i)
  }
}

const ageing: System = (sim) => {
  const { ants } = sim
  for (let i = 0; i < ants.count; i += 1) {
    if (ants.isAlive(i)) ants.ageTicks[i] = ants.ageTicks[i]! + 1
  }
}

function build(seed: number): Simulation {
  const sim = new Simulation({ seed, params: SPECIES, capacity: 512, startDayOfYear: 150 })
  sim.register('wander', wander).register('turnover', turnover).register('ageing', ageing)
  sim.ants.spawn(Caste.Queen, Domain.Nest)
  return sim
}

/** Digests at every checkpoint, so a divergence is located rather than merely detected. */
function checkpoints(seed: number, ticks: number, every: number): string[] {
  const sim = build(seed)
  const out: string[] = [sim.digest()]
  for (let t = 0; t < ticks; t += every) {
    sim.run(every)
    out.push(sim.digest())
  }
  return out
}

describe('determinism', () => {
  it('gives the same run for the same seed', () => {
    const a = checkpoints(20240607, 5000, 250)
    const b = checkpoints(20240607, 5000, 250)
    expect(a).toEqual(b)
  })

  it('locates a divergence at the tick it happens, not at the end', () => {
    // Two identical runs, one of them nudged once, a third of the way in. Checkpointing
    // has to place the divergence at the checkpoint after the nudge and not merely notice
    // it at the finish, or debugging a broken run means bisecting a simulated decade.
    const clean = build(11)
    const nudged = build(11)
    const cleanDigests: string[] = []
    const nudgedDigests: string[] = []

    for (let checkpoint = 0; checkpoint < 20; checkpoint += 1) {
      clean.run(100)
      nudged.run(100)
      if (checkpoint === 6) nudged.ants.x[0] = nudged.ants.x[0]! + 1e-6
      cleanDigests.push(clean.digest())
      nudgedDigests.push(nudged.digest())
    }

    const firstDivergence = cleanDigests.findIndex((d, i) => d !== nudgedDigests[i])
    expect(firstDivergence).toBe(6)
    expect(cleanDigests.slice(0, 6)).toEqual(nudgedDigests.slice(0, 6))
  })

  it('gives different runs for different seeds', () => {
    const digests = [1, 2, 3, 99, 20240607].map((seed) => {
      const sim = build(seed)
      sim.run(2000)
      return sim.digest()
    })
    expect(new Set(digests).size).toBe(digests.length)
  })

  it('does not care how the ticks are batched', () => {
    // Playback speed changes how many ticks run per frame and nothing else. A run at 32x
    // and the same run at 1x must be the same run.
    const oneAtATime = build(7)
    for (let i = 0; i < 3000; i += 1) oneAtATime.step()

    const inChunks = build(7)
    inChunks.run(1000)
    inChunks.run(1)
    inChunks.run(1999)

    expect(oneAtATime.digest()).toBe(inChunks.digest())
    expect(oneAtATime.clock.tick).toBe(inChunks.clock.tick)
  })

  it('survives a save and restore mid-run', () => {
    const original = build(4242)
    original.run(1500)
    const savedPrng = original.prng.snapshot()
    const savedClock = original.clock.snapshot()

    const resumed = build(4242)
    resumed.run(1500)
    resumed.prng.restore(savedPrng)
    resumed.clock.restore(savedClock)

    original.run(500)
    resumed.run(500)
    expect(resumed.digest()).toBe(original.digest())
  })

  it('notices if a system is dropped or reordered', () => {
    // System order is part of the model, not an implementation detail.
    const forward = new Simulation({ seed: 5, params: SPECIES, capacity: 128 })
    forward.register('wander', wander).register('turnover', turnover)
    forward.ants.spawn(Caste.Queen, Domain.Nest)
    forward.run(500)

    const reversed = new Simulation({ seed: 5, params: SPECIES, capacity: 128 })
    reversed.register('turnover', turnover).register('wander', wander)
    reversed.ants.spawn(Caste.Queen, Domain.Nest)
    reversed.run(500)

    expect(reversed.digest()).not.toBe(forward.digest())
    expect(forward.pipeline).toEqual(['wander', 'turnover'])
  })

  it('pins the run to a committed digest', () => {
    /**
     * The cross-engine guarantee. This value was produced in Node; the browser build must
     * produce the same one, and does, because nothing in /core touches an unspecified Math
     * function or ambient randomness.
     *
     * If this changes, every run anyone has already published has been invalidated.
     * Regenerate deliberately and say so in the pull request. See docs/DETERMINISM.md.
     *
     * Regenerated once, when foraging landed: the ant store gained the two site-fidelity
     * fields, and the digest widened to cover the nest, soil, brood and surface as well as
     * the ants. Both change what the hash is taken over, so the value moved for a stated
     * reason rather than a mysterious one. The previous value was 5b0d3c6947024b0b.
     *
     * Regenerated again when the interior of the nest was modelled: the ant store gained
     * `preferredDepthCm`, and the nest grid gained the seed and brood layers, so the hash is
     * again taken over more than it was. The run itself is unchanged — this simulation has
     * none of those systems in it — and the previous value was 14b17c699c52ab0b.
     *
     * Regenerated a third time when seeds and digging were merged: the ant store gained
     * `seedClass`, so a carried seed remembers what it is, and `dugCells`, the sand each ant
     * has moved herself. The hash therefore covers two arrays more. The run itself is
     * unchanged: this simulation has neither seed carrying nor excavation in it. The value
     * below was regenerated after the merge. See docs/DECISIONS.md D22 and D28.
     */
    const sim = build(20240607)
    sim.run(10000)
    expect(sim.digest()).toBe('5faa4469551c330b')
  })
})
