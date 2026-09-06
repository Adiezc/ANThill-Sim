# Decisions

Every point where the build brief, `SCIENCE.md` and `species/pogonomyrmex-badius.json`
disagreed, or were silent, and how it was resolved. Anyone auditing the model's fidelity
should read this file alongside `SCIENCE.md`.

Format: the conflict, the resolution, and — where the resolution departs from the
literature — the tag the resulting mechanic carries.

---

## D1. Space is modelled as two coupled 2D domains

**Conflict.** The brief specifies a single 2D vertical slice. But `SCIENCE.md` §5 and §7
describe 1–4 trunk trails _radiating_ from the nest, whose directions are shaped by
neighbouring colony positions, a foraging range of ~20 m radius, and relocation of ~4 m
_along_ a trail whose direction is random at population level _because trail direction
is_. Projected onto a single vertical slice, above-ground ants move on a line, "radiating
trails" collapses to left-or-right, trail direction carries no information, and relocation
direction and distance stop being quantities at all.

**Resolution.** Two 2D domains that share the nest entrance:

- a **plan-view surface domain** (x, y) for foraging, trunk trails, range exclusivity and
  relocation geometry;
- a **vertical slice domain** (x, depth) for everything subterranean.

This is not a fake third spatial dimension. It is two honest 2D projections of the same
colony, and neither the simulation nor the UI will pretend otherwise. Nothing in `/core`
reconstructs a 3D position; an ant is in one domain or the other, and the nest entrance is
the only place it can transfer between them. The UI states this.

**Tag.** Modelling choice, not a biological claim. The mechanics it carries keep their own
tags.

---

## D2. `maxHarvestableSeedWidthMm` is read as maximum _openable_ width

**Conflict.** `foraging.maxHarvestableSeedWidthMm: 1.4` is tagged **[A]**. Read literally
it means nothing wider than 1.4 mm is ever collected — in which case large seeds never
enter the store, the large-seed fraction cannot reach the 70% by weight that `SCIENCE.md`
§6 records, and germination, the mechanic this simulator exists to model, has nothing to
act on. The field is internally inconsistent with the section it belongs to.

**Resolution.** The parameter is renamed `maxOpenableSeedWidthMm`, keeps tag **[A]**, and
governs which seeds workers can _open_. A separate `maxCollectableSeedWidthMm` governs
what they can _carry home_, tagged **[C]**, because no published value was found. Workers
therefore collect a wide range of sizes and open only the small ones, exactly as
Tschinkel & Kwapich 2016 describe.

**Tag.** The opening limit stays **[A]**. The collection limit is **[C]** and is exposed
as a slider.

---

## D3. Relocation candidate sites genuinely differ — a deliberate departure from [A]

**Conflict.** The brief asks that the player be shown two or three candidate relocation
sites with readable trade-offs — soil moisture, workable depth, distance, neighbour
proximity. `SCIENCE.md` §7 and §11 say, tagged **[A]**, that the replacement nest is
statistically indistinguishable from the vacated one, that architecture, forest canopy and
neighbour density were each tested as explanations for relocation and each failed, and
that the cause of relocation **remains unknown**.

**Resolution.** By explicit instruction from the project author, candidate sites differ in
substance: soil moisture and workable depth affect excavation rate and colony outcome at
the new site, so the player's choice has consequences.

**Tag.** The entire site-differentiation mechanic is **[C]**, and the relocation panel
states plainly that Tschinkel 2013 and 2014 searched for exactly this effect and did not
find it, and that the cause of relocation is unexplained. The player gets a meaningful
lever; nobody is left believing the literature supports it.

---

## D4. Colony death: a [C] queen mortality hazard

**Conflict.** v1 scope requires colony death and an end-of-run summary. No queen lifespan,
colony lifespan or senescence constant exists in the parameter file, and no biological
constant may be hard-coded.

**Resolution.** A new `colony.queenLifespanYears` with a per-day hazard, tagged **[C]**,
exposed as a slider, defaulting to a ~15–20 year expectation. Emergent failure modes
(failed founding, sustained forager loss above 4% per day, starvation) remain and are
tagged as they were. After the queen dies the colony declines to extinction along the
lines of `SCIENCE.md` §10 — worker rank orders, male-only eggs, no recovery, no rescue.

**Tag.** **[C]**, flagged as invented wherever it is surfaced.

---

## D5. The top-heaviness contradiction, resolved by the primary source

**Superseded. The conflict was an artefact of reading a secondary account.**

The original problem: `chamberAreaDecayPerDepthDecile` of 0.25–0.40 and
`topQuarterAreaFraction` of 0.5 are both **[A]** and, under a constant geometric decay,
cannot both hold. A flat 25 percent decay puts 0.54 of chamber area in the top quarter and
a flat 40 percent puts 0.72, so only the shallow end of the range came close.

Reading `docs/papers/tschinkel-2004-nest-architecture.pdf` in full dissolves it. The
decile-to-decile decrease is **not constant**. Tschinkel regresses it directly:

> proportional decrease = 0.10 × decile − 0.12  (R² = 0.16, p < 0.01)

which runs from about 10 percent between deciles 1 and 2 to about 90 percent between 9 and
10, and averages about half. The abstract's "25 to 40 percent" is that regression
compressed into one clause; the two were never the same claim. Applying the regression
gives a top-quarter share of about 0.60 against a reported "about half" — a real but
ordinary discrepancy between a fitted line and a summary statistic, not a contradiction.

**Resolution.** The model uses the regression. `nest.chamberAreaDecreaseSlope` and
`chamberAreaDecreaseIntercept` are the authored values;
`nest.chamberAreaDecayPerDepthDecile` is retained and marked superseded, because it is what
the abstract of the source says and deleting it would hide the discrepancy rather than
record it. The nest signature gate in `VALIDATION.md` targets the regression.

Worth stating plainly: this was found only because the paper itself was read rather than a
summary of it. It is the argument for `docs/papers/`.

## D6. Building pheromone persistence was specified twice

`excavation.buildingPheromoneLifetimeTicks: 600` and `pheromones.building.decayPerTick:
0.998` describe the same quantity and disagree — 0.998 retains 30% of the signal after 600
ticks. Both are **[C]**.

**Resolution.** Lifetime is the single authored value, because it is the form Khuong et al.
2016 reason in and it is the exposed slider. The per-tick decay constant is derived from
it, and `pheromones.building.decayPerTick` is removed.

---

## D7. Tick duration is defined as one simulated minute

Nothing in either document states a tick length, yet every `decayPerTick`,
`...PerHour` and `...Ticks` value depends on one.

**Resolution.** `time.secondsPerTick: 60`, tagged **[C]**, giving 1440 ticks per simulated
day and ~525,600 per year. Playback speed changes how many ticks run per frame and never
the size of a tick.

---

## D8. Missing demographic and seed parameters

The parameter file has no brood stage durations, no queen laying rate, no non-forager
worker lifespan, no brood mortality, no alate production quantity, no queen founding fat
reserve, no nanitic count, no seed species table, no germination rate function, no seed
encounter rate and no larval food demand. Sections 1, 6 and the whole demographic engine
cannot be built without them.

**Resolution.** They are added to the parameter file as they become needed, each tagged
**[B]** where a congener or a claustral-ant generality supports it and **[C]** where
nothing does, each noted in `SCIENCE.md`. None is tagged **[A]** without a _badius_
citation. This file records each addition as it lands.

---

## D9. A fixed 365-day calendar

The model needs a calendar to drive the climate table, but it has no `Date` and no wall
clock, and it must be exactly reproducible over runs spanning fifteen simulated years.

**Resolution.** A fixed 365-day year with no leap days, derived entirely from the integer
tick count. Over a fifteen-year run this puts the simulated date at most four days ahead
of a Gregorian one, which is well inside the resolution of monthly climate normals and of
every seasonal transition in `SCIENCE.md` §9. Introducing leap years would buy nothing and
would make the tick-to-date mapping non-uniform.

**Tag.** Modelling choice. Not a biological claim.

---

## D10. Primary sources added, and sections 2 and 3 rewritten from them

Five papers were added to `docs/papers/` (2026-09-06). `tschinkel-2004-nest-architecture.pdf`
was read in full and `SCIENCE.md` sections 2 and 3 were rewritten from it. Corrections:

- **Incipient nest depth is 29–37 cm, not 40–50 cm.** The larger figure came from a
  secondary account and is wrong.
- **Shaft angle is stated twice and inconsistently in the source.** The abstract says
  15–20 degrees from horizontal near the surface rising to about 70 degrees; the body says
  20–30 degrees rising to 45–60 degrees by 50 cm. The model uses the body text; both are
  kept in the parameter file so the inconsistency stays visible instead of being silently
  resolved.
- **Chamber area decrease is depth-dependent, not flat.** See D5.
- **Total area scales as a fitted law**, `log A = 0.551 + 0.873 log W`, R² 93 percent,
  replacing "grows slightly more slowly than the worker population".

New material with no previous entry: helix pitch (8–10 cm per turn shallow, 20 cm deep),
shaft bore diameter (just under 1 cm, up to 2 cm in the upper nest), chamber–shaft
intersection angle, chamber outline complexity, vertical spacing in centimetres, branch
depths, per-series area contributions, depth scaling law, per-worker-day excavation rates,
and the whole-nest excavation rate of 3 to 6 days regardless of colony size.

One finding changes the shape of the excavation model rather than a number in it.
Tschinkel's penning experiments show the difference between age groups is mostly **how many
workers dig, not how fast each digs**, and that *"a worker either digs consistently or does
not dig at all"*. Digging is therefore a persistent individual state in this model, set
once and carried, never a per-tick probability. It is recorded as a HARD RULE
(`excavation.diggingIsAPersistentTrait`).

Finally, the depth cue. Tschinkel 2004 proposed a carbon dioxide gradient as the template
for depth-dependent architecture, having measured a fivefold rise from surface to nest
bottom that mirrors the chamber-area distribution almost exactly. Tschinkel 2013 then
vented the gradient away and reversed it, and architecture was unchanged. So the model's
one big invention — handing a digging ant its own depth — is standing in for a cue whose
most plausible candidate has been tested and killed. That is now stated in
`excavation.depthCueMechanism`, in the rule registry, and in `NOT_MODELLED`.

**Licensing.** These PDFs are third-party works and are not ours to relicense. Only
Tschinkel 2004 is certainly open access. See `docs/papers/README.md` before this repository
is made public.
