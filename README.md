# Anthill

An agent-based simulation of a single colony of the Florida harvester ant,
_Pogonomyrmex badius_, from the nuptial flight of one mated queen through claustral
founding, self-organised excavation, trunk-trail foraging, seed storage and germination,
seasonal cycles and annual nest relocation, to the death of the colony. It runs in a
browser at one URL with nothing to install, and headless in Node for anyone who wants to
use it as an instrument rather than watch it.

It is not a game with ants in it. No ant holds a map, a plan, or any knowledge of the nest
as a whole. Every structure that appears on screen is a by-product of individual ants
following local rules. You are not in charge of them.

Every modelled mechanic carries a provenance tag, reachable in one click from the
simulator itself:

| Tag     | Meaning                                                                   |
| ------- | ------------------------------------------------------------------------- |
| **[A]** | Documented for _Pogonomyrmex badius_ specifically                         |
| **[B]** | Generalised from another ant species because _badius_ data does not exist |
| **[C]** | Invented for playability or tractability, with no direct evidential basis |

The simulator also ships a panel for mechanics it deliberately **refuses** to model —
intuitive assumptions that were tested in this species and rejected. What a model declines
to do is as instructive as what it does. See [`docs/SCIENCE.md`](docs/SCIENCE.md) §11.

## Two ways to use it

The simulator opens on a choice, because it has two audiences who want incompatible things
from it.

**Watch a colony.** One colony, in a browser tab, from the founding queen to the end of the
run. Nothing to install.

**Use it as an instrument.** Replicate runs on your own machine, with a methods file written
at the end. A browser tab runs one colony well and cannot run a study: a colony of a few
thousand workers on a one-minute timestep is on the order of a billion agent updates per
simulated year. Replicates are independent, sharded by seed, and embarrassingly parallel.

## Status

Early, and honest about it. Founding, excavation, the demographic engine, climate, foraging
and the inside of the nest are built: ants move around underground, the queen sits in the
brood chambers, brood is kept somewhere rather than merely counted, and seeds a forager
brings home are put down in the top chambers for other workers to carry toward the seed
chambers. Germination, seed size classes and annual relocation are not built, and nothing
eats a seed yet, so larval survival is still a forager-to-larva proxy.

Two failures are worth knowing before you watch it. Colonies dig far deeper than their
worker number warrants, and because most of the workforce ends up at a dig face, the
vertical sorting of workers by task and the downward movement of the seed store — both
things the model implements and both measured in the field — barely happen in a grown
colony. Both have the same cause. See [`docs/VALIDATION.md`](docs/VALIDATION.md) for the
acceptance gates this model meets and the ones it fails, and `docs/DECISIONS.md` for the
open questions.

## Running it

```bash
npm install
npm run dev        # simulator in the browser
npm test           # determinism and validation suites
npm run headless   # one seeded run, no renderer, machine-readable output
```

### Running a study

```bash
npm run study -- --replicates 30 --years 12 --out out/my-study
```

Writes four files:

| File            | What it is                                                                                                                                         |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `REPORT.md`     | Methods, provenance, the invented values the results rest on, the acceptance gates this model fails, and the exact command that reproduces the run |
| `runs.csv`      | One row per replicate-year, with the state digest for that year                                                                                    |
| `runs.jsonl`    | Full per-run records, including the digest chain                                                                                                   |
| `manifest.json` | What was run, and the SHA-256 of the parameter file it was run against                                                                             |

**Read `REPORT.md` before using `runs.csv`.** It states what the model does not reproduce.

To split a large study across machines, give each a disjoint seed range with `--seed-from`
and `--replicates` and concatenate the CSVs. No coordination is needed: replicates share
nothing.

## Hosting it

The browser build is a static site and deploys to GitHub Pages for free.
[`.github/workflows/pages.yml`](.github/workflows/pages.yml) builds and publishes on every
push to `main`; in the repository settings, set Pages to build from GitHub Actions. The
`BASE_PATH` for a project site is handled already.

## For scientists

- **Deterministic.** One seeded PRNG, injected, never ambient. A fixed timestep. The same
  seed and the same parameter file produce a byte-identical run in Chrome, Firefox and
  Node. This is asserted by a test, not by hope. See
  [`docs/DETERMINISM.md`](docs/DETERMINISM.md).
- **Parameterised.** Every biological constant lives in
  [`species/pogonomyrmex-badius.json`](species/pogonomyrmex-badius.json), each carrying its
  own A/B/C tag. No biological constant is hard-coded anywhere in the source, and the
  build fails if one is.
- **Cited.** [`docs/SCIENCE.md`](docs/SCIENCE.md) states every mechanic, the rule as
  implemented, and its source. The simulator surfaces the citation for whatever rule an
  ant is following at the moment you inspect it.
- **Headless.** `/src/core` imports no DOM and no Node built-ins, and runs unchanged in
  both.

## A note on the papers

**No PDF of any cited paper is in this repository, and none will be.** Most are not
redistributable, and copying one would not make it more citable. Every number taken from
them lives in [`species/pogonomyrmex-badius.json`](species/pogonomyrmex-badius.json) with
its own provenance tag, and [`docs/papers/README.md`](docs/papers/README.md) carries the
DOIs. A test fails the build if a PDF is ever committed.

## How to cite

If you use this software or its parameter data, please cite it. GitHub renders a
"Cite this repository" button from [`CITATION.cff`](CITATION.cff).

> Diez Cuadrado, A. _Anthill Simulator: an agent-based model of Pogonomyrmex badius._

The underlying biology is not ours. It is overwhelmingly the field work of Walter R.
Tschinkel and Christina L. Kwapich in the Apalachicola National Forest, north Florida,
together with the other authors listed in `docs/SCIENCE.md`. Cite them, not us, for any
biological claim.

## Licence

- Code: MIT ([`LICENSE`](LICENSE))
- `docs/` and `species/`: CC BY 4.0 ([`LICENSE-docs`](LICENSE-docs))

Author: Adrian Diez Cuadrado.
