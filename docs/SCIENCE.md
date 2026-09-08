# SCIENCE.md

Every mechanic in this simulator, the rule as implemented, and where it comes from.

This file is the point of the project. The simulator models one species, the Florida
harvester ant *Pogonomyrmex badius*, as observed in the longleaf pine sandhills of the
Apalachicola National Forest near Tallahassee, north Florida, which is where almost all
of the field work cited below was done.

## Tag key

| Tag | Meaning |
|---|---|
| **[A]** | Documented for *Pogonomyrmex badius* specifically |
| **[B]** | Generalised from another ant species because *badius* data does not exist |
| **[C]** | Invented for playability or tractability, with no direct evidential basis |

Every **[B]** and **[C]** row must be surfaced in the simulator's own "how do we know
this?" panel. A user should never be unable to tell which is which.

Where this document, the build brief and `species/pogonomyrmex-badius.json` disagreed or
were silent, the conflict and its resolution are recorded in
[`DECISIONS.md`](DECISIONS.md). Rows introduced by those resolutions are marked below with
the decision that introduced them. No row has been promoted to **[A]** without a *badius*
citation. One mechanic — relocation site quality, D3 — is a deliberate departure from an
**[A]** finding, made at the project author's instruction, and is tagged **[C]** and
labelled as such wherever the simulator surfaces it.

## 1. Colony founding

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Nuptial flight timing | Alates fly May to July, on a calm humid morning following heavy rain | **[A]** | AntWiki; Wikipedia species account |
| Mating | Queen mates with several males over successive days, then sheds wings | **[A]** | Wikipedia species account |
| Claustral founding | Queen digs one vertical shaft and a single chamber, seals herself in, takes in no food, raises the first brood entirely from her own fat and flight-muscle reserves | **[A]** | Wikipedia species account; Tschinkel 2004 |
| Founding nest depth | Incipient nests 40 to 50 cm deep | **[A]** | Tschinkel 2004 |
| Queen number | Exactly one. Multiple foundresses may cooperate briefly, but mature wild colonies are never truly polygynous, so at most one queen survives the founding phase | **[A]** | Wikipedia species account |
| First workers | Undersized "nanitic" workers; they open the nest and begin foraging | **[B]** | General to claustral ants |
| Sexual maturity | Colony begins producing alates at roughly 700 workers | **[A]** | AntWiki |
| Queen lifespan | A per-day mortality hazard with a roughly 17 year expectation, not a hard cap. After the queen dies the colony declines to extinction as in section 10 and cannot be saved | **[C]** (D4) | None. No lifespan constant appears in the cited literature, and v1 requires colony death |

## 2. Nest architecture

**Rewritten from the primary source.** Everything in this section and the next now comes
from `docs/papers/tschinkel-2004-nest-architecture.pdf`, read in full, rather than from
secondary accounts. Rows marked **(corrected)** disagree with what this file previously
said. The study is 33 complete excavations and plaster, zinc and aluminium casts, from 2 to
3.02 m deep, of 5 to 150 chambers.

Colony size classes used throughout are Tschinkel's: class 0, under 100 workers; class 1,
101–800; class 2, 801–2000; class 3, 2001–4000; class 4, over 4000.

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Structural unit | Two units only: descending shafts, and horizontal chambers | **[A]** | Tschinkel 2004 |
| Shaft bore **(new)** | Shaft diameter averages a little under 1 cm and changes little with nest size. In the upper nest shafts are larger, flattened-oval, up to about 2 cm wide | **[A]** | Tschinkel 2004 |
| Shaft helix | Shafts spiral, more often to the left than the right, forming a helix 4 to 6 cm in diameter | **[A]** | Tschinkel 2004 |
| Helix pitch **(new)** | Shaft length per turn rises from 8 to 10 cm per turn near the surface to about 20 cm per turn deeper. This is what sets the projected zigzag in a vertical slice | **[A]** | Tschinkel 2004 |
| Shaft angle **(corrected)** | The paper states this twice and inconsistently. Abstract: about 15–20 degrees from horizontal near the surface, rising to about 70 degrees below 50 cm. Body: about 20–30 degrees near the surface, rising to 45–60 degrees by 50 cm, with shafts overall inclined 20 to 70 degrees from the vertical. The model uses the body text and records the abstract's figures beside it | **[A]**, internally inconsistent | Tschinkel 2004 |
| Chamber height | About 1 cm floor to ceiling, no matter what the floor area | **[A]** | Tschinkel 2004 |
| Chamber initiation | Chambers begin as small circular flat-floored niches in the outer wall of the helix, and become increasingly lobed as workers enlarge them | **[A]** | Tschinkel 2004 |
| Chamber complexity **(new)** | Outline complexity, measured as actual perimeter over the perimeter of a circle of equal area, runs from 1 for small chambers to 2–7 for the large chambers of the upper third | **[A]** | Tschinkel 2004 |
| Shaft–chamber angle **(new)** | Below 15 to 20 cm, chambers are lateral horizontal-floored extensions from the outside of the descending helix, meeting it at 25 to 70 degrees | **[A]** | Tschinkel 2004 |
| Superficial chambers | Within 10 to 15 cm of the surface, chambers are modified shafts: widened, branched, looping and interconnected, with lobes on **both** sides rather than only the outside. Mean area rises from about 26 cm² in class 0 to about 330 cm² in class 4 | **[A]** | Tschinkel 2004 |
| Top-heaviness **(corrected)** | About half of total chamber area lies in the top quarter. The decile-to-decile decrease is **not constant**: it rises with depth as `proportional decrease = 0.10 × decile − 0.12`, from about 10 percent between deciles 1 and 2 to about 90 percent between 9 and 10, averaging about half. The previously stated flat "25 to 40 percent per decile" is the paper's own abstract summarising this regression, and the two are not equivalent | **[A]** | Tschinkel 2004 |
| Depth–area scaling **(new)** | Log-log slope of decile area against mean decile depth is −0.59 (R² 62 percent), the same for every colony size class: a tenfold increase in decile depth gives a 75 percent decrease in that decile's area | **[A]** | Tschinkel 2004 |
| Vertical spacing **(corrected)** | 2 to 4 cm between chambers near the surface, rising to 20 to 30 cm deeper, with the maximum in the 7th or 8th decile and a decrease again in the 10th. Spacing barely changes as the nest grows, because deepening and chamber addition happen together | **[A]** | Tschinkel 2004 |
| Chamber size with depth **(new)** | Mean chamber area near the surface is 5 to 6 times that near the bottom | **[A]** | Tschinkel 2004 |
| Branching | Every shaft branch begins less than 40 cm down, whatever the nest size. Rarely more than 2 branches in one shaft. Deeper nests branch closer to the surface than shallow ones | **[A]** | Tschinkel 2004 |
| Branch depths **(new)** | Outside the largest size class the first branch appears at 12 to 17 cm and the second at 26 to 33 cm; a third begins about 35 cm. In class 4 the second branch is variable and the rest fall at 10 to 15 cm | **[A]** | Tschinkel 2004 |
| Vertical series | 1 to 4 chamber-and-shaft series, one nest in 32 having 5. Mean worker number was 1700 with one series, 3200 with two, 4600 with three, 5000 with four | **[A]** | Tschinkel 2004 |
| Series contribution **(new)** | Each chamber adds a mean of 98 cm² to total area in the first series, 73 in the second, 57 in the third, 43 in the fourth. Deeper branch points give fewer chambers in the series | **[A]** | Tschinkel 2004 |
| Total area scaling **(corrected)** | `log(total chamber area) = 0.551 + 0.873 × log(dark workers)`, R² 93 percent: a tenfold increase in mature workers gives a 7.5-fold increase in area, so space per ant falls as the colony grows | **[A]** | Tschinkel 2004 |
| Depth scaling **(new)** | `log(max depth) = 0.95 + 0.37 × log(dark workers)`, R² 72 percent: a tenfold increase in workers gives a 2.4-fold increase in depth | **[A]** | Tschinkel 2004 |
| Top decile area **(new)** | 38, 190, 516, 1700 and 2670 cm² for size classes 0 to 4 | **[A]** | Tschinkel 2004 |
| Incipient depth **(corrected)** | Incipient nests are **29 to 37 cm** deep. This file previously said 40 to 50 cm | **[A]** | Tschinkel 2004 |
| Mature depth | Commonly 2.5 to 3.0 m; the deepest measured was 3.06 m | **[A]** | Tschinkel 2004 |
| Growth mode | Deepening, chamber addition and chamber enlargement happen simultaneously, so the size-free shape is the same at every colony size. Enlargement contributes more to area than addition does | **[A]** | Tschinkel 2004; Tschinkel 1999a |
| Mound | Flattened sand crater, no surrounding vegetation, decorated with charcoal and detritus for reasons unknown | **[A]** | AntWiki; Wikipedia species account |
| Chamber spacing and stability | Chambers are placed so that stress zones overlap and arching is enhanced; modelled as a soil stress field that discourages placing chambers too close vertically | **[B]** | Belachew, Arson & Frost 2025 |

## 3. Excavation

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Whole-nest excavation rate **(new)** | The workers of a colony can excavate a complete nest in 3 to 6 days, whatever the colony size. About 5000 workers moved roughly 20 kg of sand in 4 to 5 days | **[A]** | Tschinkel 2004 |
| Sand moved **(new)** | About 40 g of sand in an incipient nest, up to about 40 kg in the largest. A worker shifts 300 to 400 times its own weight per day while excavating | **[A]** | Tschinkel 2004 |
| Per-worker rate **(new)** | Older workers excavate about 0.45 cm² of chamber and 0.13 cm of shaft per worker-day; young workers about 0.15 cm² and 0.06 cm. Digging rate as plaster: 0.80, 0.41 and 0.28 g per worker-day for top, middle and bottom groups | **[A]** | Tschinkel 2004 |
| **Participation, not pace** | The difference between age groups is mostly *how many* dig, not how fast each digs: 82 percent of old workers, 25 percent of middle and 19 percent of young were recaptured carrying sand. **"A worker either digs consistently or does not dig at all."** Digging is a persistent individual state, not a per-moment coin flip | **[A]** | Tschinkel 2004 |
| Age and nest size | Workers taken from the top of a mature nest dug larger, more complex nests than those from the bottom: about twice the rate of the middle group and three times the bottom. All age groups nevertheless produced top-heavy nests of similar shape | **[A]** | Tschinkel 2004 |
| Digging regulation | Digging effort is modulated by each ant's own rate of collision with nestmates, with no global control. Rate curve runs constant, then decays rapidly, then tails off | **[B]** | Avinery et al. 2023 (*Solenopsis invicta*) |
| Excavation dynamics | Excavation is logistic: exponential growth then saturation. Total excavated volume is close to proportional to worker number | **[B]** | Buhl et al. 2005 (*Messor sancta*) |
| Space feedback | Ants dig significantly less in a tunnel that is already long, and walking speed correlates with excavation rate | **[B]** | Bruce et al. 2018 (*Acromyrmex lundi*, *Atta colombica*) |
| Spoil as a cue | Accumulated freshly excavated pellets influence where workers choose to begin digging next | **[B]** | Pielström & Roces 2013 (*Atta vollenweideri*) |
| Sequential transport | A pellet passes through multiple carriers on its way to the surface, not one ant end to end. Modelled as excavators, short-distance carriers and long-distance carriers | **[A]** for *badius* upward sand transport; **[B]** for the three-tier carrier split | Tschinkel & Seal 2015 (**[A]**); Pielström & Roces 2013 (**[B]**) |
| Underground redeposition | About 2.5 percent of excavated sand is redeposited underground rather than reaching the surface, mostly in the top 30 to 40 cm | **[A]** | Tschinkel & Seal 2015 |
| Grain selection and arching | Ants remove grains under low stress. Force chains arch over the tunnel and shield it, so tunnels stay stable without any ant sensing the force network | **[B]** | Buarque de Macedo et al. 2021 (*Pogonomyrmex* sp., close congener) |
| Substrate limits | Ants cannot excavate fully dry or fully saturated sand. Tunnels are deepest at intermediate moisture | **[B]** | Monaenkova et al. 2015 (*Solenopsis invicta*) |
| Granular constraints | Tunnel diameter is bounded below by grain size and by body size; the resulting topology is energy-efficient within those limits | **[B]** | Espinoza & Santamarina 2010 |
| Stigmergic amplification | Deposition of building material is amplified where deposition has already occurred, via a building pheromone added to the material itself. **Pheromone lifetime is the dominant parameter controlling nest form** and is exposed as a slider | **[B]** | Khuong et al. 2016 (*Lasius niger*, PNAS) |
| Body-size template | Ants use their own body size as a cue for the height at which to begin roofing over a pillar. In this model that is what makes a chamber stop growing upward at about 1 cm | **[B]** for the mechanism, **[A]** for the resulting height | Khuong et al. 2016 (**[B]**); Tschinkel 2004 (**[A]**) |
| Temperature response | Warmer surface temperatures produce deeper nests | **[B]** | Sankovitz & Purcell 2021; García Ibarra et al. 2023 |
| Relocation excavation rate | A full replacement nest is excavated to 2 m and about 8 L in roughly two weeks, with most progress in the first days | **[A]** | Tschinkel & Seal 2015 |
| **The depth cue** | Shaft angle steepens with depth, branching stops below 40 cm, and chamber spacing and area vary systematically with depth — yet **no ant knows how deep it is**. Tschinkel 2004 proposed a carbon dioxide gradient as the template, having measured a fivefold rise from surface to nest bottom with the steepest part in the top half-metre, mirroring the area distribution. Tschinkel 2013 then tested it by venting the gradient away and by reversing it, and nest architecture was unchanged. **The hypothesis is dead and no replacement exists.** This simulation hands a digging ant its own depth as an admitted stand-in. It is the largest invented element in the model | **[C]** | Tschinkel 2004 proposed it; Tschinkel 2013 falsified it |

## 4. Division of labour

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Vertical stratification | Foragers occupy the top 15 cm; only 5 percent are found below 20 cm. Transfer workers range widely, about 30 percent found below 20 cm. Below 70 cm, 90 percent of workers are brood-care workers | **[A]** | Tschinkel & Kwapich 2017 |
| Caste proportions | In summer, foragers are about 40 percent of the nest population and transfer workers about 25 percent | **[A]** | Tschinkel & Kwapich 2017 |
| Age progression | Workers eclose deep, work as nurses, become transfer workers, migrate upward, then forage until they die. The progression is one-way | **[A]** | Tschinkel & Kwapich 2017; Tschinkel 2004 |
| Trigger for foraging | A worker becomes a forager when its fat content falls below about 10 percent | **[A]** | Tschinkel 1998 |
| Development rate | Summer-born workers begin foraging at about 43 days old. Autumn-born workers need 200 days or more | **[A]** | Kwapich & Tschinkel 2013 |
| **No task reversion** | Foragers do **not** revert to inside work. Raising forager number, body fat or the larva-to-forager ratio induces no reversion, and increased mortality or starvation does not recruit replacements | **[A]** | Kwapich & Tschinkel 2016 |
| Forager lifespan | Foragers die within 27 days of their first foraging trip. Baseline loss 3 to 4 percent per day. Forager population declines once loss exceeds 4 percent per day | **[A]** | Kwapich & Tschinkel 2013, 2016 |
| Longevity feedback | Increased forager survival *inhibits* the movement of new workers into foraging | **[A]** | Kwapich & Tschinkel 2016 |
| Response to forager loss | Removing 50 percent of foragers does **not** draw workers from other castes. Larval survival suffers instead | **[A]** | Kwapich & Tschinkel 2013 |
| Worker castes | Minor and major workers. Majors average about 7 percent of the colony regardless of colony size, rising slightly in midsummer. Minors grow larger as the colony grows; majors do not | **[A]** | Tschinkel 1998 |
| Vertical age sorting is active | Older workers actively move upward and choose their position. It is not passive | **[A]** | Tschinkel 2004 |
| How an ant reaches its depth | It walks toward a depth drawn from the distribution measured for its task, redrawn every few days. **No ant knows its depth**; this is the same invented cue as `excavation.depthCue` and carries the same caveat | **[C]** | None. See §11 and DECISIONS.md D20 |
| Where the brood is | Brood is held as a count per chamber in the nest grid, laid where the queen is and carried deeper by brood-care workers. The demographic count in `BroodStore` remains authoritative and the two are reconciled daily | **[A]** for brood being kept deep and callows eclosing in the bottom chambers; **[C]** for the carrying mechanism | Tschinkel & Kwapich 2017; DECISIONS.md D20 |
| Where the queen is | In the brood chambers, which is where the eggs then appear. No source in the bibliography says where in the nest she sits | **[C]** | None |

## 5. Foraging

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Trunk trails | The colony forages from a small number of short trunk trails radiating into a surrounding foraging range | **[A]** | Harrison & Gentry 1981 |
| Trail direction | Trail direction is shaped by the position of neighbouring colonies | **[A]** | Harrison & Gentry 1981 |
| Range defence | Foraging ranges are **not** actively defended, but are used almost exclusively by one colony. A range expands into ground abandoned by a neighbour | **[A]** | Harrison & Gentry 1981 |
| Recruitment | *P. badius* lays recruitment trails and is capable of mass recruitment | **[A]** | Hölldobler & Wilson 1970 |
| Site fidelity | A forager returns to within about 0.5 m of its previous site on successive trips. Trip duration depends on search time, not on distance | **[B]** | Beverly et al. 2009 (*P. barbatus*) |
| Trail length | Trails extend up to about 20 m | **[B]** | Beverly et al. 2009 (*P. barbatus*) |
| **Worker size and load** | Worker size does **not** predict seed size collected or foraging distance. Do not implement the intuitive "majors fetch big seeds from far away" rule | **[A]** | Ferster & Traniello 1995 |
| Diet | Seeds and insects, with a preference for protein items | **[A]** | Wikipedia species account |
| Water budget | Foragers carry a water budget; foraging is throttled under heat to limit water loss | **[B]** | Harvester ant water-loss plasticity literature (desert *Pogonomyrmex*) |
| Walking speed, search pattern, trip budget | About 5 cm/s, a random-turn search, and a 90-minute budget before an ant gives up and comes home | **[C]** | None. No value is published for this species. Tuned so that trip duration is dominated by search rather than by walking, which is the [B] finding |
| Seeds on the ground | A patchy standing crop, replenished daily towards its ceiling | **[C]** | None. No seed rain is published for these sandhills. Patchiness is what gives searching a cost, and therefore what makes site fidelity and recruitment worth anything |
| Diurnal window | Foraging between about 06:00 and 20:00 | **[C]** | None. That these are diurnal ants is not in doubt; the hours are invented |
| What a delivered seed does | Nothing yet. Seeds accumulate in a store that no other system draws on | **[C]** | Larval survival is still the forager-to-larva proxy described in section 4. The food account arrives with the seed store in section 6 |

## 6. Seed stores and germination

This is the mechanic that distinguishes this simulator. Treat the seed chamber as a
process, not a container.

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Seed chamber depth | Seed chambers sit 20 to 80 cm below the surface, in damp soil | **[A]** | Tschinkel & Kwapich 2017; Tschinkel & Kwapich 2016 |
| Task partitioning | Foragers deposit seeds only in the topmost chambers. A separate class of workers moves them downward, visible as a travelling "wave" | **[A]** | Tschinkel & Seal 2015 |
| Task partitioning, as implemented | **Implemented.** A returning forager carries its seed in and puts it down in the first chamber it meets, and never takes one deeper. Any worker that is *not* a forager will pick up a seed lying above the store and carry it down toward 20 to 80 cm. The prohibition is the documented half; leaving the permission open to any non-forager is a workaround, and DECISIONS.md D20 says what for | **[A]** prohibition, **[C]** permission | Tschinkel & Seal 2015 |
| The store, as implemented | **Implemented.** Seeds are counts per cell in the nest grid — a place in the nest a reader can point at, not a global total | **[A]** | Tschinkel & Kwapich 2017 |
| Seed size classes, germination, and eating | **Still not implemented.** A seed is a seed, nothing germinates, and nothing eats one. Larval survival remains the forager-to-larva proxy of §4 | — | — |
| Size limit on opening | Workers collect a wide range of seed sizes but can only open small ones. Large seeds accumulate to 70 percent or more of stores by weight | **[A]** | Tschinkel & Kwapich 2016 |
| Size limit on collection | The widest seed a worker will carry home is a separate and larger limit than the widest it can open. Tuned so that large seeds reach the observed 70 percent of stores by weight | **[C]** (D2) | None |
| Majors and seed opening | Majors increase the *rate* at which small and medium seeds are opened, but do **not** widen the size range that can be opened | **[A]** | Tschinkel & Kwapich 2016 |
| Germination in storage | Stored seeds germinate. Germination rate depends on seed species, soil temperature and burial depth, so it follows the seasonal soil temperature cycle | **[A]** | Tschinkel & Kwapich 2016 |
| Exploiting germination | Ants remove germinating seeds promptly and preferentially feed them to larvae, which unlocks large seeds they could not otherwise open | **[A]** | Tschinkel & Kwapich 2016 |
| Consequence | Large seeds are a delayed store that cannot be drawn on quickly in a crisis | **[A]** | Tschinkel & Kwapich 2016 |

## 7. Nest relocation

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Frequency | About one move per year; some colonies up to four. Between May and November, peaking in July when over 1 percent of colonies move per day | **[A]** | Tschinkel 2014 |
| Distance | Mean about 4 m, rarely over 10 m. Over successive moves the colony performs a random walk around its original position | **[A]** | Tschinkel 2014 |
| **Direction** | Moves occur **along an existing foraging trail, usually the main trunk trail**. Direction is random at population level because trail direction is | **[A]** | Harrison & Gentry 1981; Tschinkel 2014 |
| Duration | 4 to 6 days. Diurnal, peaking morning and afternoon, dipping at midday, stopping before sundown | **[A]** | Tschinkel 2014 |
| Concurrent excavation | Workers excavate the new nest continuously throughout the move and after it | **[A]** | Tschinkel 2014 |
| What is carried | A minority of workers carry anything. Seeds are by far the commonest burden, then charcoal, then brood. The proportion carrying rises through the move | **[A]** | Tschinkel 2014 |
| Result | The new nest is statistically indistinguishable from the vacated one in size and shape. The colony builds a replica | **[A]** | Tschinkel 2013 |
| Cost | Colonies that moved more than once in two years lost more size than those that moved less | **[A]** | Tschinkel 2014 |
| Cause | **Unknown.** Architecture, forest canopy and neighbour density all failed to explain it. Surface this honestly in the simulator | **[A]** | Tschinkel 2013, 2014 |
| Candidate site quality | The player is offered two or three trail-constrained candidates whose soil moisture and workable depth genuinely affect excavation rate and outcome. **This contradicts the row above**, which is the [A] finding that no such property explains relocation and that the replacement nest is indistinguishable from the vacated one. Included at the project author's instruction so that the one annual decision has consequences, and labelled as invented wherever it is shown | **[C]** (D3) | None. Tschinkel 2013, 2014 tested for exactly this effect and did not find it |

## 8. Pheromones

Model at least three separate chemical channels, each with its own grid, decay constant
and diffusion kernel. Do not collapse them into one "pheromone".

| Channel | Rule as implemented | Tag | Source |
|---|---|---|---|
| Recruitment trail | Deposited on the return leg. Response is **non-linear**: strong trails elicit disproportionately stronger responses, producing winner-take-all trail selection | **[A]** that *badius* lays recruitment trails; **[B]** for the non-linear response function | Hölldobler & Wilson 1970 (**[A]**); Sumpter & Beekman 2003 (**[B]**) |
| Deposition modulation | More pheromone is deposited near a food source than near the nest, and more for distant sources than near ones | **[B]** | Czaczkes et al. 2024 (*Lasius niger*) |
| Alarm | Short-lived, fast-diffusing, radial. Drives defensive recruitment | **[B]** | General |
| Necrophoric cue | Corpse recognition via cuticular fatty acids, driving removal | **[B]** | Diez et al. 2012, 2014; Zhang et al. 2025 |
| Building pheromone | Added to excavated material, amplifying deposition where deposition already happened. Lifetime governs architecture | **[B]** | Khuong et al. 2016 |
| Path integration | Foragers also hold a homing vector and use landmarks. They do not navigate by trail alone | **[B]** | General *Pogonomyrmex* and desert ant literature |
| Decay and deposition constants | **No published values exist for *badius*.** These are tuned parameters, exposed in the UI and flagged as such | **[C]** | None |
| Tick length | One tick is one simulated minute, which is what gives every per-tick decay constant its meaning. Neither the literature nor the brief states one | **[C]** (D7) | None |
| Diffusion schedule | Diffusion is applied every ten ticks rather than every tick. A performance decision, applied identically at every playback speed and in headless runs, so reproducibility is unaffected | **[C]** | None |
| Building pheromone persistence | Authored as a lifetime in ticks, which is the form Khuong et al. reason in and the form exposed as a slider. The per-tick decay constant is derived from it rather than authored separately | **[C]** (D6) | Khuong et al. 2016 for the form |

## 9. Climate and seasons

Location: longleaf pine sandhills, Apalachicola National Forest, near Tallahassee,
north Florida (roughly 30.4 N, 84.3 W). Humid subtropical, hot wet summers, mild winters
with occasional frost, summer rainfall maximum.

| Month | Mean daily high (C) | Mean daily low (C) | Mean precipitation (mm) |
|---|---|---|---|
| January | 18 | 5 | 101 |
| February | 20 | 6 | 84 |
| March | 23 | 9 | 109 |
| April | 27 | 12 | 70 |
| May | 31 | 17 | 61 |
| June | 33 | 22 | 139 |
| July | 33 | 23 | 148 |
| August | 33 | 23 | 151 |
| September | 31 | 21 | 101 |
| October | 28 | 15 | 72 |
| November | 23 | 9 | 60 |
| December | 19 | 6 | 86 |

Frost is possible November to April. Source: 1991 to 2020 US climate normals for
Tallahassee.

Seasonal biology to drive from this calendar:

| Season | Colony behaviour | Tag | Source |
|---|---|---|---|
| Spring (Mar to May) | Proportion foraging rises, driven by an increase in forager number together with a *reduction* in colony size. Large pulse of alates produced, paid for out of worker fat stored the previous autumn | **[A]** | Kwapich & Tschinkel 2013; Tschinkel 1998 |
| Late spring to summer (May to Jul) | Nuptial flights after heavy rain. Foragers peak alongside maximal larval production, reaching about 0.37 of the colony | **[A]** | Kwapich & Tschinkel 2013 |
| Summer (Jun to Aug) | Relocation season, peaking in July. Workers at their leanest and lowest fat after alate production | **[A]** | Tschinkel 2014; Tschinkel 1998 |
| Autumn (Sep to Nov) | Proportion foraging falls as colony size rises through new worker birth. Workers gain about 24 percent in weight by winter, storing fat for overwintering and next year's alates | **[A]** | Kwapich & Tschinkel 2013; Tschinkel 1998 |
| Winter (Dec to Feb) | Excavation lull. Nests part-built in autumn are doubled in volume after the winter lull | **[A]** | Tschinkel & Seal 2015 |
| Soil temperature | Follows the seasonal air cycle with depth-dependent lag and damping, and drives the seed germination rate in storage chambers | **[A]** for the germination link; **[B]** for the soil thermal model | Tschinkel & Kwapich 2016 (**[A]**) |

## 10. Events (v2 unless noted)

| Event | Rule as implemented | Tag | Source |
|---|---|---|---|
| Heavy rain | Saturated sand cannot be excavated; foraging stops. Also the trigger for nuptial flights | **[A]** for the flight trigger; **[B]** for the digging limit | Wikipedia species account (**[A]**); Monaenkova et al. 2015 (**[B]**) |
| Drought and heat | Foraging is throttled to limit water loss; colonies differ in how plastic they are | **[B]** | Desert *Pogonomyrmex* water-loss literature |
| Horned lizard | Introduced Texas horned lizard sits near the entrance and takes foragers | **[A]** | Wikipedia species account |
| Parasitoid wasp | *Kapala floridana* attacks brood | **[A]** | Wikipedia species account |
| Kleptoparasitic beetle | *Hymenorus dorsalis* larvae occupy the top 7 to 8 cm and intercept roughly 84 percent of incoming insect prey. Present in 18 to 63 percent of nests, mean depth 7.6 cm, 0 to 31 beetles per nest. Smaller colonies suffer more | **[A]** | Kwapich et al. 2024 |
| Fungal parasite | *Myrmicinosporidium durum* | **[A]** | Wikipedia species account |
| Social immunity | Corpses are carried further from the nest than inert rubbish; removal rate scales with pathogenicity; sick workers largely self-isolate; corpse removal measurably raises survival from day 8. Small colonies may evacuate brood entirely and return it after sanitising | **[B]** | Diez et al. 2012, 2014, 2015; Leclerc et al. 2016, 2017 |
| **Architecture as immunity** | Multi-chambered nest structure is itself what confers social immunity. Collapse the chamber structure and transmission becomes universal | **[B]** | LeBrun et al. 2025 |
| Competition | Red imported fire ant *Solenopsis invicta* competes with *P. badius* | **[A]** | Southeastern Naturalist 2024 |
| Queen death | No political rebellion. Workers form aggression-based rank orders, top-ranked workers begin laying male eggs, rivals are suppressed by targeted aggression and egg destruction. The colony declines and cannot be saved | **[B]** | Stroeymeyt et al. 2007; Brunner et al. 2009; Monnin & Ratnieks 2001 |

## 11. Mechanics deliberately NOT implemented, and why

These are intuitive, commonly assumed, and wrong for this species. Surfacing them in the
simulator is as valuable as anything it does implement.

| Assumption | Why it is not implemented |
|---|---|
| "Big anthills have many queens" | *P. badius* is monogynous. Exactly one queen |
| "Majors are soldiers" | *P. badius* has no defensive soldier caste. Majors are seed-crackers whose contribution is raising the *rate* at which small and medium seeds are opened |
| "Majors fetch the big seeds from far away" | Tested by Ferster & Traniello 1995 and rejected. No correlation between worker size and either seed size or foraging distance |
| "Idle workers respond to a labour shortage" | Tested by Kwapich & Tschinkel 2013, 2016 and rejected. Removing half the foragers drew no replacements from other castes; larvae starved instead |
| "Foragers can be reassigned to nursing" | Allocation in this species is one-way. Foragers do not revert |
| "A CO2 gradient tells the ants how deep they are" | An appealing hypothesis, tested by venting the gradient and by reversing it. Falsified. Nest architecture was unchanged |
| "The colony chooses a better site when it moves" | The replacement nest is statistically indistinguishable from the one vacated, and the reason for moving remains unknown |
| "Ants plan the nest" | There is no plan and no architect. Structure emerges from local rules, though ice-cast experiments show colonies do have preferences about what they will accept |

## References

Achenbach, A. & Foitzik, S. (2009) First evidence for slave rebellion. *Evolution*.
Avinery, R. et al. (2023) Agitated ants. *J. R. Soc. Interface*.
Belachew, M., Arson, C. & Frost, J. D. (2025) Insights from studies on the spatial distribution of chambers in ant nests.
Beverly, B. D. et al. (2009) How site fidelity leads to individual differences in the foraging activity of harvester ants. *Behavioral Ecology*.
Bruce, A. I. et al. (2018) The digging dynamics of ant tunnels. *Insectes Sociaux*.
Brunner, E. et al. (2009) Worker dominance and policing in *Temnothorax unifasciatus*. *Insectes Sociaux*.
Buarque de Macedo, R. et al. (2021) Unearthing real-time 3D ant tunneling mechanics. *PNAS*.
Buhl, J. et al. (2005) Self-organized digging activity in ant colonies. *Behav. Ecol. Sociobiol.*
Czaczkes, T. et al. (2024) Ants deposit more pheromone close to food sources. *Insectes Sociaux*.
Diez, L. et al. (2012) Social prophylaxis through distant corpse removal. *Naturwissenschaften*.
Diez, L. et al. (2014) Keep the nest clean. *Biology Letters*.
Diez, L. et al. (2015) Emergency measures. *Behavioural Processes*.
Espinoza, D. & Santamarina, J. (2010) Ant tunneling, a granular media perspective.
Ferster, B. & Traniello, J. (1995) Polymorphism and foraging behavior in *Pogonomyrmex badius*. *Environmental Entomology*.
García Ibarra, F. A. et al. (2023) Experimental evidence that increased surface temperature affects bioturbation by ants.
Harrison, J. & Gentry, J. (1981) Foraging pattern, colony distribution, and foraging range of the Florida harvester ant. *Ecology*.
Hölldobler, B. & Wilson, E. O. (1970) Recruitment trails in the harvester ant *Pogonomyrmex badius*. *Psyche*.
Khuong, A. et al. (2016) Stigmergic construction and topochemical information shape ant nest architecture. *PNAS*.
Kwapich, C. L. & Tschinkel, W. (2013) Demography, demand, death. *Behav. Ecol. Sociobiol.*
Kwapich, C. L. & Tschinkel, W. (2016) Limited flexibility and unusual longevity shape forager allocation. *Behav. Ecol. Sociobiol.*
Kwapich, C. L. et al. (2024) A kleptoparasitic beetle larva exploits vertical division of labor. *Insectes Sociaux*.
LeBrun, E. et al. (2025) Social immunity in a supercolonial invasive ant. *J. Animal Ecology*.
Leclerc, J.-B. & Detrain, C. (2016) Ants detect but do not discriminate diseased workers. *The Science of Nature*.
Leclerc, J.-B. et al. (2017) Impact of colony size on survival and sanitary strategies. *Behav. Ecol. Sociobiol.*
Monaenkova, D. et al. (2015) Behavioral and mechanical determinants of collective subsurface nest excavation. *J. Exp. Biol.*
Monnin, T. & Ratnieks, F. (2001) Policing in queenless ponerine ants. *Behav. Ecol. Sociobiol.*
Pielström, S. & Roces, F. (2013) Sequential soil transport. *PLoS ONE*.
Sankovitz, M. & Purcell, J. (2021) Ant nest architecture is shaped by local adaptation and plastic response to temperature. *Scientific Reports*.
Stroeymeyt, N. et al. (2007) Selfish worker policing. *Behav. Ecol. Sociobiol.*
Sumpter, D. & Beekman, M. (2003) From nonlinearity to optimality. *Animal Behaviour*.
Tschinkel, W. (1998) Sociometry and sociogenesis of *Pogonomyrmex badius*, worker characteristics. *Insectes Sociaux*.
Tschinkel, W. (1999) Sociometry and sociogenesis of *Pogonomyrmex badius*, distribution of workers, brood and seeds. *Ecological Entomology*.
Tschinkel, W. (2004) The nest architecture of the Florida harvester ant. *Journal of Insect Science*.
Tschinkel, W. (2013) Florida harvester ant nest architecture, nest relocation and soil carbon dioxide gradients. *PLoS ONE*.
Tschinkel, W. (2014) Nest relocation and excavation in the Florida harvester ant. *PLoS ONE*.
Tschinkel, W. (2015) The architecture of subterranean ant nests. *Journal of Bioeconomics*.
Tschinkel, W. (2017) Do Florida harvester ant colonies have a nest architecture "plan"? *Ecology*.
Tschinkel, W. & Kwapich, C. L. (2016) The Florida harvester ant relies on germination to consume large seeds. *PLoS ONE*.
Tschinkel, W. & Kwapich, C. L. (2017) Vertical organization of the division of labor. *PLoS ONE*.
Tschinkel, W. & Seal, J. (2015) Sequential subterranean transport of excavated sand and foraged seeds. *PLoS ONE*.
