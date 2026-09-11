/**
 * Mechanics this simulator deliberately refuses to model, and why.
 *
 * Every one of these is intuitive, commonly assumed, and wrong for this species. Most were
 * tested experimentally and rejected. What the model declines to do is as instructive as
 * what it does, so this is first-class content rather than a footnote, and it lives in
 * `/core` so it cannot drift away from the code that honours it.
 *
 * See docs/SCIENCE.md section 11.
 */

export interface NotModelled {
  readonly assumption: string
  readonly reason: string
  /** The paper that tested it, where one exists. */
  readonly citation: string
  /** True where the assumption was experimentally tested and rejected, not merely absent. */
  readonly experimentallyRejected: boolean
}

export const NOT_MODELLED: readonly NotModelled[] = [
  {
    assumption: 'Big anthills have many queens.',
    reason:
      'Pogonomyrmex badius is monogynous. Several foundresses may cooperate briefly, but a mature wild colony has exactly one queen. Loading a parameter file with more is a hard error.',
    citation: 'Wikipedia species account; Tschinkel 2004',
    experimentallyRejected: false,
  },
  {
    assumption: 'Majors are soldiers.',
    reason:
      'This species has no defensive caste. Majors are seed-crackers: their contribution is raising the rate at which small and medium seeds are opened. There is no soldier value in the caste enumeration to assign.',
    citation: 'Tschinkel 1998; Tschinkel & Kwapich 2016',
    experimentallyRejected: false,
  },
  {
    assumption: 'Majors fetch the big seeds from far away.',
    reason:
      'Tested and rejected. Worker size predicts neither the size of seed collected nor the distance travelled to collect it.',
    citation: 'Ferster & Traniello 1995',
    experimentallyRejected: true,
  },
  {
    assumption: 'Idle workers respond to a labour shortage.',
    reason:
      'Tested and rejected. Removing half of a colony’s foragers drew no replacements from any other caste. Larval survival suffered instead.',
    citation: 'Kwapich & Tschinkel 2013, 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Foragers can be reassigned to nursing.',
    reason:
      'Allocation in this species is one-way. Raising forager number, body fat or the larva-to-forager ratio induces no reversion. Increased forager survival actually inhibits new workers moving into foraging.',
    citation: 'Kwapich & Tschinkel 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'A carbon dioxide gradient tells the ants how deep they are.',
    reason:
      'An appealing hypothesis, and the obvious candidate for the depth cue this simulation has to invent. It was tested by venting the gradient away and by reversing it. Nest architecture was unchanged. This simulator hands a digging ant its own depth as an admitted stand-in for a cue nobody has identified.',
    citation: 'Tschinkel 2013',
    experimentallyRejected: true,
  },
  {
    assumption: 'The colony chooses a better site when it moves.',
    reason:
      'The replacement nest is statistically indistinguishable from the one vacated, in both size and shape, and architecture, forest canopy and neighbour density all failed to explain why colonies move at all. The reason for relocation remains unknown. This simulator nevertheless lets candidate sites differ, at the project author’s instruction, so that the player’s one annual decision has consequences — a departure recorded in docs/DECISIONS.md D3 and labelled wherever it is shown.',
    citation: 'Tschinkel 2013, 2014',
    experimentallyRejected: true,
  },
  {
    assumption: 'Big foragers go further and bring back bigger seeds.',
    reason:
      'Tested and rejected. Worker size predicts neither the size of seed collected nor the distance travelled to collect it, so nothing in the foraging system reads body size or caste at all. The parameter file records both prohibitions as HARD RULEs and the loader refuses a file that flips either.',
    citation: 'Ferster & Traniello 1995',
    experimentallyRejected: true,
  },
  {
    assumption: 'Colonies defend a foraging territory.',
    reason:
      'A range is used almost exclusively by one colony, but it is not actively defended, and a range expands into ground a neighbour has abandoned. Exclusivity here is a consequence of where the trails point, not of any fighting. There is no territorial behaviour in this model.',
    citation: 'Harrison & Gentry 1981',
    experimentallyRejected: false,
  },
  {
    assumption: 'A forager’s sense of the way home drifts as it wanders.',
    reason:
      'It does in a real ant, and it does not here. A forager accumulates its homing vector from its own steps rather than reading its position off the world, which is the part that matters for the claim that no ant knows where it is; but the accumulation is exact, so the vector never goes wrong. No homing error has been measured in this species, and an invented error would be worse than an absent one that is declared.',
    citation: 'None. General Pogonomyrmex and desert ant literature for the mechanism',
    experimentallyRejected: false,
  },
  {
    assumption: 'The seed store is an emergency granary.',
    reason:
      'Colonies kept from foraging did not draw on their stores, and their larvae starved within about a week; doubling a colony’s larvae did not unlock the store either. Most of a store is seed the ants cannot open until it germinates, and in a packed chamber that is slow. A colony in this model that stops foraging starves its larvae above a full store, as the real ones did.',
    citation: 'Kwapich & Tschinkel 2013; Smith 2007; both as reported by Tschinkel & Kwapich 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Harvester ants keep their stored seeds from germinating.',
    reason:
      'Some ant species do. The Florida harvester ant does the opposite: it relies on germination to eat seeds too large to open, finds germinating seeds in its chambers within days, and feeds them to its larvae first. Chambers the ants were barred from filled with sprouting seeds; chambers they could reach had almost none.',
    citation: 'Tschinkel & Kwapich 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Big workers crack the big seeds.',
    reason:
      'Majors raise the rate at which small and medium seeds are opened, roughly threefold, and open nothing the minors cannot: the widest seed opened was the same with or without them. A large seed is eaten only once it germinates.',
    citation: 'Tschinkel & Kwapich 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Ants plan the nest.',
    reason:
      'There is no plan and no architect. No ant has a map, and none has seen the whole structure. Everything here emerges from local rules — though ice-cast experiments do show colonies have preferences about what they will accept.',
    citation: 'Tschinkel 2004, 2015, 2017',
    experimentallyRejected: false,
  },
]
