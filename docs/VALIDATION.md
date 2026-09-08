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
| Chamber spacing | 3.5 cm decile 1 rising to ~12 cm at decile 7-8 (Fig. 10) | **Met.** 2.9 cm shallow and 10.9 cm deep. Both ends, for the first time |
| Build time | Most of a nest inside the first week | **Met.** 166 cm by day 6 at 600 workers, against about 70 days before |
| Top-heaviness | ~0.5 of chamber area in the top quarter | **Met.** 0.63 |
| Decile ordering | First decile holds more area than the last | **Met** |
| Chamber height | ~1 cm | **Met, barely.** 1.55 cm, against 1.20 before the excavation rate was corrected |
| Series count | 1-4 | **Met.** 4 |
| Reproducibility | Same seed, same nest | **Met** |
| Depth reached | Deep, emergent, no ant knowing the shape | **Met** in the weak sense that it happens; see below for why the strong version does not |
| **Nest size tracks worker number** | `log(depth) = 0.95 + 0.37 log(workers)` | **Not met.** Digs to the grid floor at every colony size. The central open problem — see below |
| Max depth | Within the 306 cm deepest ever measured | **Not met.** 320 cm, which is the grid floor |
| Height independent of depth | ~1 cm whatever the area | **Not met.** 1.71 cm shallow against 0.99 cm deep |
| Branch depth | All branches above 40 cm | **Not met.** Deepest branch 59 cm, worse than the 41.75 cm before faster digging |
| Surface:bottom chamber width | ~2.4x | **Not met.** 1.20x |

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

### The founding nest is a tenth of the size it should be

Measured while making the inside of the nest visible, 2026-09-08, and not previously
recorded. `nest.incipientDepthCm` is **[A]**: Tschinkel 2004 measured incipient nests at 29
to 37 cm. A founding queen in this model gets to about **5 cm** before her first daughters
eclose and founding ends.

The rate is not the reason. Her per-tick rate at a face works out to roughly 3 cells a day,
which would sink a 30 cm shaft in about three weeks; she manages under a third of a cell a
day. The time goes on everything that is not digging — carrying each pellet up, putting it
down, walking back to the face, and dig attempts refused by the roof and body-size rules.
For a colony that is one ant, there is no relay chain to hand a pellet to, so every pellet
is her own round trip.

It is worth stating what this costs a viewer, because it is the first thing anyone sees: for
the first two months of simulated time there is a queen, a hole a centimetre deep, and a
clutch of eggs, and nothing else. The nest only starts to look like a nest once workers
eclose. This is a model failure and not a rendering one, and it is the first thing to fix
in the excavation rules.

### The central unsolved problem: nothing stops the digging

Tschinkel's nests obey a law. Total chamber area tracks worker number and depth goes with
it, `log(depth) = 0.95 + 0.37 log(workers)`, so 600 workers predicts a nest about 96 cm
deep. **The model digs until it runs out of grid** — 320 cm, whatever the colony size.

This was tested against a linear crowding response and a Hill-shaped one, against collision
memories from 45 ticks to three days, and against crowd-avoidance weights spanning an order
of magnitude. The depth came out at the grid floor every time.

The reason is structural rather than a matter of tuning. Crowding at a working face never
falls, because ants gather where digging is happening, so the one signal the model has for
"we have enough room now" is measured in the one place that is always busy. The same failure
is what makes a founding colony of eleven nanitics excavate a 2.5 m nest in its first year
against an incipient 29-37 cm.

A colony-level regulator — stop when volume per worker passes some ratio — would fix both in
an afternoon, and would also contradict the premise the project exists to demonstrate: that
no ant knows anything about the nest as a whole. Deriving the area-worker law from local
rules alone is an open problem in this literature, not an oversight here. It is recorded as
a skipped test rather than closed with a global rule.

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
| Non-linear recruitment | Trails should earn their keep | **Met.** A colony with trail following finds more seeds than the same colony with the response set to zero — the one test here that fails if the recruitment model is deleted |
| Heat curfew | Foraging stops when the surface is too hot | **Met.** The threshold is invented; that there is one is [B] |
| Diurnal | No foraging at night | **Met** |
| **Seeds feed the colony** | Larval survival should depend on what foragers deliver | **Not met, and not attempted.** Nothing eats a seed. Larval survival is still the forager-to-larva proxy it was before. The food account arrives with germination at G5 |
| Seed size classes | Large seeds accumulate to 70 % of stores | **Not met.** No size classes yet; a seed is a seed. G5 |

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
| Size classes | Large seeds reach 70 % of stores | **Not met.** A seed is a seed |
| Germination | Tracks soil temperature and depth | **Not met.** Nothing germinates |
| Germinating seeds fed to larvae | The mechanic that unlocks large seeds | **Not met.** Nothing eats |

## G6. Relocation

About one move per year, mean distance ~4 m, rarely over 10 m, duration 4–6 days, along an
existing trunk trail, and the new nest statistically indistinguishable in size and shape
from the vacated one. Successive moves describe a random walk around the original position.
**[A]**
