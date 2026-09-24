# Validation

What the model must reproduce before a stage is considered done. These are acceptance
gates, not aspirations: the order of work in the build brief says excavation does not
proceed until the nest signature matches.

## Where the model stands, 2026-09-20

| Gate | Status |
|---|---|
| G1 Nest architecture | Substantially met. Depth follows the worker-number law within about a third, and moving colonies dig new nests so older nests no longer run twice too deep. Chambers are a centimetre high, measured from floor to ceiling, since ants raise a chamber's ceiling before widening it (D50); until then most were half that, and the statistic hid it. Deep chamber spacing is met again. Branch depth and the surface-to-bottom width ratio are not met, the first week's digging now falls 1.2 cm short of its threshold, and grown colonies dig out caverns in the upper nest by their second or third year |
| G2 Determinism | Met |
| G3 Demography | Partly met. Forager share begins in April and rises through spring, but peaks in July where the measured peak is May to June. Summer growth and drought-year growth match the measured rates. **With the seed on the ground fitted, two colonies in three pass 700 workers by their fifth year, and one that passed in its fourth fell to 81 the year after**, against about 4300 in mature colonies (DECISIONS.md D43, D47) |
| G4 Vertical stratification | Partly met. Nurses settle below foragers, but the measured fractions are not reproduced across the whole workforce |
| G4b Foraging | Mostly met. Recruitment trails bring a small, consistent gain of 3 to 7 percent |
| G5 Seeds and germination | Mostly met in the mechanism; the store holds more unopenable seed than measured, and growth on it fails as in G3 |
| G6 Relocation | Met for frequency, season, distance, trail and duration. The store and brood are carried, seeds first. The new nest is dug, but starts smaller than the one left behind |

## A note on 2D versus 3D statistics

Every architectural number in `SCIENCE.md` §2 is a measurement of a real three-dimensional
nest: chamber _area_ in cm², total volume in litres, area per depth decile. The simulation
models a vertical slice, in which the corresponding quantity is a cross-sectional _length_
per depth band, not an area. Comparing the two directly would be meaningless, so each gate
below states the mapping it uses. Where a mapping is assumed rather than derived, it is
tagged **[C]** and stated here, so that a reader can disagree with it explicitly.

## G1. Nest architectural signature

**Status: substantially met.** Encoded in `test/nest-signature.spec.ts`, measured at 600
workers over 70 simulated days. The four criteria still unmet are skipped tests carrying the
value the model produces, so the gap stays visible in the suite.

| Property | Target | Status |
|---|---|---|
| Chamber spacing | 3.5 cm decile 1 rising to ~12 cm at decile 7-8 (Fig. 10) | **Met.** 3.2 cm shallow, 14.4 cm deep. The deep end was 7.8 cm, below its floor of 8.75, from the digging budget of D28 until D50 |
| Build time | Most of a nest inside the first week | **Not met, by 1.2 cm.** 109.8 cm by day 6 at 600 workers against the test's 111 cm, still about half of the 225 cm the same nest reaches by day 70. It was 116 cm until D50, which made chambers the right height and so twice as costly in sand per unit of floor. A skipped test carrying the value |
| Top-heaviness | ~0.5 of chamber area in the top quarter | **Met.** 0.66, up from 0.56 before D50 |
| Decile ordering | First decile holds more area than the last | **Met** |
| Chamber height | ~1 cm | **Met.** 0.91 cm, measured from each chamber's floor to its ceiling. Reported as 1.58 cm until D48 and 0.97 cm until D50, both by averaging the height of shafts into the height of the chambers they enter; measured properly, the chambers before D50 were 0.60 cm, mostly one grid cell |
| Series count | 1-4 | **Met.** 4 at 600 workers, and 2 at 1200, where it was 6 until D50 |
| Reproducibility | Same seed, same nest | **Met** |
| Depth reached | Deep, emergent, no ant knowing the shape | **Met** |
| **Nest size tracks worker number** | `log(depth) = 0.95 + 0.37 log(workers)` | **Substantially met in colonies; this harness cannot test it.** Four colonies sat at 0.98 to 1.12 of the law after three years, measured before D50. The harness has no interior system, so its synthetic workers have no resting place and every one of them behaves as a descender. See below, and D28 |
| Max depth | Within the 306 cm deepest ever measured | **Met.** 225 cm here, and 270 cm in a colony followed for five years before D50 |
| Height independent of depth | ~1 cm whatever the area | **Met.** 0.93 cm shallow against 0.89 cm deep, a gap of 0.04 |
| Branch depth | All branches above 40 cm | **Not met.** Deepest branch 58.25 cm |
| Surface:bottom chamber width | ~2.4x | **Not met.** 1.20x, down from 1.56x before D50 |
| No caverns in a grown colony | Chambers stacked along shafts, with soil between them | **Not met, and not a criterion this harness can test.** Colonies grown from a queen dig out a void tens of centimetres tall in the upper nest by their third year under 1.1.0, and in one colony of two by the second since D50. Found on 2026-09-24 and open. See D50 |

### What feedback on version 1.0.0 changed (2026-09-20)

Version 1.0.0 was shown to researchers who work on the species. The reply was that the
simulation did not build top-heavy nests, nor cleanly stratified nests with chambers a
centimetre high, and asked what was missing. This table had top-heaviness at
**met** and chamber height at **met, barely**, so one of the two was wrong. Both were, in
different directions.

**The gate is not what a reader watches.** These numbers come from a synthetic harness: 600
workers, fixed ages, no births, no deaths, no interior system, no relocation, 70 days. A
reader opening the page watches a colony grown from one queen. Four such colonies reached at
most about 700 workers, followed for three to four simulated years, with one of the four
dead in its fourth year and 6, 14, 4 and 16 workers between them at nine months. Their nests are 30 to 35 cm deep with a top-quarter chamber share of exactly 0, which is
what an incipient nest is and is not architecture. The architecture here is downstream of
worker number, as it is in the field, and worker number is the shortfall G3 declares. Nobody
has measured the seed rain on those sandhills, so the standing crop is fitted (D43), and the
nest that was shown failed for a demographic reason rather than an architectural one.

**The chamber statistics were counting shafts.** Any void cell wider than twice the shaft
bore counted as chamber, including the shaft column where it passes through a chamber — and
that column's vertical clearance, the whole height of the shaft, was averaged into chamber
height. Applying Tschinkel's own distinction instead, that a chamber is wider than it is
tall and a shaft taller than it is wide, moves the gate figures:

| Gate, 600 workers, 70 days | Before | After |
|---|---|---|
| Mean chamber height | 1.58 cm | **0.97 cm** |
| Shallow / deep chamber height | 1.77 / 1.47 cm | **1.03 / 0.91 cm** |
| Top-quarter share | 0.570 | 0.558 |
| Shallow / deep spacing | 3.29 / 7.80 cm | 3.46 / 7.80 cm |
| Surface:bottom width | 1.52x | 1.56x |
| Deepest branch | 59.8 cm | 59.8 cm |

The measured value in real nests is 1 cm, independent of chamber area **[A]**. Only the
height statistics move much, which is the point: the model was building the centimetre and
the measurement was hiding it. Nothing an ant does changed, `NestGrid.isChamberCell` on the
hot path is untouched, and the committed determinism digest is unaffected.

**Height does not drift in a mature nest.** The harness was run five times past the gate, to
350 days: 0.97, 0.95, 0.94, 0.94, 0.94 cm, with top-quarter share steady at 0.55.

**In a colony, over the first year only.** Seed 2, at 24 workers and a 30 cm nest: 0.99 cm
at day 180 and 1.24 cm at day 365, where the old statistic gave 1.66 and 1.97. Twelve and
then nineteen shaft cells were removed from the chamber statistics, with mean clearances of
3.7 and 4.2 cm.

**Reproducing these numbers.** `tools/measure-nest-over-time.ts` measures both subjects with the
same code, and reports the chamber cells it keeps beside the shaft cells it drops:

```bash
npm run measure:nest -- --harness 600 --days 70,140,210,280,350 --picture
npm run measure:nest -- --colony --seed 2 --days 180,365
```

The colony form is slow, because a colony simulates foraging, weather and the surface as well as
the digging. The harness form is what `test/nest-signature.spec.ts` drives.

**Settled in D50 (2026-09-24), and not as expected.** This section left two things open: the
old statistic reaching about 25 cm in a colony's third year, and the corrected one drifting from
0.99 to 1.24 cm within the first. Two colonies followed for three years put the 1.1.0 figure at
2.5 to 3.6 cm by day 1000 and the 1.0.0 figure at about 20 cm. Part of that was still shafts: the
1.1.0 statistic let a cell at the foot of a shaft count the shaft's height whenever the chamber
was wider than that stretch of shaft was long. Most of it was worse: by their third year both
colonies had dug out a cavern in the upper nest, tens of centimetres tall, which is recorded as
not met in the table above. And measured from each chamber's own floor to its own ceiling, the
chambers in the harness were mostly one grid cell high, half a centimetre, so the 0.97 cm above
was not the centimetre either. That was a defect in the digging, and D50 fixed it. The table at
the top of this section gives the figures since.

### What changed to get here

Four things, in order of how much they mattered.

**Crowding is measured over a neighbourhood, not over a grid cell.** A cell is 5 mm across
and a minor worker is 6.35 mm long, so two ants in adjacent cells are touching: counting
co-occupancy of one cell is not a collision rate, it is a rounding artefact, and it reports
every narrow shaft as permanently packed. Measuring ants per unit of open space over a 4 cm
neighbourhood instead took the whole-nest build time from about seventy days to six, the
figure the species is reported to manage, and made chamber spacing widen with depth
properly for the first time.

**The excavation rate was the wrong number.** Tschinkel's 0.45 cm² of chamber and 0.13 cm
of shaft per worker-day are averages over every penned worker, most of whom were not at a
face at any moment. Applying that average to an ant that *is* at a face counts the queueing
twice. The physical rate is in the same paper (300 to 400 times body weight in sand per day
while excavating), and worker mass came from Tschinkel 1998's Figure 5 rather than from the
estimate of 1.7 mg used before, which was wrong by nearly a factor of two.

**Chambers open along the whole shaft, not only at its tip.** One rule turned a nest with a
single working face into one with hundreds, and produced the top-heavy distribution, stuck
at 0.19, as a side effect rather than as a target.

**The figures, not just the text.** Figure 10 gives spacing by decile peaking near 12 cm,
against the body text's 20-30. Figure 9B gives chamber area by depth, which fixes widths.

### The founding nest was a tenth of the size it should be (fixed 2026-09-11)

Recorded on 2026-09-08: a founding queen got to about 5 cm before her first daughters
eclosed, against the **[A]** incipient depth of 29 to 37 cm (Tschinkel 2004). Measured again
on 2026-09-11 over seeds 1 to 3, she dug only 0.3 to 0.8 cm in those 55 days, and the
incipient depth was reached on day 80 to 150, by workers.

The diagnosis recorded here before, that her time went on carrying pellets up rather than on
her rate of digging, was half of it. The interior system was also walking her back to her eggs
at the entrance on every pass, although its own comment said excavation owned her while she
founded. And her rate was a young minor worker's, because her age starts at zero. See D27.

A founding queen now has her own rule. Her depth follows what fully claustral *P. rugosus*
queens were measured digging (Enzmann & Nonacs 2010) until her colony's incipient depth, and
then she opens one chamber and stays in it. Seeds 1, 2 and 3 reach 29.8, 30.3 and 35.3 cm on
days 6.5, 8.6 and 6.5, against 7.13 days of digging for *rugosus*, and dig nothing more before
their first daughters eclose on day 55. Seed 1 lands in 12.7 mm of rain and starts a day late,
because saturated sand cannot be dug. Two tests in `demography.spec.ts` hold this: she digs from
her first day of workable sand, and after three weeks her nest is at the incipient depth and no
more than a chamber's height past it.

### Nothing stopped the digging, and now most of it does (2026-09-12)

Tschinkel's nests obey a law. Total chamber area tracks worker number and depth goes with it,
`log(depth) = 0.95 + 0.37 log(workers)`, so 600 workers predicts a nest about 96 cm deep.
**The model used to dig until it ran out of grid**, 320 cm whatever the colony size, and a
founding colony of a dozen nanitics reached 2.2 to 2.7 m in its first year against an incipient
29 to 37 cm.

That was tested against a linear crowding response and a Hill-shaped one, against collision
memories from 45 ticks to three days, and against crowd-avoidance weights spanning an order of
magnitude, and the depth came out at the grid floor every time. The reason was structural rather
than a matter of tuning: ants gather where digging is happening, so crowding at a working face
never falls, and the one signal the model had for "we have enough room now" was measured in the
one place that is always busy.

Two local rules now close most of it, and neither lets an ant know anything about the nest as a
whole (D28). An ant digs less the more sand she has dug herself, which holds the volume a colony
excavates to the number of ants in it. And most diggers work where they rest instead of walking
down to the deepest face, so what they move widens chambers rather than driving the shaft down,
while a fixed one in twenty still goes down, which is what keeps a growing nest deepening.

Measured over colonies rather than in the gate harness, because that harness has no interior
system and so cannot place a resting ant. These runs predate the food account (G5), under which
colonies stay far smaller, so the larger worker numbers below will not recur until growth is
fixed:

| Run | Workers | Depth | Law | Depth / law |
|---|---|---|---|---|
| Seeds 1-4, day 1080 | 244-331 | 73-84 cm | 68-76 cm | 0.98-1.12 |
| Seed 2, day 1260 | 1263 | 122 cm | 125 cm | 0.98 |
| Seed 2, day 1620 | 3618 | 234 cm | 185 cm | 1.27 |
| Seed 2, day 1800 | 2426 | 270 cm | 159 cm | 1.70 |

The first year sits at the depth the queen dug, 29 to 37 cm, which is the measured incipient
depth. From year two into year four the nests follow the law within about a third either way. In
years four and five they run deep against it, for a reason worth stating: a nest never shrinks
when its colony does, and this model has no relocation, while real colonies move into a freshly
dug nest once or twice a year. 270 cm is inside the 250 to 300 cm measured for mature nests, and
the law accounts for 72 percent of the variation in the field, so the late drift is a caveat
rather than a contradiction.

What it cost: deep chamber spacing in the gate harness fell to 7.8 cm against a target above
8.75 cm, and that criterion is now recorded as not yet met, with its measured value, beside the
others. The two values the rules need are invented and fitted, and the parameter file says so.

### 2D mapping

Chamber "area" in the slice is total chamber cross-sectional length per depth decile. A void
cell counts as chamber rather than shaft when its horizontal run exceeds twice the shaft
bore **and** exceeds its own vertical clearance (Tschinkel's own distinction: a chamber is
horizontal-floored and much wider than it is tall, a shaft is an elongated void of roughly
constant small diameter). The width threshold is read from `nest.shaftBoreDiameterCm` rather
than invented, and the second half of the test was added in D48 after the first half alone
was found to be counting shafts as chambers. Converting a slice length to a volume needs an out-of-plane thickness,
which a slice does not have; `discretisation.sliceThicknessCm` supplies one, tagged **[C]**,
taken as the shaft bore. It is about right for shafts and understates chambers, which are
wider out of plane than in it.

## G2. Determinism

- Two runs, same seed, same parameter file: identical state digest at every checkpoint.
- Node and browser builds agree on the digest.
- The deterministic math module matches its committed golden values exactly.

## G3. Demography

| Property         | Target                                                                                          | Source            |
| ---------------- | ----------------------------------------------------------------------------------------------- | ----------------- |
| Sexual maturity  | Alate production begins near 700 workers                                                        | **[A]**           |
| Mature size      | Mean ~4300 workers                                                                              | **[A]**           |
| Major fraction   | ~7% of the colony, roughly independent of colony size                                           | **[A]**           |
| Forager fraction | ~0.40 in summer, peaking near 0.37 of the colony in the annual cycle                            | **[A]**           |
| Forager lifespan | Emergent mean near 27 days from first foraging, from a 3–4%/day hazard rather than a hard cap   | **[A]**           |
| No reversion     | Removing 50% of foragers draws no replacements from other castes; larval survival falls instead | **[A]** HARD RULE |

**Forager fraction, measured on colonies grown from a queen.** After D47, in colonies' third and
fourth summers, the share is 0.05 to 0.27 in April, 0.13 to 0.29 in May and 0.20 to 0.30 in June,
and reaches its maximum in July at 0.39 to 0.46, when the year's first summer-born workers join.
The measured maximum is 35 to 41 percent in mature colonies and 60 in immature ones, between May
and June. March is still about zero, where foraging has begun in the field in most years.
DECISIONS.md D32, D38, D44 and D47.

**Growth.** Between May and October colonies grew 4.64 times over in a normal year (SD 1.93) and
0.996 times in the 2011 drought (SD 0.73) **[A]**. The model grows 3.3 to 4.4 times over in its second
and third summers, and 0.84 times on average in a drought year, which is fitted (D42).

**Colony size.** Workers each October, three colonies, no drought, with the seed on the ground at
its fitted 120 a square metre (D43) and the overwintered foraging peak on 1 April (D47):

| Year | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Seed 2 | 15 | 72 | 349 | 1080 | 81 |
| Seed 3 | 6 | 9 | 52 | 317 | 933 |
| Seed 4 | 13 | 70 | 204 | 532 | 260 |

**Not met.** Colonies that pass 700 fall back the year after, starving thousands of larvae with
thousands of seeds in store, most of them too large to open. Real colonies hold about 4300.

| Property | Status |
|---|---|
| Forager lifespan | **Met.** 38 days for the overwintered cohort, 27 for the rest (D40) |

## G4. Vertical stratification

Foragers in the top 15 cm with ≤5% below 20 cm; transfer workers ~30% below 20 cm; ≥90% of
workers below 70 cm are brood-care workers. **[A]**

Implemented in `systems/interior.ts` and exercised by `test/interior.spec.ts`, which shows
brood-care workers settling below foragers when both start at the same depth.

| Property | Target | Status |
|---|---|---|
| Nurses below foragers | The measured sorting | **Met** for workers the interior system owns |
| The distribution across the whole workforce | The measured fractions | **Not met.** About four workers in five pass the persistent-digging test and belong to the excavation system, which walks them to the dig face at the bottom of the nest and keeps them there. In a grown colony most of the workforce is therefore deep whatever its task, and the measured fractions cannot be recovered from it. This is the same defect as the runaway digging in G1 and it will not be fixed here |
| The mechanism | None | **Invented.** An ant walks toward a depth it is handed. See DECISIONS.md D20 |

### Brood placement

Brood is now somewhere rather than merely counted: `nest.brood` holds a count per cell, laid
where the queen is and carried deeper by nurses, with `BroodStore` still authoritative for
how much brood exists. What this reproduces is the [A] observation that brood is kept in the
deep chambers and that callows eclose there. What it does not reproduce is any measured
*number* of brood per chamber, because none is published.

## G4b. Foraging

Encoded in `test/foraging.spec.ts`. Foraging cannot be measured on a naturally grown colony
inside a test suite (a worker does not forage before 43 days old and a founding colony has
eleven workers), so these run on an artificial age structure. Nothing demographic may be
read off them; they are about what a forager *does*.

| Property | Target | Status |
|---|---|---|
| Trunk trails | 1-4 short trails into a surrounding range | **Met.** Drawn once per colony from its own seed |
| Trail direction | Random at population level | **Met**, by construction. The [A] cause, the position of neighbouring colonies, is not modelled, because no neighbours are |
| Site fidelity | Return to within ~0.5 m of the last site | **Met** |
| Path integration | Home on an accumulated vector, not on a read of position | **Met** structurally. Drift is **not modelled**; the vector is exact. See the not-modelled panel |
| Trip duration is search time | Trip length dominated by searching, not by walking | **Met.** Mean trip is well above the walk across the range |
| **Worker size predicts nothing** | Majors and minors range equally far | **Met.** Mean distances within 15 % across castes. HARD RULE |
| Range not defended | No territorial behaviour anywhere | **Met**, by absence |
| Non-linear recruitment | Trails should earn their keep | **Partly met.** Since 2026-09-17 a forager with no remembered site takes the strongest trail she smells a metre out from the entrance. Trails now bring 3 to 7 percent more seed on each of three sets of four colonies over six days (3188 against 3096, 2602 against 2433, 2603 against 2537): consistent, and small. Before that change, measured 2026-09-10 on the code before seeds had sizes, four colonies each for six days: 682 seeds with trail following against 681 without, 681 against 682, and 1129 against 1124, on three sets of seeds. This row used to say *met*, on the strength of a test that was passing by one seed; a change to the random stream elsewhere flipped it. Trails are laid and followed and do not measurably change what a colony finds. The test is now skipped and carries these numbers. The range was suspected (DECISIONS.md D21), but D30 shows trips last as long on 11 m of ground as on 25 m, so the ground's size is not what makes trails idle. The cause is still unknown |
| Heat curfew | Foraging stops when the surface is too hot | **Met.** The threshold is invented; that there is one is [B] |
| Diurnal | No foraging at night | **Met** |
| **Seeds feed the colony** | Larval survival should depend on what foragers deliver | **Met in the mechanism, and it fails the colony.** Larvae eat only what the store yields (G5), and what the foragers deliver is not enough to raise a growing brood. See G5 |
| Seed size classes | Large seeds accumulate to 70 % of stores | **Met.** See G5 |

### What the seed field is, and why it is patchy

No seed rain is published for these sandhills, so the standing crop, its patchiness and its
replenishment are all invented and tagged **[C]**. Patchiness is not decoration. With seeds
spread evenly, every ant finds one within a few steps of the entrance, every trip succeeds,
and site fidelity and recruitment trails are ornaments on a conveyor belt, which is exactly
what the first implementation did, at a 100 % trip success rate. With patches, trip success
runs 34-62 % and falls as a colony grows and depletes the patches nearest home.

## G5. Seeds and germination

Large seeds accumulate to ≥70% of stores by weight. Germination rate tracks the seasonal
soil temperature cycle with depth. Germinating seeds are removed promptly and fed
preferentially to larvae. **[A]**

| Property | Target | Status |
|---|---|---|
| The store is a place, not a total | Seeds lie in chambers | **Met.** Counts per cell in the nest grid, and visible in the slice |
| Foragers deposit in the topmost chambers only | The [A] prohibition | **Met**, and asserted by `test/interior.spec.ts` |
| A separate class carries them down | The [A] partitioning | **Met in the mechanism**, and asserted in a test with workers available to do it |
| The store ends up at 20 to 80 cm | **[A]** | **Partly met.** Measured on one colony at year 2, 350 simulated days, 82 workers, 1749 seeds in store: 39 % lies in the measured 20 to 80 cm band, 19 % between 5 and 20 cm, and 42 % in the top 5 cm. So the wave runs and the band fills, but the top of the nest holds more than it should. The cause is the same one as G1: only a couple of workers in a hundred are in the top 20 cm at any moment, because the rest are at a dig face, so seeds arrive at the entrance faster than they are carried away from it |
| Size classes | Large seeds reach 70 % of stores | **Met, perhaps too well.** Four classes at their measured masses. After four years on seeds 2 to 5, 97 to 99.8 % of the stored mass is in sizes the ants cannot open, against the measured 70 % or more. Small and medium seeds are opened at their measured daily rates whatever the larvae need, so almost none stay in store |
| Germination | Tracks soil temperature and depth | **Met in the mechanism.** Each class follows its laboratory temperature response at the soil temperature of its depth, scaled to the germinating seeds counted in natural chambers (DECISIONS.md D22), and asserted in `test/seeds.spec.ts`. Whether the seasonal peaks fall in the measured April and December depends on the soil temperature model, which is itself only roughly right |
| Germinating seeds fed to larvae | The mechanic that unlocks large seeds | **Met in the mechanism**, and asserted in `test/seeds.spec.ts`. In practice germinating seed is 3 to 5 % of what the larvae ate over four years on seeds 2 to 5; nearly all their food is small and medium seed the workers opened |
| A colony grows on what it collects | Maturity at 4 to 5 years and about 4300 workers **[A]** | **Not met, badly.** At the end of the fourth year, on seeds 2 to 5, colonies had 84, 59, 61 and 49 workers, where the same seeds under the old forager-to-larva proxy had 1349, 1133, 1736 and 508. The larvae ate almost everything openable the foragers brought home, 1.9 to 5.7 g in four years, which builds 250 to 730 workers. After D29 gave the spring its foragers back, seeds 2 to 4 had 118, 111 and 150 workers at the end of the fourth year, with no collapse in the third. That is still a tenth of a real colony. Seed collected tracks the invented seed density on the ground, not the size of the range (D30), so the shortfall now sits in a value no paper supplies. D31 then cut the queen's invented laying rate from 0.09 to 0.035 eggs a day per worker, because the model held 0.07 to 0.34 foragers per larva against a measured 1.64: seeds 2 to 4 reached 272 to 315 workers in year four and 252 to 296 in year five, and starved about two larvae per worker raised instead of seven. They levelled off there, until D43 fitted the seed on the ground (see G3). DECISIONS.md D24, D29 to D31 and D43 |

## G6. Relocation

About one move per year, mean distance ~4 m, rarely over 10 m, duration 4–6 days, along an
existing trunk trail, and the new nest statistically indistinguishable in size and shape
from the vacated one. Successive moves describe a random walk around the original position.
**[A]**

| Property | Target | Status |
|---|---|---|
| Frequency | About one move a year, up to four | **Met.** 18 moves in 15 colony-years on seeds 2 to 4, and 4, 9 and 5 per colony over five years. By construction: the daily chance is scaled to the mean |
| Season | May to November, peaking in July | **Met**, by construction |
| Distance | Mean about 4 m, rarely over 10 m | **Met.** About 3.4 m per move across those runs, none over 10 m |
| Along a trail | Main trunk trail 78 percent of the time | **Met**, by construction |
| Duration | 4 to 6 days | **Met**, by construction |
| What is carried | A minority carry; seeds, then brood; the share rises through the move | **Met.** At most a tenth of workers on the trail, rising through the move; the brood is taken only once the seeds are gone. Charcoal is not modelled. The share is invented. DECISIONS.md D45 |
| The new nest | Indistinguishable from the old | **Partly met.** The new nest is dug by the colony, from an incipient shaft that now descends at the measured angle and spirals, as every other shaft in the model does, rather than dropping straight down from the entrance (D49). Its size follows the colony as it is. After five years on seeds 2 and 3 nests were 84 and 95 cm deep, 1.2 and 1.3 times Tschinkel's depth law, where copying the old nest gave 130 and 152 cm, about twice. Forty days after a forced move a colony of about 80 workers had dug 151 cells against 385 in the nest it left, so the new nest is smaller than the old for weeks. DECISIONS.md D36 |
| Random walk around the origin | Successive moves wander around the first site | **Not measured.** The run does not track the entrance's position across moves |
