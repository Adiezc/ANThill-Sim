# Architecture

```
/src
  /core      pure TypeScript. No DOM, no Node built-ins, no wall clock,
             no randomness but the injected PRNG, no unspecified Math.
  /render    Canvas 2D. Reads core state. Never writes to it.
  /ui        HUD, controls, inspector, provenance panels.
  /worker    hosts /core off the main thread; owns the message protocol.
/headless    Node entry point. Runs /core with no renderer.
/species     parameter files (JSON).
/docs        SCIENCE.md and the rest.
```

The boundaries are enforced by the toolchain, not by convention. `src/core/tsconfig.json`
compiles with `lib: ["ES2022"]` and `types: []`, so a reference to `document` or to
`process` is a type error before it is a lint error. ESLint adds the runtime bans. See
`eslint.config.js`.

## The two spatial domains

An ant is either in the **surface domain** — plan view, (x, y) metres, where trunk trails,
foraging range and relocation geometry live — or in the **nest domain** — vertical slice,
(x, depth) centimetres, where excavation, chambers, brood and seed stores live. The nest
entrance is the only point of transfer. Neither domain is a projection of a shared 3D
model, because there is no 3D model. See `DECISIONS.md` D1.

## Time

One tick is one simulated minute (`time.secondsPerTick`, tag **[C]**): 1440 ticks per day,
~525,600 per year. The core advances on a fixed timestep and nothing else. Playback speed
changes only how many ticks are run per animation frame; it never changes the size of a
tick, and it never changes simulation fidelity. At 1x that is one simulated day per 60
seconds of real time.

Pheromone diffusion runs on a fixed sub-schedule (every N ticks, N a parameter) rather than
every tick. This is a performance decision, but it is identical at every playback speed and
in headless runs, so it does not affect reproducibility.

## State

Ant state is struct-of-arrays typed arrays, not objects: `Float32Array` for positions,
headings and fat reserves, `Uint8Array` for caste, task and age band, `Uint32Array` for ids
and timers. This is for cache behaviour, but it also makes serialisation, hashing, save/load
and headless output nearly free.

Environment layers — soil, moisture, temperature, stress, and each pheromone channel
separately — are separate `Float32Array` grids at a coarser resolution than the display.
Pheromone channels are never collapsed into one "pheromone" (`SCIENCE.md` §8).

## Provenance

`src/core/provenance` maps a rule id to its citation and A/B/C tag. Systems annotate the
rule an ant is currently following; the inspector reads that annotation and shows the
citation. The mapping lives in `/core` on purpose: a mechanic that exists in the simulation
but has no provenance entry is a build failure, so the citation cannot drift away from the
code that needs it.
