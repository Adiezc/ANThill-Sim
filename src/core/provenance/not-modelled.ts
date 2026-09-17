/**
 * Mechanics this simulator deliberately refuses to model, and why.
 *
 * Every one of these is intuitive, widely assumed and wrong for this species. Most were
 * tested experimentally and rejected. What a model declines to do teaches as much as what it
 * does, so this is first-class content rather than a footnote, and it lives in `/core` so it
 * cannot drift away from the code that honours it.
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
      'A Pogonomyrmex badius colony has one queen. Several founding queens sometimes cooperate for a while, but a mature wild colony has exactly one. A parameter file that asks for more is refused.',
    citation: 'Wikipedia species account; Tschinkel 2004',
    experimentallyRejected: false,
  },
  {
    assumption: 'Majors are soldiers.',
    reason:
      'This species has no defensive caste. Majors crack seeds. They raise the rate at which small and medium seeds are opened, and the model has no soldier caste to give them.',
    citation: 'Tschinkel 1998; Tschinkel & Kwapich 2016',
    experimentallyRejected: false,
  },
  {
    assumption: 'Big workers go further and bring back bigger seeds.',
    reason:
      'Tested and rejected. A worker’s size predicts neither the size of the seeds it collects nor how far it travels for them. Nothing in the foraging code reads body size or caste, and the parameter file records both findings as HARD RULEs that the loader will not let anyone switch off.',
    citation: 'Ferster & Traniello 1995',
    experimentallyRejected: true,
  },
  {
    assumption: 'Idle workers step in when there is a labour shortage.',
    reason:
      'Tested and rejected. When half of a colony’s foragers were removed, no workers from any other caste replaced them. Larval survival fell instead.',
    citation: 'Kwapich & Tschinkel 2013, 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Foragers can be moved back to nursing.',
    reason:
      'Work in this species runs one way. Raising the number of foragers, their body fat or the ratio of larvae to foragers never sends a forager back inside. Foragers that live longer actually slow the arrival of new ones.',
    citation: 'Kwapich & Tschinkel 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'A carbon dioxide gradient tells ants how deep they are.',
    reason:
      'It is the obvious candidate for the depth cue this model has to invent, and it was tested by venting the gradient away and by reversing it. The nest came out the same shape. The model simply hands each digging ant its own depth, as an admitted stand-in for a cue nobody has found.',
    citation: 'Tschinkel 2013',
    experimentallyRejected: true,
  },
  {
    assumption: 'A colony picks a better site when it moves.',
    reason:
      'The new nest is statistically indistinguishable from the old one in size and shape, and nest architecture, forest canopy and the density of neighbours all failed to explain why colonies move. Nobody knows why they do. In this model a colony moves along a trail by the measured distance, and no site is better than another. Candidate sites that differ, proposed at the project author’s request in docs/DECISIONS.md D3, were never built.',
    citation: 'Tschinkel 2013, 2014',
    experimentallyRejected: true,
  },
  {
    assumption: 'Colonies defend a foraging territory.',
    reason:
      'A range is used almost exclusively by one colony, but nobody defends it, and a colony’s range spreads into ground a neighbour has abandoned. Exclusivity comes from where the trails point, not from fighting. The model has no territorial behaviour.',
    citation: 'Harrison & Gentry 1981',
    experimentallyRejected: false,
  },
  {
    assumption: 'A forager’s sense of the way home drifts as it wanders.',
    reason:
      'In a real ant it does. Here it does not. A forager builds its homing vector from its own steps rather than reading its position off the world, which is what matters for the claim that no ant knows where it is. But the sum is exact, so the vector never goes wrong. Nobody has measured homing error in this species, and an invented error would be worse than an absence that is declared.',
    citation: 'None. The mechanism comes from general Pogonomyrmex and desert ant literature',
    experimentallyRejected: false,
  },
  {
    assumption: 'The seed store is an emergency granary.',
    reason:
      'Colonies kept from foraging did not draw on their stores, and their larvae starved within about a week. Doubling a colony’s larvae did not open the store either. Most of a store is seed too large to open until it germinates, and in a packed chamber that is slow. A colony in this model that stops foraging starves its larvae on top of a full store, as the real ones did.',
    citation: 'Kwapich & Tschinkel 2013; Smith 2007; both as reported by Tschinkel & Kwapich 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Harvester ants stop their stored seeds from germinating.',
    reason:
      'Some ant species do. The Florida harvester ant does the opposite. It relies on germination to eat seeds too large to open, finds sprouting seeds in its chambers within days and feeds them to its larvae first. Chambers the ants were barred from filled with sprouting seeds, while chambers they could reach had almost none.',
    citation: 'Tschinkel & Kwapich 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Big workers crack the big seeds.',
    reason:
      'Majors open small and medium seeds about three times faster, and open nothing a minor cannot. The widest seed opened was the same with or without them. A large seed is eaten only once it germinates.',
    citation: 'Tschinkel & Kwapich 2016',
    experimentallyRejected: true,
  },
  {
    assumption: 'Ants plan the nest.',
    reason:
      'There is no plan and no architect. No ant has a map, and none has seen the whole structure. Everything here emerges from local rules, though ice-cast experiments do show colonies have preferences about what they will accept.',
    citation: 'Tschinkel 2004, 2015, 2017',
    experimentallyRejected: false,
  },
]
