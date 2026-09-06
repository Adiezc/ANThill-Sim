/**
 * Brood, as daily cohorts rather than individuals.
 *
 * A mature colony holds thousands of eggs and larvae, and nothing in the model ever needs
 * to distinguish one egg from another: they are laid on a day, they age, some die, and the
 * survivors become adults. So brood is three ring buffers indexed by age in days, one per
 * stage, holding counts. That is exact, cheap, trivially serialisable and hashable, and it
 * means the whole demographic engine is a handful of array operations a day.
 *
 * Counts are `Float32Array` rather than integer, so that a mortality rate can take a
 * fraction of a cohort without either rounding it to nothing or needing a random draw per
 * individual. An egg is not really a divisible thing, but a cohort of four thousand is.
 */

/** What a cohort is destined to become. Set when the egg is laid, not later. */
export const BroodFate = {
  Worker: 0,
  /** A female destined to be a winged reproductive. */
  Alate: 1,
  Male: 2,
} as const
export type BroodFateValue = (typeof BroodFate)[keyof typeof BroodFate]

const FATES = 3

export class BroodStore {
  readonly eggDays: number
  readonly larvaDays: number
  readonly pupaDays: number

  /** counts[fate][ageInDays] for each stage. */
  readonly eggs: Float32Array
  readonly larvae: Float32Array
  readonly pupae: Float32Array

  constructor(eggDays: number, larvaDays: number, pupaDays: number) {
    this.eggDays = Math.max(1, Math.round(eggDays))
    this.larvaDays = Math.max(1, Math.round(larvaDays))
    this.pupaDays = Math.max(1, Math.round(pupaDays))
    this.eggs = new Float32Array(FATES * this.eggDays)
    this.larvae = new Float32Array(FATES * this.larvaDays)
    this.pupae = new Float32Array(FATES * this.pupaDays)
  }

  private static total(buffer: Float32Array): number {
    let sum = 0
    for (let i = 0; i < buffer.length; i += 1) sum += buffer[i]!
    return sum
  }

  get eggCount(): number {
    return BroodStore.total(this.eggs)
  }
  get larvaCount(): number {
    return BroodStore.total(this.larvae)
  }
  get pupaCount(): number {
    return BroodStore.total(this.pupae)
  }
  get total(): number {
    return this.eggCount + this.larvaCount + this.pupaCount
  }

  countOfFate(buffer: Float32Array, stageDays: number, fate: BroodFateValue): number {
    let sum = 0
    for (let age = 0; age < stageDays; age += 1) sum += buffer[fate * stageDays + age]!
    return sum
  }

  lay(fate: BroodFateValue, count: number): void {
    this.eggs[fate * this.eggDays] = this.eggs[fate * this.eggDays]! + count
  }

  /**
   * Advances every cohort by one day, applying stage mortality, and returns the adults that
   * eclosed. Ageing runs from the oldest cohort downward so that a cohort is never advanced
   * twice in one day.
   */
  advanceDay(
    eggSurvival: number,
    larvaSurvival: number,
    pupaSurvival: number,
  ): Record<BroodFateValue, number> {
    const eclosed: Record<BroodFateValue, number> = { 0: 0, 1: 0, 2: 0 }

    for (let fate = 0 as BroodFateValue; fate < FATES; fate = (fate + 1) as BroodFateValue) {
      const eggBase = fate * this.eggDays
      const larvaBase = fate * this.larvaDays
      const pupaBase = fate * this.pupaDays

      // Pupae: the oldest cohort ecloses, the rest age.
      eclosed[fate] += this.pupae[pupaBase + this.pupaDays - 1]! * pupaSurvival
      for (let age = this.pupaDays - 1; age > 0; age -= 1) {
        this.pupae[pupaBase + age] = this.pupae[pupaBase + age - 1]! * pupaSurvival
      }
      this.pupae[pupaBase] = 0

      // Larvae: the oldest cohort pupates.
      this.pupae[pupaBase] = this.larvae[larvaBase + this.larvaDays - 1]! * larvaSurvival
      for (let age = this.larvaDays - 1; age > 0; age -= 1) {
        this.larvae[larvaBase + age] = this.larvae[larvaBase + age - 1]! * larvaSurvival
      }
      this.larvae[larvaBase] = 0

      // Eggs: the oldest cohort hatches.
      this.larvae[larvaBase] = this.eggs[eggBase + this.eggDays - 1]! * eggSurvival
      for (let age = this.eggDays - 1; age > 0; age -= 1) {
        this.eggs[eggBase + age] = this.eggs[eggBase + age - 1]! * eggSurvival
      }
      this.eggs[eggBase] = 0
    }

    return eclosed
  }

  /**
   * Removes a fraction of the larvae, oldest first.
   *
   * This is what happens when a colony cannot feed its brood. It is the *only* thing that
   * happens: removing half a colony's foragers drew no replacements from any other caste,
   * and larval survival suffered instead. See docs/SCIENCE.md section 4.
   */
  starveLarvae(fraction: number): number {
    if (fraction <= 0) return 0
    let lost = 0
    for (let i = 0; i < this.larvae.length; i += 1) {
      const taken = this.larvae[i]! * fraction
      this.larvae[i] = this.larvae[i]! - taken
      lost += taken
    }
    return lost
  }

  /**
   * Clears brood that cannot possibly complete development before winter.
   *
   * P. badius colonies do not overwinter with brood, and October is the latest date of
   * pupal eclosion. Larvae still present after that were observed in the field and were
   * doomed; the colony does not carry them through. HARD RULE.
   */
  clearForWinter(): number {
    const lost = this.eggCount + this.larvaCount
    this.eggs.fill(0)
    this.larvae.fill(0)
    return lost
  }

  buffers(): ArrayBufferView[] {
    return [this.eggs, this.larvae, this.pupae]
  }
}
