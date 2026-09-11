# Primary sources

The papers themselves are **not in this repository**, and since 2026-09-10 no copies are kept
locally either. The project cites its sources the way a paper does. Every finding it uses is
written up, with its source, in `docs/SCIENCE.md`, and every number sits in
`species/pogonomyrmex-badius.json` with its own tag. To read a paper, follow its DOI.

The PDFs were read while the model was being built and deleted once their findings had been
recorded. A few were committed briefly on 2026-09-06 and removed from the history before the
repository was first published, so no public version of it has ever contained one.

| Paper                  | Citation                                                                                                                                                                                                                  | DOI or locator                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Nest architecture      | Tschinkel, W. R. (2004) The nest architecture of the Florida harvester ant, _Pogonomyrmex badius_. _Journal of Insect Science_ 4:21                                                                                       | `10.1093/jis/4.1.21` (open access)              |
| Worker characteristics | Tschinkel, W. R. (1998) Sociometry and sociogenesis of colonies of the harvester ant, _Pogonomyrmex badius_: worker characteristics in relation to colony size and season. _Insectes Sociaux_ 45:385–410                  | `10.1007/s000400050097`                         |
| Demography             | Kwapich, C. L. & Tschinkel, W. R. (2013) Demography, demand, death, and the seasonal allocation of labor in the Florida harvester ant. _Behavioral Ecology and Sociobiology_ 67:2011–2027                                  | `10.1007/s00265-013-1611-9`                     |
| Forager allocation     | Kwapich, C. L. & Tschinkel, W. R. (2016) Limited flexibility and unusual longevity shape forager allocation in the Florida harvester ant. _Behavioral Ecology and Sociobiology_ 70:221–235                                 | `10.1007/s00265-015-2039-1`                     |
| Foraging range         | Harrison, J. S. & Gentry, J. B. (1981) Foraging pattern, colony distribution, and foraging range of the Florida harvester ant, _Pogonomyrmex badius_. _Ecology_ 62:1467–1473                                              | `10.2307/1941503`                               |
| Germination            | Tschinkel, W. R. & Kwapich, C. L. (2016) The Florida harvester ant, _Pogonomyrmex badius_, relies on germination to consume large seeds. _PLoS ONE_ 11(11):e0166907                                                       | `10.1371/journal.pone.0166907` (open access)    |
| Dissertation           | Kwapich, C. L. (2014) The influence of demography, development and death on seasonal labor allocation in the Florida harvester ant (_Pogonomyrmex badius_). PhD dissertation, Florida State University                    | ProQuest UMI 3681741                            |

Every DOI above was checked against Crossref on 2026-09-11. Two had been wrong until then. The
one given for Kwapich & Tschinkel 2016 belonged to a paper on killer whales, and the one for
Harrison & Gentry 1981 to a paper on desert lizards printed on the next pages of the same issue.

## How closely each has been read

Reading a paper in full has corrected something every time, so this list records what has
actually been read, not just what is cited.

- **Tschinkel 2004.** Read in full. It corrected four values taken from secondary accounts,
  dissolved an apparent contradiction, and its Figures 9, 10 and 11 supplied the chamber areas,
  spacings and depth relations the nest checks are measured against.
- **Tschinkel 1998.** Results read in full. It supplied worker dry masses, replacing an invented
  estimate that was wrong by nearly a factor of two and had been setting the digging rate. It
  also supplied the cycles of body fat by depth and by season, the share of majors in each month
  and the relations between head width and body size.
- **Kwapich & Tschinkel 2013.** Read in full on 2026-09-11, after earlier readings of the
  Methods and Results only. It supplied the development schedules, how close to the surface
  foragers stay, the yearly cycle in the share of workers foraging, and the range of colony
  sizes.
- **Tschinkel & Kwapich 2016 (germination).** Read in full, all 34 pages, figures included. It
  supplied the seed size classes and their masses, the opening rates by size, germination rates
  by size and temperature, soil temperatures measured at 5 to 80 cm, and the evidence that
  germinating seeds are fed to larvae. It also corrected the parameter file, which had listed
  burial depth as a driver of germination. The burial experiment found no significant effect of
  depth.
- **Harrison & Gentry 1981.** Read in full. It supplied trail number, length and fidelity,
  foraging range area, colony spacing and relocation distances. Its colonies lived on an old
  field near Aiken, South Carolina, not in the Florida sandhills, which matters for range size.
  It showed that the 20 m foraging range the model borrows from _P. barbatus_ is several times
  too large for this species. See `docs/DECISIONS.md` D21.
- **Kwapich 2014 (dissertation).** Only the abstract, the introduction and the start of the
  methods have been read. The file on hand was a sixteen-page ProQuest preview, and until
  2026-09-10 it was mislabelled here as Kwapich & Tschinkel 2016. What it supplied is recorded in
  `docs/SCIENCE.md` §4 and cited to the dissertation, not to the 2016 paper.
- **Kwapich & Tschinkel 2016 (forager allocation).** **Not read.** It is cited for the
  no-reversion and no-backfill HARD RULEs, which the abstract of the dissertation it grew out of
  also states.
