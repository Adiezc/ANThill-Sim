/**
 * The rule registry: what an ant is doing, and where that comes from.
 *
 * `AntStore.ruleId` holds one of these ids. The inspector reads it and shows the citation for
 * the rule the ant is following at that moment. That one line is the educational payload of
 * the whole project, so the registry lives in `/core` beside the systems that set it, not in
 * the UI. A mechanic whose rule has no entry here cannot annotate an ant, and the citation
 * cannot drift away from the code that needs it.
 *
 * Ids are assigned in registration order, so they are stable within a build and form part of
 * the state digest. They are not stable across builds and must never be saved.
 *
 * Summaries and caveats are written for somebody watching an ant, not somebody reading a
 * paper. Say what the ant is doing, then what is known and what is not.
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
  /** Present when the rule needs a caveat shown alongside it. */
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
 * Every rule an ant can be following. `RULE.idle` is id 0, which is also the value a freshly
 * spawned ant carries, so an unannotated ant reads as idle rather than as whichever rule
 * happened to be registered first.
 */
export const RULE = {
  idle: rule('idle', 'Doing nothing in particular.', 'C', 'None', '—'),

  // ---- Soil and climate (docs/SCIENCE.md section 9) ----
  soilTemperature: rule(
    'soil.temperature',
    'The soil warms and cools with the seasons, later and less the deeper it is.',
    'B',
    'Standard soil heat model, fitted to soil temperatures measured by Tschinkel & Kwapich 2016',
    '9',
    'The pattern is standard physics. How far the warmth lags with depth, and how much warmer the surface runs than the air, are fitted to one year of measurements rather than measured directly.',
  ),
  soilMoisture: rule(
    'soil.moisture',
    'Rain wets the sand from the top down, and only the shallow sand dries out again.',
    'C',
    'None. Nobody has published a soil moisture profile for these nests',
    '9',
  ),
  soilStress: rule(
    'soil.stress',
    'Forces in the sand arch over a tunnel and shield it. No ant senses them.',
    'B',
    'Buarque de Macedo et al. 2021; Belachew, Arson & Frost 2025',
    '2, 3',
  ),

  // ---- Excavation (docs/SCIENCE.md section 3) ----
  digCollisionAgitation: rule(
    'excavation.collisionAgitation',
    'Digging harder or more gently depending on how often it has just bumped into a nestmate.',
    'B',
    'Avinery et al. 2023 (Solenopsis invicta)',
    '3',
    'Nothing controls digging effort for the colony as a whole. Each ant sets its own pace.',
  ),
  digStressSelection: rule(
    'excavation.stressSelection',
    'Taking a grain that carries little load, which is what keeps the tunnel standing.',
    'B',
    'Buarque de Macedo et al. 2021 (Pogonomyrmex sp.)',
    '3',
  ),
  digMoistureWindow: rule(
    'excavation.moistureWindow',
    'Not digging, because this sand is too dry or too wet to hold a tunnel.',
    'B',
    'Monaenkova et al. 2015 (Solenopsis invicta)',
    '3',
  ),
  digSpoilCue: rule(
    'excavation.spoilCue',
    'Starting to dig where other ants have just dumped fresh pellets.',
    'B',
    'Pielström & Roces 2013 (Atta vollenweideri)',
    '3',
  ),
  digBuildingPheromone: rule(
    'excavation.buildingPheromone',
    'Working where the building pheromone is strongest, which draws more work to wherever work has already happened.',
    'B',
    'Khuong et al. 2016 (Lasius niger)',
    '3, 8',
    'How long this pheromone lasts shapes the nest more than any other setting, and nobody has measured it for this species. It is set in the parameter file and marked as invented.',
  ),
  digBodySizeTemplate: rule(
    'excavation.bodySizeTemplate',
    'Stopping when the ceiling is about one body height above the floor, which is what makes a chamber a chamber.',
    'B',
    'Khuong et al. 2016',
    '2, 3',
    'That chambers are about 1 cm high whatever their size is measured in this species [A]. The body-size mechanism that produces it is borrowed from another ant [B].',
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
    'Driving a shaft downward, at a shallow angle near the surface and steeper further down.',
    'A',
    'Tschinkel 2004',
    '2',
    'The pattern is measured. How an ant knows its depth is not. See excavation.depthCue.',
  ),
  digDepthCue: rule(
    'excavation.depthCue',
    'Behaving differently at depth. How a real ant knows how deep it is remains unknown.',
    'C',
    'None. Tschinkel 2013 tested the carbon dioxide gradient idea and ruled it out',
    '3, 11',
    'This is the biggest invention in the digging model. Shafts do steepen with depth and branching does stop below 40 cm, but nobody knows the mechanism. The obvious candidate was tested by venting the gradient away and by reversing it, and the nest came out the same. The model simply hands a digging ant its own depth, standing in for a cue nobody has found.',
  ),
  digBranching: rule(
    'excavation.branching',
    'Starting a new shaft off an existing one, which only happens near the surface.',
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
    'That sand moves up through the nest in stages is measured in this species [A] (Tschinkel & Seal 2015). The split into three kinds of carrier is borrowed from another ant [B].',
  ),
  carryPelletLong: rule(
    'excavation.carryLong',
    'Carrying a pellet the whole way up and out onto the sand around the entrance.',
    'A',
    'Tschinkel & Seal 2015',
    '3',
  ),
  redepositUnderground: rule(
    'excavation.redeposit',
    'Dumping a pellet underground instead of carrying it out. About one pellet in 40 never reaches the surface.',
    'A',
    'Tschinkel & Seal 2015',
    '3',
  ),

  // ---- Foraging (docs/SCIENCE.md sections 5 and 8) ----
  forageTrunkTrail: rule(
    'foraging.trunkTrail',
    'Heading out along one of the colony’s few trunk trails.',
    'A',
    'Harrison & Gentry 1981',
    '5',
    'That a colony forages along a few short trunk trails is measured [A], and so is the finding that neighbouring colonies shape their directions. The model has no neighbours, so it draws the directions once from the colony’s seed and keeps them. That matches the randomness seen across colonies without pretending to model its cause.',
  ),
  forageSiteFidelity: rule(
    'foraging.siteFidelity',
    'Going back to within half a metre of where it last found food.',
    'B',
    'Beverly et al. 2009 (Pogonomyrmex barbatus)',
    '5',
    'Measured in a related species, not in badius.',
  ),
  forageRecruitmentTrail: rule(
    'foraging.recruitmentTrail',
    'Following or laying a recruitment trail. Strong trails attract far more ants than weak ones.',
    'B',
    'Hölldobler & Wilson 1970 [A] that badius recruits; Sumpter & Beekman 2003 [B] for the non-linear response',
    '8',
    'That this species lays recruitment trails and can recruit in large numbers is measured [A]. The shape of the response, and every decay and deposit rate, is borrowed or invented, because nothing has been published for badius.',
  ),
  foragePathIntegration: rule(
    'foraging.pathIntegration',
    'Walking home on a running sum of its own steps, not on a memory of the route.',
    'B',
    'General Pogonomyrmex and desert ant literature',
    '8',
  ),
  // ---- Inside the nest (docs/SCIENCE.md sections 4 and 6) ----
  interiorStratification: rule(
    'interior.stratification',
    'Settling at the depth where workers doing its job are found: nurses deep, transfer workers in the middle, foragers in the top few centimetres.',
    'A',
    'Tschinkel & Kwapich 2017',
    '4',
    'The distribution is measured. Whole nests were sorted chamber by chamber. The mechanism is invented. An ant here walks toward a depth it is given, although no real ant knows its depth, the same admitted fiction as excavation.depthCue.',
  ),
  interiorTendBrood: rule(
    'interior.tendBrood',
    'Carrying brood down to the deep chambers where the colony keeps it.',
    'A',
    'Tschinkel & Kwapich 2017; Tschinkel 2004',
    '4',
    'That brood is kept deep and that callows hatch in the bottom chambers is measured [A]. That nurses carry it there piece by piece is the obvious mechanism, but nobody has documented it.',
  ),
  seedDepositTopChamber: rule(
    'seeds.depositTopChamber',
    'Dropping a seed in the topmost chamber and heading back out. A forager never takes a seed deeper.',
    'A',
    'Tschinkel & Seal 2015',
    '6',
  ),
  seedCarryDown: rule(
    'seeds.carryDown',
    'Carrying a seed down toward the seed chambers. In a real nest this traffic shows up as a wave of seeds moving downward.',
    'A',
    'Tschinkel & Seal 2015; Tschinkel & Kwapich 2017 for the 20 to 80 cm band',
    '6',
    'The division of labour is measured [A]. The forager that brought a seed in never takes it deeper, somebody else does, and the store ends up 20 to 80 cm down. Which workers carry seeds is left open here, so any worker that is not a forager will carry a seed it finds. How fast the wave travels is invented, because nobody has timed it.',
  ),
  seedGermination: rule(
    'seeds.germination',
    'A stored seed germinating in its chamber, at a rate set by its size and the soil temperature. Depth has no effect of its own.',
    'A',
    'Tschinkel & Kwapich 2016',
    '6',
    'Each size class responds to temperature as one batch of seeds did in the laboratory, and a second batch germinated about half as much. Seeds in a packed chamber germinate far more slowly than on damp plaster, so the laboratory rates are scaled down to match counts from natural chambers. That scaling factor is calibrated rather than measured, and it matters more than any other number in the store. Seed age, soil moisture and the daily temperature swing are not modelled.',
  ),
  seedOpenSmall: rule(
    'seeds.openSmall',
    'Opening a small or medium seed and eating it. Nothing wider than about 1.4 mm can be opened, by a major or anyone else.',
    'A',
    'Tschinkel & Kwapich 2016',
    '6',
    'Majors open small and medium seeds faster but cannot open wider ones (HARD RULE). How the rate changes between a colony with no majors and one with its usual share is interpolated, not measured.',
  ),
  seedFeedGerminating: rule(
    'seeds.feedGerminating',
    'Taking a germinating seed from the store and feeding it to the larvae. This is the only way a seed too large to open is ever eaten.',
    'A',
    'Tschinkel & Kwapich 2016',
    '6',
  ),
  queenLaying: rule(
    'colony.queenLaying',
    'Laying eggs in the chamber her daughters keep her in.',
    'C',
    'None. That a colony has exactly one queen is measured [A], but where in the nest she sits is not published',
    '4',
  ),

  forageHeatCurfew: rule(
    'foraging.heatCurfew',
    'Staying in because the ground is too hot to cross without losing more water than a seed is worth.',
    'B',
    'Harvester ant water-loss literature (desert Pogonomyrmex)',
    '5',
    'Nobody has published a threshold temperature for badius. The value is invented, set in the parameter file and marked as such.',
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

/** Counts by tag, for the summary line in the sources panel. */
export function ruleTagCounts(): Record<Tag, number> {
  const counts: Record<Tag, number> = { A: 0, B: 0, C: 0 }
  for (const entry of rules) counts[entry.tag] += 1
  return counts
}
