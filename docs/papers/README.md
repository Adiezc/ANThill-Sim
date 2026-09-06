# Primary sources

The papers this model is built from, kept alongside the code so that any claim in
`docs/SCIENCE.md` can be checked against its source without a library subscription.

| File | Paper | Used for |
|---|---|---|
| `tschinkel-2004-nest-architecture.pdf` | Tschinkel, W. R. (2004) The nest architecture of the Florida harvester ant, *Pogonomyrmex badius*. *Journal of Insect Science* 4:21 | Sections 2 and 3. The source of the architectural signature the excavation model is validated against |
| `tschinkel-1998-sociometry-sociogenesis.pdf` | Tschinkel, W. R. (1998) Sociometry and sociogenesis of colonies of the harvester ant *Pogonomyrmex badius*: worker characteristics in relation to colony size and season. *Insectes Sociaux* 45:385–410 | Sections 4 and 9. Caste proportions, worker size, fat cycle |
| `kwapich-tschinkel-2013-demography-demand-death.pdf` | Kwapich, C. L. & Tschinkel, W. R. (2013) Demography, demand, death, and the seasonal allocation of labor in the Florida harvester ant. *Behavioral Ecology and Sociobiology* | Section 4. Forager lifespan, development rate, the forager-removal experiment |
| `kwapich-tschinkel-seasonal-labour-allocation.pdf` | Kwapich, C. L. & Tschinkel, W. R. Influence of demography, development and death on seasonal labor allocation in the Florida harvester ant | Section 4. Seasonal labour allocation |
| `harrison-gentry-1981-foraging-range.pdf` | Harrison, J. S. & Gentry, J. B. (1981) Foraging pattern, colony distribution, and foraging range of the Florida harvester ant. *Ecology* 62:1467–1473 | Section 5. Trunk trails, foraging range, range exclusivity |

## Reading status

`tschinkel-2004-nest-architecture.pdf` has been read in full and `docs/SCIENCE.md` sections
2 and 3 have been rewritten from it, including several corrections to figures that had come
from secondary accounts. Corrections are marked in that file.

The other four have been indexed and their abstracts and methods checked against the
corresponding sections of `SCIENCE.md`, which they confirm. They will be read at the depth
the 2004 paper has been when the sections that depend on them are built — demography and
labour at step 5, foraging at step 6. Numbers taken from them before then remain flagged
with the source they currently come from.

## A licensing point for the repository owner

The code here is MIT and `docs/` and `species/` are CC BY 4.0, but **these PDFs are not
ours to relicense**, and redistributing them is a separate question from citing them.

- **Tschinkel 2004** was published in *Journal of Insect Science*, which is open access.
- **Harrison & Gentry 1981** (*Ecology*, Wiley/ESA) and **Tschinkel 1998** (*Insectes
  Sociaux*, Springer) are almost certainly **not** open access, and the Kwapich &
  Tschinkel papers (*Behavioral Ecology and Sociobiology*, Springer) are very likely not
  either.

Keeping personal copies locally is ordinary scholarly practice. Publishing them in a public
GitHub repository is redistribution, and for the subscription titles that is likely to be a
copyright problem regardless of intent. Before this repository goes public, either confirm
each paper's licence, or move this directory into `.gitignore` and replace it with a
citation list carrying DOIs — which loses nothing, because `SCIENCE.md` already carries
every number and every attribution.

Nothing in the simulation reads these files. They are reference material only.
