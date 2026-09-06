import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { consistencyWarnings, loadSpecies } from '../src/core/params/index.js'
import { midpoint, sample } from '../src/core/params/schema.js'
import { validateParams } from '../src/core/params/validate.js'
import { Prng } from '../src/core/math/prng.js'

const SPECIES_PATH = join(import.meta.dirname, '..', 'species', 'pogonomyrmex-badius.json')

function rawSpecies(): Record<string, unknown> {
  return JSON.parse(readFileSync(SPECIES_PATH, 'utf8')) as Record<string, unknown>
}

function withEdit(edit: (root: Record<string, unknown>) => void): Record<string, unknown> {
  const root = rawSpecies()
  edit(root)
  return root
}

describe('the shipped species file', () => {
  it('loads', () => {
    const { params } = loadSpecies(rawSpecies())
    expect(params.species.binomial).toBe('Pogonomyrmex badius')
    expect(params.colony.queens.value).toBe(1)
    expect(params.climate.monthly).toHaveLength(12)
  })

  it('tags every constant it contains', () => {
    const { counts, provenance } = loadSpecies(rawSpecies())
    expect(counts.A).toBeGreaterThan(50)
    expect(counts.B).toBeGreaterThan(5)
    expect(counts.C).toBeGreaterThan(5)
    for (const entry of provenance) expect(['A', 'B', 'C']).toContain(entry.tag)
  })

  it('keeps the tag attached to the value at the point of use', () => {
    // This is the whole design of the parameter surface. A system that reads a number has
    // its provenance in hand, so the inspector's citation line cannot drift from the rule
    // the ant is actually following.
    const { params } = loadSpecies(rawSpecies())
    expect(params.labour.foragerFatThreshold).toMatchObject({
      value: 0.1,
      tag: 'A',
      path: 'labour.foragerFatThreshold',
    })
    expect(params.excavation.pelletsPerExcavatorPerHour.tag).toBe('B')
    expect(params.excavation.digRateCollisionSensitivity.tag).toBe('C')
  })

  it('derives the building pheromone decay from its authored lifetime', () => {
    // The two were specified separately and disagreed: 0.998 per tick retains 30% after
    // 600 ticks, not ~0. Lifetime is now the single authored value. DECISIONS.md D6.
    const { params } = loadSpecies(rawSpecies())
    const lifetime = params.excavation.buildingPheromoneLifetimeTicks.value
    const decay = params.pheromones.building.decayPerTick.value
    expect(lifetime).toBe(600)
    expect(decay ** lifetime).toBeCloseTo(0.01, 6)
    expect(params.pheromones.building.decayPerTick.path).toContain('derived')
  })

  it('reports the contradictions it cannot resolve rather than hiding them', () => {
    const { params } = loadSpecies(rawSpecies())
    const text = consistencyWarnings(params).join('\n')

    // D3: candidate sites differ although no site property is known to explain relocation.
    expect(text).toContain('D3')

    // D10: the source states shaft angle twice and inconsistently, and the model uses the
    // body text over the abstract. The file is not edited to make the model comfortable —
    // the paper says what it says — so the disagreement is reported instead.
    expect(text).toContain('D10')
    expect(text).toMatch(/body of Tschinkel 2004/)
  })

  it('does not warn about top-heaviness, because the regression resolves it', () => {
    // The apparent contradiction between the 25-40% decile decay and the 0.5 top-quarter
    // share was an artefact of a secondary account. Tschinkel 2004 regresses the decrease
    // directly and it rises with depth, giving about 0.60 against a reported "about half".
    // See docs/DECISIONS.md D5.
    const { params } = loadSpecies(rawSpecies())
    expect(consistencyWarnings(params).join('\n')).not.toContain('top-quarter share')
  })

  it('would warn if the regression drifted away from the reported top-quarter share', () => {
    const root = withEdit((r) => {
      const nest = r['nest'] as Record<string, Record<string, unknown>>
      nest['chamberAreaDecreaseSlope']!['value'] = 0.3
    })
    const { params } = loadSpecies(root)
    expect(consistencyWarnings(params).join('\n')).toContain('top-quarter share')
  })

  it('has a tick length that divides a day', () => {
    const { params } = loadSpecies(rawSpecies())
    expect(86400 % params.time.secondsPerTick.value).toBe(0)
  })

  it('lets a seed be collected but not opened, or germination has nothing to act on', () => {
    const { params } = loadSpecies(rawSpecies())
    expect(params.foraging.maxCollectableSeedWidthMm.value).toBeGreaterThan(
      params.foraging.maxOpenableSeedWidthMm.value,
    )
  })
})

describe('HARD RULE enforcement', () => {
  /**
   * These are not validation niceties. Each is a behaviour that was tested in this species
   * and rejected, and each is exactly what a well-meaning contributor would "fix". A
   * parameter file that flips one is not a variant run; it is a different animal.
   */
  const hardRules: [string, (root: Record<string, unknown>) => void, RegExp][] = [
    [
      'foragers reverting to inside work',
      (r) => {
        ;(r['labour'] as Record<string, Record<string, unknown>>)['taskReversionAllowed']![
          'value'
        ] = true
      },
      /Kwapich & Tschinkel 2016/,
    ],
    [
      'backfilling castes after forager loss',
      (r) => {
        ;(r['labour'] as Record<string, Record<string, unknown>>)['backfillFromOtherCastes']![
          'value'
        ] = true
      },
      /larval survival suffers instead/,
    ],
    [
      'worker size predicting seed size',
      (r) => {
        ;(r['foraging'] as Record<string, Record<string, unknown>>)['workerSizePredictsSeedSize']![
          'value'
        ] = true
      },
      /Ferster & Traniello 1995/,
    ],
    [
      'worker size predicting foraging distance',
      (r) => {
        ;(r['foraging'] as Record<string, Record<string, unknown>>)[
          'workerSizePredictsForagingDistance'
        ]!['value'] = true
      },
      /Ferster & Traniello 1995/,
    ],
    [
      'majors widening the openable size range',
      (r) => {
        ;(r['seeds'] as Record<string, Record<string, unknown>>)['majorsWidenOpenableSizeRange']![
          'value'
        ] = true
      },
      /raise the RATE/,
    ],
    [
      'more than one queen',
      (r) => {
        ;(r['colony'] as Record<string, Record<string, unknown>>)['queens']!['value'] = 3
      },
      /monogynous/,
    ],
  ]

  for (const [name, edit, expected] of hardRules) {
    it(`refuses to load a file allowing ${name}`, () => {
      expect(() => loadSpecies(withEdit(edit))).toThrow(expected)
      expect(() => loadSpecies(withEdit(edit))).toThrow(/HARD RULE/)
    })
  }
})

describe('tag validation', () => {
  it('rejects an untagged constant', () => {
    const root = withEdit((r) => {
      ;(r['labour'] as Record<string, unknown>)['someNewRate'] = 0.42
    })
    expect(() => validateParams(root)).toThrow(/labour\.someNewRate = 0\.42 has no tag/)
    expect(() => validateParams(root)).toThrow(/CONTRIBUTING\.md/)
  })

  it('rejects a constant hidden inside an untagged object', () => {
    const root = withEdit((r) => {
      ;(r['labour'] as Record<string, unknown>)['nested'] = { deeper: { rate: 7 } }
    })
    expect(() => validateParams(root)).toThrow(/labour\.nested\.deeper\.rate/)
  })

  it('rejects a tag that is not A, B or C', () => {
    const root = withEdit((r) => {
      ;(r['labour'] as Record<string, unknown>)['guess'] = { value: 1, tag: 'probably' }
    })
    expect(() => validateParams(root)).toThrow(/not A, B or C/)
  })

  it('accepts a properly tagged addition', () => {
    const root = withEdit((r) => {
      ;(r['labour'] as Record<string, unknown>)['someNewRate'] = {
        value: 0.42,
        tag: 'C',
        note: 'Invented, exposed as a slider.',
      }
    })
    expect(() => validateParams(root)).not.toThrow()
  })

  it('does not demand tags on the descriptive records', () => {
    // The climate normals and the site coordinates are a factual record of a place, not
    // modelled quantities. Everything else must be tagged.
    expect(() => validateParams(rawSpecies())).not.toThrow()
  })

  it('rejects a file from an unknown schema version', () => {
    expect(() => loadSpecies(withEdit((r) => void (r['schemaVersion'] = 99)))).toThrow(
      /schemaVersion/,
    )
  })
})

describe('range resolution', () => {
  it('is explicit about how a range becomes a number', () => {
    const { params } = loadSpecies(rawSpecies())
    const depth = params.nest.matureDepthCm
    expect(midpoint(depth)).toBe(275)

    const drawn = sample(depth, new Prng(1))
    expect(drawn).toBeGreaterThanOrEqual(depth.min)
    expect(drawn).toBeLessThan(depth.max)

    // Same seed, same colony.
    expect(sample(depth, new Prng(1))).toBe(drawn)
  })
})
