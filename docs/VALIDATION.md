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

A nest generated purely by local rules, with no global template, must satisfy all of:

| Property          | Target                                                                                                            | Source                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Chamber height    | ~1 cm, independent of chamber area                                                                                | `nest.chamberHeightCm` **[A]**                   |
| Top-heaviness     | Chamber area per depth decile falls ~25% relative to the decile above                                             | `nest.chamberAreaDecayPerDepthDecile` **[A]**    |
| Top-quarter share | ~0.5 of total chamber area in the shallowest quarter                                                              | `nest.topQuarterAreaFraction` **[A]**            |
| Branching depth   | Shaft branching only above ~40 cm                                                                                 | `nest.shaftBranchingMaxDepthCm` **[A]**          |
| Series count      | Rarely more than 4 shaft-and-chamber series, each contributing less area than the last                            | `nest.maxShaftChamberSeries` **[A]**             |
| Vertical spacing  | Smallest near the surface, greatest at 70–80% of maximum depth                                                    | `nest.maxVerticalSpacingAtDepthFraction` **[A]** |
| Shaft angle       | 15–20° from horizontal near the surface, steepening to ~70° below 50 cm                                           | `nest.shaftAngleDeg*` **[A]**                    |
| Mature depth      | 2.5–3.0 m at mature colony size                                                                                   | `nest.matureDepthCm` **[A]**                     |
| Size-free shape   | Constant at every colony size: the nest grows by simultaneous deepening, chamber addition and chamber enlargement | **[A]**                                          |

**Known tension, see `DECISIONS.md` D5.** The decay range 0.25–0.40 and the top-quarter
share of 0.5 are both **[A]** and cannot both hold. Over ten deciles a 25% decay gives a
top-quarter share of ~0.54; a 40% decay gives ~0.72. The gate targets the 25% end.

**2D mapping.** Chamber "area" in the slice is measured as total chamber cross-sectional
length per depth decile, on the assumption that a chamber's horizontal extent in the slice
is proportional to the square root of its true area, chamber height being fixed. Tag
**[C]**.

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

## G5. Seeds and germination

Large seeds accumulate to ≥70% of stores by weight. Germination rate tracks the seasonal
soil temperature cycle with depth. Germinating seeds are removed promptly and fed
preferentially to larvae. **[A]**

## G6. Relocation

About one move per year, mean distance ~4 m, rarely over 10 m, duration 4–6 days, along an
existing trunk trail, and the new nest statistically indistinguishable in size and shape
from the vacated one. Successive moves describe a random walk around the original position.
**[A]**
