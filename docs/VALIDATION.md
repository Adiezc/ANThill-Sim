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

**Status: not met.** Encoded in `test/nest-signature.spec.ts`. The criteria the model
reaches are asserted; the four it does not are skipped tests carrying the measured value,
so the gap is visible in the suite rather than absent from it.

A nest generated purely by local rules, with no global template, must satisfy all of:

| Property | Target | Status |
|---|---|---|
| Chamber height | ~1 cm, independent of chamber area | **Met.** 1.06 cm measured, and shallow and deep chambers agree. Nothing in the model sets a chamber height; an ant refuses to raise a ceiling already a body height above the floor, and this is what that produces |
| Branching depth | Every branch above ~40 cm | **Met.** Nothing forbids a deep branch; branching is shallow because that is where the ants are |
| Reproducibility | Same seed, same nest | **Met** |
| Mature depth | 250–300 cm at mature colony size | **Not met.** 21 cm at 2000 workers over 40 simulated days |
| Top-heaviness | ~0.5 of chamber area in the top quarter; decile decrease rising with depth per `decrease = 0.10 × decile − 0.12` | **Not met.** 0.19 measured, and the distribution is currently bottom-heavy |
| Vertical spacing | 2–4 cm shallow rising to 20–30 cm deep, peaking in decile 7–8 | **Not met.** 3.1 cm shallow and 2.9 cm deep: the shallow figure is right, the widening with depth is absent |
| Series count | 1–4 shaft-and-chamber series | **Not met.** 0–2 and unstable |
| Chamber outline | Circular when small, 2–7× the perimeter of an equal circle when large and shallow | Not yet measured |

### Why the four are not met

One cause, and it is a modelling question rather than a tuning one. Excavation rate is
taken straight from Tschinkel's penning experiments — 0.45 cm² of chamber and 0.13 cm of
shaft per old worker-day — and at colony scale those figures are self-consistent: 4300
workers × 0.45 cm² × 5 days is 9675 cm², against a reported ~10,000 cm² for a large nest,
and the paper's "3 to 6 days to excavate a complete nest regardless of colony size" follows
from it.

That arithmetic assumes essentially every worker is digging. In the model far fewer are
ever at a working face at once, because a face is a small place and an ant will not push
into a crowd. So the nest grows perhaps an order of magnitude too slowly, never reaches the
depth at which a top-heavy distribution can express itself, and the deep chambers that
should be widely spaced do not exist yet.

The fix is to make many faces workable at once, as they are in a real nest — which is what
chambers budding along the whole length of a shaft would do — rather than to multiply the
measured rate by a fudge factor. No **[A]** value will be bent to close this gap.

### 2D mapping

Chamber "area" in the slice is measured as total chamber cross-sectional length per depth
decile. A void cell counts as chamber rather than shaft when its horizontal run exceeds
twice the shaft bore, which is Tschinkel's own distinction — shafts are elongated voids of
roughly constant small diameter, chambers are horizontal-floored and much wider than tall —
so the threshold is read from `nest.shaftBoreDiameterCm` rather than invented. What is
compared between model and paper is the *shape* of the depth distribution, not absolute
area. Tagged **[C]** as a mapping.

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
