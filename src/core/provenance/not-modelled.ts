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
    assumption: 'Ants plan the nest.',
    reason:
      'There is no plan and no architect. No ant has a map, and none has seen the whole structure. Everything here emerges from local rules — though ice-cast experiments do show colonies have preferences about what they will accept.',
    citation: 'Tschinkel 2004, 2015, 2017',
    experimentallyRejected: false,
  },
]
