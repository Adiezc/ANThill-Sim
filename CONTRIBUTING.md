# Contributing

One rule matters more than the rest, and it is the one a new contributor is most likely to
break without noticing.

## Label every number with where it came from

Every mechanic in this simulator carries a tag:

| Tag     | Meaning                                                               |
| ------- | --------------------------------------------------------------------- |
| **[A]** | Measured in _Pogonomyrmex badius_ itself                              |
| **[B]** | Borrowed from another ant, because nobody has measured it in _badius_ |
| **[C]** | Invented to make the model work, with no direct evidence behind it    |

The tags are not paperwork. They are the point of the project. Someone using the simulator
must always be able to tell which of the three they are looking at. A plausible mechanic with
no citation, slipped in among cited ones, does more harm than a missing feature.

### In practice

1. **Never hard-code a biological constant.** It comes from
   `species/pogonomyrmex-badius.json` or it does not exist. If you catch yourself typing a
   number that describes an ant, a nest, a seed or the weather, stop and put it in the
   parameter file with a tag. `test/no-hardcoded-constants.spec.ts` looks for every number
   in the parameter file as a literal in the simulation code, and fails the build naming the
   parameter you should have used.
2. **A new parameter needs a tag.** The loader refuses any value without one. If you cannot
   cite it, it is **[C]**. Invented values should be easy to find and change, and flagged as
   invented wherever they appear. Today they are tuned in the parameter file. The browser
   does not offer sliders for them yet. Inventing a value openly is fine. Inventing one
   quietly is not.
3. **A new mechanic needs a row in `docs/SCIENCE.md`**, giving the rule as implemented, its
   tag and its source. Register its rule id in `src/core/provenance` as well, so the
   inspector can show the citation for any ant following it.
4. **Never upgrade a tag quietly.** Promoting a **[B]** to an **[A]** needs a _badius_
   citation in the pull request. "It seems reasonable" is a **[C]**.

### Rules that must not be "fixed"

Some parameters are marked `HARD RULE` in the species file. Each describes a behaviour that
was tested in this species and **rejected**. Building the intuitive version would be a
factual error, not a design choice.

- Foragers never go back to work inside the nest (`labour.taskReversionAllowed: false`).
- Losing foragers does not pull in replacements from other castes. Larvae starve instead
  (`labour.backfillFromOtherCastes: false`).
- A worker's size predicts neither the seeds it carries nor how far it forages
  (`foraging.workerSizePredicts*: false`).
- Majors open small and medium seeds faster. They cannot open bigger ones
  (`seeds.majorsWidenOpenableSizeRange: false`).
- There is no soldier caste, and majors have no defensive role.

If you think one of these is wrong, open an issue and bring the paper.

## Code boundaries

- `src/core` is pure. It uses no DOM, no `Date`, no `Math.random`, no Node built-ins and none
  of the `Math` functions that JavaScript engines are allowed to compute differently. Any of
  those would quietly break reproducibility. ESLint enforces this, and
  `docs/DETERMINISM.md` explains why it matters.
- `src/render` and `src/ui` read core state and never write to it.
- All randomness comes from the injected `Prng`. A new consumer of randomness changes every
  random number drawn after it, so the determinism test will fail. That is the test working.
  Update the expected values on purpose and say so in the pull request.

## Checks

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

CI runs the same four on every push to `main` and on every pull request.
