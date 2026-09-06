# Build brief: Anthill Simulator (Pogonomyrmex badius)

Paste this whole file to Claude Code as the opening instruction, in this folder.

---

## What we are building

A browser-based, scientifically accurate, 2D pixel-art simulation of a single colony of
the Florida harvester ant, _Pogonomyrmex badius_, from the nuptial flight of a single
queen through founding, excavation, foraging, seasonal cycles and annual nest relocation,
to the eventual death of the colony.

It is an agent-based simulation, not a game with ants in it. Every structure that appears
must emerge from individual ants following local rules. No ant has a map, a plan or any
knowledge of the nest as a whole.

It has a second audience beyond the player. It must be usable as a research instrument,
which means deterministic, seeded, parameterised and runnable headless.

**Two documents in this folder are the specification and take precedence over anything
you infer:**

- `docs/SCIENCE.md` — every mechanic, the rule as implemented, and its citation, tagged
  **[A]** documented for _P. badius_, **[B]** generalised from another ant, **[C]**
  invented. Read this in full before writing code.
- `species/pogonomyrmex-badius.json` — the parameter file. Every number the simulation
  uses lives here, each carrying the same A/B/C tag. **No biological constant may be
  hard-coded anywhere in the source.**

Several parameters are marked `HARD RULE`. These are behaviours that have been
experimentally tested in this species and _rejected_. Implementing the intuitive version
would be a factual error, not a design choice. Do not "improve" them.

## Language and stack

**TypeScript for everything.** One language across the simulation core, the renderer, the
UI and the headless runner. Plus HTML and CSS for the page shell, and JSON for data.
Nothing else.

- Build: **Vite**
- Tests: **Vitest**
- Lint and format: **ESLint** and **Prettier**
- CI: **GitHub Actions**, running typecheck, lint and tests on push
- Deploy: **GitHub Pages**, so the whole thing is one URL with no install
- **No runtime dependencies** for the simulation core. Zero. It must be plain TypeScript.
- Rendering is **HTML5 Canvas 2D**. Do not add a 3D or WebGL library.

## Architecture

Three packages, and the boundaries matter more than anything else in this brief.

```
/src
  /core        pure TypeScript, no DOM, no browser APIs, no randomness except the seeded PRNG
  /render      Canvas 2D drawing, reads core state, never writes to it
  /ui          HUD, controls, inspector panel
/headless      Node entry point that runs /core without /render
/species       parameter files (JSON)
/docs          SCIENCE.md and everything else
```

Rules:

- `/core` must be importable and runnable in Node with no browser shim.
- **Determinism is non-negotiable.** Fixed timestep. One seeded PRNG, injected, never
  `Math.random()` anywhere. Same seed plus same parameter file must always produce a
  byte-identical run. Write a test that asserts this.
- **Determinism gotcha, do not skip this.** `Math.sin`, `Math.cos`, `Math.tan`,
  `Math.exp` and `Math.pow` are _not_ specified to be bit-identical across JavaScript
  engines. A run seeded identically can therefore diverge between Chrome, Firefox and
  Node, which would silently break reproducibility for anyone using this as a research
  instrument. In `/core`, never call those directly. Use precomputed lookup tables for
  trigonometry (ant headings are quantised anyway) and a fixed polynomial approximation
  for anything else, both defined in core and covered by tests. Basic float arithmetic
  is IEEE 754 and is safe.
- Ant state is **struct-of-arrays typed arrays**, not objects. `Float32Array` for
  positions, headings and fat reserves; `Uint8Array` for caste, task and age band;
  `Uint32Array` for ids and timers. This is for cache behaviour and cheap serialisation,
  and it makes save/load and headless output trivial.
- Environment layers (soil, moisture, stress, each pheromone channel) are separate
  `Float32Array` grids at a coarser resolution than the display.
- Run the simulation in a **Web Worker** so the UI never blocks.

## Visual model

**A 2D vertical slice through the nest.** Real _badius_ shafts are helices, so a side view
is a projection. Model it honestly as a slice and say so in the UI. Do not fake a third
spatial dimension in the simulation.

You may add **2.5D depth cues in the renderer only**, and only if they are cheap:

- Parallax layers (background soil strata, mid-ground nest, foreground sand grains)
- Chamber walls drawn with a lighter top edge and a darker floor to imply volume
- Ants on the near layer drawn very slightly larger

These are cosmetic. If any of it causes trouble, drop it and ship the flat slice. Nothing
in `/core` may ever depend on it.

Above ground, the view shows the sand crater, the charcoal decoration, the trunk trails
and the surrounding foraging range. Below ground, the nest in cross-section.

**Level of detail scales with colony size.** Early on, when the colony is a queen and a
dozen nanitics, individual ants are large, distinct and readable. As the colony grows past
a few hundred, the default zoom pulls back and ants become a moving mass, with the
individual view available on demand. This transition should feel like a natural
consequence of scale, not a mode switch.

## Interaction

The player is not in charge of the colony and must never be able to command an ant. There
are exactly two levers:

1. **The annual relocation decision.** Once a relocation window opens, the colony scouts
   two or three candidate sites, all of them along existing trunk trails, and the player
   chooses to move or to stay. Show each site's readable trade-offs (soil moisture,
   workable depth, distance, proximity to neighbours).
2. **A seasonal brood investment lever.** Bias the queen's egg-laying towards workers or
   towards alates. It acts on developmental scheduling, upstream of task allocation.
   **It must not reassign existing adults.** Foragers in this species do not revert, and
   the colony does not backfill from other castes. Both are HARD RULEs.

Everything else is emergent and observed, not controlled.

## Time

- **1x is roughly one simulated day per 60 seconds of real time.** Slow enough to watch
  the colony actually grow.
- Speed controls: **1x, 2x, 4x, 8x**, plus pause.
- Also provide **16x and 32x**, and a "skip to next event" control. At 1x a single year
  takes about six hours of real time, so without a high-multiplier option the multi-year
  arc is unreachable. Make the higher speeds visibly a fast-forward, with reduced
  rendering rather than reduced simulation fidelity.
- The core must step on a fixed timestep regardless of playback speed. Speed changes how
  many steps run per frame, never the size of a step.

## Inspecting ants

Click any ant to track it. A small label follows it, and a panel shows:

- Its **caste**: queen, alate, male, minor worker, major worker, callow
- Its **current task**: forager, transfer worker, brood-care worker, excavator
- Age in days, fat reserve, current load, depth
- The pheromone concentration in the cell it is standing on
- **A one-line citation for the rule it is currently following, with its A/B/C tag**

That last line is the entire educational payload of the project. Do not omit it.

**There is no soldier or warrior caste in this species.** Majors are seed-crackers whose
contribution is raising the rate at which small and medium seeds are opened. They are not
defenders, and worker size predicts neither seed size nor foraging distance. Both are
HARD RULEs in the parameter file. Label ants by caste and current task only.

## HUD

Top left, always visible:

- **Population count**, broken down as workers / brood / alates
- Current date and season
- Colony age in years and days

Elsewhere, compact and unobtrusive: nest depth, chamber count, seed store (split into
openable and locked-large), and the current speed multiplier.

## Seasons and climate

Drive the entire annual cycle from the monthly climate table in the parameter file, which
is the real 1991 to 2020 normals for Tallahassee, north Florida, the study site for
essentially all the cited field work. Humid subtropical, hot wet summers, mild winters
with occasional frost, summer rainfall maximum.

Derive soil temperature as a damped, lagged sinusoid with depth. Soil temperature is not
decoration: it drives seed germination in the storage chambers, which is a core v1
mechanic. Soil moisture from rainfall gates excavation, since ants cannot dig fully dry or
fully saturated sand.

The seasonal biology to reproduce is tabulated in SCIENCE.md section 9.

## Version 1 scope

Ships in v1:

1. **Founding.** Nuptial flight, queen lands, sheds wings, digs a shaft and one chamber,
   seals herself in, raises the first brood from her own reserves. Time-compress the
   claustral phase so it is not several minutes of one ant in a hole, but do not skip it.
2. **Excavation and architecture.** Shafts and chambers built by local rules, with the
   collision-driven digging model, spoil-as-a-cue, sequential pellet transport, soil
   stress and arching, and the building-pheromone lifetime slider.
3. **Foraging.** Trunk trails, recruitment pheromone with non-linear response, site
   fidelity, path integration.
4. **Division of labour.** The one-way age progression and vertical stratification.
5. **Seasons** from the climate table.
6. **Seed stores and germination.** Large seeds accumulate because workers cannot open
   them; stored seeds germinate as a function of soil temperature and depth; germinating
   seeds are removed promptly and fed preferentially to larvae. This is the mechanic
   nobody else has simulated. Give it the attention it deserves.
7. **Annual relocation**, along a trunk trail, building a replica of the vacated nest.
8. **Colony death and an end-of-run summary**: years survived, nests built, total soil
   moved, peak population, seeds stored and consumed.

Deferred to v2, but leave the schema room: disease and social immunity, the
kleptoparasitic beetle, predators, the geomorphology readout, and other colonies.

## Opening text

Show this at the start, over the sandhills, before the flight:

> In the sandhills of northern Florida a single mated queen lands, breaks off her wings
> and digs a shaft into the sand. She will seal herself in and raise her first daughters
> on nothing but her own flight muscles. If they live, they will build a nest three metres
> deep with no architect, no blueprint and no ant that has ever seen the whole thing. You
> are not in charge of them. Once a year, you decide only whether they move.

## Honesty requirements

These are not optional polish. They are the reason the project exists.

- Every mechanic surfaced to the player carries its **[A] / [B] / [C]** tag and its
  citation, reachable in one click.
- Where the science is unsettled, say so in the UI. The reason _badius_ relocates at all
  is **unknown**, and the simulator should tell the player that rather than inventing a
  motive.
- Section 11 of SCIENCE.md lists mechanics that are intuitive, commonly assumed and
  **wrong** for this species, several of them experimentally tested and rejected. Build a
  small in-simulator panel that surfaces these. What the simulator refuses to model is as
  instructive as what it models.

## Repository

- `README.md` with a screenshot, a one-paragraph description, how to run it, and a
  **How to cite** section.
- `LICENSE` — MIT for the code.
- `LICENSE-docs` — CC BY 4.0 for `docs/` and `species/`.
- `CITATION.cff` naming **Adrian Diez Cuadrado** as author, so GitHub renders a
  "Cite this repository" button.
- Attribution notice in the README and in the simulator's about panel.
- `CONTRIBUTING.md` explaining the A/B/C tagging discipline, because that is the rule a
  contributor is most likely to break.

## Order of work

1. Repo scaffold, tooling, CI, licences, citation file.
2. `/core` skeleton: fixed timestep, seeded PRNG, typed-array ant store, parameter
   loader with A/B/C tag validation. Determinism test passing before anything else.
3. Soil grid, moisture, temperature, stress field.
4. Excavation. Get a recognisable _badius_ nest emerging from local rules and nothing
   else. **Do not proceed until a generated nest matches the architectural signature in
   SCIENCE.md section 2**: top-heavy area distribution, roughly 1 cm chambers, shallow
   branching, chamber area falling 25 to 40 percent per depth decile.
5. Founding sequence and the demographic engine.
6. Foraging, trunk trails, pheromones.
7. Seeds and germination.
8. Seasons wired to the climate table.
9. Relocation.
10. Renderer, HUD, inspector, opening text.
11. Colony death and summary.

Stop and ask before deviating from `docs/SCIENCE.md` or `species/pogonomyrmex-badius.json`
on any point tagged **[A]** or marked `HARD RULE`.
