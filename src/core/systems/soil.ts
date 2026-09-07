/**
 * The soil: temperature, moisture and stress, as three grids over the nest slice.
 *
 * None of this is decoration.
 *
 *  - **Temperature** drives seed germination in the storage chambers, which is the
 *    mechanic this simulator exists for, and it drives how deep the colony digs.
 *  - **Moisture** gates excavation: ants cannot work fully dry or fully saturated sand,
 *    and tunnels are deepest at intermediate moisture.
 *  - **Stress** is what keeps a tunnel standing. Ants remove grains that are carrying
 *    little load; force chains arch over the void and shield it. No ant senses the force
 *    network — the arching is a consequence of which grains were easy to take.
 *
 * See docs/SCIENCE.md sections 2, 3 and 9.
 */

import { exp } from '../math/approx.js'
import { sinTurns } from '../math/trig.js'
import { Grid2D } from '../state/grid.js'
import { DAYS_IN_YEAR } from '../sim/calendar.js'
import type { Params } from '../params/params.js'
import type { ClimateModel } from './climate.js'

/**
 * The part of the nest the soil model needs: which cells are void. Declared structurally
 * so that soil does not depend on the nest module, only on the question it asks of it.
 */
export interface NestOccupancy {
  isVoid(col: number, row: number): boolean
}

/**
 * Damping depth of the annual soil temperature wave, in centimetres, derived from the
 * thermal lag in the parameter file rather than authored separately.
 *
 * For a sinusoidal surface forcing, the phase lag at depth z is z / (D omega) and the
 * amplitude is damped by exp(-z / D), with the same D in both. So a lag quoted in days per
 * metre pins D exactly: D = 1 / (lag * omega), with omega = 2 pi / 365 per day. At the
 * tabulated 30 days per metre this gives about 1.94 m, which is the right order for dry
 * sand, and it means the amplitude at 3 m is about a fifth of the surface swing.
 */
export function dampingDepthCm(params: Params): number {
  const lagDaysPerMetre = params.climate.soilThermalLagDaysPerMetre.value
  const omegaPerDay = (2 * Math.PI) / DAYS_IN_YEAR
  return (100 / (lagDaysPerMetre * omegaPerDay)) * 1
}

export class SoilModel {
  /** Fraction of saturation, 0 to 1. */
  readonly moisture: Grid2D
  /** Degrees Celsius. */
  readonly temperature: Grid2D
  /**
   * Normalised vertical load, 0 at the surface and 1 at the bottom of an undisturbed
   * grid, modified by arching around every void.
   */
  readonly stress: Grid2D
  /** Overburden with no voids, kept so arching can be recomputed against a clean baseline. */
  private readonly overburden: Float32Array

  private readonly params: Params
  private readonly dampingCm: number

  /**
   * The arching stencil, precomputed.
   *
   * `stressAt` asks the same geometric question of every cell it is called on — which
   * neighbours lie inside the arching radius, and which of those are in the cone above —
   * and the answer depends only on the radius. Recomputing it per call, with a square root
   * per neighbour, was a third of the entire running time of the simulation once a colony
   * had a few hundred diggers. The offsets are held as flat column/row pairs so the hot
   * loop reads two integers rather than dereferencing a point object.
   *
   * This is a rearrangement, not a change of model: the same cells are visited, in the same
   * order, and the arithmetic on them is unchanged.
   */
  private readonly archRadius: number
  private readonly aboveConeOffsets: Int32Array
  private readonly sideOffsets: Int32Array

  constructor(params: Params) {
    this.params = params
    const cell = params.discretisation.nestCellSizeCm.value
    const cols = Math.round(params.discretisation.nestWidthCm.value / cell)
    const rows = Math.round(params.discretisation.nestDepthCm.value / cell)

    // Row 0 is the surface; y increases downward and is depth in centimetres.
    this.moisture = new Grid2D(cols, rows, cell, -params.discretisation.nestWidthCm.value / 2, 0)
    this.temperature = new Grid2D(cols, rows, cell, -params.discretisation.nestWidthCm.value / 2, 0)
    this.stress = new Grid2D(cols, rows, cell, -params.discretisation.nestWidthCm.value / 2, 0)
    this.overburden = new Float32Array(this.stress.length)
    this.dampingCm = dampingDepthCm(params)

    this.moisture.fill(params.soil.deepMoisture.value)
    this.initialiseStress()

    this.archRadius = Math.max(1, Math.round(params.soil.archingRadiusCm.value / cell))
    const above: number[] = []
    const side: number[] = []
    const radius = this.archRadius
    for (let dRow = -radius; dRow <= radius; dRow += 1) {
      for (let dCol = -radius; dCol <= radius; dCol += 1) {
        if (dRow === 0 && dCol === 0) continue
        if (Math.sqrt(dCol * dCol + dRow * dRow) > radius) continue
        // A void within the cone above this cell interrupts the column of sand over it.
        if (dRow < 0 && Math.abs(dCol) <= -dRow) above.push(dCol, dRow)
        else if (dRow >= 0 || Math.abs(dCol) > -dRow) side.push(dCol, dRow)
      }
    }
    this.aboveConeOffsets = Int32Array.from(above)
    this.sideOffsets = Int32Array.from(side)
  }

  /**
   * Overburden rises linearly with depth and is normalised so that the bottom of the grid
   * reads 1. Bulk density is carried so the profile responds to the parameter, even though
   * the normalisation cancels it; a denser sand would change the ratio if the model is ever
   * extended to compare substrates.
   */
  private initialiseStress(): void {
    const maxDepth = this.stress.yOf(this.stress.height - 1)
    this.stress.fillByRow((_row, depthCm) => depthCm / maxDepth)
    this.overburden.set(this.stress.data)
  }

  /**
   * Soil temperature: the seasonal air cycle, lagged and damped with depth.
   *
   * T(z, t) = mean + A exp(-z/D) sin(2 pi (t - peak) - z/D)
   *
   * Written in turns rather than radians so the portable sine can be used. The z/D term
   * appears twice on purpose: the same damping depth sets both how much the swing shrinks
   * and how far behind the surface it runs, which is why deep chambers are still warming in
   * autumn while the surface has already cooled.
   */
  temperatureAt(depthCm: number, dayOfYear: number, climate: ClimateModel): number {
    const mean = climate.annualMeanC + this.params.soil.surfaceTemperatureOffsetC.value
    const amplitude = climate.annualAmplitudeC
    const zOverD = depthCm / this.dampingCm
    const phaseTurns =
      dayOfYear / DAYS_IN_YEAR - climate.annualPeakDayFraction - zOverD / (2 * Math.PI)
    // sin peaks a quarter turn after its zero, so shift to put the peak on the peak day.
    return mean + amplitude * exp(-zOverD) * sinTurns(phaseTurns + 0.25)
  }

  /** Refreshes the whole temperature grid. Called once a day; it varies only with depth. */
  updateTemperature(dayOfYear: number, climate: ClimateModel): void {
    this.temperature.fillByRow((_row, depthCm) => this.temperatureAt(depthCm, dayOfYear, climate))
  }

  /**
   * Rain wets the sand from the top down; between rains only shallow soil dries out.
   *
   * Sand holds little water, so a millimetre of rain wets about a centimetre of depth and
   * anything below the wetting front is untouched by today's weather. Drying falls off
   * exponentially with `evaporationDepthCm`, which is why a summer drought closes the top
   * of the nest to excavation while the seed chambers at 20 to 80 cm stay damp.
   *
   * Every value in this model is invented; none is published for these nests.
   */
  updateMoisture(rainfallMm: number): void {
    const { moisture } = this
    const soil = this.params.soil
    const wettingFrontCm = rainfallMm * soil.infiltrationDepthCmPerMm.value
    const deep = soil.deepMoisture.value
    const wet = soil.surfaceMoistureMax.value
    const dryingRate = soil.dryingRatePerDay.value
    const evapDepth = soil.evaporationDepthCm.value

    for (let row = 0; row < moisture.height; row += 1) {
      const depthCm = moisture.yOf(row)
      const base = row * moisture.width

      // Drying, strongest at the surface and negligible below the evaporation depth.
      const dryFraction = dryingRate * exp(-depthCm / evapDepth)
      // Wetting, applied only above today's wetting front.
      const wetFraction = depthCm <= wettingFrontCm ? 1 - depthCm / (wettingFrontCm + 1) : 0

      for (let col = 0; col < moisture.width; col += 1) {
        const i = base + col
        let m = moisture.data[i]!
        m += (deep - m) * dryFraction
        if (wetFraction > 0) m += (wet - m) * wetFraction
        moisture.data[i] = m < 0 ? 0 : m > 1 ? 1 : m
      }
    }
  }

  /**
   * True where the sand can be worked at all. Ants cannot excavate fully dry or fully
   * saturated sand; tunnels are deepest at intermediate moisture.
   */
  isDiggable(col: number, row: number): boolean {
    const m = this.moisture.get(col, row)
    return (
      m >= this.params.excavation.soilMoistureDiggableMin.value &&
      m <= this.params.excavation.soilMoistureDiggableMax.value
    )
  }

  /**
   * How workable this cell is, peaking at the optimal moisture and falling to zero at the
   * edges of the diggable window. A smooth hump rather than a step, so a drying spell slows
   * excavation before it stops it.
   */
  workability(col: number, row: number): number {
    const m = this.moisture.get(col, row)
    const exc = this.params.excavation
    const lo = exc.soilMoistureDiggableMin.value
    const hi = exc.soilMoistureDiggableMax.value
    const best = exc.soilMoistureOptimal.value
    if (m <= lo || m >= hi) return 0
    const spread = m < best ? best - lo : hi - best
    const offset = (m - best) / spread
    return 1 - offset * offset
  }

  /**
   * Vertical load on the grain at a cell, in [0, 1].
   *
   * Overburden rises with depth. A void changes how that load is carried around it: soil
   * directly above and below is shielded, because the column of sand over it now ends at
   * the roof of the void rather than continuing to the surface, while soil to the side
   * takes up what the void can no longer carry. That is arching, and it is why a tunnel
   * stays open.
   *
   * This is computed on demand from the void configuration nearby, not accumulated as
   * cells are dug. Accumulating was the obvious implementation and it was wrong: each void
   * added load to its neighbours with nothing taking it away, so after a few dozen cells
   * every grain around the nest was at maximum load and no ant could remove anything. Load
   * is redistributed by a void, not created by one.
   *
   * No ant senses any of this. An ant only ever finds that some grains come away easily.
   */
  stressAt(nest: NestOccupancy, col: number, row: number): number {
    if (!this.stress.inBounds(col, row)) return 1
    const base = this.overburden[row * this.stress.width + col]!
    const radius = this.archRadius
    const width = this.stress.width
    const height = this.stress.height

    let shieldedAbove = 0
    let aboveCells = 0
    let sideVoids = 0
    let sideCells = 0

    const above = this.aboveConeOffsets
    for (let k = 0; k < above.length; k += 2) {
      const c = col + above[k]!
      const r = row + above[k + 1]!
      if (c < 0 || c >= width || r < 0 || r >= height) continue
      aboveCells += 1
      if (nest.isVoid(c, r)) shieldedAbove += 1
    }

    const sides = this.sideOffsets
    for (let k = 0; k < sides.length; k += 2) {
      const c = col + sides[k]!
      const r = row + sides[k + 1]!
      if (c < 0 || c >= width || r < 0 || r >= height) continue
      sideCells += 1
      if (nest.isVoid(c, r)) sideVoids += 1
    }

    const shield =
      aboveCells === 0
        ? 0
        : (shieldedAbove / aboveCells) * this.params.soil.stressShieldBelowFactor.value
    const arch =
      sideCells === 0
        ? 0
        : (sideVoids / sideCells) * this.params.soil.archingStressGainPerVoid.value * radius

    const value = base * (1 - shield) * (1 + arch)
    return value < 0 ? 0 : value > 1 ? 1 : value
  }

  /**
   * Refreshes the cached stress layer around a cell that has just become a void. The cache
   * exists for the renderer and for measurement; the digging rules call `stressAt` so they
   * never read a stale value.
   */
  applyVoid(nest: NestOccupancy, col: number, row: number): void {
    const radius = this.archRadius
    for (let r = row - radius; r <= row + radius; r += 1) {
      for (let c = col - radius; c <= col + radius; c += 1) {
        if (!this.stress.inBounds(c, r)) continue
        this.stress.set(c, r, nest.isVoid(c, r) ? 0 : this.stressAt(nest, c, r))
      }
    }
  }

  /** The undisturbed overburden at a cell, before any arching. */
  overburdenAt(col: number, row: number): number {
    return this.overburden[row * this.stress.width + col]!
  }

  buffers(): ArrayBufferView[] {
    return [this.moisture.data, this.temperature.data, this.stress.data]
  }
}
