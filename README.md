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

## Status

Early. See `docs/DECISIONS.md` for the open questions and how they were resolved.

## Running it

```bash
npm install
npm run dev        # simulator in the browser
npm test           # determinism and validation suites
npm run headless   # seeded run, no renderer, machine-readable output
```

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
