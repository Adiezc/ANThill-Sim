/**
 * The sizes everything in the nest is drawn at, read from the species file.
 *
 * Kept apart from the drawing so that every size on screen traces back to one parameter in
 * one place, and so the legend can print the same numbers the picture uses. All sizes are in
 * millimetres, because that is how the sources give them.
 *
 * Where a size had to be derived rather than read, the derivation is here and the species
 * file says so: the egg's length and width come from a measured volume and an invented shape,
 * and a male's length comes from the queen's length scaled by their measured head widths.
 */

import { Caste } from '../core/state/ants.js'
import type { Params } from '../core/params/params.js'
import type { AntBody } from './ant-sprite.js'

export interface BodySizes {
  readonly minorLengthMm: number
  readonly majorLengthMm: number
  /** Minors grow with the colony, so this one changes as the colony does. */
  readonly minorHeadwidthMm: number
  readonly majorHeadwidthMm: number
  readonly queenLengthMm: number
  readonly queenHeadwidthMm: number
  readonly maleLengthMm: number
  readonly maleHeadwidthMm: number
  readonly eggLengthMm: number
  readonly eggWidthMm: number
  readonly matureLarvaLengthMm: number
  readonly pupaLengthMm: number
  readonly seedLengthMm: number
  readonly seedWidthMm: number
}

/**
 * Seeds are drawn this much longer than wide. Appearance only: on this branch the store is a
 * count of seeds with no size or shape, so a stored seed is drawn at the widest seed a worker
 * can open.
 */
const SEED_LENGTH_TO_WIDTH = 1.5

export function bodySizesFor(params: Params, workers: number): BodySizes {
  const { colony, brood, foraging } = params
  const minorHeadwidthMm =
    colony.minorHeadwidthInterceptMm.value +
    colony.minorHeadwidthSlopeMm.value * Math.log10(Math.max(1, workers))
  const majorHeadwidthMm = (colony.majorHeadwidthMm.min + colony.majorHeadwidthMm.max) / 2
  const queenLengthMm = (colony.queenLengthMm.min + colony.queenLengthMm.max) / 2

  // An egg as a prolate spheroid of the measured volume, V = pi/6 x length x width squared,
  // with width = length / ratio. One nanolitre is a thousandth of a cubic millimetre.
  const ratio = brood.eggLengthToWidth.value
  const eggVolumeMm3 = brood.eggVolumeNl.value / 1000
  const eggLengthMm = Math.cbrt((6 * eggVolumeMm3 * ratio * ratio) / Math.PI)

  const minorLengthMm = colony.minorWorkerLengthMm.value
  const seedWidthMm = foraging.maxOpenableSeedWidthMm.value

  return {
    minorLengthMm,
    majorLengthMm: colony.majorWorkerLengthMm.value,
    minorHeadwidthMm,
    majorHeadwidthMm,
    queenLengthMm,
    queenHeadwidthMm: colony.queenHeadwidthMm.value,
    maleLengthMm: (queenLengthMm * colony.maleHeadwidthMm.value) / colony.queenHeadwidthMm.value,
    maleHeadwidthMm: colony.maleHeadwidthMm.value,
    eggLengthMm,
    eggWidthMm: eggLengthMm / ratio,
    matureLarvaLengthMm: minorLengthMm * brood.matureLarvaLengthToMinorWorker.value,
    pupaLengthMm: minorLengthMm * brood.pupaLengthToAdult.value,
    seedLengthMm: seedWidthMm * SEED_LENGTH_TO_WIDTH,
    seedWidthMm,
  }
}

/**
 * The body an ant of this caste is drawn with, at `pxPerMm`.
 *
 * Workers carry their own length in the ant store. A major is recognised by that length as
 * well as by caste, so a callow that will become a major is already drawn with a major's head.
 */
export function antBodyFor(
  caste: number,
  lengthMm: number,
  sizes: BodySizes,
  pxPerMm: number,
): AntBody {
  const body = (length: number, head: number, form: AntBody['form']): AntBody => ({
    lengthPx: length * pxPerMm,
    headWidthPx: head * pxPerMm,
    form,
  })
  switch (caste) {
    case Caste.Queen:
      return body(sizes.queenLengthMm, sizes.queenHeadwidthMm, 'queen')
    case Caste.Alate:
      return body(sizes.queenLengthMm, sizes.queenHeadwidthMm, 'winged')
    case Caste.Male:
      return body(sizes.maleLengthMm, sizes.maleHeadwidthMm, 'male')
    default: {
      const major = caste === Caste.MajorWorker || lengthMm >= sizes.majorLengthMm - 1e-6
      const length = lengthMm > 0 ? lengthMm : major ? sizes.majorLengthMm : sizes.minorLengthMm
      return body(length, major ? sizes.majorHeadwidthMm : sizes.minorHeadwidthMm, 'worker')
    }
  }
}
