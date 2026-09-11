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
    readonly maxWorkers: Param<number>
    readonly activeMonths: Param<readonly number[]>
    readonly daysFirstForagingToLarvae: RangeParam
    readonly daysFirstForagingToPupae: RangeParam
    readonly daysFirstForagingToCallows: RangeParam
    readonly daysFirstForagingToMatingFlight: RangeParam
    readonly majorWorkerFraction: Param<number>
    readonly minorWorkerLengthMm: Param<number>
    readonly majorWorkerLengthMm: Param<number>
    readonly minorWorkerDryMassMg: Param<number>
    readonly minorWorkerDryMassJulyMg: Param<number>
    readonly minorWorkerDryMassJanuaryMg: Param<number>
    readonly minorWorkerLeanMassMg: Param<number>
    readonly majorWorkerDryMassMg: Param<number>
    readonly minorHeadwidthInterceptMm: Param<number>
    readonly minorHeadwidthSlopeMm: Param<number>
    /** HARD RULE that this does not scale with colony size. Minors grow; majors do not. */
    readonly majorHeadwidthMm: RangeParam
    readonly firstMajorAppearsAtWorkers: RangeParam
    readonly majorWorkerFractionBySeason: Param<readonly number[]>
    readonly queenLifespanYears: Param<number>
  }

  readonly nest: {
    readonly incipientDepthCm: RangeParam
    readonly matureDepthCm: RangeParam
    readonly meanDepthAcrossColoniesCm: Param<number>
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
    readonly crowdingRadiusCm: Param<number>
    readonly collisionSaturationCount: Param<number>
    readonly collisionResponseExponent: Param<number>
    readonly collisionDigBaseline: Param<number>
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
    readonly pheromoneHaloCells: Param<number>
  }

  readonly labour: {
    readonly foragerDepthMaxCm: Param<number>
    readonly foragerFractionBelow20cm: Param<number>
    readonly transferWorkerFractionBelow20cm: Param<number>
    readonly broodCareFractionBelow70cm: Param<number>
    /** The depths those fractions were measured against. A measurement boundary, not a cue. */
    readonly stratificationShallowProbeCm: Param<number>
    readonly stratificationDeepProbeCm: Param<number>
    readonly summerForagerFraction: Param<number>
    readonly summerTransferWorkerFraction: Param<number>
    readonly peakForagingProportion: Param<number>
    readonly foragerFatThreshold: Param<number>
    readonly workerFatFractionByDepthThird: Param<readonly number[]>
    readonly workerFatFractionBySeason: Param<readonly number[]>
    readonly ageAtFirstForagingDaysSummerBorn: Param<number>
    readonly ageAtFirstForagingDaysAutumnBorn: Param<number>
    readonly ageAtFirstForagingDaysAutumnBornRange: RangeParam
    readonly ageAtFirstForagingSummerBornSd: Param<number>
    readonly maxProportionForaging: RangeParam
    readonly proportionForagingMatureMean: Param<number>
    readonly proportionForagingImmatureMean: Param<number>
    readonly foragersPerLarva: Param<number>
    readonly foragerLeadsLarvaeDays: RangeParam
    readonly foragerObservedMaxDepthCm: Param<number>
    readonly callowFractionBeforeWinter: Param<number>
    readonly midcolouredFractionBeforeWinter: Param<number>
    readonly midcolouredFractionEarlySpring: Param<number>
    readonly foragerLifespanDays: Param<number>
    readonly foragerMortalityPerDay: RangeParam
    readonly foragerPopulationCollapseMortality: Param<number>
    /** HARD RULE, false. Foragers never revert to inside work. */
    readonly taskReversionAllowed: Param<boolean>
    /** HARD RULE, false. Losing foragers draws no replacements; larvae starve instead. */
    readonly backfillFromOtherCastes: Param<boolean>
    readonly foragingSeasonMonths: Param<readonly number[]>
    readonly foragingOnsetSoilTempC: Param<number>
    readonly foragingOnsetTempSpanC: Param<number>
    readonly winterWorkerMortalityPerDay: Param<number>
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

    /**
     * How a trip is walked and how long it may last. Every value below is invented: no
     * walking speed, search pattern or trail constant is published for this species.
     */
    readonly speedMetresPerTick: Param<number>
    readonly maxTripTicks: Param<number>
    readonly departureChancePerTick: Param<number>
    readonly encounterChancePerTick: Param<number>
    readonly searchTurnSdTurns: Param<number>
    readonly trunkTrailAngularSpreadTurns: Param<number>
    readonly trunkTrailJitter: Param<number>
    readonly trailSensingDistanceM: Param<number>
    readonly trailSensingTurns: Param<number>
    readonly trailFollowingStrength: Param<number>
    readonly recruitmentDepositPerStep: Param<number>
    readonly seedPatchCount: Param<number>
    readonly seedPatchRadiusM: Param<number>
    readonly backgroundSeedsPerSquareMetre: Param<number>
    readonly standingSeedsPerSquareMetre: Param<number>
    readonly seedReplenishmentPerDay: Param<number>
    readonly surfaceTemperatureMaxC: Param<number>
    readonly activeDayFractionStart: Param<number>
    readonly activeDayFractionEnd: Param<number>
  }

  readonly brood: {
    readonly eggDurationDays: Param<number>
    readonly larvaDurationDays: Param<number>
    readonly pupaDurationDays: Param<number>
    readonly callowDurationDays: Param<number>
    /** HARD RULE, true. Colonies do not overwinter with brood. */
    readonly noOverwinteringBrood: Param<boolean>
    readonly latestPupalEclosionMonth: Param<number>
    readonly eggMortalityPerDay: Param<number>
    readonly larvaMortalityPerDay: Param<number>
    readonly pupaMortalityPerDay: Param<number>
    readonly queenEggsPerDayMature: Param<number>
    readonly queenEggsPerDayFounding: Param<number>
    readonly queenEggsPerWorkerPerDay: Param<number>
    readonly nanaticsForageImmediately: Param<boolean>
    readonly starvationSeverityPerDay: Param<number>
    /** [C]. Sets how much seed a larva needs each day; see systems/seeds.ts. */
    readonly larvalSeedConversionEfficiency: Param<number>
    readonly alateShareBalanced: Param<number>
    readonly alateShareWorkerBias: Param<number>
    readonly alateShareAlateBias: Param<number>
    readonly alateBroodMonths: Param<readonly number[]>
    readonly eclosionDepthBand: Param<number>
    readonly transferFractionOfForagingAge: Param<number>
    readonly insideWorkerLifespanDays: Param<number>
    readonly insideWorkerMortalityPerDay: Param<number>
    readonly autumnFatGainMonths: Param<readonly number[]>
    readonly nanaticCount: RangeParam
    readonly queenFoundingFatReserve: Param<number>
    readonly queenFoundingFatPerEgg: Param<number>
  }

  /**
   * Movement and work inside the nest for ants that are not digging.
   *
   * Where each group ends up is measured; how an ant gets there is invented. See the
   * `$comment` on this section in the species file.
   */
  readonly interior: {
    readonly stepIntervalTicks: Param<number>
    readonly depthPreferenceWeight: Param<number>
    readonly walkNoise: Param<number>
    readonly crowdAvoidance: Param<number>
    readonly preferredDepthRedrawDays: Param<number>
    readonly tendingAttraction: Param<number>
    readonly broodPickUpChancePerTick: Param<number>
    readonly maxBroodPerCell: Param<number>
    readonly broodSearchRadiusCm: Param<number>
    readonly broodChamberDepthFraction: Param<number>
  }

  readonly seeds: {
    readonly seedChamberDepthCm: RangeParam
    readonly foragerDepositMaxDepthCm: Param<number>
    readonly downwardTransportChancePerTick: Param<number>
    readonly storeBandFractionOfDepth: Param<number>
    readonly maxSeedsPerCell: Param<number>
    readonly largeSeedStoreFractionByWeight: Param<number>
    readonly majorsIncreaseOpeningRate: Param<boolean>
    /** HARD RULE, false. Majors raise the rate, not the range. */
    readonly majorsWidenOpenableSizeRange: Param<boolean>
    readonly germinationDrivenBy: Param<readonly string[]>
    readonly germinatedSeedsFedToLarvaePreferentially: Param<boolean>
    readonly largeSeedNutritionalValueInSmallSeeds: Param<number>
    /**
     * The four size classes of Tschinkel & Kwapich 2016. Every per-class list below is in
     * this order, and the loader refuses a file whose lists disagree in length.
     */
    readonly sizeClassNames: Param<readonly string[]>
    readonly sizeClassSieveNumbers: Param<readonly number[]>
    readonly sizeClassMinWidthMm: Param<readonly number[]>
    readonly sizeClassMassMg: Param<readonly number[]>
    readonly collectedFractionByClass: Param<readonly number[]>
    readonly openingChancePerDay: Param<readonly number[]>
    readonly openingRateFractionWithoutMajors: Param<number>
    readonly openingMajorReferenceFraction: Param<number>
    readonly seedsOpenedOnlyInActiveSeason: Param<boolean>
    readonly germinationTestTemperaturesC: Param<readonly number[]>
    /** One list per size class: the fraction germinating in a one-month test at each temperature. */
    readonly germinationByClass: readonly Param<readonly number[]>[]
    readonly germinationTestDurationDays: Param<number>
    /** [C], calibrated. Laboratory germination is far faster than germination in a packed chamber. */
    readonly inNestGerminationFactor: Param<number>
    readonly germinatingRemovalChancePerDay: Param<number>
    readonly germinationOutsideActiveSeasonIsLost: Param<boolean>
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
      maxWorkers: readScalar(root, 'colony.maxWorkers'),
      activeMonths: readNumberList(root, 'colony.activeMonths'),
      daysFirstForagingToLarvae: readRange(root, 'colony.daysFirstForagingToLarvae'),
      daysFirstForagingToPupae: readRange(root, 'colony.daysFirstForagingToPupae'),
      daysFirstForagingToCallows: readRange(root, 'colony.daysFirstForagingToCallows'),
      daysFirstForagingToMatingFlight: readRange(root, 'colony.daysFirstForagingToMatingFlight'),
      majorWorkerFraction: readScalar(root, 'colony.majorWorkerFraction'),
      minorWorkerLengthMm: readScalar(root, 'colony.minorWorkerLengthMm'),
      majorWorkerLengthMm: readScalar(root, 'colony.majorWorkerLengthMm'),
      minorWorkerDryMassMg: readScalar(root, 'colony.minorWorkerDryMassMg'),
      minorWorkerDryMassJulyMg: readScalar(root, 'colony.minorWorkerDryMassJulyMg'),
      minorWorkerDryMassJanuaryMg: readScalar(root, 'colony.minorWorkerDryMassJanuaryMg'),
      minorWorkerLeanMassMg: readScalar(root, 'colony.minorWorkerLeanMassMg'),
      majorWorkerDryMassMg: readScalar(root, 'colony.majorWorkerDryMassMg'),
      minorHeadwidthInterceptMm: readScalar(root, 'colony.minorHeadwidthInterceptMm'),
      minorHeadwidthSlopeMm: readScalar(root, 'colony.minorHeadwidthSlopeMm'),
      majorHeadwidthMm: readRange(root, 'colony.majorHeadwidthMm'),
      firstMajorAppearsAtWorkers: readRange(root, 'colony.firstMajorAppearsAtWorkers'),
      majorWorkerFractionBySeason: readNumberList(root, 'colony.majorWorkerFractionBySeason'),
      queenLifespanYears: readScalar(root, 'colony.queenLifespanYears'),
    },

    nest: {
      incipientDepthCm: readRange(root, 'nest.incipientDepthCm'),
      matureDepthCm: readRange(root, 'nest.matureDepthCm'),
      meanDepthAcrossColoniesCm: readScalar(root, 'nest.meanDepthAcrossColoniesCm'),
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
      crowdingRadiusCm: readScalar(root, 'excavation.crowdingRadiusCm'),
      collisionSaturationCount: readScalar(root, 'excavation.collisionSaturationCount'),
      collisionResponseExponent: readScalar(root, 'excavation.collisionResponseExponent'),
      collisionDigBaseline: readScalar(root, 'excavation.collisionDigBaseline'),
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
      pheromoneHaloCells: readScalar(root, 'discretisation.pheromoneHaloCells'),
    },

    labour: {
      foragerDepthMaxCm: readScalar(root, 'labour.foragerDepthMaxCm'),
      foragerFractionBelow20cm: readScalar(root, 'labour.foragerFractionBelow20cm'),
      transferWorkerFractionBelow20cm: readScalar(root, 'labour.transferWorkerFractionBelow20cm'),
      broodCareFractionBelow70cm: readScalar(root, 'labour.broodCareFractionBelow70cm'),
      stratificationShallowProbeCm: readScalar(root, 'labour.stratificationShallowProbeCm'),
      stratificationDeepProbeCm: readScalar(root, 'labour.stratificationDeepProbeCm'),
      summerForagerFraction: readScalar(root, 'labour.summerForagerFraction'),
      summerTransferWorkerFraction: readScalar(root, 'labour.summerTransferWorkerFraction'),
      peakForagingProportion: readScalar(root, 'labour.peakForagingProportion'),
      foragerFatThreshold: readScalar(root, 'labour.foragerFatThreshold'),
      workerFatFractionByDepthThird: readNumberList(root, 'labour.workerFatFractionByDepthThird'),
      workerFatFractionBySeason: readNumberList(root, 'labour.workerFatFractionBySeason'),
      ageAtFirstForagingDaysSummerBorn: readScalar(root, 'labour.ageAtFirstForagingDaysSummerBorn'),
      ageAtFirstForagingDaysAutumnBorn: readScalar(root, 'labour.ageAtFirstForagingDaysAutumnBorn'),
      ageAtFirstForagingDaysAutumnBornRange: readRange(
        root,
        'labour.ageAtFirstForagingDaysAutumnBornRange',
      ),
      ageAtFirstForagingSummerBornSd: readScalar(root, 'labour.ageAtFirstForagingSummerBornSd'),
      maxProportionForaging: readRange(root, 'labour.maxProportionForaging'),
      proportionForagingMatureMean: readScalar(root, 'labour.proportionForagingMatureMean'),
      proportionForagingImmatureMean: readScalar(root, 'labour.proportionForagingImmatureMean'),
      foragersPerLarva: readScalar(root, 'labour.foragersPerLarva'),
      foragerLeadsLarvaeDays: readRange(root, 'labour.foragerLeadsLarvaeDays'),
      foragerObservedMaxDepthCm: readScalar(root, 'labour.foragerObservedMaxDepthCm'),
      callowFractionBeforeWinter: readScalar(root, 'labour.callowFractionBeforeWinter'),
      midcolouredFractionBeforeWinter: readScalar(root, 'labour.midcolouredFractionBeforeWinter'),
      midcolouredFractionEarlySpring: readScalar(root, 'labour.midcolouredFractionEarlySpring'),
      foragerLifespanDays: readScalar(root, 'labour.foragerLifespanDays'),
      foragerMortalityPerDay: readRange(root, 'labour.foragerMortalityPerDay'),
      foragerPopulationCollapseMortality: readScalar(
        root,
        'labour.foragerPopulationCollapseMortality',
      ),
      taskReversionAllowed: readFlag(root, 'labour.taskReversionAllowed'),
      backfillFromOtherCastes: readFlag(root, 'labour.backfillFromOtherCastes'),
      foragingSeasonMonths: readNumberList(root, 'labour.foragingSeasonMonths'),
      foragingOnsetSoilTempC: readScalar(root, 'labour.foragingOnsetSoilTempC'),
      foragingOnsetTempSpanC: readScalar(root, 'labour.foragingOnsetTempSpanC'),
      winterWorkerMortalityPerDay: readScalar(root, 'labour.winterWorkerMortalityPerDay'),
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
      speedMetresPerTick: readScalar(root, 'foraging.speedMetresPerTick'),
      maxTripTicks: readScalar(root, 'foraging.maxTripTicks'),
      departureChancePerTick: readScalar(root, 'foraging.departureChancePerTick'),
      encounterChancePerTick: readScalar(root, 'foraging.encounterChancePerTick'),
      searchTurnSdTurns: readScalar(root, 'foraging.searchTurnSdTurns'),
      trunkTrailAngularSpreadTurns: readScalar(root, 'foraging.trunkTrailAngularSpreadTurns'),
      trunkTrailJitter: readScalar(root, 'foraging.trunkTrailJitter'),
      trailSensingDistanceM: readScalar(root, 'foraging.trailSensingDistanceM'),
      trailSensingTurns: readScalar(root, 'foraging.trailSensingTurns'),
      trailFollowingStrength: readScalar(root, 'foraging.trailFollowingStrength'),
      recruitmentDepositPerStep: readScalar(root, 'foraging.recruitmentDepositPerStep'),
      seedPatchCount: readScalar(root, 'foraging.seedPatchCount'),
      seedPatchRadiusM: readScalar(root, 'foraging.seedPatchRadiusM'),
      backgroundSeedsPerSquareMetre: readScalar(root, 'foraging.backgroundSeedsPerSquareMetre'),
      standingSeedsPerSquareMetre: readScalar(root, 'foraging.standingSeedsPerSquareMetre'),
      seedReplenishmentPerDay: readScalar(root, 'foraging.seedReplenishmentPerDay'),
      surfaceTemperatureMaxC: readScalar(root, 'foraging.surfaceTemperatureMaxC'),
      activeDayFractionStart: readScalar(root, 'foraging.activeDayFractionStart'),
      activeDayFractionEnd: readScalar(root, 'foraging.activeDayFractionEnd'),
    },

    brood: {
      eggDurationDays: readScalar(root, 'brood.eggDurationDays'),
      larvaDurationDays: readScalar(root, 'brood.larvaDurationDays'),
      pupaDurationDays: readScalar(root, 'brood.pupaDurationDays'),
      callowDurationDays: readScalar(root, 'brood.callowDurationDays'),
      noOverwinteringBrood: readFlag(root, 'brood.noOverwinteringBrood'),
      latestPupalEclosionMonth: readScalar(root, 'brood.latestPupalEclosionMonth'),
      eggMortalityPerDay: readScalar(root, 'brood.eggMortalityPerDay'),
      larvaMortalityPerDay: readScalar(root, 'brood.larvaMortalityPerDay'),
      pupaMortalityPerDay: readScalar(root, 'brood.pupaMortalityPerDay'),
      queenEggsPerDayMature: readScalar(root, 'brood.queenEggsPerDayMature'),
      queenEggsPerDayFounding: readScalar(root, 'brood.queenEggsPerDayFounding'),
      queenEggsPerWorkerPerDay: readScalar(root, 'brood.queenEggsPerWorkerPerDay'),
      nanaticsForageImmediately: readFlag(root, 'brood.nanaticsForageImmediately'),
      larvalSeedConversionEfficiency: readScalar(root, 'brood.larvalSeedConversionEfficiency'),
      starvationSeverityPerDay: readScalar(root, 'brood.starvationSeverityPerDay'),
      alateShareBalanced: readScalar(root, 'brood.alateShareBalanced'),
      alateShareWorkerBias: readScalar(root, 'brood.alateShareWorkerBias'),
      alateShareAlateBias: readScalar(root, 'brood.alateShareAlateBias'),
      alateBroodMonths: readNumberList(root, 'brood.alateBroodMonths'),
      eclosionDepthBand: readScalar(root, 'brood.eclosionDepthBand'),
      transferFractionOfForagingAge: readScalar(root, 'brood.transferFractionOfForagingAge'),
      insideWorkerLifespanDays: readScalar(root, 'brood.insideWorkerLifespanDays'),
      insideWorkerMortalityPerDay: readScalar(root, 'brood.insideWorkerMortalityPerDay'),
      autumnFatGainMonths: readNumberList(root, 'brood.autumnFatGainMonths'),
      nanaticCount: readRange(root, 'brood.nanaticCount'),
      queenFoundingFatReserve: readScalar(root, 'brood.queenFoundingFatReserve'),
      queenFoundingFatPerEgg: readScalar(root, 'brood.queenFoundingFatPerEgg'),
    },

    interior: {
      stepIntervalTicks: readScalar(root, 'interior.stepIntervalTicks'),
      depthPreferenceWeight: readScalar(root, 'interior.depthPreferenceWeight'),
      walkNoise: readScalar(root, 'interior.walkNoise'),
      crowdAvoidance: readScalar(root, 'interior.crowdAvoidance'),
      preferredDepthRedrawDays: readScalar(root, 'interior.preferredDepthRedrawDays'),
      tendingAttraction: readScalar(root, 'interior.tendingAttraction'),
      broodPickUpChancePerTick: readScalar(root, 'interior.broodPickUpChancePerTick'),
      maxBroodPerCell: readScalar(root, 'interior.maxBroodPerCell'),
      broodSearchRadiusCm: readScalar(root, 'interior.broodSearchRadiusCm'),
      broodChamberDepthFraction: readScalar(root, 'interior.broodChamberDepthFraction'),
    },

    seeds: {
      seedChamberDepthCm: readRange(root, 'seeds.seedChamberDepthCm'),
      foragerDepositMaxDepthCm: readScalar(root, 'seeds.foragerDepositMaxDepthCm'),
      downwardTransportChancePerTick: readScalar(root, 'seeds.downwardTransportChancePerTick'),
      storeBandFractionOfDepth: readScalar(root, 'seeds.storeBandFractionOfDepth'),
      maxSeedsPerCell: readScalar(root, 'seeds.maxSeedsPerCell'),
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
      sizeClassNames: readStringList(root, 'seeds.sizeClassNames'),
      sizeClassSieveNumbers: readNumberList(root, 'seeds.sizeClassSieveNumbers'),
      sizeClassMinWidthMm: readNumberList(root, 'seeds.sizeClassMinWidthMm'),
      sizeClassMassMg: readNumberList(root, 'seeds.sizeClassMassMg'),
      collectedFractionByClass: readNumberList(root, 'seeds.collectedFractionByClass'),
      openingChancePerDay: readNumberList(root, 'seeds.openingChancePerDay'),
      openingRateFractionWithoutMajors: readScalar(root, 'seeds.openingRateFractionWithoutMajors'),
      openingMajorReferenceFraction: readScalar(root, 'seeds.openingMajorReferenceFraction'),
      seedsOpenedOnlyInActiveSeason: readFlag(root, 'seeds.seedsOpenedOnlyInActiveSeason'),
      germinationTestTemperaturesC: readNumberList(root, 'seeds.germinationTestTemperaturesC'),
      // In the order of sizeClassNames. The file names each list rather than nesting a table,
      // so that every list carries its own note saying which figure it was read from.
      germinationByClass: [
        readNumberList(root, 'seeds.germinationSmallByTemperature'),
        readNumberList(root, 'seeds.germinationMediumByTemperature'),
        readNumberList(root, 'seeds.germinationLargeByTemperature'),
        readNumberList(root, 'seeds.germinationVeryLargeByTemperature'),
      ],
      germinationTestDurationDays: readScalar(root, 'seeds.germinationTestDurationDays'),
      inNestGerminationFactor: readScalar(root, 'seeds.inNestGerminationFactor'),
      germinatingRemovalChancePerDay: readScalar(root, 'seeds.germinatingRemovalChancePerDay'),
      germinationOutsideActiveSeasonIsLost: readFlag(
        root,
        'seeds.germinationOutsideActiveSeasonIsLost',
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
