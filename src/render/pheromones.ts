/**
 * The scents, as the picture draws them and the key names them.
 *
 * One colour per channel, used everywhere that channel is drawn and never for anything else.
 * Three of the four channels in SCIENCE.md section 8 are simulated. The other two have
 * parameters in the species file and nothing behind them yet. The key lists them anyway and
 * says so, because a reader who knows ants will look for them, and leaving them out would
 * suggest the model had no such thing when it simply has not got there.
 */

export type PheromoneId = 'building' | 'recruitment' | 'alarm' | 'necrophoric'

export interface Pheromone {
  readonly id: PheromoneId
  readonly name: string
  readonly colour: string
  /** Where in the picture to look for it. */
  readonly where: string
  /** What it does, in a sentence or two. */
  readonly what: string
  readonly simulated: boolean
}

export const PHEROMONES: readonly Pheromone[] = [
  {
    id: 'building',
    name: 'Digging scent',
    colour: '#a88bf5',
    where: 'In the nest',
    what: 'Added to the sand an ant digs out. Ants work where it is strong, so a tunnel keeps growing where it already is. How long it lasts shapes the whole nest.',
    simulated: true,
  },
  {
    id: 'recruitment',
    name: 'Foraging trail',
    colour: '#1e9e7a',
    where: 'On the ground',
    what: 'Laid by a forager walking home with a seed. Other foragers follow it back to the same patch. It fades within a day if nobody renews it.',
    simulated: true,
  },
  {
    id: 'alarm',
    name: 'Alarm',
    colour: '#e5484d',
    where: 'On the ground, round a disturbance',
    what: 'Released from the head of a forager that meets something on the ground. Nearby foragers run to it and circle it, and release it too. The real scent reaches about 6 cm and is gone in 35 seconds, far less than one step of this model, so the ring on the map shows how close a forager must be to respond here.',
    simulated: true,
  },
  {
    id: 'necrophoric',
    name: 'Dead-nestmate scent',
    colour: '#8b8f98',
    where: 'Not simulated yet',
    what: 'Given off by a dead ant, and what makes workers carry the body out of the nest.',
    simulated: false,
  },
]

export function pheromoneColour(id: PheromoneId): string {
  return PHEROMONES.find((p) => p.id === id)!.colour
}
