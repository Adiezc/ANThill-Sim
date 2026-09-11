# Primary sources

The papers themselves are **not committed**, and since 2026-09-10 they are not kept locally
either. This project cites the literature the way a paper does: every finding it uses is
written up, with its source, in `docs/SCIENCE.md`, and every number is in
`species/pogonomyrmex-badius.json` with its own tag. A reader who wants a paper follows its
DOI.

The PDFs were read here while the model was being built and then deleted once their findings
had been recorded. They were briefly committed early on (2026-09-06) and removed from the
history before the repository was first published, so no version of this repository has
ever distributed one.

| Paper | Citation | DOI / locator |
|---|---|---|
| Nest architecture | Tschinkel, W. R. (2004) The nest architecture of the Florida harvester ant, *Pogonomyrmex badius*. *Journal of Insect Science* 4:21 | `10.1093/jis/4.1.21` — open access |
| Worker characteristics | Tschinkel, W. R. (1998) Sociometry and sociogenesis of colonies of the harvester ant, *Pogonomyrmex badius*: worker characteristics in relation to colony size and season. *Insectes Sociaux* 45:385–410 | `10.1007/s000400050097` |
| Demography | Kwapich, C. L. & Tschinkel, W. R. (2013) Demography, demand, death, and the seasonal allocation of labor in the Florida harvester ant. *Behavioral Ecology and Sociobiology* 67:2011–2027 | `10.1007/s00265-013-1611-9` |
| Forager allocation | Kwapich, C. L. & Tschinkel, W. R. (2016) Limited flexibility and unusual longevity shape forager allocation in the Florida harvester ant. *Behavioral Ecology and Sociobiology* 70:221–235 | `10.1007/s00265-015-2038-2` |
| Foraging range | Harrison, J. S. & Gentry, J. B. (1981) Foraging pattern, colony distribution, and foraging range of the Florida harvester ant, *Pogonomyrmex badius*. *Ecology* 62:1467–1473 | `10.2307/1941504` |
| Germination | Tschinkel, W. R. & Kwapich, C. L. (2016) The Florida harvester ant, *Pogonomyrmex badius*, relies on germination to consume large seeds. *PLoS ONE* 11(11):e0166907 | `10.1371/journal.pone.0166907` — open access |
| Dissertation | Kwapich, C. L. (2014) The influence of demography, development and death on seasonal labor allocation in the Florida harvester ant (*Pogonomyrmex badius*). PhD dissertation, Florida State University | ProQuest UMI 3681741 |

## How deeply each has been read

Reading a paper in full has corrected something every time, so this records what has
actually been read rather than what has been cited.

- **Tschinkel 2004** — read in full. Corrected four values taken from secondary accounts,
  dissolved an apparent contradiction, and its Figures 9, 10 and 11 supplied the chamber
  areas, spacings and depth relations the architecture gate is measured against.
- **Tschinkel 1998** — Results read in full. Supplied worker dry masses (replacing a [C]
  estimate that was wrong by nearly a factor of two and had been feeding the excavation
  rate), the fat-by-depth and fat-by-season cycles, major worker proportions by month, and
  the headwidth relations.
- **Kwapich & Tschinkel 2013** — Methods and Results read. Supplied the development
  schedules, forager depths, proportion-foraging cycle and the colony size range.
- **Tschinkel & Kwapich 2016 (germination)** — read in full, all 34 pages, figures
  included. Supplied the seed size classes and masses, the size-specific opening rates, the
  germination rates by size and temperature, measured soil temperatures at 5 to 80 cm, and
  the evidence that germinating seeds are fed to larvae. It also corrected the parameter
  file: burial depth had been listed as a driver of germination, and the burial experiment
  found no significant effect of depth.
- **Harrison & Gentry 1981** — read in full. Supplied trail number, length and fidelity,
  foraging range area, colony spacing, and relocation distances. Its population is an old
  field near Aiken, South Carolina, not the Florida sandhills, which matters for the range
  sizes. It showed that the 20 m foraging range the model borrows from *P. barbatus* is
  several times too large for this species; see `docs/DECISIONS.md` D21.
- **Kwapich 2014 (dissertation)** — abstract, introduction and the start of the methods
  only. The file on hand was a sixteen-page ProQuest preview, and until 2026-09-10 it was
  mislabelled here as Kwapich & Tschinkel 2016. What it supplied is recorded in
  `docs/SCIENCE.md` §4 and cited to the dissertation, not to the 2016 paper.
- **Kwapich & Tschinkel 2016 (forager allocation)** — the paper itself has **not** been
  read. It is cited for the no-reversion and no-backfill HARD RULEs, and the dissertation
  abstract, which it was published from, states both.
