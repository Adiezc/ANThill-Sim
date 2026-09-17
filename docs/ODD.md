# ODD description

This describes Anthill 1.0.0 in the ODD protocol for agent-based models (Overview, Design
concepts, Details; Grimm et al. 2006, 2020). It is a map of the model, not a second copy of it.
Every rule is set out with its source in [`SCIENCE.md`](SCIENCE.md), every value with its tag in
[`species/pogonomyrmex-badius.json`](../species/pogonomyrmex-badius.json), and every choice with
its reasons in [`DECISIONS.md`](DECISIONS.md). Where they disagree with this file, they are right.

Tags: **[A]** measured in _Pogonomyrmex badius_; **[B]** borrowed from another ant; **[C]** invented.

## 1. Purpose and patterns

**Purpose.** To grow one colony of the Florida harvester ant from a single mated queen to its
death, in which the nest, the foraging trails and the colony's seasonal cycle come out of individual
ants following local rules, and every rule and value says whether it was measured, borrowed or
invented. It serves two uses: watching a colony in a browser, and replicate studies run headless.

**Patterns the model is held against** ([`VALIDATION.md`](VALIDATION.md) gives the status of each):

- Nest architecture: chamber area falling with depth, top-heaviness, chamber height, and nest depth
  following worker number, `log(depth) = 0.95 + 0.37 log(workers)` (Tschinkel 2004). **[A]**
- Seasonal share of workers foraging, rising in spring to 35 to 41 percent in mature colonies and
  60 in immature ones, and 1.64 foragers per larva (Kwapich & Tschinkel 2013). **[A]**
- Forager lifespans of 27 days, and 38 for the overwintered cohort (Kwapich & Tschinkel 2013). **[A]**
- Colony growth between May and October: 4.64 times over in a normal year and 0.996 in a drought
  (Kwapich & Tschinkel 2013). **[A]**
- A seed store in which large seeds the ants cannot open make up about 70 percent by weight
  (Tschinkel & Kwapich 2016). **[A]**
- Nest relocation about once a year, about 4 m along a trunk trail, over 4 to 6 days (Tschinkel 2014;
  Harrison & Gentry 1981). **[A]**
- Sexual maturity near 700 workers, and about 4300 in a mature colony. **[A]**

## 2. Entities, state variables and scales

**Ants**, held in one structure-of-arrays store with room for 11 000 individuals. Each has an
identity, whether she is alive, a position, a domain (underground or on the surface), a heading,
a caste (queen, minor worker, major worker, callow, winged queen, male), a task (brood care,
transfer, forager, excavator, none), a burden (nothing, sand, seed, brood, charcoal, corpse), age,
fat reserve, body length, a homing vector, a remembered foraging site, whether she is a persistent
digger, a preferred depth, agitation, how much she has dug and carried, the size class of any seed
she holds, and the rule she is following. There is no soldier caste, because this species has none.

**Brood** is not individual. It is held as daily cohorts of eggs, larvae and pupae, each with a fate
(worker, winged queen, male), and placed in the nest's chambers by count.

**The nest** is a vertical slice through the sand 200 cm wide and 320 cm deep, in cells of 0.5 cm,
treated as 0.9 cm thick. Each cell is sand or void and carries digging pheromone, seeds by size
class, germinating seeds, brood and corpses.

**The soil** under the nest: moisture and temperature by depth, and a stress field for arching over
voids.

**The ground** is a square 50 m across centred on the entrance, in cells of 0.25 m. Each cell
carries seeds, a ceiling the seeds grow back towards, and recruitment trail pheromone. The colony
has 1 to 4 trunk trail directions.

**The weather**: one day at a time, from the 1991 to 2020 monthly normals for Tallahassee, north
Florida, with warm and cool spells, cloud, rain events, and drought years.

**Colony-level records**: the queen's founding reserve, the brood investment the reader sets, the
phase (founding, growing, mature, queenless, dead), the seed store's accounts, relocations and
flights, an intruder on the ground, and running totals.

**Scales.** One step is one simulated minute. A year is 365 days. Space is in centimetres
underground and metres on the surface.

## 3. Process overview and scheduling

Each step runs these systems in this order, which is part of the run's digest:

1. **Climate**, on the day boundary: the day's weather, soil moisture and soil temperature.
2. **Excavation**: digging, carrying sand, the founding queen's own shaft and chamber.
3. **Interior**: movement inside the nest; seeds carried down to the store; brood carried to the
   brood chambers; corpses carried out; daily recount of brood and seeds.
4. **Seeds**, on the day boundary: germination by soil temperature, opening of small and medium seeds,
   and the larvae's food account.
5. **Demography**: laying, brood development and starvation, eclosion, the one-way schedule from
   brood care to foraging, mortality, winter, colony phase.
6. **Foraging**: seed on the ground growing back; foragers leaving, searching, following trails,
   picking up seeds, and walking home on their homing vector.
7. **Alarm**: disturbances on the ground and the foragers' response to them.
8. **Flights**: winged queens and males leaving on a mating flight after heavy rain.
9. **Relocation**: deciding on a move, changing site, carriers walking the store and brood to the
   new nest.
10. **New adults**, on the day boundary: retiring the founding queen from digging.

Ants are updated in slot order within each system. Inside the nest, each ant moves only every few
steps, staggered, which is a cost control and not a claim about speed.

## 4. Design concepts

**Basic principles.** Stigmergy and self-organisation: no ant holds a map or a plan. Division of
labour follows a fixed, one-way age schedule set by the season of birth, and does not respond to
colony need, because experiments on this species found it does not.

**Emergence.** Nest shape and depth, the seed store's layout and composition, the seasonal share of
foragers, trail use, and colony size.

**Adaptation.** None in the sense of choices made to improve an outcome. Foragers return to a site
where they found seed and follow recruitment trails.

**Objectives, learning, prediction.** None.

**Sensing.** Local only: the digging pheromone and crowding around an ant, the trail strength a nose
length to either side, seeds and brood within reach, soil moisture where she digs. Each digging
ant is handed its own depth, an admitted stand-in for a depth cue nobody has found (SCIENCE.md
section 11).

**Interaction.** Indirect through pheromones and the nest's shape; direct through crowding, brood and
seed transport, and the alarm.

**Stochasticity.** A seeded random stream for the model, and separate streams for the weather,
relocation and alarm, so that adding one did not reshuffle the others. Stochastic elements include
laying, development times, mortality, digging choices, foraging turns and encounters, weather,
drought years, moves and disturbances.

**Collectives.** The colony, and the cohorts of brood.

**Observation.** A summary each day and each year: workers, foragers, brood, seeds stored and
collected, larvae starved, nest depth and area, flights, relocations, corpses. The headless study
writes one row per colony per year, a full per-run record with a digest chain, and a methods report
stating what the model does not reproduce. The browser shows the same colony drawn.

## 5. Initialisation

One mated queen lands on 15 June (day 165) at the entrance, and the colony's seed sets every random
stream. She is the colony's only queen. The number of undersized first workers she will raise
alone is drawn from 8 to 20 **[B]**, and the depth of her founding shaft from 29 to 37 cm **[A]**.
The ground's seed patches and 1 to 4 trunk trail directions are drawn once. The nest is solid sand
except the entrance. The first day's weather is rolled before anything digs.

## 6. Input data

The species parameter file, [`species/pogonomyrmex-badius.json`](../species/pogonomyrmex-badius.json),
including the monthly climate normals for Tallahassee. Nothing else is read during a run.

## 7. Submodels

Each is set out in full, with sources, in the SCIENCE.md section named.

| Submodel | What it does | SCIENCE.md | Decisions |
|---|---|---|---|
| Founding | The queen digs her shaft and chamber and raises the first workers on her reserves | 1 | D27 |
| Excavation | Digging under local pheromone and crowding rules and a per-ant digging budget | 2, 3 | D12 to D14, D17, D28 |
| Interior | Where ants, brood and seeds go inside the nest | 4, 6 | D20 |
| Demography | Laying, brood cohorts, eclosion, the age schedule to foraging, mortality, winter | 4 | D15, D29, D31, D38, D40, D44 |
| Foraging | Trunk trails, search, site fidelity, recruitment trails, path integration, heat and rain | 5 | D18, D21, D30, D41 |
| Seeds | Four measured size classes, opening, germination in the chambers, the larvae's food account | 6 | D22, D24, D43 |
| Relocation | When and where a colony moves, digging the new nest, carrying the store and brood | 7 | D35, D36, D45 |
| Pheromones and alarm | Digging scent, recruitment trails, alarm at a disturbance on the ground | 8 | D6, D41, D46 |
| Climate | Daily weather from monthly normals, soil moisture and temperature, drought years | 9 | D25, D33, D42 |
| Flights | Winged queens and males leaving after heavy rain in May to July | 10 | D34 |
| Corpses | Workers carrying dead nestmates out | 10 | D37 |

**What the model does not do.** Its known failures are listed in [`VALIDATION.md`](VALIDATION.md) and
in every study report. The chief one: colonies that pass 700 workers fall back the following year,
where real colonies hold about 4300 (D43).

## References

Grimm, V. et al. (2006) A standard protocol for describing individual-based and agent-based models.
_Ecological Modelling_ 198:115-126.

Grimm, V. et al. (2020) The ODD protocol for describing agent-based and other simulation models: a
second update to improve clarity, replication, and structural realism. _Journal of Artificial
Societies and Social Simulation_ 23(2):7.

The biological sources are listed in [`SCIENCE.md`](SCIENCE.md).
