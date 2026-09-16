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
