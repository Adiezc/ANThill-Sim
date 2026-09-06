import { describe, expect, it } from 'vitest'
import { Prng } from '../src/core/math/prng.js'
import { AntStore, Burden, Caste, Domain, Task } from '../src/core/state/ants.js'
import { StateHasher, hashBuffers } from '../src/core/state/hash.js'
import { Clock } from '../src/core/sim/clock.js'

describe('Prng', () => {
  it('is reproducible from a seed', () => {
    const a = new Prng(12345)
    const b = new Prng(12345)
    for (let i = 0; i < 1000; i += 1) expect(a.nextUint32()).toBe(b.nextUint32())
  })

  it('separates adjacent seeds', () => {
    // A user typing 1, 2, 3 should get three unrelated colonies, not three variations on
    // one. This is what the splitmix32 expansion in the constructor is for.
    const first = [1, 2, 3].map((s) => new Prng(s).nextUint32())
    expect(new Set(first).size).toBe(3)
    for (const value of first) expect(value).toBeGreaterThan(0xffff)
  })

  it('produces floats in [0, 1)', () => {
    const rng = new Prng(7)
    let min = 1
    let max = 0
    let outOfRange = 0
    for (let i = 0; i < 200000; i += 1) {
      const v = rng.nextFloat()
      if (v < 0 || v >= 1) outOfRange += 1
      if (v < min) min = v
      if (v > max) max = v
    }
    expect(outOfRange).toBe(0)
    expect(min).toBeLessThan(0.001)
    expect(max).toBeGreaterThan(0.999)
  })

  it('is uniform enough for a simulation', () => {
    const rng = new Prng(99)
    const buckets = new Uint32Array(16)
    const draws = 320000
    for (let i = 0; i < draws; i += 1) buckets[rng.nextInt(16)]! += 1
    const expected = draws / 16
    for (const count of buckets) expect(Math.abs(count - expected) / expected).toBeLessThan(0.03)
  })

  it('consumes a deterministic number of draws for nextInt', () => {
    // Rejection sampling must not make the stream position depend on anything but the
    // stream itself, or two runs would drift apart at the first non-power-of-two bound.
    const a = new Prng(4242)
    const b = new Prng(4242)
    for (let i = 0; i < 500; i += 1) a.nextInt(7)
    for (let i = 0; i < 500; i += 1) b.nextInt(7)
    expect(a.nextUint32()).toBe(b.nextUint32())
  })

  it('round-trips its state', () => {
    const rng = new Prng(2024)
    for (let i = 0; i < 50; i += 1) rng.nextUint32()
    const saved = rng.snapshot()
    const expected = [rng.nextUint32(), rng.nextUint32(), rng.nextUint32()]

    const restored = new Prng(0)
    restored.restore(saved)
    expect([restored.nextUint32(), restored.nextUint32(), restored.nextUint32()]).toEqual(expected)
  })

  it('draws a plausible standard normal', () => {
    const rng = new Prng(31337)
    let sum = 0
    let sumSq = 0
    const n = 200000
    for (let i = 0; i < n; i += 1) {
      const v = rng.nextNormal()
      sum += v
      sumSq += v * v
    }
    expect(Math.abs(sum / n)).toBeLessThan(0.01)
    expect(Math.abs(Math.sqrt(sumSq / n) - 1)).toBeLessThan(0.01)
  })
})

describe('AntStore', () => {
  it('allocates, kills and reuses slots without reusing ids', () => {
    const store = new AntStore(8)
    const a = store.spawn(Caste.Queen, Domain.Surface)
    const b = store.spawn(Caste.MinorWorker, Domain.Nest)
    expect(store.id[a]).toBe(1)
    expect(store.id[b]).toBe(2)

    store.kill(a)
    expect(store.isAlive(a)).toBe(false)

    const c = store.spawn(Caste.MajorWorker, Domain.Nest)
    expect(c).toBe(a) // slot reused
    expect(store.id[c]).toBe(3) // id is not
    expect(store.count).toBe(2)
  })

  it('refuses to overflow rather than reallocating mid-tick', () => {
    const store = new AntStore(2)
    expect(store.spawn(Caste.MinorWorker, Domain.Nest)).toBe(0)
    expect(store.spawn(Caste.MinorWorker, Domain.Nest)).toBe(1)
    expect(store.spawn(Caste.MinorWorker, Domain.Nest)).toBe(-1)
  })

  it('has no soldier caste', () => {
    // P. badius has no defensive caste and majors are seed-crackers. If a value for one
    // ever appears here, something has drifted away from the species.
    // See docs/SCIENCE.md section 11.
    expect(Object.keys(Caste)).toEqual([
      'Queen',
      'Alate',
      'Male',
      'MinorWorker',
      'MajorWorker',
      'Callow',
    ])
    expect(Object.keys(Caste).some((k) => /soldier|warrior|defend/i.test(k))).toBe(false)
  })

  it('wraps headings exactly', () => {
    const store = new AntStore(1)
    const ant = store.spawn(Caste.MinorWorker, Domain.Nest)
    store.turn(ant, -1)
    expect(store.heading[ant]).toBe(4095)
    store.turn(ant, 1)
    expect(store.heading[ant]).toBe(0)
    store.turn(ant, 4096 * 3 + 5)
    expect(store.heading[ant]).toBe(5)
  })

  it('exposes every buffer for hashing', () => {
    const store = new AntStore(4)
    // If a field is added and not listed in buffers(), it silently drops out of the
    // determinism guarantee. This catches that.
    const fields = Object.keys(store).filter((k) => ArrayBuffer.isView(store[k as never]))
    expect(store.buffers().length).toBe(fields.length)
  })

  it('keeps Task and Burden in step with the species', () => {
    expect(Task.Forager).toBeGreaterThan(Task.BroodCare) // one-way progression, in order
    expect(Burden.Nothing).toBe(0)
  })
})

describe('StateHasher', () => {
  it('is stable for identical input and sensitive to any change', () => {
    const a = Float32Array.of(1, 2, 3)
    const b = Float32Array.of(1, 2, 3)
    expect(hashBuffers([a])).toBe(hashBuffers([b]))

    b[2] = 3.0000005 // a genuinely different float32, one ulp up from 3
    expect(b[2]).not.toBe(a[2])
    expect(hashBuffers([a])).not.toBe(hashBuffers([b]))
  })

  it('distinguishes zero from negative zero', () => {
    // Positional arithmetic can produce -0, and a digest that cannot see it would let two
    // genuinely different states claim to be the same run.
    expect(hashBuffers([Float64Array.of(0)])).not.toBe(hashBuffers([Float64Array.of(-0)]))
  })

  it('is order-sensitive', () => {
    const a = Uint8Array.of(1)
    const b = Uint8Array.of(2)
    expect(hashBuffers([a, b])).not.toBe(hashBuffers([b, a]))
  })

  it('produces 64 bits of hex', () => {
    expect(new StateHasher().absorbInt(1).digest()).toMatch(/^[0-9a-f]{16}$/)
  })
})

describe('Clock', () => {
  it('rejects a tick length that does not divide a day', () => {
    expect(() => new Clock(7)).toThrow(/divide a day/)
    expect(() => new Clock(0)).toThrow()
  })

  it('counts 1440 ticks in a day at one simulated minute per tick', () => {
    const clock = new Clock(60)
    expect(clock.ticksPerDay).toBe(1440)
    expect(clock.ticksFromDays(43)).toBe(61920)
  })

  it('walks the calendar without a Date', () => {
    const clock = new Clock(60)
    expect(clock.date()).toMatchObject({ colonyYear: 0, month: 1, dayOfMonth: 1, dayOfYear: 0 })

    for (let i = 0; i < 1440 * 31; i += 1) clock.advance()
    expect(clock.date()).toMatchObject({ month: 2, dayOfMonth: 1 })

    for (let i = 0; i < 1440 * 334; i += 1) clock.advance()
    expect(clock.date()).toMatchObject({ colonyYear: 1, month: 1, dayOfMonth: 1 })
  })

  it('reports the time of day, which relocation and foraging both need', () => {
    const clock = new Clock(60)
    for (let i = 0; i < 720; i += 1) clock.advance()
    expect(clock.date().dayFraction).toBe(0.5)
    expect(clock.isDayBoundary).toBe(false)
  })

  it('starts on the day it is told to', () => {
    // A colony founded by a June nuptial flight is not founded on 1 January.
    const clock = new Clock(60, 165)
    expect(clock.date()).toMatchObject({ month: 6, dayOfMonth: 15 })
  })
})
