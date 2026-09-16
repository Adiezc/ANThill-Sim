# SCIENCE.md

Every mechanic in this simulator, the rule as implemented, and where it comes from.

This file is the point of the project. The simulator models one species, the Florida
harvester ant *Pogonomyrmex badius*, as observed in the longleaf pine sandhills of the
Apalachicola National Forest near Tallahassee, north Florida, which is where almost all
of the field work cited below was done.

The papers themselves are not in this repository. Findings are summarised here in this
project's own words and cited to their authors, the way one paper cites another; the DOIs
are in [`docs/papers/README.md`](papers/README.md), together with a record of how deeply each
primary source has actually been read.

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
| Nuptial flights, as implemented **(new)** | **Implemented.** On the first morning without rain up to two days after a heavy rain in May to July, every winged queen and male at least a callow period old climbs out onto the sand by the entrance at 09:00 and takes off within the hour. Younger ones wait for the next rain. One flight per rain. Flights are highly synchronised across colonies and usually follow the first heavy summer rain; colonies have some of both sexes ready for it and keep rearing more for later flights. What happens to them after they leave is not modelled. Colonies in this model do not yet reach the 700 workers at which sexuals are reared (D31), so a naturally grown colony has none to send; the flight is exercised in `test/flights.spec.ts` on a colony given them directly. See DECISIONS.md D34 | **[A]** for the season, the rain trigger and repeated flights; **[C]** for the hour, the two days and the hour to leave | Smith & Tschinkel 2006 |
| Mating | Queen mates with several males over successive days, then sheds wings | **[A]** | Wikipedia species account |
| Claustral founding | Queen digs one shaft and a single chamber, takes in no food, and raises the first brood entirely from her own fat and flight-muscle reserves. Real queens then seal themselves in; the model does not plug the entrance | **[A]** | Wikipedia species account; Tschinkel 2004 |
| Founding nest depth | Incipient nests 29 to 37 cm deep, drawn once per colony, and the queen digs all of it. Whether a real queen does is unknown: see the row below. This row said 40 to 50 cm until 2026-09-11; see the correction in section 2 | **[A]** for the depth | Tschinkel 2004 |
| Who dug the incipient nest **(new)** | The queen alone, in this model. Tschinkel reports incipient nests as 29 to 37 cm deep and holding about 40 g of sand, but never says whether they held workers, and "incipient colony" ordinarily means a queen and her first brood. Her 40 g is nearly all of it, which is a great deal for one ant. Queens measured digging alone go shallower: *P. rugosus* stopped at 17 cm after about 7 days, though in frames holding only 19 cm of soil, and *Atta sexdens* digs about 15 cm plus a chamber. A shallower queen was tried on 2026-09-12 and her workers never finished the nest, so the whole depth stays with her until somebody measures a *badius* queen digging alone | **[C]** for the attribution | Tschinkel 2004; Enzmann & Nonacs 2010; Camargo et al. 2016 |
| Founding digging pace **(new)** | She starts digging the day she lands. Her nest is 9.32 cm deep after one day of digging, 14.32 after two and 16.26 after three, then deepens 5.25 cm a day to the incipient depth, about a week in all. Her clock counts only time when the sand under her can be dug, so rain holds her up | **[B]** | Enzmann & Nonacs 2010, Table 1 (*P. rugosus*, fully claustral, in sand-filled frames). Their queens stopped at 17 cm, but the frames held only 19 cm of soil, so that stop is not used |
| Founding chamber **(new)** | One chamber opened sideways from the bottom of her shaft, 1 cm high and 3 cm wide in the slice. She stays in it until her first daughters eclose | **[A]** for the height; **[C]** for the width | Tschinkel 2004 for chamber height; no incipient chamber has been measured |
| Founding spoil **(new)** | Sand a founding queen digs is counted onto the surface without her walking it up. Every ant in the model walks a cell a minute, and a queen alone has nobody to hand a pellet to, so walking it up would make that pace, not her, set her depth (D27) | **[C]** | None. An abstraction, and labelled as one |
| Queen number | Exactly one. Multiple foundresses may cooperate briefly, but mature wild colonies are never truly polygynous, so at most one queen survives the founding phase | **[A]** | Wikipedia species account |
| First workers | Undersized "nanitic" workers; they open the nest and begin foraging | **[B]** | General to claustral ants |
| Sexual maturity | Colony begins producing alates at roughly 700 workers | **[A]** | AntWiki |
| Queen lifespan | A per-day mortality hazard with a roughly 17 year expectation, not a hard cap. After the queen dies the colony declines to extinction as in section 10 and cannot be saved | **[C]** (D4) | None. No lifespan constant appears in the cited literature, and v1 requires colony death |

## 2. Nest architecture

**Rewritten from the primary source.** Everything in this section and the next now comes
from Tschinkel 2004, read in full, rather than from secondary accounts. Rows marked
**(corrected)** disagree with what this file previously said. The study is 33 complete
excavations and plaster, zinc and aluminium casts, from 2 to 3.02 m deep, of 5 to 150
chambers.

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
| The disc, as drawn | **Drawn only; not modelled.** A very slight, flattened disc of sand 30 to 60 cm across round the entrance, often covered with small pebbles or charcoal. The picture draws it 45 cm across, rising 6 mm at the middle, scattered with charcoal and bare of grass; the rise and the amount of charcoal are appearance | **[A]** from a secondary account for the diameter; **[C]** for the rest | Nickerson & Fasulo, EDIS EENY-298, citing Smith & Whitman 1992 |
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
| Digging fatigue **(new)** | An ant digs less the more sand she has moved herself, which is what ties the volume a colony digs to the number of ants in it | **[B]** for the mechanism, **[C]** for the amount | Rasse & Deneubourg 2001 (*Lasius niger*): nest volume tracks population, held there by the nest's volume and by a change in the ants after digging. The 0.5 cm³ is invented and fitted to Tschinkel's depth law (D28) |
| Where a digger works **(new)** | Most diggers dig the wall beside where they rest, which widens chambers; a fixed one in twenty walks down to the working face and deepens the shaft | **[C]** | None for this species. Density-dependent digging that subsides as a nest grows is **[B]** (Buhl et al. 2005; Halley et al. 2005); that individuals differ in how they dig is **[B]** (Rajendran et al. 2025). The one in twenty is invented and fitted (D28) |
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
| Where foragers live | Marked foragers were found only in the top 12 cm of nests that may be more than 200 cm deep | **[A]** | Kwapich 2014; Kwapich & Tschinkel 2013 |
| Caste proportions | In summer, foragers are about 40 percent of the nest population and transfer workers about 25 percent | **[A]** | Tschinkel & Kwapich 2017 |
| Age progression | Workers eclose deep, work as nurses, become transfer workers, migrate upward, then forage until they die. The progression is one-way | **[A]** | Tschinkel & Kwapich 2017; Tschinkel 2004 |
| Trigger for foraging | A worker becomes a forager when its fat content falls below about 10 percent | **[A]** | Tschinkel 1998 |
| Development rate | Summer-born workers begin foraging at about 43 days old. Autumn-born workers need 200 days or more. Slow-developing workers, produced from late August to mid-October, dominate the forager population from the following March to mid-July; fast developers appear in early June and forage the month after | **[A]** | Kwapich & Tschinkel 2013; Kwapich 2014 |
| **No task reversion** | Foragers do **not** revert to inside work. Raising forager number, body fat or the larva-to-forager ratio induces no reversion, and increased mortality or starvation does not recruit replacements | **[A]** | Kwapich & Tschinkel 2016 |
| Forager lifespan | Foragers die within 27 days of their first foraging trip. Baseline loss 3 to 4 percent per day. Forager population declines once loss exceeds 4 percent per day | **[A]** | Kwapich & Tschinkel 2013, 2016 |
| The short life is risk, not age | The same foragers that lived an average maximum of 27 days in the field survived for hundreds of days in the laboratory, and restricting the foraging range of wild foragers raised their longevity by 57 percent. Death in the forager caste is a cost of foraging, not senescence. The model applies it as a daily hazard for that reason | **[A]** | Kwapich 2014 |
| Neighbours kill foragers | Interactions with neighbouring colonies account for about 30 percent of forager mortality in spring. **Not modelled**: there are no neighbouring colonies, so the whole forager hazard is applied without a neighbour term | **[A]**, not implemented | Kwapich 2014 |
| Longevity feedback | Increased forager survival *inhibits* the movement of new workers into foraging | **[A]** | Kwapich & Tschinkel 2016; Kwapich 2014 |
| Response to forager loss | Removing 50 percent of foragers does **not** draw workers from other castes, and neither does doubling the larval population: neither raised the daily rate at which new foragers appeared within seven days. Larval survival suffers instead | **[A]** | Kwapich & Tschinkel 2013; Kwapich 2014 |
| Foragers per larva | From May to October colonies held 1.64 foragers per larva (SD 0.99), whatever the date and the adult population, across 48 colonies. Foragers appear 30 to 40 days before the year's first larvae. The model does not reproduce the ratio: its larvae outnumber its foragers, and laying is an invented rate set against it and tuned for growth (DECISIONS.md D31) | **[A]** for the ratio; **[C]** for the laying rate | Kwapich & Tschinkel 2013 |
| Worker castes | Minor and major workers. Majors average about 7 percent of the colony regardless of colony size, rising slightly in midsummer. Minors grow larger as the colony grows; majors do not | **[A]** | Tschinkel 1998 |
| Vertical age sorting is active | Older workers actively move upward and choose their position. It is not passive | **[A]** | Tschinkel 2004 |
| How an ant reaches its depth | It walks toward a depth drawn from the distribution measured for its task, redrawn every few days. **No ant knows its depth**; this is the same invented cue as `excavation.depthCue` and carries the same caveat | **[C]** | None. See §11 and DECISIONS.md D20 |
| Where the brood is | Brood is held as a count per chamber in the nest grid, laid where the queen is and carried deeper by brood-care workers. The demographic count in `BroodStore` remains authoritative and the two are reconciled daily | **[A]** for brood being kept deep and callows eclosing in the bottom chambers; **[C]** for the carrying mechanism | Tschinkel & Kwapich 2017; DECISIONS.md D20 |
| Where the queen is | In the brood chambers, which is where the eggs then appear. No source in the bibliography says where in the nest she sits | **[C]** | None |
| Worker sizes, as drawn | **Drawn only.** Minor workers 6.35 mm long and majors 9.52 mm. A minor's head width grows with the colony, from 1.15 mm in incipient colonies to 1.90 mm at seven to eight thousand workers; a major's is 2.50 to 2.75 mm whatever the colony size. The picture uses all four, so a major's broad head is visible beside a minor's | **[A]** | Tschinkel 1998 |
| Queen and male sizes, as drawn | **Drawn only.** Head width 2.9 mm for a gyne and 1.9 mm for a male, with dry weights of 8.6 and 2.4 mg. The queen is drawn 11 mm long, the middle of the 10 to 12 mm in an extension sheet that names no source; no primary measurement of queen length was found. No male length was found either, so a male is drawn at the queen's length scaled by the ratio of their head widths | **[A]** for head widths; **[A]** from a secondary account for queen length; **[C]** for male length | Smith & Tschinkel 2006, Table 1; Nickerson & Fasulo, EDIS EENY-298 |
| Brood sizes, as drawn | **Drawn only.** An egg has the measured volume of a *P. rugosus* egg, 63.3 nl, drawn as an oval 1.6 times as long as it is wide, which makes it about 0.68 by 0.42 mm. A fully fed larva is drawn at 0.8 of a minor worker's length and a pupa at the length of the worker it will become. No source found measures any stage of *badius* brood | **[B]** for the egg volume; **[C]** for the egg's shape and both lengths | Genzoni et al. 2025 |

## 5. Foraging

Harrison & Gentry 1981 is the one full study of trails and ranges in this species, and it
was done in a dense population on an old field near Aiken, South Carolina — 254 colonies on
5.6 ha, each of 1500 to 10 000 workers — not in the Florida sandhills. Density there was about
one colony per 220 m²; in Kwapich's Apalachicola sandhills site it was one per 670 m². Range
sizes in particular should be read with that difference in mind.

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Trunk trails | Each colony establishes three or four trails in late spring, and they persist through the summer into autumn. Most foragers walk to the end of a trail before they begin searching, so trails direct foragers into three or four general areas rather than confining them to a strip. Foraging off any trail is rare, and happens mostly early in the morning and late in the evening | **[A]** | Harrison & Gentry 1981 |
| Trail length | Mean trail length at the peak of daily activity was 3.4 m (SD 0.5); a few trails reached 7 m and some were only 1 m. An isolated colony has been seen to run one or two long trails, up to 30 m, to a large seed patch | **[A]** | Harrison & Gentry 1981 (the 30 m trails are Gentry's personal observation, reported there) |
| Trail fidelity | Trails are kept over winter. Of 41 trails marked in autumn 1974, 75 percent were in use the following spring; 70 percent of the 1975 trails were in use in 1976. In this model trail directions are fixed for the life of the colony, which is more faithful than the ants | **[A]** | Harrison & Gentry 1981 |
| Trail direction | Trail direction is shaped by the position of neighbouring colonies, and the main trails of adjacent colonies rarely cross into each other's ranges | **[A]** | Harrison & Gentry 1981 |
| Foraging range | Ranges of ten adjacent colonies were 66 to 186 m², mean 136 m², tightly packed with little overlap. Smaller colonies have smaller ranges. **The model uses a 20 m range from *P. barbatus*, which is an area several times larger than any measured *badius* range**; see DECISIONS.md D21. Shrinking it was tested and left alone, because in the model income is capped by the invented seed density and not by walking distance; see D30 | **[A]** for the measurement; the model's value is still **[B]** | Harrison & Gentry 1981 |
| Range defence | Foraging ranges are **not** actively defended, but are used almost exclusively by one colony. Foragers of neighbouring colonies meeting at a range edge become agitated and run off or avoid each other; no fighting was ever seen there. The nest mound and its trails *are* defended: a worker from another colony put on them is attacked at once | **[A]** | Harrison & Gentry 1981 |
| Range dynamics | A range expands into ground abandoned by a neighbour that died or was removed, and shifts with the colony when it relocates, by about the distance and in the direction of the move | **[A]** | Harrison & Gentry 1981 |
| Recruitment | *P. badius* lays recruitment trails and is capable of mass recruitment | **[A]** | Hölldobler & Wilson 1970 |
| Site fidelity | A forager returns to within about 0.5 m of its previous site on successive trips. Trip duration depends on search time, not on distance | **[B]** | Beverly et al. 2009 (*P. barbatus*) |
| **Worker size and load** | Worker size does **not** predict seed size collected or foraging distance. Do not implement the intuitive "majors fetch big seeds from far away" rule | **[A]** | Ferster & Traniello 1995 |
| Diet | Seeds and insects, with a preference for protein items | **[A]** | Wikipedia species account |
| Water budget | Foragers carry a water budget; foraging is throttled under heat to limit water loss | **[B]** | Harvester ant water-loss plasticity literature (desert *Pogonomyrmex*) |
| Walking speed, search pattern, trip budget | About 5 cm/s, a random-turn search, and a 90-minute budget before an ant gives up and comes home | **[C]** | None. No value is published for this species. Tuned so that trip duration is dominated by search rather than by walking, which is the [B] finding |
| Seeds on the ground | A patchy standing crop, replenished daily towards its ceiling | **[C]** | None. No seed rain is published for these sandhills. Patchiness is what gives searching a cost, and therefore what makes site fidelity and recruitment worth anything |
| Diurnal window | Foraging between about 06:00 and 20:00 | **[C]** | None. That these are diurnal ants is not in doubt; the hours are invented |
| What a delivered seed does | It is carried in and stored, and it is eaten either when a worker opens it or, if it is too large to open, once it germinates. What is eaten feeds the larvae, and larvae that are not fed starve. See section 6 | **[A]** | Tschinkel & Kwapich 2016 |

## 6. Seed stores and germination

This is the mechanic that distinguishes this simulator. Treat the seed chamber as a
process, not a container.

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Seed chamber depth | Seed chambers sit 20 to 80 cm below the surface, in damp soil. The germination paper gives the band two ways itself — "usually between 40 and 100 cm" citing Tschinkel 1999, and mostly 30 to 80 cm citing Tschinkel 2004 — so the model keeps the 20 to 80 cm of the chamber-by-chamber census | **[A]** | Tschinkel & Kwapich 2017; Tschinkel & Kwapich 2016 |
| Task partitioning | Foragers deposit seeds only in the topmost chambers. A separate class of workers moves them downward, visible as a travelling "wave" | **[A]** | Tschinkel & Seal 2015 |
| Task partitioning, as implemented | **Implemented.** A returning forager carries its seed in and puts it down in the first chamber it meets, and never takes one deeper. Any worker that is *not* a forager will pick up a seed lying above the store and carry it down toward 20 to 80 cm. The prohibition is the documented half; leaving the permission open to any non-forager is a workaround, and DECISIONS.md D20 says what for | **[A]** prohibition, **[C]** permission | Tschinkel & Seal 2015 |
| The store, as implemented | **Implemented.** Seeds are counts per cell in the nest grid — a place in the nest a reader can point at, not a global total | **[A]** | Tschinkel & Kwapich 2017 |
| Seed size classes | **Implemented.** Four classes — small, medium, large and very large, by the sieve that retains them (20, 18, 14 and 12) — each with its measured mass: 0.65, 1.49, 2.61 and 10.9 mg. The store is a count per cell per class, and a carried seed remembers its class | **[A]** | Tschinkel & Kwapich 2016, Table 1 |
| What foragers bring home | **Implemented.** Each seed's class is drawn from the measured loads of returning foragers, about 61 percent small, 33 percent medium, 1 percent large and 5 percent very large by number, and from nothing about the forager | **[A]**, read from a figure | Tschinkel & Kwapich 2016, Figure 4; Ferster & Traniello 1995 for the prohibition |
| Size limit on opening | **Implemented.** Only classes narrower than 1.4 mm can be opened, which is small and medium. Large and very large seeds are never opened, and the loader refuses a parameter file that says otherwise | **[A]** | Tschinkel & Kwapich 2016 |
| Size limit on collection | The widest seed carried home is about 4 mm, a separate and larger limit than the widest opened | **[A]** (D2; tag corrected in D21) | Tschinkel & Kwapich 2016 |
| Opening rate | **Implemented.** Each day a stored small seed is opened with a chance of 0.235 and a medium one 0.142, the daily equivalents of 80 and 60 percent within six days. The rates are applied whatever the size of the store. No seed is opened outside the active season | **[A]** for the rates; **[C]** for holding them constant and for the winter pause | Tschinkel & Kwapich 2016, Figure 6 |
| Majors and seed opening | **Implemented.** Majors increase the *rate* at which small and medium seeds are opened, but do **not** widen the size range that can be opened. With no majors the rate is 0.34 of the full rate; with one worker in twenty or more it is the full rate; the straight line between is invented | **[A]**; **[C]** for the interpolation | Tschinkel & Kwapich 2016, Figure 8 |
| Germination in storage | **Implemented.** Each day a stored seed germinates with a chance taken from the laboratory fraction of its class germinating in a month at the soil temperature of its depth, interpolated between 10, 15, 24 and 32 °C and held beyond them. Depth has no effect of its own (corrected in D21). Class stands in for species | **[A]** | Tschinkel & Kwapich 2016, Figure 12B |
| Germination in a chamber | **Implemented.** The laboratory chance is multiplied by 0.015, so that a chamber the ants cannot reach shows the half percent of seeds germinating after two to three weeks that was counted in the field. The most consequential number in the store | **[C]** (D22), calibrated against **[A]** | Tschinkel & Kwapich 2016, Figure 15 |
| Exploiting germination | **Implemented.** Each day 40 percent of the germinating seeds in the store are found, opened and fed out, and germinating seed is offered to the larvae before anything else | **[A]** | Tschinkel & Kwapich 2016, Figures 9 and 11 |
| Winter | **Implemented.** Outside the active season whatever germinates, and whatever is still germinating when the season ends, is lost rather than eaten | **[C]** for an **[A]** observation | Wheeler 1910 and Tschinkel 1999, as reported by Tschinkel & Kwapich 2016 |
| What a larva needs | **Implemented.** About 0.35 mg of seed a day: a minor worker's 3.1 mg dry mass, over 22 days as a larva, at an efficiency of 0.4. Every larva is fed as a worker larva, though an alate larva needs more | **[A]** for the mass; **[B]** for the duration; **[C]** for the efficiency | Tschinkel 1998; Kwapich & Tschinkel 2013 |
| Starvation | **Implemented.** Each day the larvae get what the store yields that day. A shortfall kills a share of them in proportion to it: 48 percent a day when they get nothing, which leaves 1 percent alive after a week. Nothing else answers a shortfall. This replaces the forager-to-larva proxy of §4 | **[A]** that larvae starve in about a week; **[C]** for the shape of the loss | Kwapich & Tschinkel 2013; Smith 2007; both as reported by Tschinkel & Kwapich 2016 |
| Adults eating seed | **Not modelled.** Workers do eat seed. Here only larvae are fed from the store, and worker fat follows its own published schedule | **[A]**, not implemented | Tschinkel & Kwapich 2016 |
| Seed ageing, moisture, the daily swing | **Not modelled.** Germination depends on size class and mean soil temperature only. The laboratory tests found a smaller effect of elapsed time, and moisture was not tested | — | Tschinkel & Kwapich 2016 |
| Consequence | Large seeds are a delayed store that cannot be drawn on quickly in a crisis. A colony in this model that stops foraging starves most of its larvae within a week above a full store | **[A]** | Tschinkel & Kwapich 2016 |

### What Tschinkel & Kwapich 2016 found

Read in full, figures included. Sizes are U.S. Standard Testing Sieve numbers, which run
backwards: a *higher* number is a *smaller* seed. Sieve 20 retains seeds 0.85 to 1.0 mm
across, 18 retains 1.0 to 1.18 mm, 14 retains 1.4 to 1.7 mm and 12 retains 1.7 to 2.0 mm.
The paper's four experimental classes are small (20), medium (18), large (14) and very large
(12 and bigger). Values marked *read from figure* were read off a plot and are good to a few
percent.

| Finding | What was measured | Tag |
|---|---|---|
| Used seeds are small, stored seeds are large | Husks in the middens, the record of what was eaten, were almost all sieve 18 (about 1 mm) and smaller. Seeds taken from storage chambers were almost all larger than sieve 18. Seeds robbed from workers carrying the whole store during relocations showed the same split against the chaff at both old and new nests | **[A]** |
| Foragers bring in every size | Seeds taken from laden foragers of six colonies were by number roughly three fifths sieve 35 to 20, a third sieve 18 to 16, about 1 percent sieve 14 and about 5 percent sieve 12 and 11 (*read from figure*). So a colony collects more large seeds than it eats, and eats more small ones than it collects | **[A]** |
| Seed mass by size | Mean dry mass per seed, 1989 samples: sieve 8+ 14.45 mg, 10 7.30, 12 5.28, 14 2.31, 16 1.47, 18 0.83, 20 0.63, 25 0.51, 30 0.37, 35 0.34. 2014 experimental classes: very large 10.9 mg, large 2.61, medium (sieves 18 and 16) 1.49, small 0.65. The largest stored seeds are almost 4 mm across and 80 to 90 times the mass of the smallest | **[A]** |
| Which sizes can be opened, in the laboratory | Five colonies were offered 30 marked seeds of each of the four classes. Within about six days 80 percent of small and 60 percent of medium husks were in the trash pile; almost no large or very large seed had been opened after twelve. By the end, 82 percent of small and 58 percent of medium seeds had been eaten, and about 70 percent of the large seeds lay unopened in the nest | **[A]** |
| Which sizes can be opened, in the field | Nine field colonies offered 30 of each class discarded, per colony over two weeks, husks equivalent to 17.3 small, 10.0 medium, 0.6 large and no very large seeds. All sizes were carried in. Even among openable sizes, the rate of opening falls as size rises | **[A]** |
| What majors do | Colony fragments with and without their majors (mean 28 majors to 450 minors, a ratio of about 1 to 20) were offered the four classes for a week. With majors, 33 small and 18 medium husks were discarded; without them, 12 and 5.5. Large and very large husks were under one either way. Majors raise the rate; they do not extend the range | **[A]** |
| The limit and the payoff | The largest seed the ants readily open is about 1 mm wide (sieve 18), about 0.8 mg. A 2 mm seed (sieve 10), about 7.3 mg, cannot be opened and holds about nine times as much food; against a sieve 25 seed the ratio is about fifteen | **[A]** |
| What the store is made of | In 31 colonies excavated in 1989, about 70 percent of stored seed biomass, and about half of stored seeds by number, was in sizes the ants cannot readily open. In the 2014–15 samples very large seeds were about 70 percent of store weight and large seeds another quarter. Size composition differed greatly among colonies and very little among chambers of one colony | **[A]** |
| Germinating seeds are eaten | Nine field colonies were offered 50 germinating and 50 non-germinating sieve 14 seeds, marked. Husks equivalent to 74 percent of the germinating seeds turned up in the middens against 2 percent of the non-germinating ones, and about 40 percent of the germinating husks appeared within a day | **[A]** |
| …and fed to larvae first | In the laboratory, within two days of being offered dyed germinating seeds, 45 percent of larvae had eaten dye; non-germinating seeds mostly stayed unopened in the nest. In eight field colonies that had their own stores available, 24 percent of larvae and 12 percent of pharate pupae carried dye after two to three days | **[A]** |
| Germination happens in the chambers | Nine natural seed chambers were split with a metal strip so that the ants could reach only one side. Two to three weeks later the side they could not reach held a mean of 21 germinating seeds among about 4400; the side they could reach held 1.3 among about 6500. The ants find germinating seeds and take them | **[A]** |
| What germination depends on: burial | Seeds of the four classes were buried at 5, 15, 40 and 80 cm for one month, six times through 2015. Seed size, date and their interaction accounted for 93 percent of the explained variance. **Depth had no significant effect.** Sizes 14 and 18 peaked in April and December and fell to a minimum in August; sizes 12 and 20 rose gradually through the year | **[A]** |
| What germination depends on: temperature | The same seed batch held one month at 10, 15, 24 and 32 °C. Overall germination was moderate at 10 °C, highest at 15, lower at 24 and very low at 32. By class (*read from figure*): small about 35, 29, 12 and 10 percent; medium about 27, 48, 33 and 19; large about 25, 62, 23 and 2; very large about 11, 30, 30 and 30 | **[A]** |
| Temperature explains the season | Mean soil temperature over each burial month barely differed between 5 and 80 cm, though its daily swing shrank with depth: about 11.5 °C in February, 18 rising to 22 in April, 27 in June, 28 in August, 23 in October, 18 in December and 13 the next February. Germination of sizes 14 and 18 peaks as the soil passes through about 18 °C on the way up and on the way down, which is why the burial peaks fall in April and December | **[A]** |
| Batches differ | A second batch, collected in 2015 and tested the same year, germinated about half as much as the 2014 batch. Each size class was dominated by one or two plant species — sieve 14 was 98 percent *Croton michauxii* — so a germination rate is really a property of a species mix, and a colony's mix depends on where it forages | **[A]** |
| Turnover, as inferred | If rates in the dishes hold in the nest, large and medium seeds turn over mainly in spring and autumn at 50 to 80 percent a month, and very large and small seeds at 15 to 30 percent, rising from spring to winter. The authors state that this has not been tested in a nest | **[A]** as an inference, untested |
| The store is not an emergency granary | Colonies prevented from foraging for 7 to 60 days did not draw on their seed stores, at the cost of larval survival, alate production and worker fat, and larvae died of starvation in as little as seven days. When the larval population was doubled, the stores were not drawn on either. The authors suggest germination is simply too slow to cover a sudden loss of income | **[A]** | 
| Winter | Wheeler in 1910 found deep chambers in winter holding masses of sprouted seeds, grown "too far to be fit for food", which the ants carried out. Workers also eat seed themselves; whether they do so in winter is not known, and the ratio of stored seeds to workers does not change over the winter | **[A]** |

Kwapich & Tschinkel 2013 and Smith 2007 for the foraging-prevention experiments, Wheeler
1910 for winter, and Tschinkel 1999 for the winter seed-to-worker ratio are cited here as
Tschinkel & Kwapich 2016 report them; they have not been read directly.

One correction follows. The parameter file listed burial depth as a driver of germination.
The burial experiment found no significant effect of depth, and the paper's own summary of
the drivers is seed species, temperature and elapsed time. See DECISIONS.md D21.

## 7. Nest relocation

| Mechanic | Rule as implemented | Tag | Source |
|---|---|---|---|
| Frequency | About one move per year; some colonies up to four. Between May and November, peaking in July when over 1 percent of colonies move per day. In Harrison & Gentry's South Carolina population up to 80 percent of colonies moved once a season, fewer moved twice, and third and fourth moves were rare | **[A]** | Tschinkel 2014; Harrison & Gentry 1981 |
| Distance | Mean about 4 m, rarely over 10 m. Over successive moves the colony performs a random walk around its original position. Harrison & Gentry measured shorter moves in their denser population: a mean of 2.2 to 2.5 m in three separate years, individual moves from 1.3 to 3.7 m | **[A]** | Tschinkel 2014; Harrison & Gentry 1981 |
| **Direction** | Moves occur **along an existing foraging trail, usually the main trunk trail**. Direction is random at population level because trail direction is. Every one of eleven colonies induced to move by shading moved along an established trail; of 23 natural moves in 1976, 78 percent followed the main trail and 22 percent a secondary one. New trails keep the orientation of the old ones, displaced by the distance moved | **[A]** | Harrison & Gentry 1981; Tschinkel 2014 |
| Spacing survives moving | Colonies are regularly spaced, nearest neighbours about 10 to 12.5 m apart, and the spacing did not change over five years of moves and new colonies | **[A]** | Harrison & Gentry 1981 |
| Duration | 4 to 6 days. Diurnal, peaking morning and afternoon, dipping at midday, stopping before sundown | **[A]** | Tschinkel 2014 |
| Concurrent excavation | Workers excavate the new nest continuously throughout the move and after it | **[A]** | Tschinkel 2014 |
| What is carried | A minority of workers carry anything. Seeds are by far the commonest burden, then charcoal, then brood. The proportion carrying rises through the move. The whole seed store moves, so a store can accumulate over the life of the colony | **[A]** | Tschinkel 2014; Tschinkel & Kwapich 2016 |
| Result | The new nest is statistically indistinguishable from the vacated one in size and shape. The colony builds a replica | **[A]** | Tschinkel 2013 |
| Cost | Colonies that moved more than once in two years lost more size than those that moved less | **[A]** | Tschinkel 2014 |
| Cause | **Unknown.** Architecture, forest canopy and neighbour density all failed to explain it. Surface this honestly in the simulator. Shading a nest makes a colony move, which says what can trigger a move, not why colonies move unshaded | **[A]** | Tschinkel 2013, 2014; Carlson & Gentry 1973 as reported by Harrison & Gentry 1981 |
| Relocation, as implemented **(new)** | **Implemented, in part.** A colony with workers may start a move on any day from May to November, with a daily chance highest in July and falling by a fifth for each month either side, scaled so a colony makes the measured one move a year on average; no more than four a season. It moves along its main trunk trail 78 percent of the time and another trail otherwise, an exponential distance about 4 m cut at 10 m, over 4 to 6 days, and the move finishes at midnight. The new nest is not dug: it is taken to be the replica the excavations found, so chambers, brood and seed store are unchanged and the colony stands on new ground, with the seed patches, trails and remembered sites around it shifted by the distance moved. Carrying, concurrent excavation and the size cost of moving are not simulated. There is no choice of site, so D3 is not yet in effect. See DECISIONS.md D35 | **[A]** for season, peak, frequency, trail, distance, duration and the replica; **[C]** for the monthly fall-off, the exponential distance and the abstraction of the move | Tschinkel 2013, 2014; Harrison & Gentry 1981 |
| Candidate site quality | The player is offered two or three trail-constrained candidates whose soil moisture and workable depth genuinely affect excavation rate and outcome. **This contradicts the row above**, which is the [A] finding that no such property explains relocation and that the replacement nest is indistinguishable from the vacated one. Included at the project author's instruction so that the one annual decision has consequences, and labelled as invented wherever it is shown | **[C]** (D3) | None. Tschinkel 2013, 2014 tested for exactly this effect and did not find it |

## 8. Pheromones

Model at least three separate chemical channels, each with its own grid, decay constant
and diffusion kernel. Do not collapse them into one "pheromone".

| Channel | Rule as implemented | Tag | Source |
|---|---|---|---|
| Recruitment trail | Deposited on the return leg. Response is **non-linear**: strong trails elicit disproportionately stronger responses, producing winner-take-all trail selection | **[A]** that *badius* lays recruitment trails; **[B]** for the non-linear response function | Hölldobler & Wilson 1970 (**[A]**); Sumpter & Beekman 2003 (**[B]**) |
| Deposition modulation | More pheromone is deposited near a food source than near the nest, and more for distant sources than near ones | **[B]** | Czaczkes et al. 2024 (*Lasius niger*) |
| Alarm | **Not implemented.** The species file has decay and diffusion parameters for it and nothing reads them; the simulator's key lists it as not simulated yet. What it should be: short-lived, fast-diffusing, radial, driving defensive recruitment | **[B]** | General |
| Necrophoric cue | **Not implemented.** Parameters exist and nothing reads them; the key lists it as not simulated yet. What it should be: corpse recognition via cuticular fatty acids, driving removal | **[B]** | Diez et al. 2012, 2014; Zhang et al. 2025 |
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
| Soil temperature | Follows the seasonal air cycle with depth-dependent lag and damping, and drives the seed germination rate in storage chambers | **[A]** for the germination link; **[C]** for the soil thermal model, whose lag and surface offset are fitted to the measurement below | Tschinkel & Kwapich 2016 (**[A]**) |
| Measured soil temperature | At the study site, monthly mean soil temperature at 5, 15, 40 and 80 cm differed by at most about 2 °C between depths in any month, running from about 11 °C in February to 28 °C in August. What falls with depth is the daily swing, not the mean. The soil thermal model is fitted to this and checked against it in `test/soil.spec.ts`: 1.8 °C RMS, running cold in late April and December. See DECISIONS.md D25 | **[A]** | Tschinkel & Kwapich 2016 |
| Daily weather **(new)** | **Implemented.** Each day is clear, overcast or rainy around the monthly normals, with warm and cool spells that last a few days. Rain comes in events whose monthly totals match the normals; in June to September it falls as afternoon storms, in other months at any hour, and it lasts as long as its total takes to fall. Every value shaping the variation is invented. See DECISIONS.md D33 | **[A]** for the normals; **[C]** for the variation | 1991 to 2020 US climate normals, Tallahassee |
| Foraging and rain **(new)** | **Implemented.** Foraging pauses during heavy rain. Here no forager leaves while any rain falls, and one caught outside gives up her search and walks home, keeping any seed she holds. Rain also washes recruitment pheromone off the ground, half of it an hour | **[A]** that foraging pauses in heavy rain; **[C]** for the rest | Kwapich & Tschinkel 2013 |
| Foraging and heat **(new)** | **Implemented.** Foraging pauses under exceptionally hot, cloudless conditions. Sand in sun runs hotter than the soil model's seasonal value, most at early afternoon, a third as much under cloud and not at all in rain, and no forager leaves while it is above `foraging.surfaceTemperatureMaxC`. That happens on a few afternoons a month in a hot summer spell | **[A]** for the pause; **[C]** for the heating and the threshold | Kwapich & Tschinkel 2013 |

## 10. Events (v2 unless noted)

| Event | Rule as implemented | Tag | Source |
|---|---|---|---|
| Heavy rain | Saturated sand cannot be excavated; foraging stops. Also the trigger for nuptial flights, implemented in section 1 | **[A]** for the flight trigger; **[B]** for the digging limit | Wikipedia species account (**[A]**); Monaenkova et al. 2015 (**[B]**) |
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
| "The seed store is an emergency granary" | Tested and rejected. Colonies kept from foraging did not draw on their stores and their larvae starved within about a week; doubling the larvae did not unlock the stores either. Most of a store is seed the ants cannot open until it germinates (Tschinkel & Kwapich 2016, reporting Kwapich & Tschinkel 2013 and Smith 2007) |
| "Harvester ants stop their stored seeds from germinating" | The usual assumption, and some ant species do. *P. badius* does the opposite: it relies on germination to get at seeds too large to open, and removes germinating seeds from its chambers within days (Tschinkel & Kwapich 2016) |
| "Big workers crack big seeds" | Majors raise the rate at which small and medium seeds are opened, and open nothing the minors cannot. The widest seed opened is the same with or without them (Tschinkel & Kwapich 2016) |

## References

Achenbach, A. & Foitzik, S. (2009) First evidence for slave rebellion. *Evolution*.
Avinery, R. et al. (2023) Agitated ants. *J. R. Soc. Interface*.
Belachew, M., Arson, C. & Frost, J. D. (2025) Insights from studies on the spatial distribution of chambers in ant nests.
Beverly, B. D. et al. (2009) How site fidelity leads to individual differences in the foraging activity of harvester ants. *Behavioral Ecology*.
Bruce, A. I. et al. (2018) The digging dynamics of ant tunnels. *Insectes Sociaux*.
Brunner, E. et al. (2009) Worker dominance and policing in *Temnothorax unifasciatus*. *Insectes Sociaux*.
Buarque de Macedo, R. et al. (2021) Unearthing real-time 3D ant tunneling mechanics. *PNAS*.
Buhl, J. et al. (2005) Self-organized digging activity in ant colonies. *Behav. Ecol. Sociobiol.*
Carlson, D. M. & Gentry, J. B. (1973) Effects of shading on the migratory behavior of the Florida harvester ant, *Pogonomyrmex badius*. *Ecology* 54:452–453. Cited as reported by Harrison & Gentry 1981.
Czaczkes, T. et al. (2024) Ants deposit more pheromone close to food sources. *Insectes Sociaux*.
Diez, L. et al. (2012) Social prophylaxis through distant corpse removal. *Naturwissenschaften*.
Diez, L. et al. (2014) Keep the nest clean. *Biology Letters*.
Diez, L. et al. (2015) Emergency measures. *Behavioural Processes*.
Espinoza, D. & Santamarina, J. (2010) Ant tunneling, a granular media perspective.
Ferster, B. & Traniello, J. (1995) Polymorphism and foraging behavior in *Pogonomyrmex badius*. *Environmental Entomology*.
García Ibarra, F. A. et al. (2023) Experimental evidence that increased surface temperature affects bioturbation by ants.
Harrison, J. S. & Gentry, J. B. (1981) Foraging pattern, colony distribution, and foraging range of the Florida harvester ant, *Pogonomyrmex badius*. *Ecology* 62:1467–1473.
Genzoni, E. et al. (2025) Trophic eggs affect caste determination in the ant *Pogonomyrmex rugosus*. *eLife*.
Hölldobler, B. & Wilson, E. O. (1970) Recruitment trails in the harvester ant *Pogonomyrmex badius*. *Psyche*.
Khuong, A. et al. (2016) Stigmergic construction and topochemical information shape ant nest architecture. *PNAS*.
Kwapich, C. L. (2014) The influence of demography, development and death on seasonal labor allocation in the Florida harvester ant (*Pogonomyrmex badius*). PhD dissertation, Florida State University.
Kwapich, C. L. & Tschinkel, W. (2013) Demography, demand, death. *Behav. Ecol. Sociobiol.*
Kwapich, C. L. & Tschinkel, W. (2016) Limited flexibility and unusual longevity shape forager allocation. *Behav. Ecol. Sociobiol.*
Kwapich, C. L. et al. (2024) A kleptoparasitic beetle larva exploits vertical division of labor. *Insectes Sociaux*.
LeBrun, E. et al. (2025) Social immunity in a supercolonial invasive ant. *J. Animal Ecology*.
Leclerc, J.-B. & Detrain, C. (2016) Ants detect but do not discriminate diseased workers. *The Science of Nature*.
Leclerc, J.-B. et al. (2017) Impact of colony size on survival and sanitary strategies. *Behav. Ecol. Sociobiol.*
Monaenkova, D. et al. (2015) Behavioral and mechanical determinants of collective subsurface nest excavation. *J. Exp. Biol.*
Monnin, T. & Ratnieks, F. (2001) Policing in queenless ponerine ants. *Behav. Ecol. Sociobiol.*
Nickerson, J. C. & Fasulo, T. R. Florida harvester ant, *Pogonomyrmex badius*. UF/IFAS Extension, EDIS publication EENY-298 (IN536). A secondary account, cited only for queen length and the surface disc.
Pielström, S. & Roces, F. (2013) Sequential soil transport. *PLoS ONE*.
Sankovitz, M. & Purcell, J. (2021) Ant nest architecture is shaped by local adaptation and plastic response to temperature. *Scientific Reports*.
Smith, C. R. (2007) Energy use and allocation in the Florida harvester ant, *Pogonomyrmex badius*: are stored seeds a buffer? *Behav. Ecol. Sociobiol.* 61:1479–1487. Cited as reported by Tschinkel & Kwapich 2016.
Smith, C. R. & Tschinkel, W. R. (2006) The sociometry and sociogenesis of reproduction in the Florida harvester ant. *Journal of Insect Science*.
Stroeymeyt, N. et al. (2007) Selfish worker policing. *Behav. Ecol. Sociobiol.*
Sumpter, D. & Beekman, M. (2003) From nonlinearity to optimality. *Animal Behaviour*.
Tschinkel, W. (1998) Sociometry and sociogenesis of *Pogonomyrmex badius*, worker characteristics. *Insectes Sociaux*.
Tschinkel, W. (1999) Sociometry and sociogenesis of *Pogonomyrmex badius*, distribution of workers, brood and seeds. *Ecological Entomology*.
Tschinkel, W. (2004) The nest architecture of the Florida harvester ant. *Journal of Insect Science*.
Tschinkel, W. (2013) Florida harvester ant nest architecture, nest relocation and soil carbon dioxide gradients. *PLoS ONE*.
Tschinkel, W. (2014) Nest relocation and excavation in the Florida harvester ant. *PLoS ONE*.
Tschinkel, W. (2015) The architecture of subterranean ant nests. *Journal of Bioeconomics*.
Tschinkel, W. (2017) Do Florida harvester ant colonies have a nest architecture "plan"? *Ecology*.
Tschinkel, W. R. & Kwapich, C. L. (2016) The Florida harvester ant, *Pogonomyrmex badius*, relies on germination to consume large seeds. *PLoS ONE* 11(11):e0166907.
Tschinkel, W. & Kwapich, C. L. (2017) Vertical organization of the division of labor. *PLoS ONE*.
Tschinkel, W. & Seal, J. (2015) Sequential subterranean transport of excavated sand and foraged seeds. *PLoS ONE*.
Wheeler, W. M. (1910) *Ants: their structure, development and behavior.* Columbia University Press. Cited as reported by Tschinkel & Kwapich 2016.
