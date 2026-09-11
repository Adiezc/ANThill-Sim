# Architecture

```
/src
  /core      Pure TypeScript. No DOM, no Node built-ins, no clock, no randomness except the
             injected generator, and none of the Math functions engines are free to disagree on.
  /render    Draws core state on a 2D canvas. Reads it and never writes to it.
  /ui        Readouts, controls, the ant inspector and the sources panels.
  /worker    Empty for now. The core moves here, off the main thread, in a later step.
/headless    Node entry points: one seeded run (run.ts) and a replicate study (study.ts).
/species     The parameter file, one JSON file per species.
/docs        The science, the decisions, the validation record and this file.
```

The toolchain enforces these boundaries, so nobody has to remember them.
`src/core/tsconfig.json` compiles with `lib: ["ES2022"]` and `types: []`, which makes a
reference to `document` or `process` a type error before ESLint even runs. ESLint adds the
bans a type checker cannot express, and `test/boundaries.spec.ts` checks them a second time,
because a lint rule can be switched off with a comment and a test cannot.

## Two spatial domains

An ant is always in one of two places. On the **surface** it lives in plan view, measured in
metres, among trunk trails and the foraging range. In the **nest** it lives in a vertical
slice, measured in centimetres, among tunnels, chambers, brood and seed stores. The nest
entrance is the only way between the two. Neither is a projection of a shared 3D world,
because there is no 3D world. See `DECISIONS.md` D1.

## Time

One tick is one simulated minute (`time.secondsPerTick`, tagged **[C]**), which makes 1440
ticks a day and 525,600 a year. The core moves forward in these fixed steps and in no other
way. Playback speed, set in simulated days per real second, changes how many ticks run in each
animation frame. It never changes the size of a tick, so it never changes the result.

Pheromone diffusion runs every 10 ticks (`pheromones.diffusionIntervalTicks`) rather than every
tick. That saves time, and because the schedule is the same at every speed and in headless
runs, it costs nothing in reproducibility.

## State

Each ant property lives in its own typed array, indexed by ant, rather than in an object per
ant. Position, fat and body length are `Float32Array`, heading is `Uint16Array`, caste, task
and burden are `Uint8Array`, and ids, age and timers are `Uint32Array`. The layout suits the
processor's cache, and it makes hashing, saving and headless output almost free.

The environment lives in separate `Float32Array` grids, coarser than the display: soil,
moisture, temperature, stress and one grid for each pheromone. Pheromones are never merged into
a single channel (`SCIENCE.md` §8).

## Provenance

`src/core/provenance` maps every rule id to its citation and its A, B or C tag. Each system
records which rule an ant is following, and the inspector reads that record to show the
citation. Rule ids are typed constants, so a system that points at a rule nobody has
registered does not compile. The mapping sits in `/core` for that reason: a citation cannot
drift away from the code that depends on it.
