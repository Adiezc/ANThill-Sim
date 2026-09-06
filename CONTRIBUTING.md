# Contributing

One rule matters more than all the others, and it is the one a new contributor is most
likely to break without noticing.

## The A/B/C discipline

Every mechanic in this simulator is tagged:

| Tag     | Meaning                                                                   |
| ------- | ------------------------------------------------------------------------- |
| **[A]** | Documented for _Pogonomyrmex badius_ specifically                         |
| **[B]** | Generalised from another ant species because _badius_ data does not exist |
| **[C]** | Invented for playability or tractability, with no direct evidential basis |

The tags are not documentation. They are the product. A user of this simulator must never
be unable to tell which of the three they are looking at. A plausible mechanic with no
citation, silently mixed in among cited ones, does more damage than a missing feature.

### What this means in practice

1. **No biological constant may be hard-coded.** It comes from
   `species/pogonomyrmex-badius.json` or it does not exist. If you find yourself typing a
   number that describes an ant, a nest, a seed or the weather, stop and put it in the
   parameter file with a tag. The test suite fails the build on numeric literals in
   `src/core/systems/`.
2. **Adding a parameter means adding a tag.** The loader rejects any untagged constant.
   If you cannot cite it, it is **[C]**, and **[C]** values must be exposed in the UI as
   tunable and flagged as invented. That is not a demotion. Honest invention is fine;
   undeclared invention is not.
3. **Adding a mechanic means adding a row to `docs/SCIENCE.md`** — the rule as
   implemented, the tag, and the source — and registering its rule id in
   `src/core/provenance` so the inspector can show the citation for an ant that is
   currently following it.
4. **Never quietly upgrade a tag.** Promoting a **[B]** to **[A]** requires a _badius_
   citation in the pull request. "It seems reasonable" is a **[C]**.

### HARD RULE parameters

Some parameters are marked `HARD RULE` in the species file. These are behaviours that were
experimentally tested in this species and **rejected**. Implementing the intuitive version
would be a factual error, not a design choice:

- Foragers do not revert to inside work (`labour.taskReversionAllowed: false`).
- Losing foragers draws no replacements from other castes; larvae starve instead
  (`labour.backfillFromOtherCastes: false`).
- Worker size predicts neither seed size nor foraging distance
  (`foraging.workerSizePredicts*: false`).
- Majors raise the _rate_ at which small and medium seeds are opened. They do not widen
  the range of openable sizes (`seeds.majorsWidenOpenableSizeRange: false`).
- There is no soldier caste, and no defensive role for majors.

Do not "fix" these. If you believe one is wrong, open an issue with the paper.

## Code boundaries

- `src/core` is pure: no DOM, no `Date`, no `Math.random`, no Node built-ins, and none of
  the transcendental `Math` functions, which are not specified to be bit-identical across
  JavaScript engines and would silently break reproducibility. ESLint enforces all of
  this. See `docs/DETERMINISM.md`.
- `src/render` and `src/ui` read core state. They never write to it.
- Randomness comes from the injected `Prng`. Adding a new consumer of randomness changes
  the sequence and will fail the determinism test; that is the test working, and the
  golden hash should be regenerated deliberately and mentioned in the pull request.

## Checks

```bash
npm run typecheck && npm run lint && npm run format:check && npm test
```

CI runs the same four on every push and pull request.
