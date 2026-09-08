/**
 * The rule registry: what an ant is doing, and where that comes from.
 *
 * `AntStore.ruleId` holds one of these ids. The inspector reads it and shows the citation
 * for the rule the ant is following at that instant. That one line is the educational
 * payload of the whole project, so this registry lives in `/core` beside the systems that
 * set it, not in the UI: a mechanic whose rule has no entry here cannot annotate an ant,
 * and the citation cannot drift away from the code that needs it.
 *
 * Ids are assigned by registration order and are therefore stable within a build and part
 * of the state digest. They are not stable across builds and must never be persisted.
 */

import type { Tag } from '../params/schema.js'

export interface Rule {
  readonly id: number
  /** Stable dotted key, safe to persist and to look up by. */
  readonly key: string
  /** One line, written for a reader who is watching an ant, not reading a paper. */
  readonly summary: string
  readonly tag: Tag
  /** Author and year, as it appears in the reference list of docs/SCIENCE.md. */
  readonly citation: string
  /** Section of docs/SCIENCE.md this rule is tabulated in. */
  readonly section: string
  /** Present when the rule needs a caveat surfaced alongside it. */
  readonly caveat?: string
}

const rules: Rule[] = []
const byKey = new Map<string, Rule>()

function rule(
  key: string,
  summary: string,
  tag: Tag,
  citation: string,
  section: string,
  caveat?: string,
): number {
  if (byKey.has(key)) throw new Error(`Duplicate rule key "${key}"`)
  const entry: Rule = {
    id: rules.length,
    key,
    summary,
    tag,
    citation,
    section,
    ...(caveat === undefined ? {} : { caveat }),
  }
  rules.push(entry)
  byKey.set(key, entry)
  return entry.id
}

/**
 * Every rule an ant can be following. `RULE.idle` is id 0, which is also the value a
 * freshly spawned ant carries, so an unannotated ant reads as idle rather than as
 * whichever rule happened to be registered first.
 */
export const RULE = {
  idle: rule('idle', 'Doing nothing in particular.', 'C', 'None', '—'),

  // ---- Soil and climate (docs/SCIENCE.md section 9) ----
  soilTemperature: rule(
    'soil.temperature',
    'Soil temperature follows the seasonal air cycle, lagged and damped with depth.',
    'B',
    'Standard soil thermal model; the link to seed germination is Tschinkel & Kwapich 2016 [A]',
    '9',
  ),
  soilMoisture: rule(
    'soil.moisture',
    'Rain wets the sand from the top down; only shallow soil dries out again.',
    'C',
    'None. No soil moisture profile is published for these nests',
    '9',
  ),
  soilStress: rule(
    'soil.stress',
    'Force chains arch over a tunnel and shield it. No ant senses the force network.',
    'B',
    'Buarque de Macedo et al. 2021; Belachew, Arson & Frost 2025',
    '2, 3',
  ),

  // ---- Excavation (docs/SCIENCE.md section 3) ----
  digCollisionAgitation: rule(
    'excavation.collisionAgitation',
    'Digging harder or less hard according to how often it has just bumped into a nestmate.',
    'B',
    'Avinery et al. 2023 (Solenopsis invicta)',
    '3',
    'There is no global control of digging effort. Each ant modulates its own rate.',
  ),
  digStressSelection: rule(
    'excavation.stressSelection',
    'Taking a grain that is carrying little load, which is what leaves the tunnel standing.',
    'B',
    'Buarque de Macedo et al. 2021 (Pogonomyrmex sp.)',
    '3',
  ),
  digMoistureWindow: rule(
    'excavation.moistureWindow',
    'Not digging: this sand is too dry or too saturated to hold a tunnel.',
    'B',
    'Monaenkova et al. 2015 (Solenopsis invicta)',
    '3',
  ),
  digSpoilCue: rule(
    'excavation.spoilCue',
    'Starting to dig where other ants have already dumped fresh pellets.',
    'B',
    'Pielström & Roces 2013 (Atta vollenweideri)',
    '3',
  ),
  digBuildingPheromone: rule(
    'excavation.buildingPheromone',
    'Working where the building pheromone is strongest, which amplifies wherever work has already happened.',
    'B',
    'Khuong et al. 2016 (Lasius niger)',
    '3, 8',
    'The lifetime of this pheromone is the single parameter that dominates nest form, and no value exists for this species. It is a slider.',
  ),
  digBodySizeTemplate: rule(
    'excavation.bodySizeTemplate',
    'Stopping when the ceiling is about a body height above the floor, which is what makes a chamber a chamber.',
    'B',
    'Khuong et al. 2016',
    '2, 3',
    'Chamber height of about 1 cm regardless of chamber area is [A] for this species; the body-size mechanism producing it is [B].',
  ),
  digTunnelLengthFeedback: rule(
    'excavation.tunnelLengthFeedback',
    'Digging less, because this tunnel is already long.',
    'B',
    'Bruce et al. 2018 (Acromyrmex lundi, Atta colombica)',
    '3',
  ),
  digShaftDescent: rule(
    'excavation.shaftDescent',
    'Driving a shaft downward, shallow-angled near the surface and steepening with depth.',
    'A',
    'Tschinkel 2004',
    '2',
    'The pattern is documented. The cue an ant uses to know its depth is not — see excavation.depthCue.',
  ),
  digDepthCue: rule(
    'excavation.depthCue',
    'Behaving differently at depth. How a real ant knows its depth is unknown.',
    'C',
    'None. The CO2-gradient hypothesis was tested and falsified by Tschinkel 2013',
    '3, 11',
    'This is the largest invented element of the excavation model. Shaft angle steepening with depth and branching stopping below 40 cm are both observed, but no mechanism is known, and the obvious candidate was tested by venting the gradient and by reversing it and left nest architecture unchanged. The simulation hands a digging ant its own depth as a stand-in for a cue nobody has identified.',
  ),
  digBranching: rule(
    'excavation.branching',
    'Starting a new shaft off an existing one, which only ever happens near the surface.',
    'A',
    'Tschinkel 2004',
    '2',
  ),
  digTemperatureDepth: rule(
    'excavation.temperatureDepth',
    'Digging deeper because the surface is warm.',
    'B',
    'Sankovitz & Purcell 2021; García Ibarra et al. 2023',
    '3',
  ),

  // ---- Spoil transport (docs/SCIENCE.md section 3) ----
  carryPelletShort: rule(
    'excavation.carryShort',
    'Carrying a pellet a short way and handing it on, rather than taking it all the way up.',
    'B',
    'Pielström & Roces 2013',
    '3',
    'That sand moves upward through the nest in stages is [A] for this species (Tschinkel & Seal 2015); the three-tier split of carriers is [B].',
  ),
  carryPelletLong: rule(
    'excavation.carryLong',
    'Carrying a pellet the length of the nest and out onto the crater.',
    'A',
    'Tschinkel & Seal 2015',
    '3',
  ),
  redepositUnderground: rule(
    'excavation.redeposit',
    'Dumping a pellet underground instead of carrying it out. About one pellet in forty never reaches the surface.',
    'A',
    'Tschinkel & Seal 2015',
    '3',
  ),

  // ---- Foraging (docs/SCIENCE.md sections 5 and 8) ----
  forageTrunkTrail: rule(
    'foraging.trunkTrail',
    'Heading out along one of the colony\u2019s few trunk trails.',
    'A',
    'Harrison & Gentry 1981',
    '5',
    'That the colony forages from a small number of short trunk trails is [A]. Their direction is [A] to be shaped by neighbouring colonies, and no neighbours are modelled here, so the directions are drawn once from the colony seed and fixed \u2014 which reproduces the population-level randomness without pretending to model its cause.',
  ),
  forageSiteFidelity: rule(
    'foraging.siteFidelity',
    'Going back to within half a metre of where it last found something.',
    'B',
    'Beverly et al. 2009 (Pogonomyrmex barbatus)',
    '5',
    'Measured in a congener, not in badius.',
  ),
  forageRecruitmentTrail: rule(
    'foraging.recruitmentTrail',
    'Following, or laying, a recruitment trail. Strong trails win disproportionately.',
    'B',
    'Hölldobler & Wilson 1970 [A] that badius recruits; Sumpter & Beekman 2003 [B] for the non-linear response',
    '8',
    'That this species lays recruitment trails and is capable of mass recruitment is [A]. The shape of the response curve, and every decay and deposition constant, is [B] or invented: no values are published for badius.',
  ),
  foragePathIntegration: rule(
    'foraging.pathIntegration',
    'Walking home on a vector it accumulated on the way out, not on a memory of the route.',
    'B',
    'General Pogonomyrmex and desert ant literature',
    '8',
  ),
  // ---- Inside the nest (docs/SCIENCE.md sections 4 and 6) ----
  interiorStratification: rule(
    'interior.stratification',
    'Settling at the depth workers doing its job are found at: nurses deep, transfer workers through the middle, foragers in the top few centimetres.',
    'A',
    'Tschinkel & Kwapich 2017',
    '4',
    'The distribution is measured \u2014 whole nests were sorted chamber by chamber. The mechanism is invented: an ant here walks toward a depth it is given, and no real ant knows its depth. Same admitted fiction as excavation.depthCue.',
  ),
  interiorTendBrood: rule(
    'interior.tendBrood',
    'Carrying brood down to the deep chambers where the colony keeps it.',
    'A',
    'Tschinkel & Kwapich 2017; Tschinkel 2004',
    '4',
    'That brood is kept deep and that callows eclose in the bottom chambers is [A]. That a nurse carries it there piece by piece is the obvious mechanism and is not itself documented.',
  ),
  seedDepositTopChamber: rule(
    'seeds.depositTopChamber',
    'Dropping a seed in the topmost chamber and going back out. A forager never takes one deeper.',
    'A',
    'Tschinkel & Seal 2015',
    '6',
  ),
  seedCarryDown: rule(
    'seeds.carryDown',
    'Carrying a seed down toward the seed chambers. This traffic is visible in a real nest as a wave of seeds moving downward.',
    'A',
    'Tschinkel & Seal 2015; Tschinkel & Kwapich 2017 for the 20 to 80 cm band',
    '6',
    'What is [A] is the partitioning — the forager that brought the seed in never takes it deeper, and somebody else does — and the 20 to 80 cm band it ends up in. Which workers do the carrying is left open here: any worker that is not a forager will carry a seed it comes across. How fast the wave travels is invented; nobody timed it.',
  ),
  queenLaying: rule(
    'colony.queenLaying',
    'Laying, in the chamber her daughters keep her in.',
    'C',
    'None. That the colony has exactly one queen is [A]; where in the nest she sits is not published',
    '4',
  ),

  forageHeatCurfew: rule(
    'foraging.heatCurfew',
    'Staying in because the surface is too hot to cross without losing more water than a seed is worth.',
    'B',
    'Harvester ant water-loss plasticity literature (desert Pogonomyrmex)',
    '5',
    'No threshold temperature is published for badius. The value is invented and exposed as a slider.',
  ),
} as const

export type RuleKey = keyof typeof RULE

/** Every registered rule, in id order. */
export function allRules(): readonly Rule[] {
  return rules
}

export function ruleById(id: number): Rule {
  const found = rules[id]
  if (found === undefined) throw new Error(`No rule with id ${id}`)
  return found
}

export function ruleByKey(key: string): Rule | undefined {
  return byKey.get(key)
}

/** Counts by tag, for the honesty panel's summary line. */
export function ruleTagCounts(): Record<Tag, number> {
  const counts: Record<Tag, number> = { A: 0, B: 0, C: 0 }
  for (const entry of rules) counts[entry.tag] += 1
  return counts
}
