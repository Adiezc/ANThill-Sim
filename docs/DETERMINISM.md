# Determinism

The same seed and the same parameter file must produce a byte-identical run, in Chrome, in
Firefox and in Node. This is what makes the simulator usable as an instrument rather than
an illustration, and it is asserted by `test/determinism.spec.ts`, not assumed.

## The three sources of divergence, and what we do about each

### 1. Ambient randomness

`Math.random()` is seeded by the host and is not reproducible. `/core` never calls it —
ESLint fails the build if it appears. All randomness comes from a single counter-based
PRNG, constructed from the run seed and passed explicitly into every system that needs it.

A consequence worth stating plainly: **adding a new consumer of randomness changes the
whole downstream sequence.** The determinism test will fail. That is the test doing its
job. Regenerate the golden hash deliberately, and say so in the pull request.

### 2. Unspecified transcendental functions

This is the one that bites silently. ECMA-262 does **not** require `Math.sin`, `cos`,
`tan`, `exp`, `pow`, `log` and friends to be bit-identical across implementations — only
that they be within an implementation-defined approximation of the true result. V8,
SpiderMonkey and JavaScriptCore give different last bits. A run seeded identically would
therefore diverge between a scientist's browser and the same scientist's Node script, with
no error and no warning, which is the worst possible failure mode for a reproducibility
claim.

`/core` therefore never calls them. ESLint bans the entire family. Instead:

- **Trigonometry** comes from precomputed lookup tables in `src/core/math/trig.ts`. Ant
  headings are quantised anyway, so a table is the natural representation rather than a
  compromise.
- **Exponentials and powers** come from fixed polynomial approximations in
  `src/core/math/approx.ts`.
- Both are pure integer-and-float-arithmetic, both are covered by tests that pin their
  outputs to committed golden values, and both are generated offline by `tools/`, which is
  the only code permitted to touch the host `Math`.

What _is_ safe: `+ - * /`, comparison, `Math.abs`, `floor`, `ceil`, `round`, `trunc`,
`sign`, `min`, `max`, `sqrt` and `Math.fround`. These are all exactly specified by IEEE
754 or by ECMA-262 and are used freely.

### 3. Iteration and accumulation order

Floating-point addition is not associative, so the order in which ants are visited and
grid cells are accumulated is part of the result. `/core` therefore:

- stores ants as struct-of-arrays typed arrays and iterates them by index, never by
  reference or by hash-map order;
- never uses `Object.keys`, `Set` or `Map` iteration to drive a numerical accumulation;
- never sorts with a comparator that can return 0 for distinct elements — ties break on
  ant id, so every sort is total.

## What "byte-identical" is measured on

`hashState()` in `src/core/state/hash.ts` produces a 64-bit digest over a canonical
serialisation of the whole simulation state: every typed array, every grid, the clock, and
the PRNG's own internal counter. Two runs agree if their digests agree at every checkpoint
tick, not merely at the end.

## Floats, not fixed point

The simulation uses `Float32Array` and `Float64Array` rather than fixed-point integers.
IEEE 754 arithmetic is exactly specified and reproduces bit-for-bit across engines, so
fixed point would buy nothing here and would cost precision and clarity. The danger was
never the floats. It was the library functions on top of them.
