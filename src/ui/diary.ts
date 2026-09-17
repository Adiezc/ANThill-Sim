/**
 * The colony diary, and the "Right now" description above it.
 *
 * Every diary entry is read off the model's own state the first time it becomes true, so the
 * diary is a record of this colony and not a script: a queen whose landing day is rained out
 * writes her entries a day late, and a colony that never finds a seed never writes that entry.
 * Where the biology does something the model does not, the entry says so.
 */

import { Burden } from '../core/state/ants.js'
import { RULE } from '../core/provenance/rules.js'
import { countForagers, countWorkers } from '../core/systems/demography.js'
import { formatDate } from './hud.js'
import type { Colony } from '../core/sim/colony.js'
import type { NestGrid } from '../core/state/nest.js'
import type { Params } from '../core/params/params.js'

export interface DiaryEntry {
  readonly key: string
  readonly date: string
  readonly text: string
}

/** Worker counts worth an entry of their own. */
const WORKER_MILESTONES = [10, 25, 50, 100, 250, 500, 1000, 2000, 4000]

/** Simulated hours without a dug cell before a founding queen's chamber counts as finished. */
const SETTLED_HOURS = 12

/** Simulated hours since the last dug cell within which she is still described as digging. */
const DIGGING_HOURS = 6

/** Seeds in the nest before the diary calls it a store. */
const SEED_STORE = 20

export class ColonyDiary {
  readonly entries: DiaryEntry[] = []
  private readonly seen = new Set<string>()
  private lastDug = -1
  private lastDugTick = 0
  private cellsAtFirstWorker = -1

  constructor(private readonly params: Params) {}

  /** Adds whatever has newly become true, and returns just those entries. */
  update(colony: Colony): DiaryEntry[] {
    const fresh: DiaryEntry[] = []
    const { sim, nest, demography: d, excavation, foraging, interior } = colony
    const { clock } = sim
    const date = clock.date()
    const add = (key: string, text: string): void => {
      if (this.seen.has(key)) return
      this.seen.add(key)
      const entry = { key, date: formatDate(date), text }
      this.entries.push(entry)
      fresh.push(entry)
    }
    this.noteDigging(colony)

    add(
      'landed',
      'The queen lands after her mating flight, breaks off her wings and starts to dig.',
    )
    if (d.foundingEggsLaid > 0) add('first-egg', 'She lays her first eggs while she digs.')
    if (d.phase === 'founding' && d.foundingEggsLaid >= d.nanaticTarget) {
      add(
        'clutch',
        'She has laid ' +
          d.nanaticTarget +
          ' eggs, all she will lay until her daughters hatch. She eats nothing in that time: every egg and larva is paid for from her own fat and wing muscles.',
      )
    }
    const target = excavation.foundingTargetDepthCm
    if (target > 0 && nest.maxDepthCm >= target) {
      add(
        'shaft',
        'Her shaft is ' +
          Math.round(nest.maxDepthCm) +
          ' cm deep, as deep as a new nest of this species goes. She starts a small chamber at the bottom.',
      )
    }
    if (
      this.seen.has('shaft') &&
      d.phase === 'founding' &&
      clock.tick - this.lastDugTick > (SETTLED_HOURS / 24) * clock.ticksPerDay
    ) {
      add(
        'settled',
        'The chamber is finished, and she settles in it with her eggs. A real queen would also plug the entrance with sand. This model leaves it open.',
      )
    }
    if (d.brood.larvaCount >= 0.5) {
      add(
        'first-larva',
        'The first eggs hatch into larvae, small white grubs. The queen feeds them from her own body.',
      )
    }
    if (d.brood.pupaCount >= 0.5) {
      add('first-pupa', 'The first larvae turn into pupae, pale and already shaped like ants.')
    }
    if (d.totalEclosed > 0) {
      if (this.cellsAtFirstWorker < 0) this.cellsAtFirstWorker = nest.excavatedCells
      add(
        'first-worker',
        'Her first daughter hatches: a small, pale worker. Her sisters follow over the next days.',
      )
    }
    if (this.cellsAtFirstWorker >= 0 && nest.excavatedCells > this.cellsAtFirstWorker) {
      add(
        'workers-dig',
        'The workers start digging tunnels and chambers of their own. From now on the queen only lays eggs.',
      )
    }
    if (foraging.antsOnSurface > 0) {
      add('first-forager', 'The first forager goes out onto the ground to look for seeds.')
    }
    if (foraging.totalSeedsCollected > 0) {
      add(
        'first-seed',
        'A forager carries the first seed home. Harvester ants live on the seeds they store.',
      )
    }
    if (interior.seedsInStore >= SEED_STORE) {
      add(
        'seed-store',
        'The colony is keeping a store of seeds, about ' +
          Math.round(meanSeedDepthCm(nest)) +
          ' cm down.',
      )
    }
    const workers = countWorkers(sim)
    for (const n of WORKER_MILESTONES) {
      if (workers >= n) add('workers-' + n, 'The colony has ' + n + ' workers.')
    }
    if (date.month === 12) {
      add('winter-' + date.colonyYear, 'Winter. The queen lays no more eggs until March.')
    }
    if (date.month === 3 && date.colonyYear > 0) {
      add('spring-' + date.colonyYear, 'Spring. The queen starts laying again.')
      if (colony.climate.drought) {
        add(
          'drought-' + date.colonyYear,
          'A drought year. About half the usual rain will fall, the plants will set less seed and the foragers will find less of it. In a real drought colonies of this species stopped growing for the year.',
        )
      }
    }
    if (d.phase === 'mature') {
      add(
        'mature',
        'The colony is now big enough to start raising winged queens and males, the founders of new colonies.',
      )
    }
    if (colony.interior.totalCorpsesCarriedOut > 0) {
      add(
        'first-corpse',
        'A worker carries a dead nestmate up and out of the nest. Ants in other species do this too, taking bodies further from the nest than other rubbish.',
      )
    }
    const reloc = colony.relocation
    if (reloc.moveStartDay >= 0) {
      const cell = colony.surface.cellSizeM
      const metres = Math.hypot(reloc.moveDxCells * cell, reloc.moveDyCells * cell)
      add(
        'move-start-' + reloc.totalMoves,
        'The colony starts moving to a new nest ' +
          metres.toFixed(1) +
          ' m away, along ' +
          (reloc.moveAlongMainTrail ? 'its main trunk trail' : 'one of its foraging trails') +
          '. The workers start digging a new nest and carry the seed store in as they make room. Nobody knows why harvester ant colonies move.',
      )
    }
    reloc.moves.forEach((m, n) => {
      add(
        'move-done-' + n,
        'The move is done after ' +
          m.days +
          ' days. The workers go on enlarging the new nest, and the foragers have new ground to search.',
      )
    })
    colony.flights.flights.forEach((f, n) => {
      const who: string[] = []
      if (f.gynes > 0) who.push(f.gynes + (f.gynes === 1 ? ' winged queen' : ' winged queens'))
      if (f.males > 0) who.push(f.males + (f.males === 1 ? ' male' : ' males'))
      add(
        'flight-' + n,
        (n === 0 ? 'The first mating flight. ' : 'Another mating flight. ') +
          'The morning after heavy rain, ' +
          sentence(who) +
          ' climb out and fly off to mate with ants from other colonies. Each new queen that survives will found a nest of her own.',
      )
    })
    if (d.phase === 'queenless') {
      add(
        'queenless',
        'The queen has died. Nothing can replace her, and the colony will dwindle as its workers age.',
      )
    }
    if (d.phase === 'dead') add('dead', 'The colony has died.')
    return fresh
  }

  /** The weather at this moment, and what it means for the foragers. */
  describeWeather(colony: Colony): string {
    const { sim, climate, soil } = colony
    const date = sim.clock.date()
    const f = date.dayFraction
    const params = this.params
    const airC = Math.round(climate.at(f).airTemperatureC)
    const daytime =
      f >= params.foraging.activeDayFractionStart.value &&
      f <= params.foraging.activeDayFractionEnd.value
    const foragers = countForagers(sim) > 0
    if (climate.isRaining(f)) {
      return foragers
        ? `Raining, ${airC} °C. No forager goes out while it rains, and any outside head home.`
        : `Raining, ${airC} °C.`
    }
    const sky = climate.day.sky
    const dry = climate.drought ? ' A drought year.' : ''
    if (!daytime) {
      const rainedToday = climate.day.rainfallMm > 0 && f > climate.day.rainEndFraction
      return (
        (rainedToday ? 'After rain, ' : sky === 'clear' ? 'Clear night, ' : 'Cloudy night, ') +
        `${airC} °C.` +
        dry +
        (foragers ? ' The foragers are inside until morning.' : '')
      )
    }
    const surfaceC = climate.surfaceTemperatureC(soil.temperatureAt(0, date.dayOfYear, climate), f)
    const skyWord = sky === 'clear' ? 'Sunny' : 'Overcast'
    if (surfaceC > params.foraging.surfaceTemperatureMaxC.value) {
      return `${skyWord}, ${airC} °C, and the sand is over ${params.foraging.surfaceTemperatureMaxC.value} °C. Too hot to forage on${foragers ? ', so the foragers wait inside' : ''}.`
    }
    const later =
      climate.day.rainfallMm > 0 && f < climate.day.rainStartFraction ? ' Rain is on the way.' : ''
    return `${skyWord}, ${airC} °C.${dry}${later}`
  }

  /** What is going on at this moment, and what the colony is living on. */
  describeNow(colony: Colony): { now: string; food: string } {
    const { sim, nest, demography: d, excavation, foraging, interior } = colony
    this.noteDigging(colony)
    const b = d.brood
    const brood = broodWords(b.eggCount, b.larvaCount, b.pupaCount)

    if (d.phase === 'dead') return { now: 'The colony has died.', food: '' }

    if (d.phase === 'founding') {
      const queen = d.queenSlot
      const rule = queen >= 0 ? sim.ants.ruleId[queen] : -1
      const digging =
        sim.clock.tick - this.lastDugTick < (DIGGING_HOURS / 24) * sim.clock.ticksPerDay
      let now: string
      if (nest.maxDepthCm < excavation.foundingTargetDepthCm) {
        now =
          rule === RULE.digMoistureWindow
            ? 'The sand is too wet to dig after rain, so the queen waits for it to drain.'
            : 'The queen is digging her shaft. It is ' +
              (nest.maxDepthCm < 10
                ? nest.maxDepthCm.toFixed(1)
                : String(Math.round(nest.maxDepthCm))) +
              ' cm deep so far.'
      } else if (digging) {
        now = 'The queen is hollowing out a chamber at the bottom of her shaft.'
      } else {
        now = 'The queen rests in her chamber and tends her brood.'
      }
      if (brood !== '') now += ' With her: ' + brood + '.'
      const start = this.params.brood.queenFoundingFatReserve.value
      const left = start > 0 ? Math.round((100 * d.queenReserve) / start) : 0
      return {
        now,
        food:
          'Food: none. Until her daughters hatch, the queen lives on her own reserves, ' +
          left +
          '% of them left.',
      }
    }

    let sand = 0
    let seeds = 0
    let moving = 0
    let dead = 0
    const { ants } = sim
    for (let i = 0; i < ants.count; i += 1) {
      if (!ants.isAlive(i)) continue
      const burden = ants.burden[i]
      if (burden === Burden.SoilPellet) sand += 1
      else if (burden === Burden.Seed) seeds += 1
      else if (burden === Burden.Brood) moving += 1
      else if (burden === Burden.Corpse) dead += 1
    }
    const workers = countWorkers(sim)
    let now =
      workers +
      (workers === 1 ? ' worker' : ' workers') +
      (d.phase === 'queenless' ? ', and no queen.' : ' and the queen.')
    const doing: string[] = []
    if (colony.relocation.moveStartDay >= 0) {
      const r = colony.relocation
      doing.push(
        'moving house, day ' +
          Math.min(r.moveDays, sim.clock.daysElapsed - r.moveStartDay + 1) +
          ' of ' +
          r.moveDays,
      )
    }
    if (colony.flights.aloft > 0) {
      doing.push(
        colony.flights.aloft === 1
          ? 'the last winged ant leaving on its mating flight'
          : colony.flights.aloft + ' winged queens and males leaving on their mating flight',
      )
    }
    if (foraging.antsOnSurface > 0) doing.push(foraging.antsOnSurface + ' out foraging')
    if (sand > 0) doing.push(sand + ' carrying sand')
    if (seeds > 0) doing.push(seeds + ' carrying seeds')
    if (moving > 0) doing.push(moving + ' moving brood')
    if (dead > 0) doing.push(dead + ' carrying the dead out')
    if (doing.length > 0) now += ' ' + sentence(doing) + '.'
    now += brood === '' ? ' No brood right now.' : ' Brood: ' + brood + '.'

    const collected = foraging.totalSeedsCollected
    const food =
      collected === 0
        ? 'Food: seeds, once the foragers find some. None brought home yet.'
        : 'Food: seeds. ' +
          Math.round(interior.seedsInStore) +
          ' in store, ' +
          collected +
          ' brought home so far.'
    return { now, food }
  }

  private noteDigging(colony: Colony): void {
    if (colony.nest.excavatedCells !== this.lastDug) {
      this.lastDug = colony.nest.excavatedCells
      this.lastDugTick = colony.sim.clock.tick
    }
  }
}

/** "13 eggs, 4 larvae and 2 pupae", leaving out any stage there is none of. */
function broodWords(eggs: number, larvae: number, pupae: number): string {
  const parts: string[] = []
  const add = (n: number, one: string, many: string): void => {
    const k = Math.round(n)
    if (k > 0) parts.push(k + ' ' + (k === 1 ? one : many))
  }
  add(eggs, 'egg', 'eggs')
  add(larvae, 'larva', 'larvae')
  add(pupae, 'pupa', 'pupae')
  return sentence(parts)
}

/** Joins phrases as a list in prose, with "and" before the last, and a capital at the start. */
function sentence(parts: readonly string[]): string {
  if (parts.length === 0) return ''
  const joined =
    parts.length === 1
      ? parts[0]!
      : parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1]!
  return joined.charAt(0).toUpperCase() + joined.slice(1)
}

/** The mean depth of the seeds in the nest, in centimetres. */
function meanSeedDepthCm(nest: NestGrid): number {
  const bounds = nest.pheromoneBounds()
  let sum = 0
  let weighted = 0
  for (
    let row = Math.max(0, bounds.minRow);
    row <= Math.min(nest.rows - 1, bounds.maxRow);
    row += 1
  ) {
    for (
      let col = Math.max(0, bounds.minCol);
      col <= Math.min(nest.cols - 1, bounds.maxCol);
      col += 1
    ) {
      const seeds = nest.seeds.get(col, row)
      sum += seeds
      weighted += seeds * nest.depthOf(row)
    }
  }
  return sum > 0 ? weighted / sum : 0
}
