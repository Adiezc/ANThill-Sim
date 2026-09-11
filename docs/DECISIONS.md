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
higher. The moisture is the model's; the rest is appearance.

