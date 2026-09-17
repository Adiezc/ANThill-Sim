# Decisions

Every point where the build brief, `SCIENCE.md` and `species/pogonomyrmex-badius.json`
disagreed, or were silent, and how it was resolved. Anyone auditing the model's fidelity
should read this file alongside `SCIENCE.md`.

Each entry gives the problem, what was decided, and the tag the resulting mechanic carries where it
departs from the literature. Entries are a dated log: a later one can overturn an earlier one, and
says so. The current state of the model is summarised in the README and in `VALIDATION.md`.

## Contents

- [D1. Space is modelled as two coupled 2D domains](#d1-space-is-modelled-as-two-coupled-2d-domains)
- [D2. `maxHarvestableSeedWidthMm` is read as maximum _openable_ width](#d2-maxharvestableseedwidthmm-is-read-as-maximum-_openable_-width)
- [D3. Relocation candidate sites genuinely differ — a deliberate departure from [A]](#d3-relocation-candidate-sites-genuinely-differ--a-deliberate-departure-from-a)
- [D4. Colony death: a [C] queen mortality hazard](#d4-colony-death-a-c-queen-mortality-hazard)
- [D5. The top-heaviness contradiction, resolved by the primary source](#d5-the-top-heaviness-contradiction-resolved-by-the-primary-source)
- [D6. Building pheromone persistence was specified twice](#d6-building-pheromone-persistence-was-specified-twice)
- [D7. Tick duration is defined as one simulated minute](#d7-tick-duration-is-defined-as-one-simulated-minute)
- [D8. Missing demographic and seed parameters](#d8-missing-demographic-and-seed-parameters)
- [D9. A fixed 365-day calendar](#d9-a-fixed-365-day-calendar)
- [D10. Primary sources added, and sections 2 and 3 rewritten from them](#d10-primary-sources-added-and-sections-2-and-3-rewritten-from-them)
- [D11. A vertical slice needs an out-of-plane thickness](#d11-a-vertical-slice-needs-an-out-of-plane-thickness)
- [D12. Excavation rate: the papers give two, and only one is a per-ant rate](#d12-excavation-rate-the-papers-give-two-and-only-one-is-a-per-ant-rate)
- [D13. The figures disagree with the text, twice](#d13-the-figures-disagree-with-the-text-twice)
- [D14. The collision rule runs the other way round](#d14-the-collision-rule-runs-the-other-way-round)
- [D15. Fat is the mechanism, not a second rule beside the schedule](#d15-fat-is-the-mechanism-not-a-second-rule-beside-the-schedule)
- [D16. Session boundary, 2026-09-06](#d16-session-boundary-2026-09-06)
- [D17. A grid cell is smaller than an ant, and that broke the crowding rule](#d17-a-grid-cell-is-smaller-than-an-ant-and-that-broke-the-crowding-rule)
- [D18. Foraging onset follows temperature, not the calendar](#d18-foraging-onset-follows-temperature-not-the-calendar)
- [D19. The simulation spent half its time on empty sand](#d19-the-simulation-spent-half-its-time-on-empty-sand)
- [D20. The inside of the nest: two places for the brood, and a fiction for everyone else](#d20-the-inside-of-the-nest-two-places-for-the-brood-and-a-fiction-for-everyone-else)
- [D21. The papers, read to the end, and what they corrected](#d21-the-papers-read-to-the-end-and-what-they-corrected)
- [D22. A seed germinates a hundred times more slowly in a chamber than on damp plaster](#d22-a-seed-germinates-a-hundred-times-more-slowly-in-a-chamber-than-on-damp-plaster)
- [D23. Session boundary, 2026-09-10](#d23-session-boundary-2026-09-10)
- [D24. The food account starves the colony, and the proxy had been hiding why](#d24-the-food-account-starves-the-colony-and-the-proxy-had-been-hiding-why)
- [D25. The soil model, fitted to the soil the ants actually live in](#d25-the-soil-model-fitted-to-the-soil-the-ants-actually-live-in)
- [D26. Everything in the nest at its real size](#d26-everything-in-the-nest-at-its-real-size)
- [D27. The founding queen digs her own nest, and the slice is drawn like an ant farm](#d27-the-founding-queen-digs-her-own-nest-and-the-slice-is-drawn-like-an-ant-farm)
- [D28. An ant digs less the more she has dug, and most diggers dig where they rest](#d28-an-ant-digs-less-the-more-she-has-dug-and-most-diggers-dig-where-they-rest)
- [D29. Foragers keep to their own schedule, and the autumn cohort forages from March to mid-July](#d29-foragers-keep-to-their-own-schedule-and-the-autumn-cohort-forages-from-march-to-mid-july)
- [D30. The foraging range stays at 25 m, because distance is not what starves the colony](#d30-the-foraging-range-stays-at-25-m-because-distance-is-not-what-starves-the-colony)
- [D31. The queen lays fewer eggs, and the seed on the ground now sets the ceiling](#d31-the-queen-lays-fewer-eggs-and-the-seed-on-the-ground-now-sets-the-ceiling)
- [D32. Foragers are as many as measured, but their peak comes two months late](#d32-foragers-are-as-many-as-measured-but-their-peak-comes-two-months-late)
- [D33. Weather from day to day, and what rain and sun do to foraging](#d33-weather-from-day-to-day-and-what-rain-and-sun-do-to-foraging)
- [D34. Winged queens and males leave on a flight after heavy rain](#d34-winged-queens-and-males-leave-on-a-flight-after-heavy-rain)
- [D35. Colonies move their nest, and the new nest is taken to be a copy](#d35-colonies-move-their-nest-and-the-new-nest-is-taken-to-be-a-copy)
- [D36. A colony that moves digs its new nest](#d36-a-colony-that-moves-digs-its-new-nest)
- [D37. The dead are carried out](#d37-the-dead-are-carried-out)
- [D38. The overwintered cohort comes due together, and foraging peaks in June](#d38-the-overwintered-cohort-comes-due-together-and-foraging-peaks-in-june)
- [D39. Colony size: the model's main limit, and why it is left there](#d39-colony-size-the-models-main-limit-and-why-it-is-left-there)
- [D40. Overwintered foragers live longer at it than summer ones](#d40-overwintered-foragers-live-longer-at-it-than-summer-ones)
- [D41. A forager with nowhere to go takes the strongest trail](#d41-a-forager-with-nowhere-to-go-takes-the-strongest-trail)
- [D42. Drought years](#d42-drought-years)
- [D43. Colony size: the seed on the ground is fitted after all](#d43-colony-size-the-seed-on-the-ground-is-fitted-after-all)
- [D44. The overwintered cohort's foraging dates peak on 1 May](#d44-the-overwintered-cohorts-foraging-dates-peak-on-1-may)
- [D45. The store and the brood are carried to the new nest](#d45-the-store-and-the-brood-are-carried-to-the-new-nest)
- [D46. Alarm on the foraging ground](#d46-alarm-on-the-foraging-ground)
- [D47. The overwintered cohort's foraging dates peak on 1 April](#d47-the-overwintered-cohorts-foraging-dates-peak-on-1-april)

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

---

## D11. A vertical slice needs an out-of-plane thickness

A slice has two dimensions, but excavation rates are volumes — cubic centimetres of sand per
worker-day — and chamber areas are areas. Neither can be used at all without saying what
volume a slice cell stands for.

**Resolution.** `discretisation.sliceThicknessCm`, tagged **[C]**, set to the shaft bore of
0.9 cm. A shaft cell is then about the right volume. A chamber cell is understated, because
chambers are wider out of the plane than in it — a 220 cm² chamber is roughly 17 cm across
in both directions, not 17 by 0.9. Chamber areas reported by the model are therefore low,
and `VALIDATION.md` says so rather than scaling them up with a second invented factor.

---

## D12. Excavation rate: the papers give two, and only one is a per-ant rate

Tschinkel 2004 reports 0.45 cm² of chamber and 0.13 cm of shaft per old worker-day. Those
are averages over every penned worker across four to seven days, and the same paper reports
that only 82 percent of old workers and 19 percent of young ones ever came to the surface
carrying sand — so the average already includes the workers who were not digging at that
moment.

Applying it as the rate for an ant *standing at a face* counts that dilution twice. It did:
the model sat at 21 cm after forty simulated days, against a species that builds three
metres, and no amount of tuning the invented parameters moved it, because the error was in
how an **[A]** number was being used rather than in a **[C]** value.

**Resolution.** The rate for an ant at a face is the physical one, also from Tschinkel 2004:
a worker moves 300 to 400 times its own weight in sand per day while excavating. With a
worker mass, the bulk density of sand and the slice thickness from D11, that is a number of
cells per tick. The colony-average figures stay as the check on the outcome, in G1.

Worker dry mass is not yet a measured value here — `colony.minorWorkerDryMassMg` is a **[C]**
estimate of 1.7 mg. Tschinkel 1998 weighed workers individually and should replace it when
that paper is read at depth, at step 5.

---

## D13. The figures disagree with the text, twice

Reading Tschinkel 2004's figures rather than only its prose produced two corrections, both
now in the parameter file with the text's version kept alongside:

- **Vertical chamber spacing.** The body says 2–4 cm near the surface rising to 20–30 cm
  deeper. Figure 10 shows the maximum at about 12 cm, in the 7th or 8th decile, decreasing
  again in the 10th; only one outlying class-2 nest approaches 20. `verticalSpacingByDecileCm`
  is read from the figure and supersedes `verticalSpacingDeepCm`.
- **Chamber area with depth.** Figure 9B gives about 220 cm² in the uppermost deciles of a
  large nest against about 35 cm² at the bottom, which is where the 5–6 fold ratio in the
  text comes from and which fixes chamber *widths*: roughly 17 cm across near the surface
  and 7 cm deep, or a width ratio of about 2.4.

---

## D14. The collision rule runs the other way round

Avinery et al. 2023 find that an ant's own rate of collision with nestmates *drives* its
digging: a crowded nest gets enlarged, a roomy one does not. The first implementation had
it backwards, with crowding suppressing digging, and the consequence was not subtle — six
nanitics excavated a two-metre nest in their first year, because nothing in the model ever
told them they already had room.

**Resolution.** Digging effort now rises with collision rate and saturates
(`agitation / (agitation + collisionSaturationCount)`), with a small baseline so a solitary
ant is not frozen. This is also, incidentally, the mechanism by which total chamber area
tracks worker number without any ant knowing how many workers there are.

A claustral queen is a separate case and is handled separately: she has no nestmates to
collide with, so the collision rule correctly says she has little reason to dig, and yet
she sinks a shaft to 29–37 cm on her own. That is a documented behaviour rather than
something crowding produces, so founding excavation is its own rule and ends when the nest
reaches the depth the species digs to.

---

## D15. Fat is the mechanism, not a second rule beside the schedule

Tschinkel 1998 is unambiguous that a worker becomes a forager when its fat drops below
about ten percent. Kwapich & Tschinkel 2013 are unambiguous that summer-born workers forage
at 43 days and autumn-born ones at 210 to 360. Implemented as two independent rules, the
first wins: a flat fat-burn rate put every worker past the threshold in 45 days regardless
of when it eclosed, the autumn cohort foraged into the winter, and no colony survived its
first year.

**Resolution.** The rate at which fat falls is derived from the age the individual is due
to forage at, so the two are one rule. What is published — the threshold, and the two
schedules — is honoured exactly; what is not published — how fast fat falls — is what
carries the difference between the cohorts. Autumn fat gain of about 24 percent is layered
on top, which is what carries that cohort through to spring.

---

## D16. Session boundary, 2026-09-06

Steps 3, 4 and 5 are committed. Where things stand:

- **Step 3 (soil) complete.** Temperature, moisture and stress, all tested.
- **Step 4 (excavation) substantially met**, 8 of 13 gate criteria, including chamber height,
  depth and top-heaviness. Five remain, each a skipped test carrying its measured value.
- **Step 5 (demography) working end to end.** A single queen founds, raises nanitics from her
  own reserves, and the colony reaches sexual maturity in year 5 and about 4800 workers by
  year 7, against a reported 4–5 years and a mean mature size of 4300.

Known gaps to pick up next:

1. **Peak foraging is 14–15 % against a measured 33–42 %.** The one-way progression and the
   two birth cohorts are right; the standing stock of foragers is too low. Suspect the
   inside-worker fat schedule, which keeps autumn-born workers inside for 210–360 days while
   the summer cohort is short-lived.
2. **A founding colony digs too deep**: about 170 cm in its first year against an incipient
   29–37 cm. The queen's own founding rule is correct and bounded; it is the nanitics that
   over-dig, because seven ants in a seventeen-cell nest read as crowded.
3. **Excavation build time** remains an order of magnitude slow at colony scale (G1).
4. **The simulation still runs on the main thread**, which is why the browser shell is capped
   at 600 workers. It belongs in a Worker (step 10).
5. **Four papers are indexed but not yet read at depth.** Worker dry mass in particular is a
   [C] estimate that Tschinkel 1998 can replace with a measured value.

---

## D17. A grid cell is smaller than an ant, and that broke the crowding rule

Digging effort is regulated by an ant's own rate of collision with nestmates. The first
implementation counted how many ants shared its grid cell — but a cell is 5 mm across and a
minor worker is 6.35 mm long, so two ants in *adjacent* cells are already touching. Cell
co-occupancy is therefore not a collision rate; it is an artefact of the discretisation, and
it reports every narrow shaft as permanently packed.

**Resolution.** Crowding is ants per unit of open space over a neighbourhood a few
centimetres across (`excavation.crowdingRadiusCm`), maintained cheaply as a block grid with
the void count updated incrementally as cells are dug.

The effect was larger than expected. Whole-nest build time went from about seventy simulated
days to six, which is the 3-to-6 days the species is reported to manage, and chamber spacing
began to widen with depth the way Figure 10 shows. Two gate criteria fell out of one fix to
a unit-scale mistake.

---

## D18. Foraging onset follows temperature, not the calendar

Workers were taking up foraging the moment their 210-to-360-day schedule expired, which for
the autumn cohort is midwinter. The model produced a January foraging peak in a species that
does not forage in January.

Gating on the month fixed the winter but created a new artefact: the entire overwintered
cohort was released on 1 March, giving a spike and then an April trough, where the real
pattern climbs steadily from March to a midsummer maximum.

**Resolution.** Onset probability follows soil temperature at forager depth. This is what the
data suggest anyway — foraging began within five days of 1 March in three of the four study
years and a full month later in the fourth — and it spreads the backlog across the spring.

Peak proportion foraging is now about 26 % against a measured 33-41 %. The seasonal *shape*
is right: zero in winter, a temperature-driven rise through spring, a midsummer maximum, and
an autumn decline driven by the colony growing while forager number falls. The remaining
shortfall in height is not yet explained and the trace it was measured on used an artificial
age structure, so it should be re-measured on a naturally grown colony.

---

## D19. The simulation spent half its time on empty sand

A profile of a colony in its first year — eleven nanitics in a burrow of about a thousand
cells — found that more than half of all running time was the pheromone decay-and-diffuse
sweep, and a further third was the arching calculation. Neither cost had anything to do with
how many ants there were.

The sweep ran over the whole grid: 400 by 640 cells, of which the nest occupied a
four-hundredth. The arching calculation recomputed, per digging ant per tick, which of its
neighbours lay inside a 3 cm radius and which lay in the cone above it — the same geometric
question, with a square root per neighbour, answered identically every time.

**Resolution.** Two changes, both rearrangements rather than changes of model.

The nest grid tracks the rectangle it has ever excavated. Every pheromone deposit in the
model happens at a cell an ant is standing in, and an ant underground stands in a void, so
that rectangle contains every cell that can hold signal. The sweep runs over it grown by
`discretisation.pheromoneHaloCells`, and cells beyond the halo are held at zero. Diffusion
carries signal one cell per application against a per-application decay far below one, so
the concentration six cells outside anything ever dug is below what a float32 distinguishes
from zero. Edges reflect at the rectangle rather than at the grid, because the scratch
buffer is only refreshed inside it and reading beyond would read the previous sweep.

The arching stencil is precomputed once from the radius. The same cells are visited in the
same order and the arithmetic on them is unchanged.

**The state digest is byte-identical before and after, at every checkpoint**, which is the
claim the halo argument predicts and the reason no golden value or recorded measurement in
`VALIDATION.md` moved. A simulated first year fell from 42.8 s to 9.1 s and a third year
from 101.8 s to 56.3 s.

What is left scales with ant number, which is as it should be for an agent-based model: a
colony of 4300 workers on a one-minute timestep is about 2.3 billion agent-updates per
simulated year, and no amount of cache-tightening changes that. It is the reason the browser
runs one colony and a replicate study runs headless, sharded by seed.

## D20. The inside of the nest: two places for the brood, and a fiction for everyone else

**Date.** 2026-09-08.

Until this point the only ants that moved underground were the ones digging. Everyone else
was placed once, at eclosion, and never took another step. The nest was a photograph of a
cloud of dots, and the two best-measured facts about the inside of a *badius* nest — that
the colony is sorted by task from top to bottom, and that seeds travel downward in stages —
were not in the model at all. `systems/interior.ts` is where they are now. Three decisions
in it are worth recording.

**Brood is counted in one place and located in another.** `BroodStore` holds the
demography — how many eggs, larvae and pupae, how old, what each cohort will become — and
stays authoritative. `nest.brood` holds where that same brood is being kept, as a count per
cell. They are reconciled once a day: new brood appears wherever the queen is, and losses
are taken off the existing distribution in proportion, because nothing in the demographic
engine says which chamber a dead larva was in. The alternative — giving every egg an
identity and a position — buys nothing the picture or the science needs and costs a
per-individual store for the most numerous thing in the colony.

**Depth is handed to every ant, not just to diggers.** The stratification is [A] and the
mechanism producing it is invented. Excavation already had this problem and states it
(`excavation.depthCue`): the CO₂-gradient hypothesis was tested by venting the gradient away
and then by reversing it, and the architecture did not change. Nothing has replaced it. So
an ant that wants to be at 70 cm is told how deep it is, exactly as a digging ant is, and
the rule registry says so on the ant's own inspector line. If someone identifies the real
cue, this file changes and the measured distributions should not.

**An ant that digs will still carry a seed it comes across.** Tschinkel & Seal 2015 is
specific that the forager which brings a seed home does not take it deeper and that other
workers do. In this model four workers in five pass the persistent-digging test and belong
to the excavation system, and at any moment only about two in a hundred are in the top 20 cm
where the seeds are. Restricting the downward carry to the workers on the transfer task
would hand the job to a group that is almost never present to do it. So the prohibition is
enforced — a forager never takes its own seed deeper — and the permission is left open: any
worker that is not a forager will pick up a seed it finds above the store. That an excavator
carries seeds is not a documented behaviour and is not offered as one. What the store
actually looks like with this in place is measured in VALIDATION.md G5: the band fills, and
the top of the nest still holds more than it should.

It is a workaround for something else, and the something else is already on the record: the
excavation model puts far too much of the workforce at a dig face, which is the same defect
that gives a colony of sixty workers a three-metre nest. See VALIDATION.md G1. When that is
fixed, this permission should be narrowed back to the transfer task and the store should
still fill.

## D21. The papers, read to the end, and what they corrected

**Date.** 2026-09-10.

**The files are gone; the findings are not.** The five PDFs added in D10 had been committed
once, on 2026-09-06, and deleted from the tree a day later, which left them in the history.
Before the repository was first pushed, the history was rewritten so that no commit contains
one: every tree is otherwise byte-identical and the commit messages and dates are unchanged,
but the hashes of every commit from 5b6da8c onward changed. The local copies were then
deleted as well. The project cites its sources the way a paper does — findings written up in
its own words in `SCIENCE.md`, numbers in the parameter file, DOIs in
`docs/papers/README.md` — and has no need to hold the papers themselves.

Before the files went, the three that had not been read in full were read, and the
germination paper, which had not been on hand at all, was fetched from the publisher (it is
open access) and read cover to cover. Five corrections came out of it.

- **One of the five files was not the paper it was filed as.**
  `kwapich-tschinkel-seasonal-labour-allocation.pdf` was catalogued as Kwapich & Tschinkel
  2016, *Limited flexibility and unusual longevity*. It was a sixteen-page ProQuest preview
  of Kwapich's 2014 dissertation, from which that paper was later published. What it
  supplied — foragers confined to the top 12 cm, a 57 percent gain in forager longevity when
  range is restricted, neighbours causing about 30 percent of spring forager deaths — is now
  cited to the dissertation. The 2016 paper itself has still not been read, and
  `docs/papers/README.md` says so.
- **Burial depth does not drive germination.** `seeds.germinationDrivenBy` listed it. The
  burial experiment it came from found no significant effect of depth at 5, 15, 40 and 80
  cm, and the paper's own summary names species, temperature and elapsed time. Depth now
  acts only through the soil temperature at that depth.
- **The widest seed collected is measured.** `foraging.maxCollectableSeedWidthMm` was
  tagged **[C]** and described as tuned. The paper reports the largest stored seeds as almost
  4 mm across, which is the value it already had. The tag is now **[A]**, with the citation;
  the store's make-up comes from the measured mix of sizes foragers carry, not from this
  limit.
- **The foraging range is several times too large, and is left so for now.**
  `foraging.foragingRangeMetres` is 20 m, **[B]**, from *P. barbatus*. Harrison & Gentry
  measured *badius* ranges of 66 to 186 m² with trails averaging 3.4 m — a circle of 136 m²
  has a radius under 7 m, and a 20 m radius encloses nearly ten times that. Their population
  was unusually dense, one colony per 220 m² on an old field in South Carolina; at Kwapich's
  Florida sandhills site it was one per 670 m², which caps a tiled range at a radius of
  about 15 m. Either way 20 m is too large. It is not changed here because foraging is not
  this step and every foraging test is tuned against the current range; it is the next
  foraging correction, and `SCIENCE.md` §5 now says so where the value is described.
- **Relocation distance depends on the population.** Tschinkel 2014 gives a mean of about
  4 m in Florida; Harrison & Gentry measured 2.2 to 2.5 m in three separate years in their
  denser population. Both are now in `SCIENCE.md` §7, and the parameter keeps the Florida
  figure because the model is of the Florida site.

## D22. A seed germinates a hundred times more slowly in a chamber than on damp plaster

**Date.** 2026-09-10.

**The conflict.** Tschinkel & Kwapich 2016 measured germination for each seed size at four
temperatures, one month at a time, on damp plaster with no ants. Large seeds reached 62
percent at 15 °C. Taken as they stand, those rates have a mature store — half a kilogram,
most of it large seed — sprouting several grams of food a day, enough to raise a colony's
brood with no foraging at all. But colonies kept from foraging were observed to lose their
larvae within about a week with their stores untouched beneath them (Kwapich & Tschinkel
2013 and Smith 2007, as reported in the same paper). Both findings are **[A]**, and a model
using the laboratory rates directly reproduces the first and contradicts the second.

**The evidence that settles it.** The same paper measured germination inside natural
chambers. Nine seed chambers were split with a metal strip so that the ants could reach only
one side, and opened again after two to three weeks, between December and April. The side
the ants could not reach held a mean of 21 germinating seeds among about 4400: about half a
percent.

At the soil temperatures of those months, around 15 to 18 °C, and for a store made up the way
the 2014–15 stores were — by number roughly a third very large, half large and the rest
medium and small, converted from the weights in Figure 21 — the laboratory rates predict
that about a third of the seeds would germinate in seventeen days. The chamber count is
about a seventieth of that. `seeds.inNestGerminationFactor` is set to 0.015 so that the
model reproduces the chamber count, and is tagged **[C]**: it is calibrated against a
measurement, not measured.

**Why the factor might be wrong.** The authors note that germinating seeds are uncommon in
excavated stores and suggest that densely packed seeds may inhibit one another's
germination; if that is the cause, the factor stands. If instead germinating seeds rot or are
eaten by something else before a chamber is opened, the count understates germination and the
factor is too small. The paper cannot distinguish the two. The authors also estimate, from
the plaster rates, that large and medium seeds turn over at 50 to 80 percent a month in
spring and autumn, and say plainly that this has not been tested in a nest. The model does not
adopt that estimate, because the one measurement made in a nest contradicts it.

**What follows.** With the factor, a store of three hundred thousand seeds yields tens of
milligrams of germinating seed a day in a good month: enough for a few hundred larvae, not
for a mature colony's brood. A colony that stops foraging starves most of its larvae within
a week, as the real ones did, and large seeds accumulate over years, which is what makes a
store as big as the ones excavated. `test/seeds.spec.ts` holds the model to the first of
those.

**The food account this completes.** The forager-to-larva ratio that had stood in for
feeding since D8 is gone. Larvae now eat what the store yields each day — small and medium
seeds the workers open at the measured rates, and germinating seeds of any size — and a day
on which that falls short of their need kills a share of them. The need is built from what a
worker is made of: a minor's dry mass of 3.1 mg **[A]**, over a larval period of 22 days
**[B]**, at an efficiency of 0.4 **[C]**, about a third of a milligram of seed a larva a day.
`brood.starvationSeverityPerDay` was 0.08 against the old proxy and is now 0.48, which kills
99 percent of larvae given nothing within the week the literature reports.

## D23. Session boundary, 2026-09-10

`main` is on GitHub, with the paper PDFs removed from its history (D21), and the browser
build is live on GitHub Pages. Step 7, seeds and germination, is built on
`feat/seeds-germination` and **not yet committed**. Where it stands:

- **Built and passing.** Seed size classes, the measured forager load, opening rates and the
  majors effect, temperature-driven germination scaled to the chamber count (D22), the
  larval food account, and fourteen tests in `test/seeds.spec.ts`. Typecheck, lint and
  formatting are clean, and every fast spec passes.
- **Not yet run on this code.** `test/demography.spec.ts` and `test/nest-signature.spec.ts`,
  which take about twenty minutes together. The food account changes demography, so these
  have to pass before this is committed.
- **Recruitment gate now recorded as unmet.** On `main` a colony finds the same number of
  seeds with trail following as without (682 against 681). The test had been passing by one
  seed. See VALIDATION.md G4b.

Open, in the order to pick them up:

1. **Does the food account starve colony growth?** In a single-seed run of four years, a G5
   colony had 34 workers in its fourth August and had starved 1160 larvae against 84
   eclosed, with only 2 of its workers foraging. That looks like the low forager share of
   D16 and D18 now costing real food rather than a proxy, but it has not been compared with
   `main` on the same seeds. A replicate study was started to do that — seeds 2 to 7, four
   years, on `main`, on this branch, and on this branch with the calibrated soil below. It
   was stopped at the end of the session with ten of its eighteen runs finished: this branch
   on seeds 2 to 5, the calibrated variant on seeds 2 to 5, and `main` on seeds 2 and 3 only.
   Those are kept in `out/g5-study-2026-09-10/`, which is not committed, with the calibrated
   parameter file beside them. `main` on seeds 4 to 7 is what the comparison still lacks.
2. **The soil thermal model disagrees with the measured soil temperatures.** Against the
   monthly means at 5, 15, 40 and 80 cm in Figure 13 of Tschinkel & Kwapich 2016, the model
   is off by 2.6 °C RMS, four degrees too warm in February, and shows depth differences the
   measurements do not. A thermal lag of 10 days per metre instead of 30, with a surface
   offset of 0.5 °C instead of 2.5, brings that to 1.7 °C and moves the large-seed
   germination peaks to December and March–April, nearer the measured April and December.
   But it cools early spring enough that foraging would not start until April, unless the
   **[B]** onset threshold of 15 °C falls to about 13 °C — which the measured soil
   temperatures around 1 March support. `test/soil.spec.ts` asserts the old lag and would
   need rewriting against the measurements. Not decided.
3. `VALIDATION.md` G5 and the README status still describe the store as unbuilt.
4. The foraging range is several times too large for this species (D21). The likely reason
   recruitment does nothing, untested. (Tested in D30: a smaller range lowers income, so it is left.)

## D24. The food account starves the colony, and the proxy had been hiding why

**Date.** 2026-09-11.

**What was run.** The replicate study D23 left unfinished, completed: four years a seed, on
`main` at `cb71b26` with its own parameter file, and on this branch. Workers at the end of
the fourth year:

| Seed | `main` (forager-to-larva proxy) | This branch (food account) | This branch, soil lag 10 d/m |
|---|---|---|---|
| 2 | 1349 | 84 | 37 |
| 3 | 1133 | 59 | 56 |
| 4 | 1736 | 61 | 95 |
| 5 | 508 | 49 | 51 |
| 6 | 1117 | — | — |
| 7 | 804, queen dead, peak 1676 | — | — |

So on every seed the food account cuts a fourth-year colony by a factor of ten to twenty-eight,
and the soil variant makes no consistent difference. The slow demography and nest-signature
specs pass on this code, but they would not have caught it: the one test that follows a
colony to maturity is skipped for its running time.

**Why it is not a defect in the food account.** A minor worker costs about 7.75 mg of seed
(3.1 mg dry mass at an efficiency of 0.4, D22). `main`'s colonies eclosed 925 to 3683
workers by their fourth year, which is 7 to 29 g of seed, and the proxy fed every one of
them from nothing. On this branch the larvae ate 1.9 to 5.7 g over the same four years —
enough for 250 to 730 workers — and that is nearly all the openable seed the foragers
delivered; germinating seed was 3 to 5 percent of it. The colony is not wasting its food.
It is not being brought enough.

**The likely cause, untested.** Two deficits already on record: too few workers forage
(D16, D18), and they search a range several times too large for this species (D21). Under the
proxy both were cosmetic. Now they cost the brood.

**What was decided at the time.** G5 was committed on `feat/seeds-germination` and initially
held back from `main`, because `main` is what the public build deploys. On 2026-09-15 it was
merged into `main` with the redesigned simulator UI, with the failed growth gate still stated
plainly in the README, the simulator and this validation record. The fix is not to keep the
proxy beside the food account, or to let a starving colony draw on its store faster: colonies
whose foragers were removed lost their larvae with full stores beneath them **[A]**, and a model
that rescued them would contradict the measurement G5 was built to reproduce. The forager share
and the foraging range are the next step.

## D25. The soil model, fitted to the soil the ants actually live in

**Date.** 2026-09-11.

**The measurement.** Tschinkel & Kwapich 2016 give the mean soil temperature over each
month of their burial experiment: 11.5 °C in February 2015, about 18 early in April and 21.8
by its end, 26.8 in June, 28 in August, 22.8 in October, 17.9 in December and 13.1 the next
February, with the means at 5, 15, 40 and 80 cm differing by at most about 2 °C. **[A]**

**The model against it.** A sinusoid driven by the thirty-year air normals, damped and lagged
with depth, with a lag of 30 days per metre **[B]** and a surface running 2.5 °C above air
temperature **[C]**. Against the burial means at all four depths it is off by 2.6 °C RMS,
six degrees too warm at 80 cm in February, and it spreads the depths by 3.5 °C where the
measurements barely separate them.

**The choice.** The candidate recorded in D23, 10 days per metre with a 0.5 °C offset, scores
best at 1.6 °C, but a damping depth of 5.8 m needs a thermal diffusivity of about
3 × 10⁻⁶ m²/s, several times what any soil conducts. It fits by being wrong about the
physics. The fit is shallow: **20 days per metre with a 1.0 °C offset** scores 1.8 °C, with a
damping depth of 2.9 m and a diffusivity of about 8 × 10⁻⁷ m²/s, which damp sand can reach.
That is adopted, and the lag is retagged **[C]**: it is now fitted to an [A] measurement, not
measured, the same standing as the germination factor of D22.

**What remains wrong.** The model runs up to 3.5 °C cold in late April and up to 2 °C cold in
December, and up to 3.6 °C warm in February at 80 cm. The measurements are one year and the
model is a climatology, and a sinusoid cannot take the shape of that one year; this is about
the floor for a model of this form.

**What it moved.** A cooler early spring puts the soil at forager depth at about 14 °C on
1 March, as the measurements do. The **[B]** foraging onset threshold falls from 15 to 14 °C,
so that foraging can still begin in early March, as it did in three of the four study years,
and not in February. `test/soil.spec.ts` now asserts the burial measurements instead of the
old lag.
## D26. Everything in the nest at its real size

**Date.** 2026-09-11.

This branch's log stops at D20 and the seeds branch has reached D25, so this entry is numbered
D26 and the two logs can be merged without renumbering either.

The ants were already drawn at their real body length, but three things about the picture
were wrong. Every ant stood on the centre of its 5 mm grid cell, so ants sharing a cell were
drawn exactly on top of one another and a busy shaft looked solid. The camera followed the
queen's position in the model, which moves half a centimetre at a time, so the whole view
jumped every time she took a step. And nothing about a queen, a major or an egg said how big
any of them was: the queen was simply drawn 1.4 times the size of a major, and brood were
tokens of no particular size.

**Sizes come from the species file.** Worker lengths and head widths were already there. Queen
and male head widths are now read from Table 1 of Smith & Tschinkel 2006. Queen length comes
from an extension sheet that names no source, and its note says so. Nobody has measured
*badius* brood in any source found, so the egg borrows its volume from *P. rugosus* and
invents its shape, and the larva and pupa lengths are invented fractions of a worker's
length. All six new parameters are read only by the renderer, and each carries its tag.

**Where an ant stands in its cell is a drawing decision, and is labelled as one.** Ants that
share a cell are spread across it. In a shaft, ants climbing keep to one side and ants
descending to the other, so two workers in a tunnel under a centimetre wide can be seen
passing. In a chamber they spread along the floor. No offset ever puts an ant in sand. The
model is untouched, so headless runs and their digests are the same as before.

**The camera follows the queen as she is drawn, and eases after her.** The drawn position
glides, so the camera glides with it.

**Two pheromones are drawn, and the key names all four.** SCIENCE.md section 8 lists four
chemical channels, but only the building pheromone in the nest and the recruitment trail on
the ground have grids. Both are now drawn in their own colours and can be switched off. Alarm
and the dead-nestmate cue have parameters that nothing reads. The key lists them as not
simulated yet, and section 8 no longer describes them under "rule as implemented" without
saying so.

**The ground is drawn above the nest, and the map of the range becomes an inset.** There used
to be two pictures side by side, the slice and the ground from above, and nothing connected a
forager leaving the entrance in one to the seed arriving in a chamber in the other. Now the
slice carries the ground on top of it, seen side on. The ants and seeds shown there are the
model's, limited to a metre either side of the plane of the slice, because the ground is a
plan and anything drawn from further out would put a distant forager at the entrance. The
bare disc of sand, the charcoal on it and the grass round it are drawn and not modelled: the
disc's diameter comes from an extension sheet and is used nowhere else. When the camera is too
deep to see the surface, a band across the top shows it at a smaller scale and prints how much
ground it covers. The whole range from above stays available as an inset in the corner.

**The burrows are drawn to the cell, with softened corners.** Tunnels used to be stacks of
hard squares with a lighter top edge and a darker floor. They are now filled cell by cell at
exactly the width the model dug, with only the outside corners rounded, by under two
millimetres, and a small bridge where two cells meet only at a corner. A smoothed outline was
tried first and rejected: it trimmed the end cell off every dead-end tunnel, so an ant digging
at a face was drawn inside solid sand. The cavity darkens towards its walls and has a thin lit
rim, the sand has a grain texture, and it is tinted darker where the soil model's moisture is
higher. The moisture is the model's; the rest is appearance. (Superseded by D27: the burrows
are now traced as one smooth outline, and the ants are drawn from the side.)

---

## D27. The founding queen digs her own nest, and the slice is drawn like an ant farm

**Date.** 2026-09-11.

**The founding queen never dug her founding nest.** VALIDATION.md recorded a founding nest a
tenth of its proper size. Measured again while building a view of the founding for the
"Watch a colony" door, over seeds 1 to 3 she dug 0.3 to 0.8 cm in the 55 days before her
first daughters eclosed, and the 29 to 37 cm incipient depth was reached only on day 80 to 150,
by workers. There were two causes. The interior system's queen branch walked her back to her
brood on every pass, although its comment said excavation owned her while she founded, and
she had laid her eggs at the entrance, so that is where she stayed. And excavation gave her a
minor worker's rate of work, cut to a young worker's third because her age starts at zero. No
rate of work would have been enough on its own: an ant in this model walks a cell a minute,
and a queen alone carries every pellet up the shaft herself.

**What real queens do.** Enzmann & Nonacs (2010, *Insectes Sociaux* 57: 115–123, Table 1)
watched fully claustral *P. rugosus* foundresses dig in sand-filled frames at 30 °C. After one
day of digging they were 9.32 cm down, after two 14.32 and after three 16.26, digging 5.25 cm
a day between the second and third, for 7.13 days in all. Their stopping depth of 17.11 cm is
not used, because the frames held only 17.75 to 19 cm of soil. No such series is published for
*badius*, whose incipient depth of 29 to 37 cm stays **[A]** from Tschinkel 2004. Queens of
another harvester ant, *Messor semirufus*, were seen to start digging between a few minutes and
about two hours after landing (Motro et al. 2016).

**Resolution.** The interior system leaves a founding queen alone. Excavation gives her her
own rule, `excavation.foundingQueen`, tagged **[B]**. Her depth follows the measured series and
then the last measured rate until this colony's incipient depth. She then opens one chamber
from the cell that finished her shaft, 1 cm high **[A]** and 3 cm wide in the slice **[C]**,
and stays in it. Her clock runs only while the sand under her can be dug, so a rained-out
landing day costs her a day. The sand she digs while founding is counted onto the surface
without her walking it up. That is an abstraction, it is **[C]**, and the rule she is shown
following says so; it exists only because the walking pace would otherwise decide her depth.

Seeds 1, 2 and 3 now reach 29.8, 30.3 and 35.3 cm on days 6.5, 8.6 and 6.5, and dig nothing
more before their first daughters eclose. The chamber was first anchored at whatever was the
deepest dug cell, which slid sideways with every cell she opened, and one queen dug 286 cells
before it stopped; it is now fixed where the shaft finished. Every colony run changes from its
first day. The digest pinned in `determinism.spec.ts` does not, because that run has no colony
in it.

**Not addressed here.** A queen does not plug her entrance, which most *rugosus* queens did. Once
the nanitics work, the over-digging recorded in VALIDATION.md ("nothing stops the digging")
is untouched and has not been re-measured.

**The burrows are traced as one smooth outline.** D26 drew them cell by cell and rejected a
smoothed outline because it cut the last cell off every dead-end tunnel. The outline is now
traced through a field of soft bumps, one per dug cell, reaching 1.3 cells, drawn where their
sum crosses 0.65 (render/cavity.ts). Checked numerically before use: a straight wall lands 0.52
cells from its last cell's centre where the cell ends at 0.5, a dead end and a lone cell reach
0.48 cells past their centre, and two cells touching only at a corner stay joined. What changes
is that corners are rounded. The outline is traced a 32 by 32 cell patch at a time and kept
until a patch's count of dug cells changes, which is safe because this model never puts sand
back.

**The ants are drawn from the side.** A slice is seen side on, but ants were drawn as seen from
above, so half of every ant's legs lay across the sand of the floor, the wall or the ground.
Each ant is now drawn in profile, standing on the floor of a chamber within a centimetre below
her, or holding on to a shaft wall when she is heading up or down. Which wall follows which way
up she already was, so ants climbing and ants descending a shaft settle on opposite walls and
pass. Seeds and brood lie on chamber floors. The map of the foraging range, a plan, keeps the
view from above. All of this is drawing: no system reads it, and headless runs are unaffected by
it.

---

## D28. An ant digs less the more she has dug, and most diggers dig where they rest

**Date.** 2026-09-12.

**The problem.** VALIDATION.md has recorded since the excavation step that nothing stops the
digging: the model dug to the floor of the grid whatever the colony size. With the founding
queen fixed (D27), colonies of 7 to 22 workers still reached 2.2 to 2.7 m by day 270 of their
first year, against Tschinkel's own law, `log(depth) = 0.95 + 0.37 log(workers)`, which
predicts 21 to 28 cm for that many ants.

**Why.** Traced by probing a colony day by day. Nanitics eclose at day 55 and reach 43 days old
at about day 98, at which point participation jumps from 19 percent to 82 percent, which is
[A] from the penning experiments. All of them then walk to the tip of the single shaft, because
an unburdened digger is pulled downward and toward faces. In a shaft one cell wide the local
crowding reads 1 to 3 ants per open cell against a half-saturation of 0.30, so every one of them
digs flat out, and deepening the shaft never lowers the reading. The one signal for "we have
enough room" was being taken in the one place that is always busy.

**What the literature offers.** Rasse & Deneubourg (2001) found nest volume tracking population
in *Lasius niger*, with the brake coming from the nest's volume together with a change in the
ants themselves after digging. Buhl et al. (2005) reproduced volume proportional to colony size
in *Messor sancta* from recruitment and ant density alone, with no explicit negative feedback,
and Halley et al. (2005) described Argentine ant nests growing the same way, digging subsiding
as the density of digging stimuli declined. Rajendran et al. (2025) found *Camponotus fellah*
workers differing in how they dig by age: young ants dug slanted tunnels, old ones straight down.

**Resolution: two local rules.** Each ant carries the sand she has dug herself (`dugCells`
in the ant store), and her willingness to dig falls as exp of minus that volume over
`diggingFatigueSandCm3`. That ties the volume a colony digs to how many ants it has. And a
digger with a resting place, which the interior system gives every worker, digs the wall beside
her instead of walking to the deepest face; only `descenderShare` of diggers, drawn from
each ant's id and fixed for life, still go down. Both values are **[C]**, invented and fitted to
the depth law, and the parameter file says so in full. No ant reads the nest's size, its volume
or its population.

**What it gives.** Four colonies over three years, depth against the law: 0.98, 1.00, 1.08 and
1.12 at day 1080 (244 to 331 workers). One colony over five years: 0.98 at 1263 workers, 1.27 at
3618, and 1.70 at 2426 in the fifth year, when the colony had shrunk but its nest had not. The
first year sits at the queen's founding depth, which is the measured incipient depth. Against no
budget at all: 2.2 to 2.7 m in year one.

**What it cost.** The pinned digest moved, because the ant store gained an array; it is
regenerated in determinism.spec.ts with that reason. Deep chamber spacing in the gate harness
fell to 7.8 cm against a target above 8.75, and that criterion is now skipped with its measured
value. The harness cannot exercise the resting rule at all: it has no interior system, so its
synthetic workers have no resting place and all of them behave as descenders. Evidence for the
rule therefore comes from colony runs, which is where it is measured above.

**Not addressed.** Colonies do not relocate, so a nest never shrinks when its colony does, which
is what makes the fifth year run deep. A colony-level regulator would close the remaining gap in
an afternoon and would contradict the premise this project exists to demonstrate, so it stays
out.

## D29. Foragers keep to their own schedule, and the autumn cohort forages from March to mid-July

**Date.** 2026-09-16.

**The problem.** With the food account (D24), spring brood starved because no one brought seed
home in spring. Three faults in the schedule that turns a worker into a forager caused it. May
callows were put on the overwintering schedule, so a growing colony's first workers of the year
stayed inside until the next spring. Autumn fattening topped up every worker, which froze the
summer cohort in September and a founding colony's first workers for the whole first year. And
the fat each worker burns was set against its whole age, so the autumn fattening was counted
twice and the autumn cohort did not forage before mid-June, against a paper that has it
foraging from March.

**Resolution.** The year's own workers are everything that ecloses in the foraging season
before the autumn fattening begins. Autumn fattening applies only to a worker that will not
come due before the season ends. The burn is spread over the days after the callow stage and
catches up to each worker's due date. Spring foraging returns.

**What that broke.** The winter test in demography.spec.ts failed: 22 percent of workers
foraging in December to February, against a limit of 5. The slowest of the autumn cohort came
due in October or November, took up foraging while the soil was still warm and were still
foraging in December.

**The choice.** Kwapich & Tschinkel 2013 and Kwapich 2014 have slow developers dominating the
foragers from March to mid-July **[A]**. The model now holds them to that window. An
autumn-born worker's 210 to 360 days are drawn so that they end by 15 July
(`labour.autumnBornLastOnsetDayOfYear`). A worker on that schedule still inside after that day
waits for the next spring. Reading the end of the window as a hard last day is ours **[B]**.
The other option was to change the test's made-up age structure, which would have hidden a
behaviour real colonies do not show.

One other test moved. "Gives summer-born and autumn-born workers very different schedules"
counted workers on day 420 of a colony started on 15 June, which is mid-August. By then the
autumn cohort has foraged and died, as the paper describes, so none were left to count. The
test now counts on day 360, early June, when both cohorts are alive.

**Not yet measured.** The growth study has not been rerun with this change. Before the window
was added, one seed reached 201 workers by November of year two and then collapsed from 153 to
37 in the summer of year three, when about 67 foragers brought home about 19 mg of seed a day
against about 29 mg of larval demand. The foraging range (D21) is still the next step.

## D30. The foraging range stays at 25 m, because distance is not what starves the colony

**Date.** 2026-09-16.

**The question.** D21 found the modelled range several times larger than any measured *badius*
range, and D24 named it as one reason foragers bring home too little. A smaller range should
mean shorter walks and more seed per trip.

**The test.** Three colonies (seeds 2 to 4) over four years, after D29, on three sizes of
ground. The modelled ground is `discretisation.surfaceExtentM` either side of the nest.
`foraging.foragingRangeMetres` was set to match, and the number of seed patches was scaled
with area, so that seed lay as densely on the ground in every run.

| Half-width | Patches | Workers in year 4 | Seeds collected over 4 years | Mean trip, ticks |
|---|---|---|---|---|
| 25 m (unchanged) | 45 | 111 to 150 | 23 543 to 25 343 | 87 |
| 15 m, the Florida density cap | 16 | 49 to 67 | 8 825 to 9 949 | 85 |
| 11 m | 9 | 21 to 47 | 4 881 to 5 608 | 84 |

**What it shows.** Trips last as long on the smallest ground as on the largest, because a trip
is spent searching and not walking, which is what Beverly et al. describe. Seed collected
tracks the number of patches almost exactly. So in this model the colony's income is capped by
how much seed lies on the ground, not by how far foragers walk. D21's reasoning does not hold
here. The standing crop (`standingSeedsPerSquareMetre`, `seedPatchCount`,
`seedReplenishmentPerDay`) is invented **[C]**, and no seed density has been published for these
sandhills.

**What was decided.** The range is left at 25 m. Shrinking it to the measured size while keeping
the invented seed density cuts colony growth by half or more. Shrinking it and raising the
seed density to compensate would mean tuning an invented number until colonies grow, which
would make growth a fitted result rather than an outcome. With D29 and this range, colonies no
longer collapse in their third year. They still grow more slowly than real colonies, which pass
a thousand workers by their fifth year, and the growth gate in `VALIDATION.md` still fails.

**Next, if the work continues.** A measured seed density or seed rain for Florida sandhills
would settle this. Without one, the range should stay a known mismatch rather than become a
tuning knob.

## D31. The queen lays fewer eggs, and the seed on the ground now sets the ceiling

**Date.** 2026-09-16.

**The problem.** After D29 and D30, colonies reached 111 to 150 workers in their fourth year,
and about seven larvae starved for every worker the colony raised. Kwapich & Tschinkel (2013)
counted 1.64 foragers per larva (SD 0.99) from May to October in 48 colonies, whatever the date
and the adult population. The model held 0.07 to 0.34, traced month by month on seed 2. Each
forager brought home 1 to 5 mg of seed a day, several times the 0.21 mg that 1.64 foragers per
larva would need from each. So the colony was not short of food per forager. It laid far more
eggs than its foragers could feed.

**Why.** `brood.queenEggsPerWorkerPerDay` is invented, since no laying rate is published for this
species. Its value of 0.09 was tuned under the forager-to-larva proxy, which fed any number of
larvae.

**What was tried.** Seeds 2 to 4, up to five years each.

| Laying | Workers, year 4 | Workers, year 5 | Larvae starved per worker raised |
|---|---|---|---|
| 0.09 a day per worker (former) | 111 to 150 | not run | 7.0 to 7.4 by year 4 |
| 0.028 a day per forager | all colonies near extinction by year 3 | – | – |
| 0.017 a day per worker | 0 to 18; one colony dead | – | – |
| **0.035 a day per worker** | **272 to 315** | **252 to 296** | **1.9 to 2.0 by year 5** |
| 0.05 a day per worker | 219 to 267 | 185 to 235 | 3.1 to 3.3 by year 5 |

The measured ratio gives 0.017: 60 percent of an immature colony foraging, 1.64 foragers per
larva and a 22-day larva. Every colony died at that rate. Laying in proportion to foragers,
which is the ratio as measured, failed in the same way. Both fail for a reason already on
record: this model has fewer foragers than real colonies (D16, D18), so a laying rate true to
the ratio cannot replace the workers who die.

**What was decided.** 0.035, tagged **[C]** and described in the parameter file as tuned. It
roughly doubles the workforce and cuts larval starvation by more than two thirds.

**What the science says about size, and where the model stands.** Colonies reach sexual
maturity at about 700 workers and average about 4300 once mature **[A]**. The colonies Kwapich &
Tschinkel sampled held 157 to 9656 adults, Harrison & Gentry's 1500 to 10 000, and the model's
ant store is sized for 11 000. Laying is capped at `queenEggsPerDayMature`, 90 eggs a day, which
this rate reaches at about 2600 workers. Over the nine active months that is about 24 000 eggs a
year, enough in arithmetic to sustain a colony of several thousand workers who each live about a
year. No modelled colony comes near that. Colonies stop growing at about 300 workers in their
fourth and fifth years at both 0.035 and 0.05, so the laying rate is no longer what limits them.

**The ceiling.** In a two-year trace on seed 2, three times the seed on the ground carried the
larvae to about 600 in the third spring, against about 130 at today's density. The standing
crop is invented **[C]** and no one has published it for these sandhills (D30). Raising it until
colonies reach 700 workers would make maturity a fitted result, so it is left alone. The growth
gate in `VALIDATION.md` still fails, now at about a fifteenth of mature size rather than a
thirtieth.

## D32. Foragers are as many as measured, but their peak comes two months late

**Date.** 2026-09-16.

**The measurement.** Kwapich & Tschinkel (2013) followed 55 colonies from 2009 to 2012. Foraging
began in early March or April and rose to a maximum of 35 to 41 percent of the colony between May
and June, then fell to zero by December. At midsummer 60 percent of dark workers foraged in
immature colonies (under 800 workers) and 35 percent in mature ones. The spring maximum comes
from the large cohort of middle-aged, overwintered workers moving into foraging in late spring
and early summer. The year's own workers join from about mid-July.

**The model, measured on colonies grown from a queen** (seeds 2 to 4, D31 laying rate):

| | April | May | June | July | August | September |
|---|---|---|---|---|---|---|
| Share foraging, year 3 | 0.02 to 0.07 | 0.11 to 0.18 | 0.12 to 0.25 | 0.32 to 0.37 | 0.32 to 0.34 | 0.20 to 0.26 |
| Share foraging, year 4 | 0.01 to 0.08 | 0.10 to 0.16 | 0.17 to 0.22 | 0.31 to 0.39 | 0.34 to 0.43 | 0.26 to 0.42 |

So D16's shortfall in height (14 to 15 percent) and D18's (26 percent) are gone: the model's
maximum, 0.31 to 0.43, sits on the measured 0.35 to 0.41. What is wrong is its timing. The model
peaks in July to September on the year's own workers, and the overwintered cohort gives a weak
spring. That cohort's foraging age is drawn evenly across 210 to 360 days (D29), so its members
start across four months from April to mid-July, and each forages for only about 27 days. At no
moment are many of them out at once.

**What was tried.** Holding the overwintered cohort's start to a narrower window, still no
earlier than 210 days old:

| Window | Workers, year 4 (Oct) | Share, June of year 4 | Share, August of year 4 | April |
|---|---|---|---|---|
| Unchanged, up to 15 July | 223 to 253 | 0.17 to 0.22 | 0.34 to 0.43 | foraging |
| 1 April to 15 July | 190 to 196 | 0.17 to 0.19 | 0.43 to 0.53 | foraging |
| 1 May to 15 July | 200 to 249 | 0.29 to 0.36 | 0.28 to 0.36 | none |

The May window put the June share on the measurement but removed all April foraging, which the
paper contradicts, and grew smaller colonies in year three. The April window changed almost
nothing in spring. Neither was kept.

**What is left.** The measured spring pulse needs overwintered workers to start foraging close
together, which a start drawn evenly across months cannot give. No distribution of foraging ages
within the 210 to 360 days is published. Fitting one to the seasonal curve is the next step if
the work continues, and it should be judged against Figure 3 of Kwapich & Tschinkel 2013 rather
than against colony growth.

## D33. Weather from day to day, and what rain and sun do to foraging

**Date.** 2026-09-16.

**Why.** The climate was the monthly normals and nothing else. Every July day had the same
temperature, rain fell as a daily total with no hour, and it only wetted the sand. The one
[A] link between weather and behaviour beyond digging, that foraging pauses during heavy rain
and under exceptionally hot, cloudless conditions (Kwapich & Tschinkel 2013), was not modelled,
and the heat curfew never fired because the surface never got hotter than about 30 °C.

**What was built.** Kept small on purpose.

- **Sky and temperature.** Each day is clear, overcast or rainy. A day's temperature strays from
  the normal by a draw that carries over from the day before (persistence 0.7, spread 2.5 °C), so
  warm and cool spells last a few days. Cloud and rain take 3 °C off the high and add half that to
  the low. The normals, the rain totals and the rain draw itself are unchanged.
- **When rain falls.** In June to September a day's rain starts within two hours of 15:00; in other
  months at any hour. It falls at 10 mm an hour, for between one and ten hours.
- **Sun on sand.** The sand surface is the soil model's seasonal value plus the day's temperature
  departure plus up to 16 °C of sun, peaking at 13:30, a third of that under cloud and none during
  rain. Over three simulated years that puts the surface above the 46 °C foraging limit for 1 to 8
  daylight hours a month in June to September, and never otherwise.
- **Ants.** No forager leaves while rain falls, a forager caught outside walks home keeping any
  seed, and rain removes half the recruitment pheromone on the ground each hour.
- **The picture.** The sky greys under cloud and rain falls over the ground strip, still for readers
  who asked for reduced motion. "Right now" gives the weather and what it means for the foragers.

**Determinism.** The new draws use their own random stream, seeded from the colony's seed and
folded into the digest, so the rest of a run's random draws are unchanged. Runs still differ from
before, because foraging now responds to the weather. Two climate tests that read a single day as
the monthly normal now read the normal, which the day's weather is applied on top of.

**What it does to growth.** Little. Seeds 2 to 4 over four years had 301, 271 and 275 workers,
against 288, 272 and 315 without weather (D31), and colonies still level off near 300.

**Tags.** The pause in heavy rain and under hot, clear conditions is **[A]**. Everything else here
is **[C]**: the spread and persistence of temperature, the cloud chance and its cooling, the storm
hour and rate, the heating of sand, and the washing of trails.

**Not done.** Nuptial flights still do not follow heavy rain, since alates are not flown. Drought
does not throttle foraging. Wet sand after rain already stopped digging before this change.

## D34. Winged queens and males leave on a flight after heavy rain

**Date.** 2026-09-16.

**Why.** Sexuals were reared once a colony passed 700 workers and then stayed in the nest until
they died. The parameter file already recorded the flight season and its trigger as **[A]**, and
D33 gave the model heavy rain on a particular day, so the flight could now be built on something.

**What the literature says.** Smith & Tschinkel (2006) excavated 19 colonies. All 17 that reproduced
had more than 700 workers. Sexual eggs are laid from early April, and production is highly
synchronised among colonies, because flights are unpredictable events that usually follow the first
heavy summer rain and need several colonies to take part. Colonies have some of both sexes ready
when the first rain comes and go on rearing more for later flights. Flights run May to July, on a
calm, humid morning after heavy rain.

**What was built.** A small system, `systems/flights.ts`, after foraging.

- A day in May to July whose rain passes `climate.heavyRainMm` arms a flight.
- On each of the next `brood.nuptialFlightDaysAfterRain` mornings (2), at `brood.nuptialFlightHour`
  (09:00), if no rain is falling, every winged queen and male older than a callow period climbs
  onto the sand round the entrance. Each takes off at a random minute within
  `brood.nuptialFlightDepartureTicks` (60) and leaves the run. Foraging ignores them.
- Younger sexuals stay for the next rain. One flight per rain.
- The run records each flight's date and counts. The study's `runs.csv` gains `nuptialFlights`,
  `gynesFlown` and `malesFlown`. The simulator adds a diary entry per flight, and "Right now"
  reports the ants leaving.

**Tags.** The season, the rain trigger and repeated flights are **[A]**. The hour, the two days and
the hour to leave are **[C]**. Nothing reads colony size.

**The catch.** Colonies in this model level off near 300 workers (D31), below the 700 at which
sexuals are reared, so a naturally grown colony never flies. The flight is tested on a colony
given winged queens and males directly (`test/flights.spec.ts`), and was checked in the simulator
the same way: 8 winged queens and 16 males left on 28 May of year two. It will show in ordinary runs
once colonies reach maturity.

**Not modelled.** Mating, the survival of new queens, and founding by them. Alates that never fly
still die only by the inside-worker hazard, and alate larvae are fed as worker larvae (SCIENCE §6).

## D35. Colonies move their nest, and the new nest is taken to be a copy

**Date.** 2026-09-16.

**Why.** Relocation was the largest documented behaviour still missing, and the README had
promised it since the first version. It is also the reason given in D28 for nests running deep in
year five: a real colony moves into a new nest once or twice a year, and this one never did.

**What the literature says.** Colonies move about once a year, some up to four times, from May to
November, most in July. A move goes along an existing trail, the main trunk trail in 78 percent of
23 natural moves, a mean of about 4 m and rarely over 10, and takes 4 to 6 days. Workers carry the
seed store and brood and dig the new nest during the move. The new nest is statistically
indistinguishable from the old one. Trails keep their directions. Why colonies move is unknown
(Tschinkel 2013, 2014; Harrison & Gentry 1981).

**What was built.** `systems/relocation.ts`.

- Each day of the season a colony with workers may start a move. The chance is highest in July,
  falls by a fifth for each month either side, and is scaled so that it comes to the measured one
  move a year. That puts July a little under the 1 percent a day measured across a population,
  which counts second and later moves too. At most four moves a season.
- The direction is the main trunk trail with probability 0.78 (`relocation.mainTrailShare`, **[A]**),
  otherwise another trail. The distance is exponential about 4 m, cut at 10 m. The move lasts 4 to 6
  days and finishes at the first midnight with no forager out.
- On finishing, the ground slides under the entrance: seeds, patches, trail pheromone and remembered
  foraging sites shift by the distance moved, and ground newly in view gets background seed and its
  share of new patches.
- The diary marks the start and end of a move, and "Right now" shows which day of the move it is.
  `runs.csv` gains `relocations` and `relocationDistanceM`.
- Relocation draws from its own random stream, like the weather (D33). An early version drew from
  the shared one, and although nothing in it kills an ant, the shifted stream happened to give
  three colonies early queen deaths. Checked: the queen's daily draws over two years were evenly
  spread, and she died on one very low draw. A separate stream keeps a run identical to the run
  without relocation until its first move.

**What was not built.** The new nest is not dug. Chambers, brood and the seed store are kept as they
were, on the strength of the [A] finding that the replica is indistinguishable from the original.
So nothing is carried, no excavation happens, colonies pay no size cost for moving, and a nest still
never shrinks when its colony does. D28's deep fifth year is therefore not fixed. There is no choice
of site either, so the departure recorded in D3 is not yet in effect.

**What it gives.** Seeds 2 to 4 over five years: 18 moves in 15 colony-years (4, 9 and 5), about
3.4 m each. Workers in year five 245, 329 and 217, against 271 to 301 in year four without
relocation (D33), so moving to fresh ground does not change growth much.

**Tags.** Season, peak, frequency, trail, distance, duration and the replica are **[A]**. The monthly
fall-off, the exponential distance and treating the move as a shift of the ground are **[C]**.

## D36. A colony that moves digs its new nest

**Date.** 2026-09-17.

**Why.** D35 took the new nest to be a copy of the old one. That matched the measurement that
replicas are indistinguishable, but it meant a nest never shrank when its colony did, which is
what makes the fifth year run deep (D28). Workers dig the new nest during the move and after it
**[A]**, so the model should too.

**What was built.** At the first midnight with no forager out after a move is decided, the ground
shifts under the new entrance as before. The nest grid is then filled back in (`NestGrid.clearToSoil`,
the same object, so every system keeps its reference) and the soil stress reset. Every ant
underground goes to the entrance, sand in mandibles is dropped, and each ant's digging tally
(`dugCells`, D28) starts again, since it was the tally for the nest she dug. The whole seed store,
including seeds in mandibles, goes into a store in transit and is set down hour by hour in the
topmost dug cells below the entrance, up to the packing limit. Brood is placed where the queen is by
the daily reconciliation, as before. The renderer's burrow cache is dropped when the nest's
generation changes.

**Two things that failed first.** Starting the new nest from a single cell, 142 workers dug 10 cells
in 40 days: the digging rules cannot start a nest from nothing, which is why the founding queen has
her own rule (D27). So the new nest starts as the shaft and chamber a founding queen digs, at the
incipient depth, and workers enlarge it **[C]**. Before that, ants still holding seeds at the moment
of the move could not put them down in a nest whose only cell the store had filled, and nobody dug
at all; seeds in mandibles now join the store in transit, and the store is never set down in the
entrance cell.

**What it gives.** A forced move in July of year three on seed 3, about 80 workers: the store was in
the new nest within a day, no larvae starved, and in 40 days the nest grew from the 79-cell shaft to
151 cells, against 385 in the nest left behind. Five years on seeds 2 to 4:

| Seed | Workers, year 5 | Depth, dug nest | Depth, copied nest (D35) | Depth law |
|---|---|---|---|---|
| 2 | 264 | 84 cm | 130 cm | 70 cm |
| 3 | 310 | 95 cm | 152 cm | 74 cm |
| 4 | queen died in year 3 | – | 114 cm in year 4 | – |

So nests run about 1.2 to 1.3 times the law after five years, against about twice when copied.
Growth is about the same. Seed 4's queen died of the ordinary daily hazard.

**Not done.** The walk between sites, the size cost of moving, germinating seeds carried across, and
any choice of site (D3).

## D37. The dead are carried out

**Date.** 2026-09-17.

**Why.** Ants died and vanished. The pheromone parameters for a necrophoric cue had sat unused
since the first version, and SCIENCE §10 records that workers carry corpses further from the nest
than inert rubbish and that removing them raises the survival of the rest **[B]**.

**What was built.** `NestGrid.corpses` counts bodies per cell. Deaths underground from the
inside-worker hazard, winter mortality and the queen's daily hazard leave a body where the ant was.
A forager's death does not, because it is the risk of foraging and happens outside. In the
interior system a worker that is not a forager, within reach of a body, picks it up with a chance
of 0.02 a step (`interior.corpsePickUpChancePerTick`, **[C]**) and walks it up to the entrance,
where it leaves the nest. The run counts bodies in the nest and bodies carried out, `runs.csv` gains
`corpsesCarriedOut`, the nest view draws a body on its back on the chamber floor, the diary notes
the first one carried out and "Right now" counts workers carrying the dead.

**Not done.** The chemical cue itself, how far from the nest a body is taken, and any effect of
bodies left lying on the health of the colony. Nothing in the model makes a body dangerous, so
removing it changes nothing but where it is.

## D38. The overwintered cohort comes due together, and foraging peaks in June

**Date.** 2026-09-17.

**The problem.** D32 found the right height of foraging and the wrong season: 31 to 43 percent at
the peak, measured 35 to 41, but in July to September instead of May to June. The overwintered
cohort's foraging dates were spread evenly over March to mid-July, and a forager lives about a month,
so few of them were out at once.

**What was changed.** An autumn-born worker's foraging date is now drawn from a triangle between the
earliest date her 210 days allow and 15 July, most likely on 1 June
(`labour.autumnBornOnsetPeakDayOfYear`, **[C]**). The measured range, the window and the one-way
schedule are unchanged, and the draw still takes one random number.

**What it gives.** Three colonies over three years, share of workers foraging:

| | April | May | June | July |
|---|---|---|---|---|
| Before, year 3 | 0.02 to 0.07 | 0.11 to 0.18 | 0.12 to 0.25 | (year 2) 0.26 to 0.48 |
| After, year 3 | 0 to 0.03 | 0.07 to 0.14 | 0.39 to 0.53 | (year 2) 0.29 to 0.32 |

June is now the peak, at about the measured height (60 percent in immature colonies, 35 to 41 in
mature ones). March and April are still close to zero where the paper has foraging beginning and
rising, which remains a mismatch.

## D39. Colony size: the model's main limit, and why it is left there

**Date.** 2026-09-17.

**The gap.** Colonies level off at about 250 to 330 workers in their fourth and fifth years. Real
colonies mature at about 700 and average about 4300 once mature **[A]**.

**What was looked for.** A measured density or rain of seed on the ground in the Florida sandhills,
since D30 showed the invented standing crop caps what foragers bring home. A web search found none.
Soil seed-bank counts for longleaf pine sites exist, but they count buried seeds, not the harvestable
crop on the surface. Tschinkel & Kwapich 2016 give stores of up to 300 000 seeds and half a kilogram
in mature colonies, which says what a colony accumulates over its life, not what the ground offers in
a year.

**The nearest comparison.** Colonies of other harvester ants collect 0.44 to 18 seeds a minute while
foraging (Flanagan et al. 2012, desert *Pogonomyrmex*), and large *P. occidentalis* colonies about
30 an hour (as reported by Tschinkel & Kwapich 2016). The model's colonies of about 250 workers
collect about 8 700 seeds a year, roughly 2 an active hour. Per worker that is close to the
*P. occidentalis* figure, so nothing measured says the model's foragers bring home too little.

**The decision.** The seed on the ground is left as it is. Raising it until colonies mature would make
maturity a fitted result. The invented values that could equally be responsible, among them the
larval conversion efficiency (0.4) and the laying rate (D31), have no measurement to tune against
either. Colony size is recorded as the model's main limit in the README, VALIDATION and the study
report, and a reader who changes the seed density can see the effect for themselves with
`npm run study`.

## D40. Overwintered foragers live longer at it than summer ones

**Date.** 2026-09-17.

**What was missed.** Kwapich & Tschinkel 2013 marked foragers through four seasons and give two
lifespans, not one. Foragers sampled between March and July, all of them born the autumn before,
survived an average of 38 days (SD 10.1) once marked. Those sampled after July, a mix of that
cohort and the year's own workers, survived 26.9 days (SD 7.93) **[A]**. The model gave every
forager the second rate, 3 to 4 percent a day.

**What was changed.** A forager at least 210 days old, which only the overwintered cohort can be,
now dies at one over 38 a day (`labour.overwinteredForagerLifespanDays`, **[A]**). Everyone else
keeps `labour.foragerMortalityPerDay`. The age test is used rather than the worker's scheduled
foraging age, because the foraging system reuses that field to count the length of a trip.

**Why it matters.** Spring and early summer foraging rests on that cohort alone: no new worker
forages before July. A forager that lasts a third longer keeps more of them out at once in April
and May, which is where D38 left the model short, and brings in more seed while the year's first
large brood is being raised.

## D41. A forager with nowhere to go takes the strongest trail

**Date.** 2026-09-17.

**What was wrong.** VALIDATION G4b has recorded since 2026-09-10 that recruitment trails are laid
and followed and make no measurable difference to what a colony finds, cause unknown. Part of the
cause was in the code. The comment on a forager's departure reads: a remembered site first, then
the strongest trail smelled at the entrance, and a trunk trail direction if it has neither. The
middle step was never written. A forager with no site went down a trunk trail at random, and a
trail recruited only the ants that happened to cross it while searching.

**What was changed.** A forager with no remembered site smells a ring a metre out from the
entrance (`foraging.entranceTrailSniffRadiusM`, **[C]**), where trails are strong enough to tell
apart, since they are laid most heavily near the food. She picks a direction with the same
non-linear response the searching ants use. Whether she follows a trail at all saturates with
its strength: half the time for a trail as strong as one step's deposit, nearly always for a
well-used one, never for the remnant decay leaves everywhere. With trail following switched
off she takes a trunk trail as before, so the comparison below is like for like.

**What it gives.** Seeds found by four colonies of 60 foragers each over six days, on three sets
of seeds:

| Seeds | With trails | Without | Gain |
|---|---|---|---|
| 21 to 24 | 3188 | 3096 | 3 % |
| 25 to 28 | 2602 | 2433 | 7 % |
| 29 to 32 | 2603 | 2537 | 3 % |

Before the change the same comparison gave 1, 6 and 2 percent. The gain is now positive on every
set, and still small. Site fidelity carries most of the work: a forager that found seed goes back
to the same spot and needs no trail. The test that asks trails to earn their place stays skipped,
because a margin of a few percent is the kind a change to the random stream elsewhere can erase.

## D44. The overwintered cohort's foraging dates peak on 1 May

**Date.** 2026-09-17.

**The gap.** D38 moved the most likely foraging date of the overwintered cohort to 1 June to put
the peak of foraging in June, and left March and April close to zero. Kwapich & Tschinkel 2013
have foraging beginning in March or April and rising to its maximum between May and June, with
foragers preceding the larvae by 30 to 40 days **[A]**. With few foragers until June, the spring
brood in the model had almost nobody bringing food.

**What was changed.** `labour.autumnBornOnsetPeakDayOfYear` from 151 to 121, 1 May (**[C]** as
before). The triangle, its limits and the one-way schedule are unchanged.

**What it gives.** Share of workers foraging, three colonies, with D40 in place:

| | April | May | June |
|---|---|---|---|
| Second summer, peak 1 June | 0 to 0.11 | 0 to 0.13 | 0.17 to 0.33 |
| Second summer, peak 1 May | 0.06 to 0.22 | 0.21 to 0.31 | 0.33 to 0.36 |
| Third summer, peak 1 June | 0 to 0.04 | 0.08 to 0.16 | 0.29 to 0.47 |
| Third summer, peak 1 May | 0.01 to 0.02 | 0.18 to 0.22 | 0.29 to 0.46 |

Foraging now rises through May and still peaks in June. April in the third summer is still about
zero, which remains a mismatch. Colonies also grew faster through their second summer, 3.5 to 4.7
times over between May and October against 2.5 to 4.0 before, the measured figure being 4.64.

## D45. The store and the brood are carried to the new nest

**Date.** 2026-09-17.

**What D35 and D36 left out.** The walk. The seed store was set down in the new nest as room was
dug, the brood was placed there at once, and the map showed nobody carrying anything.

**What the literature says.** A minority of workers carry anything during a move; seeds are by far
the commonest burden, then charcoal, then brood; the share carrying rises through the move; the
whole store is moved (Tschinkel 2014) **[A]**. The parameter file had recorded the order of burdens
and the rising share since the first version and nothing read them.

**What was built.** From the move's first morning the store and the brood stay at the old site
until carried. Foragers at home with empty mandibles set out along the trail until the share of the
colony carrying matches how far through the move it is, rising in a straight line to
`relocation.carrierShareAtEnd` (**[C]**, 0.1) and rounded up so that a small colony has a carrier.
Each walks to the old nest, spends `relocation.loadHandlingTicks` (**[C]**) picking up one seed,
chosen in proportion to what is left of each size, or once the seeds are gone one piece of brood,
and walks back. At the new entrance she goes in, and the interior's ordinary rules put the seed or
the brood away. Carriers stop at night, in rain and on sand too hot to cross, like foragers. Brood
at the old nest or on the trail is left out of the new nest's chambers until it arrives. Whatever
is still at the old nest when the move ends is set down without a carrier and counted
(`totalSeedsUncarried`, `totalBroodUncarried`), so how much of a move was walked can be read off.

**What is ours, besides the two values.** That only foragers carry: they are the workers already on
the surface, and letting others do it would have put their age schedule and the carrying in
conflict. Charcoal is not modelled, so it is not carried. The queen still moves at the start.

**What it gives.** In the test colony of 200 foragers, 150 seeds and 40 brood, a move of 3 m over five
days: at most a tenth of the workers are on the trail at once, the seeds are all walked in during
the first day, the brood is taken only once they are gone, and nothing is left at the old nest at the
end. The effect on growth is nil where no move falls in the period: the same colony grew to the same
80 workers with carrying on and off.

## D46. Alarm on the foraging ground

**Date.** 2026-09-17.

**Why.** The scent key had listed alarm as not simulated since the first version, because nothing in
the model threatened the colony. Adrian chose disturbances on the foraging ground as the trigger,
from three options (a visitor poking the nest, disturbances on the ground, cave-ins).

**What is measured.** A disturbed worker of this species releases an alarm scent from her mandibular
glands, 4-methyl-3-heptanone. Workers that smell it are drawn towards the source; close to it they
run in tight circles, open their mandibles, and appear to release the scent themselves, so the alarm
is relayed. From one crushed worker's head the scent draws others from up to about 6 cm, 13 seconds
after release, and is gone by about 35 seconds; the circling happens within about 3 cm (Wilson 1958;
Bossert & Wilson 1963; McGurk et al. 1966) **[A]**. The measured response is to approach, not to flee.
The option as first offered said foragers would run home; that was changed to the measured response.

**The problem of scale.** A step of this model is a minute, and a forager walks metres in one. The real
scent lives for less than one step and reaches a fiftieth of the ground a step covers, so foragers are
almost never within 6 cm of each other when it is released. A grid layer for the scent, which the
parameter file had decay and diffusion values for, would have been a picture of nothing. Those values
remain unread.

**What was built.** `systems/alarm.ts`, with its own random stream. About `alarm.intrudersPerDay` times
a day (**[C]**, 0.5) a disturbance turns up where a forager is searching, and stays 5 to 30 minutes
(**[C]**). Foragers within `alarm.responseRadiusM` of it (**[C]**, 30 cm, standing in for the relay)
are alarmed: they go to it and circle within the measured 3 cm, pick nothing up, and stay alarmed for
one step after the last thing that alarmed them, which is how many steps 35 seconds rounds up to.
Rain ends it. Nothing is killed and nothing reaches the nest. Carriers during a move are left alone.

**What is not built.** What the disturbance is. Alarm inside the nest, and the digging Wilson found the
same scent releases in the nest. Any defence that drives a disturbance off.

## D42. Drought years

**Date.** 2026-09-17.

**What is measured.** Kwapich & Tschinkel 2013 followed colonies through four seasons, one of them,
2011, an extreme drought. Between May and October colonies grew 4.64 times over in 2010 (SD 1.93,
n = 5) and 0.996 times in 2011 (SD 0.73, n = 5): in the drought they held their size **[A]**. Foraging
also reached a lower maximum that year.

**What was built.** About one year in ten, drawn on 1 January from the weather's own stream, is a
drought year (`climate.droughtYearChance`, **[C]**). Rain comes half as often
(`climate.droughtRainFraction`, **[C]**). Only a share of the ground bears a seed crop
(`foraging.droughtSeedCropFactor`, **[C]**, fitted): on 1 January the seed is cleared from the rest of
the ground, a fixed scatter of cells the same in every drought, and only the bearing ground grows seed
back. The diary and the weather line say when a year is a drought year.

**Two versions that failed.** Slowing only the regrowth of seed was not enough: with no regrowth at all
colonies lived on the crop already on the ground and still grew two to three times over. Cutting every
cell of ground to a fraction of its crop then killed every colony at any severity, because no cell was
left holding a whole seed and a forager picks up only whole ones; colonies at 10 and 30 percent died
identically, which is how the error showed.

**The fit.** Growth between May and October in a colony's second summer, with every year a drought
year, three colonies:

| Ground bearing seed | Growth | Mean |
|---|---|---|
| 10 % | 0.31, 1.22, 1.00 | 0.84 |
| 25 % | 2.21, 1.30, 2.73 | 2.08 |
| 50 % | 4.00, 3.15, 3.63 | 3.59 |
| No drought | 4.71, 3.54, 4.11 | 4.12 |

10 percent comes within the measured spread of 0.996 and is the value used. How often droughts come,
and how much less rain falls, are not fitted to anything.

## D43. Colony size: the seed on the ground is fitted after all

**Date.** 2026-09-17. Overturns D39's decision to leave the seed on the ground untuned.

**Why it was reopened.** Adrian asked for colony size to be worked on: first a search for a published
cause, and failing one, a fit of the invented seed crop until colonies reach the size at which they
rear queens and males, said plainly to be fitted.

**What the search found.** No published seed density or seed rain for these sandhills, as in D39. It did
find three things the model had wrong, which were fixed first and are recorded separately: the
overwintered foragers' measured 38-day lifespan (D40), the overwintered cohort's foraging peak, which
left almost no foragers until June (D44), and foragers that never followed a trail out of the entrance
(D41). It also found the measured growth rate, 4.64 times over between May and October in a normal
year (Kwapich & Tschinkel 2013), which the model already came close to at its old value in a colony's
second and third summers. So the rate of growth is not what was wrong; the level colonies stop at is.
Larvae starving above a full store is measured (D24) and was not touched.

**The fit.** Workers each October, three colonies, D40, D41 and D44 in place, no drought:

| Seed a square metre | Year 3 | Year 4 | Year 5 |
|---|---|---|---|
| 40 (before) | 231, 170, 216 | 190, 188, 187 | 182, 277, 147 |
| 80 | 282, 94, 350 | 607, 441, dying | 520, 470, dead |
| 120 | 181, 229, 281 | 882, 890, 439 | 67, 264, 270 |
| 160 | 218, 166, 407 | 671, 642, 264 | 444, 449, 531 |

The level colonies reach rises with the seed on the ground, but no value holds a colony above 700: at
80 and more, those that grow large fall back the next year, starving thousands of larvae with thousands
of seeds in store, most too large to open. Adrian chose 120 (`foraging.standingSeedsPerSquareMetre`,
**[C]**, fitted), at which two colonies in three pass 700 in their fourth year, so a colony in the
simulator can reach the size at which it rears queens and males and a mating flight can happen.

**What this leaves.** The year-five fall is now the model's main limit, in place of the plateau. Real
colonies hold about 4300 workers. Its likely cause is that a colony's food is capped by a fixed range of
ground while its larvae keep being laid in proportion to its workers, so a colony that outgrows its
ground in a good year starves its brood the next; nothing in the model lets a colony lay fewer eggs
when food is short, and nothing published says how a real one does. That is a candidate for the next
step, not a finding.

## D47. The overwintered cohort's foraging dates peak on 1 April

**Date.** 2026-09-17.

**The gap.** After D44 foraging still hardly began in April in older colonies: 0.01 to 0.07 of
workers in their third and fourth summers. Kwapich & Tschinkel 2013 have foraging beginning in March
or April, and the darkest and oldest of the overwintered workers foraging first **[A]**.

**Why.** Three colonies on 1 January of their third year held workers born from August to November.
About 13 percent were due to forage in April, none in March, and most in May and June. Each worker's
date is drawn from a triangle between the earliest date her 210 days allow and 15 July, most likely
on the peak day, so even a worker born in August was most likely to start on 1 May.

**What was changed.** `labour.autumnBornOnsetPeakDayOfYear` from 121 to 90, 1 April (**[C]** as
before).

**What it gives.** Share of workers foraging, three colonies, no drought:

| | April | May | June | July |
|---|---|---|---|---|
| Third summer, peak 1 May | 0.01 to 0.07 | 0.15 to 0.20 | 0.22 to 0.25 | 0.34 to 0.43 |
| Third summer, peak 1 April | 0.05 to 0.27 | 0.14 to 0.29 | 0.23 to 0.30 | 0.39 to 0.46 |
| Fourth summer, peak 1 May | 0.02 to 0.05 | 0.17 to 0.23 | 0.24 to 0.32 | |
| Fourth summer, peak 1 April | 0.07 to 0.10 | 0.13 to 0.18 | 0.20 to 0.28 | |

April now has foragers. March is still about zero. Under either date the year's maximum comes in July,
when the first summer-born workers join, where the field maximum is in May and June; that is a
mismatch left open.

**Colony size at the new date.** Workers each October over five years, three colonies, no drought:
seed 2 reached 72, 349 and 1080 in years two to four, then fell to 81; seed 3 grew more slowly, to 317
in year four and 933 in year five; seed 4 reached 532 in year four and fell to 260. Two colonies in
three still pass 700, one a year later than at the old date, and the one that passed early still
fell back the year after.

