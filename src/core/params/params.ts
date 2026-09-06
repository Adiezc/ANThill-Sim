/**
 * The typed parameter surface.
 *
 * Every field is read explicitly, so a typo in a path is a load-time error naming the path
 * rather than an `undefined` that reaches a system and quietly becomes NaN a year into a
 * run. It is more lines than a generic accessor would be, and that is the trade: the
 * species file is the specification, and the specification deserves to be read carefully.
 *
 * Each field keeps its tag. A system that uses a number has its provenance in hand.
 */

import { decayFromLifetime } from '../math/approx.js'
import {
  readFieldOf,
  readFlag,
  readNumberList,
  readRange,
  readScalar,
  readString,
  readStringList,
} from './schema.js'
import type { Param, RangeParam } from './schema.js'

type Raw = Record<string, unknown>

export interface MonthClimate {
  readonly month: number
  readonly highC: number
  readonly lowC: number
  readonly precipMm: number
}

export interface Params {
  readonly schemaVersion: number
  readonly species: {
    readonly binomial: string
    readonly common: string
    readonly habitat: string
    readonly soil: string
  }

  readonly colony: {
    readonly queens: Param<number>
    readonly sexualMaturityWorkers: Param<number>
    readonly meanMatureWorkers: Param<number>
    readonly majorWorkerFraction: Param<number>
    readonly minorWorkerLengthMm: Param<number>
    readonly majorWorkerLengthMm: Param<number>
    readonly minorWorkerDryMassMg: Param<number>
    readonly majorWorkerDryMassMg: Param<number>
    readonly queenLifespanYears: Param<number>
  }

  readonly nest: {
    readonly incipientDepthCm: RangeParam
    readonly matureDepthCm: RangeParam
    readonly maxRecordedDepthCm: Param<number>
    readonly matureVolumeLitres: Param<number>
    readonly shaftHelixDiameterCm: RangeParam
    readonly shaftBoreDiameterCm: Param<number>
    readonly shaftBoreDiameterUpperNestCm: Param<number>
    readonly helixPitchShallowCm: RangeParam
    readonly helixPitchDeepCm: Param<number>
    readonly helixLeftHandedBias: Param<number>
    /** From the body of Tschinkel 2004. Its abstract disagrees; see docs/DECISIONS.md D10. */
    readonly shaftAngleDegShallow: RangeParam
    readonly shaftAngleDegDeep: RangeParam
    readonly shaftSteepeningDepthCm: Param<number>
    readonly chamberHeightCm: Param<number>
    /** Superseded by the decrease regression below. Kept because the abstract says it. */
    readonly chamberAreaDecayPerDepthDecile: RangeParam
    /** Proportional area decrease from one decile to the next is slope * decile + intercept. */
    readonly chamberAreaDecreaseSlope: Param<number>
    readonly chamberAreaDecreaseIntercept: Param<number>
    readonly topQuarterAreaFraction: Param<number>
    readonly verticalSpacingShallowCm: RangeParam
    readonly verticalSpacingDeepCm: RangeParam
    /** Figure 10 of Tschinkel 2004. Supersedes verticalSpacingDeepCm, which overstates it. */
    readonly verticalSpacingByDecileCm: Param<readonly number[]>
    readonly meanChamberAreaShallowCm2: Param<number>
    readonly meanChamberAreaDeepCm2: Param<number>
    readonly chambersPerDecileShallow: Param<number>
    readonly chambersPerDecileDeep: Param<number>
    readonly maxVerticalSpacingDecile: RangeParam
    readonly maxVerticalSpacingAtDepthFraction: RangeParam
    readonly superficialChamberMaxDepthCm: Param<number>
    readonly shaftBranchingMaxDepthCm: Param<number>
    readonly firstBranchDepthCm: RangeParam
    readonly secondBranchDepthCm: RangeParam
    readonly maxBranchesPerShaft: Param<number>
    readonly maxShaftChamberSeries: Param<number>
    readonly totalAreaLogIntercept: Param<number>
    readonly totalAreaLogSlope: Param<number>
    readonly maxDepthLogIntercept: Param<number>
    readonly maxDepthLogSlope: Param<number>
    readonly colonySizeClassBounds: Param<readonly number[]>
  }

  readonly excavation: {
    readonly relocationExcavationDays: Param<number>
    readonly undergroundRedepositionFraction: Param<number>
    readonly pelletsPerExcavatorPerHour: Param<number>
    readonly digRateCollisionSensitivity: Param<number>
    readonly digRateSaturationExponent: Param<number>
    readonly soilMoistureDiggableMin: Param<number>
    readonly soilMoistureDiggableMax: Param<number>
    readonly soilMoistureOptimal: Param<number>
    readonly buildingPheromoneLifetimeTicks: Param<number>
    readonly stressSensitivity: Param<number>
    readonly spoilCueWeight: Param<number>
    readonly collisionAgitationHalfLifeTicks: Param<number>
    readonly collisionSaturationCount: Param<number>
    readonly tunnelLengthFeedbackCm: Param<number>
    readonly surfaceTemperatureDepthGainCmPerC: Param<number>
    /**
     * Always the string 'unknown'. Kept as a parameter so the honesty panel can read the
     * note attached to it: shaft angle steepens with depth and branching stops below 40 cm,
     * both observed, but no ant knows its depth and the obvious candidate mechanism was
     * tested and falsified. See docs/SCIENCE.md section 11.
     */
    readonly depthCueMechanism: Param<string>
    readonly wholeNestExcavationDays: RangeParam
    readonly sandPerWorkerPerDayBodyWeights: RangeParam
    readonly chamberAreaPerOldWorkerDayCm2: Param<number>
    readonly chamberAreaPerYoungWorkerDayCm2: Param<number>
    readonly shaftLengthPerOldWorkerDayCm: Param<number>
    readonly shaftLengthPerYoungWorkerDayCm: Param<number>
    readonly diggingParticipationOld: Param<number>
    readonly diggingParticipationMiddle: Param<number>
    readonly diggingParticipationYoung: Param<number>
    /**
     * HARD RULE, true. Tschinkel 2004: a worker either digs consistently or does not dig at
     * all. Digging is a persistent individual state, never a per-tick coin flip.
     */
    readonly diggingIsAPersistentTrait: Param<boolean>
    readonly superficialChamberChance: Param<number>
    readonly ceilingRaiseChance: Param<number>
    readonly geotaxisWeight: Param<number>
    readonly digFaceAttraction: Param<number>
    readonly walkNoise: Param<number>
    readonly crowdAvoidance: Param<number>
    readonly relayDistanceCm: Param<number>
    readonly relayPickUpChance: Param<number>
    readonly chamberInitiationChance: Param<number>
    readonly seriesCountProbeDepthCm: Param<number>
  }

  readonly soil: {
    readonly bulkDensityKgPerM3: Param<number>
    readonly surfaceTemperatureOffsetC: Param<number>
    readonly infiltrationDepthCmPerMm: Param<number>
    readonly surfaceMoistureMax: Param<number>
    readonly deepMoisture: Param<number>
    readonly dryingRatePerDay: Param<number>
    readonly evaporationDepthCm: Param<number>
    readonly archingStressGainPerVoid: Param<number>
    readonly archingRadiusCm: Param<number>
    readonly stressShieldBelowFactor: Param<number>
  }

  readonly discretisation: {
    readonly nestCellSizeCm: Param<number>
    readonly nestWidthCm: Param<number>
    readonly nestDepthCm: Param<number>
    readonly surfaceCellSizeM: Param<number>
    readonly surfaceExtentM: Param<number>
    readonly sliceThicknessCm: Param<number>
  }

  readonly labour: {
    readonly foragerDepthMaxCm: Param<number>
    readonly foragerFractionBelow20cm: Param<number>
    readonly transferWorkerFractionBelow20cm: Param<number>
    readonly broodCareFractionBelow70cm: Param<number>
    readonly summerForagerFraction: Param<number>
    readonly summerTransferWorkerFraction: Param<number>
    readonly peakForagingProportion: Param<number>
    readonly foragerFatThreshold: Param<number>
    readonly ageAtFirstForagingDaysSummerBorn: Param<number>
    readonly ageAtFirstForagingDaysAutumnBorn: Param<number>
    readonly foragerLifespanDays: Param<number>
    readonly foragerMortalityPerDay: RangeParam
    readonly foragerPopulationCollapseMortality: Param<number>
    /** HARD RULE, false. Foragers never revert to inside work. */
    readonly taskReversionAllowed: Param<boolean>
    /** HARD RULE, false. Losing foragers draws no replacements; larvae starve instead. */
    readonly backfillFromOtherCastes: Param<boolean>
    readonly autumnWorkerWeightGain: Param<number>
  }

  readonly foraging: {
    readonly trunkTrailCount: RangeParam
    readonly foragingRangeMetres: Param<number>
    readonly siteFidelityRadiusMetres: Param<number>
    readonly rangeActivelyDefended: Param<boolean>
    /** HARD RULE, false. Tested by Ferster & Traniello 1995 and rejected. */
    readonly workerSizePredictsSeedSize: Param<boolean>
    /** HARD RULE, false. Tested and rejected. */
    readonly workerSizePredictsForagingDistance: Param<boolean>
    readonly maxOpenableSeedWidthMm: Param<number>
    readonly maxCollectableSeedWidthMm: Param<number>
  }

  readonly seeds: {
    readonly seedChamberDepthCm: RangeParam
    readonly largeSeedStoreFractionByWeight: Param<number>
    readonly majorsIncreaseOpeningRate: Param<boolean>
    /** HARD RULE, false. Majors raise the rate, not the range. */
    readonly majorsWidenOpenableSizeRange: Param<boolean>
    readonly germinationDrivenBy: Param<readonly string[]>
    readonly germinatedSeedsFedToLarvaePreferentially: Param<boolean>
    readonly largeSeedNutritionalValueInSmallSeeds: Param<number>
  }

  readonly relocation: {
    readonly movesPerYearMean: Param<number>
    readonly movesPerYearMax: Param<number>
    readonly seasonWindowMonths: Param<readonly number[]>
    readonly peakMonth: Param<number>
    readonly peakDailyMoveProbability: Param<number>
    readonly durationDays: RangeParam
    readonly meanDistanceMetres: Param<number>
    readonly maxDistanceMetres: Param<number>
    readonly destinationConstrainedToTrunkTrail: Param<boolean>
    readonly burdenPriority: Param<readonly string[]>
    readonly burdenedWorkerFractionRisesThroughMove: Param<boolean>
    readonly newNestIsReplicaOfOld: Param<boolean>
    readonly sizeCostOfFrequentMoves: Param<boolean>
    /** False. The cause of relocation is unknown and the simulator says so. */
    readonly causeKnown: Param<boolean>
    /** [C]. A deliberate departure from an [A] finding. See docs/DECISIONS.md D3. */
    readonly candidateSitesDiffer: Param<boolean>
    readonly candidateSiteCount: RangeParam
  }

  readonly pheromones: {
    readonly recruitment: {
      readonly decayPerTick: Param<number>
      readonly diffusion: Param<number>
      readonly responseNonLinearity: Param<number>
      readonly depositOnReturnLeg: boolean
    }
    readonly alarm: { readonly decayPerTick: Param<number>; readonly diffusion: Param<number> }
    readonly necrophoric: {
      readonly decayPerTick: Param<number>
      readonly diffusion: Param<number>
    }
    readonly building: {
      /**
       * Derived from `excavation.buildingPheromoneLifetimeTicks`, not authored separately.
       * The two were specified independently and disagreed. See docs/DECISIONS.md D6.
       */
      readonly decayPerTick: Param<number>
      readonly diffusion: Param<number>
    }
    readonly diffusionIntervalTicks: Param<number>
    readonly depositMoreNearFood: Param<boolean>
    readonly depositMoreForDistantFood: Param<boolean>
    readonly foragersUsePathIntegration: Param<boolean>
  }

  readonly time: {
    readonly secondsPerTick: Param<number>
    readonly realSecondsPerSimulatedDayAt1x: Param<number>
  }

  readonly climate: {
    readonly site: { readonly name: string; readonly lat: number; readonly lon: number }
    readonly monthly: readonly MonthClimate[]
    readonly frostPossibleMonths: readonly number[]
    readonly soilThermalLagDaysPerMetre: Param<number>
    readonly nuptialFlightMonths: Param<readonly number[]>
    readonly winterExcavationLull: Param<boolean>
    readonly meanRainEventMm: Param<number>
    readonly heavyRainMm: Param<number>
    readonly dailyTemperaturePeakHour: Param<number>
  }
}

function readClimateMonths(root: Raw): MonthClimate[] {
  const monthly = (root['climate'] as Raw | undefined)?.['monthly']
  if (!Array.isArray(monthly) || monthly.length !== 12) {
    throw new Error('climate.monthly must contain twelve rows, one per month')
  }
  return monthly.map((row, i) => {
    const r = row as Raw
    for (const key of ['month', 'highC', 'lowC', 'precipMm']) {
      if (typeof r[key] !== 'number') {
        throw new Error(`climate.monthly[${i}].${key} is missing or not a number`)
      }
    }
    if (r['month'] !== i + 1) {
      throw new Error(`climate.monthly must be in calendar order; row ${i} is month ${r['month']}`)
    }
    return {
      month: r['month'] as number,
      highC: r['highC'] as number,
      lowC: r['lowC'] as number,
      precipMm: r['precipMm'] as number,
    }
  })
}

function readStrings(root: Raw, section: string, keys: readonly string[]): Record<string, string> {
  const node = root[section] as Raw | undefined
  const out: Record<string, string> = {}
  for (const key of keys) {
    const value = node?.[key]
    if (typeof value !== 'string') throw new Error(`${section}.${key} is missing or not a string`)
    out[key] = value
  }
  return out
}

/** Builds the typed surface from an already-validated raw file. */
export function buildParams(root: Raw): Params {
  const species = readStrings(root, 'species', ['binomial', 'common', 'habitat', 'soil'])
  const site = (root['climate'] as Raw)['site'] as Raw

  const buildingLifetime = readScalar(root, 'excavation.buildingPheromoneLifetimeTicks')

  return {
    schemaVersion: root['schemaVersion'] as number,
    species: {
      binomial: species['binomial']!,
      common: species['common']!,
      habitat: species['habitat']!,
      soil: species['soil']!,
    },

    colony: {
      queens: readScalar(root, 'colony.queens'),
      sexualMaturityWorkers: readScalar(root, 'colony.sexualMaturityWorkers'),
      meanMatureWorkers: readScalar(root, 'colony.meanMatureWorkers'),
      majorWorkerFraction: readScalar(root, 'colony.majorWorkerFraction'),
      minorWorkerLengthMm: readScalar(root, 'colony.minorWorkerLengthMm'),
      majorWorkerLengthMm: readScalar(root, 'colony.majorWorkerLengthMm'),
      minorWorkerDryMassMg: readScalar(root, 'colony.minorWorkerDryMassMg'),
      majorWorkerDryMassMg: readScalar(root, 'colony.majorWorkerDryMassMg'),
      queenLifespanYears: readScalar(root, 'colony.queenLifespanYears'),
    },

    nest: {
      incipientDepthCm: readRange(root, 'nest.incipientDepthCm'),
      matureDepthCm: readRange(root, 'nest.matureDepthCm'),
      maxRecordedDepthCm: readScalar(root, 'nest.maxRecordedDepthCm'),
      matureVolumeLitres: readScalar(root, 'nest.matureVolumeLitres'),
      shaftHelixDiameterCm: readRange(root, 'nest.shaftHelixDiameterCm'),
      shaftBoreDiameterCm: readScalar(root, 'nest.shaftBoreDiameterCm'),
      shaftBoreDiameterUpperNestCm: readScalar(root, 'nest.shaftBoreDiameterUpperNestCm'),
      helixPitchShallowCm: readRange(root, 'nest.helixPitchShallowCm'),
      helixPitchDeepCm: readScalar(root, 'nest.helixPitchDeepCm'),
      helixLeftHandedBias: readScalar(root, 'nest.helixLeftHandedBias'),
      shaftAngleDegShallow: readRange(root, 'nest.shaftAngleDegShallow'),
      shaftAngleDegDeep: readRange(root, 'nest.shaftAngleDegDeep'),
      shaftSteepeningDepthCm: readScalar(root, 'nest.shaftSteepeningDepthCm'),
      chamberHeightCm: readScalar(root, 'nest.chamberHeightCm'),
      chamberAreaDecayPerDepthDecile: readRange(root, 'nest.chamberAreaDecayPerDepthDecile'),
      chamberAreaDecreaseSlope: readScalar(root, 'nest.chamberAreaDecreaseSlope'),
      chamberAreaDecreaseIntercept: readScalar(root, 'nest.chamberAreaDecreaseIntercept'),
      topQuarterAreaFraction: readScalar(root, 'nest.topQuarterAreaFraction'),
      verticalSpacingShallowCm: readRange(root, 'nest.verticalSpacingShallowCm'),
      verticalSpacingDeepCm: readRange(root, 'nest.verticalSpacingDeepCm'),
      verticalSpacingByDecileCm: readNumberList(root, 'nest.verticalSpacingByDecileCm'),
      meanChamberAreaShallowCm2: readScalar(root, 'nest.meanChamberAreaShallowCm2'),
      meanChamberAreaDeepCm2: readScalar(root, 'nest.meanChamberAreaDeepCm2'),
      chambersPerDecileShallow: readScalar(root, 'nest.chambersPerDecileShallow'),
      chambersPerDecileDeep: readScalar(root, 'nest.chambersPerDecileDeep'),
      maxVerticalSpacingDecile: readRange(root, 'nest.maxVerticalSpacingDecile'),
      maxVerticalSpacingAtDepthFraction: readRange(root, 'nest.maxVerticalSpacingAtDepthFraction'),
      superficialChamberMaxDepthCm: readScalar(root, 'nest.superficialChamberMaxDepthCm'),
      shaftBranchingMaxDepthCm: readScalar(root, 'nest.shaftBranchingMaxDepthCm'),
      firstBranchDepthCm: readRange(root, 'nest.firstBranchDepthCm'),
      secondBranchDepthCm: readRange(root, 'nest.secondBranchDepthCm'),
      maxBranchesPerShaft: readScalar(root, 'nest.maxBranchesPerShaft'),
      maxShaftChamberSeries: readScalar(root, 'nest.maxShaftChamberSeries'),
      totalAreaLogIntercept: readScalar(root, 'nest.totalAreaLogIntercept'),
      totalAreaLogSlope: readScalar(root, 'nest.totalAreaLogSlope'),
      maxDepthLogIntercept: readScalar(root, 'nest.maxDepthLogIntercept'),
      maxDepthLogSlope: readScalar(root, 'nest.maxDepthLogSlope'),
      colonySizeClassBounds: readNumberList(root, 'nest.colonySizeClassBounds'),
    },

    excavation: {
      relocationExcavationDays: readScalar(root, 'excavation.relocationExcavationDays'),
      undergroundRedepositionFraction: readScalar(
        root,
        'excavation.undergroundRedepositionFraction',
      ),
      pelletsPerExcavatorPerHour: readScalar(root, 'excavation.pelletsPerExcavatorPerHour'),
      digRateCollisionSensitivity: readScalar(root, 'excavation.digRateCollisionSensitivity'),
      digRateSaturationExponent: readScalar(root, 'excavation.digRateSaturationExponent'),
      soilMoistureDiggableMin: readScalar(root, 'excavation.soilMoistureDiggableMin'),
      soilMoistureDiggableMax: readScalar(root, 'excavation.soilMoistureDiggableMax'),
      soilMoistureOptimal: readScalar(root, 'excavation.soilMoistureOptimal'),
      buildingPheromoneLifetimeTicks: buildingLifetime,
      stressSensitivity: readScalar(root, 'excavation.stressSensitivity'),
      spoilCueWeight: readScalar(root, 'excavation.spoilCueWeight'),
      collisionAgitationHalfLifeTicks: readScalar(
        root,
        'excavation.collisionAgitationHalfLifeTicks',
      ),
      collisionSaturationCount: readScalar(root, 'excavation.collisionSaturationCount'),
      tunnelLengthFeedbackCm: readScalar(root, 'excavation.tunnelLengthFeedbackCm'),
      surfaceTemperatureDepthGainCmPerC: readScalar(
        root,
        'excavation.surfaceTemperatureDepthGainCmPerC',
      ),
      depthCueMechanism: readString(root, 'excavation.depthCueMechanism'),
      wholeNestExcavationDays: readRange(root, 'excavation.wholeNestExcavationDays'),
      sandPerWorkerPerDayBodyWeights: readRange(root, 'excavation.sandPerWorkerPerDayBodyWeights'),
      chamberAreaPerOldWorkerDayCm2: readScalar(root, 'excavation.chamberAreaPerOldWorkerDayCm2'),
      chamberAreaPerYoungWorkerDayCm2: readScalar(
        root,
        'excavation.chamberAreaPerYoungWorkerDayCm2',
      ),
      shaftLengthPerOldWorkerDayCm: readScalar(root, 'excavation.shaftLengthPerOldWorkerDayCm'),
      shaftLengthPerYoungWorkerDayCm: readScalar(root, 'excavation.shaftLengthPerYoungWorkerDayCm'),
      diggingParticipationOld: readScalar(root, 'excavation.diggingParticipationOld'),
      diggingParticipationMiddle: readScalar(root, 'excavation.diggingParticipationMiddle'),
      diggingParticipationYoung: readScalar(root, 'excavation.diggingParticipationYoung'),
      diggingIsAPersistentTrait: readFlag(root, 'excavation.diggingIsAPersistentTrait'),
      superficialChamberChance: readScalar(root, 'excavation.superficialChamberChance'),
      ceilingRaiseChance: readScalar(root, 'excavation.ceilingRaiseChance'),
      geotaxisWeight: readScalar(root, 'excavation.geotaxisWeight'),
      digFaceAttraction: readScalar(root, 'excavation.digFaceAttraction'),
      walkNoise: readScalar(root, 'excavation.walkNoise'),
      crowdAvoidance: readScalar(root, 'excavation.crowdAvoidance'),
      relayDistanceCm: readScalar(root, 'excavation.relayDistanceCm'),
      relayPickUpChance: readScalar(root, 'excavation.relayPickUpChance'),
      chamberInitiationChance: readScalar(root, 'excavation.chamberInitiationChance'),
      seriesCountProbeDepthCm: readScalar(root, 'excavation.seriesCountProbeDepthCm'),
    },

    soil: {
      bulkDensityKgPerM3: readScalar(root, 'soil.bulkDensityKgPerM3'),
      surfaceTemperatureOffsetC: readScalar(root, 'soil.surfaceTemperatureOffsetC'),
      infiltrationDepthCmPerMm: readScalar(root, 'soil.infiltrationDepthCmPerMm'),
      surfaceMoistureMax: readScalar(root, 'soil.surfaceMoistureMax'),
      deepMoisture: readScalar(root, 'soil.deepMoisture'),
      dryingRatePerDay: readScalar(root, 'soil.dryingRatePerDay'),
      evaporationDepthCm: readScalar(root, 'soil.evaporationDepthCm'),
      archingStressGainPerVoid: readScalar(root, 'soil.archingStressGainPerVoid'),
      archingRadiusCm: readScalar(root, 'soil.archingRadiusCm'),
      stressShieldBelowFactor: readScalar(root, 'soil.stressShieldBelowFactor'),
    },

    discretisation: {
      nestCellSizeCm: readScalar(root, 'discretisation.nestCellSizeCm'),
      nestWidthCm: readScalar(root, 'discretisation.nestWidthCm'),
      nestDepthCm: readScalar(root, 'discretisation.nestDepthCm'),
      surfaceCellSizeM: readScalar(root, 'discretisation.surfaceCellSizeM'),
      surfaceExtentM: readScalar(root, 'discretisation.surfaceExtentM'),
      sliceThicknessCm: readScalar(root, 'discretisation.sliceThicknessCm'),
    },

    labour: {
      foragerDepthMaxCm: readScalar(root, 'labour.foragerDepthMaxCm'),
      foragerFractionBelow20cm: readScalar(root, 'labour.foragerFractionBelow20cm'),
      transferWorkerFractionBelow20cm: readScalar(root, 'labour.transferWorkerFractionBelow20cm'),
      broodCareFractionBelow70cm: readScalar(root, 'labour.broodCareFractionBelow70cm'),
      summerForagerFraction: readScalar(root, 'labour.summerForagerFraction'),
      summerTransferWorkerFraction: readScalar(root, 'labour.summerTransferWorkerFraction'),
      peakForagingProportion: readScalar(root, 'labour.peakForagingProportion'),
      foragerFatThreshold: readScalar(root, 'labour.foragerFatThreshold'),
      ageAtFirstForagingDaysSummerBorn: readScalar(root, 'labour.ageAtFirstForagingDaysSummerBorn'),
      ageAtFirstForagingDaysAutumnBorn: readScalar(root, 'labour.ageAtFirstForagingDaysAutumnBorn'),
      foragerLifespanDays: readScalar(root, 'labour.foragerLifespanDays'),
      foragerMortalityPerDay: readRange(root, 'labour.foragerMortalityPerDay'),
      foragerPopulationCollapseMortality: readScalar(
        root,
        'labour.foragerPopulationCollapseMortality',
      ),
      taskReversionAllowed: readFlag(root, 'labour.taskReversionAllowed'),
      backfillFromOtherCastes: readFlag(root, 'labour.backfillFromOtherCastes'),
      autumnWorkerWeightGain: readScalar(root, 'labour.autumnWorkerWeightGain'),
    },

    foraging: {
      trunkTrailCount: readRange(root, 'foraging.trunkTrailCount'),
      foragingRangeMetres: readScalar(root, 'foraging.foragingRangeMetres'),
      siteFidelityRadiusMetres: readScalar(root, 'foraging.siteFidelityRadiusMetres'),
      rangeActivelyDefended: readFlag(root, 'foraging.rangeActivelyDefended'),
      workerSizePredictsSeedSize: readFlag(root, 'foraging.workerSizePredictsSeedSize'),
      workerSizePredictsForagingDistance: readFlag(
        root,
        'foraging.workerSizePredictsForagingDistance',
      ),
      maxOpenableSeedWidthMm: readScalar(root, 'foraging.maxOpenableSeedWidthMm'),
      maxCollectableSeedWidthMm: readScalar(root, 'foraging.maxCollectableSeedWidthMm'),
    },

    seeds: {
      seedChamberDepthCm: readRange(root, 'seeds.seedChamberDepthCm'),
      largeSeedStoreFractionByWeight: readScalar(root, 'seeds.largeSeedStoreFractionByWeight'),
      majorsIncreaseOpeningRate: readFlag(root, 'seeds.majorsIncreaseOpeningRate'),
      majorsWidenOpenableSizeRange: readFlag(root, 'seeds.majorsWidenOpenableSizeRange'),
      germinationDrivenBy: readStringList(root, 'seeds.germinationDrivenBy'),
      germinatedSeedsFedToLarvaePreferentially: readFlag(
        root,
        'seeds.germinatedSeedsFedToLarvaePreferentially',
      ),
      largeSeedNutritionalValueInSmallSeeds: readScalar(
        root,
        'seeds.largeSeedNutritionalValueInSmallSeeds',
      ),
    },

    relocation: {
      movesPerYearMean: readScalar(root, 'relocation.movesPerYearMean'),
      movesPerYearMax: readScalar(root, 'relocation.movesPerYearMax'),
      seasonWindowMonths: readNumberList(root, 'relocation.seasonWindowMonths'),
      peakMonth: readScalar(root, 'relocation.peakMonth'),
      peakDailyMoveProbability: readScalar(root, 'relocation.peakDailyMoveProbability'),
      durationDays: readRange(root, 'relocation.durationDays'),
      meanDistanceMetres: readScalar(root, 'relocation.meanDistanceMetres'),
      maxDistanceMetres: readScalar(root, 'relocation.maxDistanceMetres'),
      destinationConstrainedToTrunkTrail: readFlag(
        root,
        'relocation.destinationConstrainedToTrunkTrail',
      ),
      burdenPriority: readStringList(root, 'relocation.burdenPriority'),
      burdenedWorkerFractionRisesThroughMove: readFlag(
        root,
        'relocation.burdenedWorkerFractionRisesThroughMove',
      ),
      newNestIsReplicaOfOld: readFlag(root, 'relocation.newNestIsReplicaOfOld'),
      sizeCostOfFrequentMoves: readFlag(root, 'relocation.sizeCostOfFrequentMoves'),
      causeKnown: readFlag(root, 'relocation.causeKnown'),
      candidateSitesDiffer: readFlag(root, 'relocation.candidateSitesDiffer'),
      candidateSiteCount: readRange(root, 'relocation.candidateSiteCount'),
    },

    pheromones: {
      recruitment: {
        decayPerTick: readFieldOf(root, 'pheromones.recruitment', 'decayPerTick'),
        diffusion: readFieldOf(root, 'pheromones.recruitment', 'diffusion'),
        responseNonLinearity: readFieldOf(root, 'pheromones.recruitment', 'responseNonLinearity'),
        depositOnReturnLeg: true,
      },
      alarm: {
        decayPerTick: readFieldOf(root, 'pheromones.alarm', 'decayPerTick'),
        diffusion: readFieldOf(root, 'pheromones.alarm', 'diffusion'),
      },
      necrophoric: {
        decayPerTick: readFieldOf(root, 'pheromones.necrophoric', 'decayPerTick'),
        diffusion: readFieldOf(root, 'pheromones.necrophoric', 'diffusion'),
      },
      building: {
        decayPerTick: {
          value: decayFromLifetime(buildingLifetime.value),
          tag: buildingLifetime.tag,
          path: 'pheromones.building.decayPerTick (derived from excavation.buildingPheromoneLifetimeTicks)',
          note: 'Derived, not authored. See docs/DECISIONS.md D6.',
        },
        diffusion: readFieldOf(root, 'pheromones.building', 'diffusion'),
      },
      diffusionIntervalTicks: readScalar(root, 'pheromones.diffusionIntervalTicks'),
      depositMoreNearFood: readFlag(root, 'pheromones.depositMoreNearFood'),
      depositMoreForDistantFood: readFlag(root, 'pheromones.depositMoreForDistantFood'),
      foragersUsePathIntegration: readFlag(root, 'pheromones.foragersUsePathIntegration'),
    },

    time: {
      secondsPerTick: readScalar(root, 'time.secondsPerTick'),
      realSecondsPerSimulatedDayAt1x: readScalar(root, 'time.realSecondsPerSimulatedDayAt1x'),
    },

    climate: {
      site: {
        name: site['name'] as string,
        lat: site['lat'] as number,
        lon: site['lon'] as number,
      },
      monthly: readClimateMonths(root),
      frostPossibleMonths: (root['climate'] as Raw)['frostPossibleMonths'] as number[],
      soilThermalLagDaysPerMetre: readScalar(root, 'climate.soilThermalLagDaysPerMetre'),
      nuptialFlightMonths: readNumberList(root, 'climate.nuptialFlightMonths'),
      winterExcavationLull: readFlag(root, 'climate.winterExcavationLull'),
      meanRainEventMm: readScalar(root, 'climate.meanRainEventMm'),
      heavyRainMm: readScalar(root, 'climate.heavyRainMm'),
      dailyTemperaturePeakHour: readScalar(root, 'climate.dailyTemperaturePeakHour'),
    },
  }
}
