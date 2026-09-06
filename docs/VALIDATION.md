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
| Chamber height | ~1 cm, independent of area | **Met.** 1.20 cm, and shallow and deep chambers agree to within 0.3 cm. No rule sets a height; an ant refuses to raise a ceiling already a body height above the floor |
| Nest depth | 250–300 cm mature, 306 cm deepest recorded | **Met.** 200–240 cm — the right order, and far past the 29–37 cm of an incipient nest |
| Top-heaviness | ~0.5 of chamber area in the top quarter | **Met.** 0.51–0.55. The last signature to appear, and it only did once chambers could open along the whole length of a shaft instead of only at its tip |
| Decile ordering | First decile holds more area than the last | **Met** |
| Spacing widens with depth | 3.5 cm decile 1 → ~12 cm decile 7–8 (Fig. 10) | **Partly met.** 2.9 → 6.4 cm: shallow figure right, direction right, deep figure about half |
| Series count | 1–4 | **Met at 600 workers** (4). Exceeded at 1200 (6) |
| Branch depth | All branches above 40 cm | **Not met.** Deepest branch 41.75 cm. Nothing constrains branch depth in the model; it lands within 2 cm of a categorical boundary, on the wrong side |
| Surface:bottom chamber width | ~2.4× (from the 5–6× area ratio, Fig. 9B) | **Not met.** 1.47× |
| Build time | Complete nest in 3–6 days regardless of colony size | **Not met.** About 70 days at 600 workers |

### What changed to get here

Three things, in order of how much they mattered.

**Chambers open along the whole shaft, not only at its tip.** An ant on a bare stretch of
shaft wall starts a chamber where there is not already one within the spacing for that
depth. That one rule turned a nest with a single working face into one with hundreds, and
it is what produced the top-heavy distribution — which had been stuck at 0.19 — as a side
effect rather than as a target.

**The excavation rate was the wrong number.** Tschinkel's 0.45 cm² of chamber and 0.13 cm
of shaft per worker-day are averages over every penned worker, most of whom were not at a
face at any moment; the same paper reports only 82 percent of old workers and 19 percent of
young ones ever surfaced carrying sand. Applying that average to an ant that *is* at a face
counts the queueing twice, and doing so held the model at 21 cm after forty simulated days.
The physical rate is in the same paper — a worker moves 300 to 400 times its own weight in
sand per day while excavating — and with a worker mass, the bulk density of sand and a slice
thickness that becomes a number of cells. The colony-average figures remain the check on the
result.

**The figures, not just the text.** Figure 10 gives vertical spacing by decile, peaking near
12 cm in the 7th or 8th — the body text's "20 to 30 cm deeper" is not supported by the
figure except for one outlying nest. Figure 9B gives mean chamber area by depth, 220 cm²
shallow to 35 cm² deep, which is where the chamber-width targets come from. Both are now
parameters, and both disagreements with the text are recorded.

### Build time is the honest remaining gap

The model needs an order of magnitude longer than the species does. Fewer of its ants are
ever at a working face than the real arithmetic implies, and the fix is more faces — denser
superficial chambers in the top 10–15 cm, which the casts show as looping and interconnected
and the model renders as sparse. No **[A]** value will be scaled to close this.

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

## G5. Seeds and germination

Large seeds accumulate to ≥70% of stores by weight. Germination rate tracks the seasonal
soil temperature cycle with depth. Germinating seeds are removed promptly and fed
preferentially to larvae. **[A]**

## G6. Relocation

About one move per year, mean distance ~4 m, rarely over 10 m, duration 4–6 days, along an
existing trunk trail, and the new nest statistically indistinguishable in size and shape
from the vacated one. Successive moves describe a random walk around the original position.
**[A]**
