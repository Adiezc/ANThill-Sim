# Determinism

The same seed and the same parameter file must produce the same run, down to the last bit, in
Chrome, Firefox and Node. That is what makes the simulator an instrument rather than an
illustration.

Two things back the promise. The model uses only operations that every JavaScript engine is
required to compute identically. And `test/determinism.spec.ts` pins the fingerprint of a
seeded run, so any change that alters a run fails the build. The test runs in Node. Agreement
with browsers follows from the first point, not from a browser test.

## Three ways runs drift apart, and what stops each

### 1. Randomness from the host

`Math.random()` is seeded by the browser or by Node and cannot be reproduced. `/core` never
calls it, and ESLint fails the build if it appears. All randomness comes from one generator,
xoshiro128\*\* seeded through splitmix32 (`src/core/math/prng.ts`), built from the run seed and
passed explicitly to every system that needs it. It uses only 32-bit integer operations, which
every engine computes the same way.

One consequence catches people out. **A new consumer of randomness changes every number drawn
after it**, so the determinism test will fail. That is the test doing its job. Update the
pinned fingerprint on purpose and say so in the pull request.

### 2. Maths functions that engines may compute differently

This one fails silently. The JavaScript standard does **not** require `Math.sin`, `Math.exp`,
`Math.pow`, `Math.log` and their relatives to return identical bits everywhere, only a close
approximation of the true value. V8, SpiderMonkey and JavaScriptCore disagree in the last bits.
A run seeded identically could therefore drift apart between a scientist's browser and the same
scientist's Node script, with no error and no warning. That is the worst way a reproducibility
claim can fail.

So `/core` never calls them. ESLint bans every trigonometric and hyperbolic function and its
inverse, along with `exp`, `expm1`, `pow`, `log`, `log2`, `log10`, `log1p`, `cbrt` and `hypot`.
In their place:

- **Trigonometry** comes from `src/core/math/trig.ts`. It builds a lookup table when the module
  loads, from ten series coefficients and ordinary arithmetic, so every engine builds the same
  table. Ant headings are quantised anyway, which makes a table the natural form rather than a
  compromise.
- **Exponentials, logarithms and powers** come from fixed truncated series in
  `src/core/math/approx.ts`, built from ordinary arithmetic and exact bit manipulation.
  `test/math.spec.ts` checks them against the host functions to within about one part in a
  trillion. Accuracy is not really the point. Agreement is.

Everything else is safe and used freely: the four arithmetic operators, comparisons, and
`Math.abs`, `floor`, `ceil`, `round`, `trunc`, `sign`, `min`, `max`, `sqrt`, `fround` and
`imul`. IEEE 754 or the JavaScript standard specifies each of these exactly.

### 3. The order things happen in

Floating-point addition is not associative, so the order in which ants are visited and grid
cells are added up is part of the result. Three habits keep that order fixed.

- Ants live in typed arrays and are visited by index, never by reference or in hash-map order.
- `Object.keys`, `Set` and `Map` iteration never drive a numerical sum.
- Nothing is sorted while the simulation runs. The only sort in `/core` orders error messages
  in the parameter loader.

## What "the same run" means

`Simulation.digest()`, built on `StateHasher` in `src/core/state/hash.ts`, produces a 64-bit
fingerprint of the whole simulation. It covers the clock, the generator's position, every ant
array and every registered state grid, such as the nest, the soil, the brood and the ground.
Two runs are the same run if their fingerprints agree at every checkpoint, not just at the end,
so a divergence shows up at the tick it happens rather than a simulated year later.

## Floats, not fixed point

The simulation uses `Float32Array` and `Float64Array` rather than fixed-point integers. IEEE 754
arithmetic is exactly specified and gives the same bits on every engine, so fixed point would buy
nothing and would cost precision and clarity. The floats were never the danger. The library
functions built on top of them were.
