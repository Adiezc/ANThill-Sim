# Validation

What the model must reproduce before a stage is considered done. These are acceptance
gates, not aspirations: the order of work in the build brief says excavation does not
proceed until the nest signature matches.

## A note on 2D versus 3D statistics

Every architectural number in `SCIENCE.md` §2 is a measurement of a real three-dimensional
nest — chamber _area_ in cm², total volume in litres, area per depth decile. The simulation
models a vertical slice, in which the corresponding quantity is a cross-sectional _length_
per depth band, not an area. Comparing the two directly would be meaningless, so each gate
below states the mapping it uses. Where a mapping is assumed rather than derived, it is
tagged **[C]** and stated here, so that a reader can disagree with it explicitly.

## G1. Nest architectural signature

**Status: substantially met.** Encoded in `test/nest-signature.spec.ts`, measured at 600
workers over 70 simulated days. The five criteria still unmet are skipped tests carrying the
value the model produces, so the gap stays visible in the suite.

| Property | Target | Status |
|---|---|---|
| Chamber spacing | 3.5 cm decile 1 rising to ~12 cm at decile 7-8 (Fig. 10) | **Shallow met, deep not met.** 3.3 cm shallow, 7.8 cm deep against a floor of 8.75. The digging budget of D28 cost the deep end, and the criterion is now a skipped test carrying that value |
| Build time | Most of a nest inside the first week | **Met.** 116 cm by day 6 at 600 workers, half of what the same nest reaches by day 70 |
| Top-heaviness | ~0.5 of chamber area in the top quarter | **Met.** 0.57 |
| Decile ordering | First decile holds more area than the last | **Met** |
| Chamber height | ~1 cm | **Met, barely.** 1.58 cm |
| Series count | 1-4 | **Met.** 3 |
| Reproducibility | Same seed, same nest | **Met** |
| Depth reached | Deep, emergent, no ant knowing the shape | **Met** |
| **Nest size tracks worker number** | `log(depth) = 0.95 + 0.37 log(workers)` | **Substantially met in colonies; this harness cannot test it.** Four colonies sit at 0.98 to 1.12 of the law after three years. The harness has no interior system, so its synthetic workers have no resting place and every one of them behaves as a descender. See below, and D28 |
| Max depth | Within the 306 cm deepest ever measured | **Met.** 230 cm here, and 270 cm in a colony followed for five years |
| Height independent of depth | ~1 cm whatever the area | **Met.** 1.77 cm shallow against 1.47 cm deep, where it was 1.71 against 0.99 before D28 |
| Branch depth | All branches above 40 cm | **Not met.** Deepest branch 59.75 cm |
| Surface:bottom chamber width | ~2.4x | **Not met.** 1.52x |

### What changed to get here

Four things, in order of how much they mattered.

**Crowding is measured over a neighbourhood, not over a grid cell.** A cell is 5 mm across
and a minor worker is 6.35 mm long, so two ants in adjacent cells are touching: counting
co-occupancy of one cell is not a collision rate, it is a rounding artefact, and it reports
every narrow shaft as permanently packed. Measuring ants per unit of open space over a 4 cm
neighbourhood instead took the whole-nest build time from about seventy days to six — the
figure the species is reported to manage — and made chamber spacing widen with depth
properly for the first time.

**The excavation rate was the wrong number.** Tschinkel's 0.45 cm² of chamber and 0.13 cm
of shaft per worker-day are averages over every penned worker, most of whom were not at a
face at any moment. Applying that average to an ant that *is* at a face counts the queueing
twice. The physical rate is in the same paper — 300 to 400 times body weight in sand per day
while excavating — and worker mass came from Tschinkel 1998's Figure 5 rather than from the
estimate of 1.7 mg used before, which was wrong by nearly a factor of two.

**Chambers open along the whole shaft, not only at its tip.** One rule turned a nest with a
single working face into one with hundreds, and produced the top-heavy distribution — stuck
at 0.19 — as a side effect rather than as a target.

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
**The model used to dig until it ran out of grid** — 320 cm, whatever the colony size — and a
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
bore — Tschinkel's own distinction — so the threshold is read from `nest.shaftBoreDiameterCm`
rather than invented. Converting a slice length to a volume needs an out-of-plane thickness,
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

**Forager fraction, measured 2026-09-16 on colonies grown from a queen.** The annual maximum is
0.31 to 0.43, on the measured 35 to 41 percent. It comes in July to September instead of May to
June, and the spring share is 0.02 to 0.22 where the measured curve is rising to its maximum.
DECISIONS.md D32.

## G4. Vertical stratification

Foragers in the top 15 cm with ≤5% below 20 cm; transfer workers ~30% below 20 cm; ≥90% of
workers below 70 cm are brood-care workers. **[A]**

Implemented in `systems/interior.ts` and exercised by `test/interior.spec.ts`, which shows
brood-care workers settling below foragers when both start at the same depth.

| Property | Target | Status |
|---|---|---|
| Nurses below foragers | The measured sorting | **Met** for workers the interior system owns |
| The distribution across the whole workforce | The measured fractions | **Not met.** About four workers in five pass the persistent-digging test and belong to the excavation system, which walks them to the dig face at the bottom of the nest and keeps them there. In a grown colony most of the workforce is therefore deep whatever its task, and the measured fractions cannot be recovered from it. This is the same defect as the runaway digging in G1 and it will not be fixed here |
| The mechanism | — | **Invented.** An ant walks toward a depth it is handed. See DECISIONS.md D20 |

### Brood placement

Brood is now somewhere rather than merely counted: `nest.brood` holds a count per cell, laid
where the queen is and carried deeper by nurses, with `BroodStore` still authoritative for
how much brood exists. What this reproduces is the [A] observation that brood is kept in the
deep chambers and that callows eclose there. What it does not reproduce is any measured
*number* of brood per chamber, because none is published.

## G4b. Foraging

Encoded in `test/foraging.spec.ts`. Foraging cannot be measured on a naturally grown colony
inside a test suite — a worker does not forage before 43 days old and a founding colony has
eleven workers — so these run on an artificial age structure. Nothing demographic may be
read off them; they are about what a forager *does*.

| Property | Target | Status |
|---|---|---|
| Trunk trails | 1-4 short trails into a surrounding range | **Met.** Drawn once per colony from its own seed |
| Trail direction | Random at population level | **Met**, by construction. The [A] cause — the position of neighbouring colonies — is not modelled, because no neighbours are |
| Site fidelity | Return to within ~0.5 m of the last site | **Met** |
| Path integration | Home on an accumulated vector, not on a read of position | **Met** structurally. Drift is **not modelled**; the vector is exact. See the not-modelled panel |
| Trip duration is search time | Trip length dominated by searching, not by walking | **Met.** Mean trip is well above the walk across the range |
| **Worker size predicts nothing** | Majors and minors range equally far | **Met.** Mean distances within 15 % across castes. HARD RULE |
| Range not defended | No territorial behaviour anywhere | **Met**, by absence |
| Non-linear recruitment | Trails should earn their keep | **Not met.** Measured 2026-09-10 on the code before seeds had sizes, four colonies each for six days: 682 seeds with trail following against 681 without, 681 against 682, and 1129 against 1124, on three sets of seeds. This row used to say *met*, on the strength of a test that was passing by one seed; a change to the random stream elsewhere flipped it. Trails are laid and followed and do not measurably change what a colony finds. The test is now skipped and carries these numbers. The range was suspected (DECISIONS.md D21), but D30 shows trips last as long on 11 m of ground as on 25 m, so the ground's size is not what makes trails idle. The cause is still unknown |
| Heat curfew | Foraging stops when the surface is too hot | **Met.** The threshold is invented; that there is one is [B] |
| Diurnal | No foraging at night | **Met** |
| **Seeds feed the colony** | Larval survival should depend on what foragers deliver | **Met in the mechanism, and it fails the colony.** Larvae eat only what the store yields (G5), and what the foragers deliver is not enough to raise a growing brood. See G5 |
| Seed size classes | Large seeds accumulate to 70 % of stores | **Met.** See G5 |

### What the seed field is, and why it is patchy

No seed rain is published for these sandhills, so the standing crop, its patchiness and its
replenishment are all invented and tagged **[C]**. Patchiness is not decoration. With seeds
spread evenly, every ant finds one within a few steps of the entrance, every trip succeeds,
and site fidelity and recruitment trails are ornaments on a conveyor belt — which is exactly
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
| A colony grows on what it collects | Maturity at 4 to 5 years and about 4300 workers **[A]** | **Not met, badly.** At the end of the fourth year, on seeds 2 to 5, colonies had 84, 59, 61 and 49 workers, where the same seeds under the old forager-to-larva proxy had 1349, 1133, 1736 and 508. The larvae ate almost everything openable the foragers brought home, 1.9 to 5.7 g in four years, which builds 250 to 730 workers. After D29 gave the spring its foragers back, seeds 2 to 4 had 118, 111 and 150 workers at the end of the fourth year, with no collapse in the third. That is still a tenth of a real colony. Seed collected tracks the invented seed density on the ground, not the size of the range (D30), so the shortfall now sits in a value no paper supplies. D31 then cut the queen's invented laying rate from 0.09 to 0.035 eggs a day per worker, because the model held 0.07 to 0.34 foragers per larva against a measured 1.64: seeds 2 to 4 reached 272 to 315 workers in year four and 252 to 296 in year five, and starved about two larvae per worker raised instead of seven. They level off there. DECISIONS.md D24 and D29 to D31 |

## G6. Relocation

About one move per year, mean distance ~4 m, rarely over 10 m, duration 4–6 days, along an
existing trunk trail, and the new nest statistically indistinguishable in size and shape
from the vacated one. Successive moves describe a random walk around the original position.
**[A]**
