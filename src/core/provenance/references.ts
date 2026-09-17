/**
 * The reference list, as data.
 *
 * It lives in `/core` and not in the UI because three things need the same list and must not
 * be allowed to disagree: the citations panel in the simulator, the methods report a batch run
 * writes, and `docs/SCIENCE.md`. A citation that exists in one and not the others is how a model
 * quietly loses its provenance.
 *
 * **No PDF of any of these is distributed with this software.** Most are not ours to
 * redistribute, and the ones that are would be no more citable for being copied. Every number
 * taken from them lives in `species/pogonomyrmex-badius.json` with its own tag, and the DOIs
 * below are how a reader gets the papers themselves. See `docs/papers/README.md`.
 *
 * A DOI appears here only where it has been checked. The five primary DOIs were checked against
 * Crossref on 2026-09-11, and two of them turned out to point at other papers: one on killer
 * whales, one on desert lizards. Both are corrected. Where a DOI is absent the entry is still a
 * complete citation, because an invented DOI would be worse than none.
 */

export interface Reference {
  /** Short key, as it appears in the rule registry and in docs/SCIENCE.md. */
  readonly key: string
  readonly authors: string
  readonly year: string
  readonly title: string
  readonly journal?: string
  readonly doi?: string
  /**
   * True for the sources this model is actually built on, as opposed to those it cites in
   * passing. The five primary sources supply nearly every [A] value in the parameter file.
   */
  readonly primary?: boolean
  /** What this model took from it. Present for the primary sources. */
  readonly usedFor?: string
}

export const REFERENCES: readonly Reference[] = [
  {
    key: 'tschinkel-2004',
    authors: 'Tschinkel, W. R.',
    year: '2004',
    title: 'The nest architecture of the Florida harvester ant, Pogonomyrmex badius',
    journal: 'Journal of Insect Science 4:21',
    doi: '10.1093/jis/4.1.21',
    primary: true,
    usedFor:
      'The shape of the nest: chamber areas by depth, chamber spacing, the top-heavy layout, shaft and chamber sizes, and the relation between nest size and worker number that the digging checks are measured against. Read in full. Its Figures 9, 10 and 11 corrected four values taken from secondary accounts.',
  },
  {
    key: 'tschinkel-1998',
    authors: 'Tschinkel, W. R.',
    year: '1998',
    title:
      'Sociometry and sociogenesis of colonies of the harvester ant, Pogonomyrmex badius: worker characteristics in relation to colony size and season',
    journal: 'Insectes Sociaux 45:385-410',
    doi: '10.1007/s000400050097',
    primary: true,
    usedFor:
      'Worker dry masses, which set how fast the ants dig. Also the cycles of body fat by depth and by season that move workers into foraging, and the share of majors in each month.',
  },
  {
    key: 'kwapich-tschinkel-2013',
    authors: 'Kwapich, C. L. & Tschinkel, W. R.',
    year: '2013',
    title:
      'Demography, demand, death, and the seasonal allocation of labor in the Florida harvester ant',
    journal: 'Behavioral Ecology and Sociobiology 67:2011-2027',
    doi: '10.1007/s00265-013-1611-9',
    primary: true,
    usedFor:
      'How fast brood develops, the age at which a worker first forages depending on when it hatched, how close to the surface foragers stay, the yearly cycle in the share of workers foraging, and the range of colony sizes.',
  },
  {
    key: 'kwapich-tschinkel-2016',
    authors: 'Kwapich, C. L. & Tschinkel, W. R.',
    year: '2016',
    title:
      'Limited flexibility and unusual longevity shape forager allocation in the Florida harvester ant',
    journal: 'Behavioral Ecology and Sociobiology 70:221-235',
    doi: '10.1007/s00265-015-2039-1',
    primary: true,
    usedFor:
      'The two HARD RULEs the colony’s demography is built on. Foragers never return to work inside, and when foragers are removed no other workers replace them. Larval survival falls instead.',
  },
  {
    key: 'harrison-gentry-1981',
    authors: 'Harrison, J. S. & Gentry, J. B.',
    year: '1981',
    title:
      'Foraging pattern, colony distribution, and foraging range of the Florida harvester ant, Pogonomyrmex badius',
    journal: 'Ecology 62:1467-1473',
    doi: '10.2307/1941503',
    primary: true,
    usedFor:
      'Trunk trails, the size of the foraging range, and the finding that a range is used almost exclusively by one colony without being defended.',
  },

  {
    key: 'achenbach-foitzik-2009',
    authors: 'Achenbach, A. & Foitzik, S.',
    year: '2009',
    title: 'First evidence for slave rebellion',
    journal: 'Evolution',
  },
  {
    key: 'avinery-2023',
    authors: 'Avinery, R. et al.',
    year: '2023',
    title: 'Agitated ants',
    journal: 'Journal of the Royal Society Interface',
  },
  {
    key: 'belachew-2025',
    authors: 'Belachew, M., Arson, C. & Frost, J. D.',
    year: '2025',
    title: 'Insights from studies on the spatial distribution of chambers in ant nests',
  },
  {
    key: 'beverly-2009',
    authors: 'Beverly, B. D. et al.',
    year: '2009',
    title:
      'How site fidelity leads to individual differences in the foraging activity of harvester ants',
    journal: 'Behavioral Ecology',
  },
  {
    key: 'bruce-2018',
    authors: 'Bruce, A. I. et al.',
    year: '2018',
    title: 'The digging dynamics of ant tunnels',
    journal: 'Insectes Sociaux',
  },
  {
    key: 'brunner-2009',
    authors: 'Brunner, E. et al.',
    year: '2009',
    title: 'Worker dominance and policing in Temnothorax unifasciatus',
    journal: 'Insectes Sociaux',
  },
  {
    key: 'buarque-2021',
    authors: 'Buarque de Macedo, R. et al.',
    year: '2021',
    title: 'Unearthing real-time 3D ant tunneling mechanics',
    journal: 'PNAS',
  },
  {
    key: 'buhl-2005',
    authors: 'Buhl, J. et al.',
    year: '2005',
    title: 'Self-organized digging activity in ant colonies',
    journal: 'Behavioral Ecology and Sociobiology',
  },
  {
    key: 'czaczkes-2024',
    authors: 'Czaczkes, T. et al.',
    year: '2024',
    title: 'Ants deposit more pheromone close to food sources',
    journal: 'Insectes Sociaux',
  },
  {
    key: 'diez-2012',
    authors: 'Diez, L. et al.',
    year: '2012',
    title: 'Social prophylaxis through distant corpse removal',
    journal: 'Naturwissenschaften',
  },
  {
    key: 'diez-2014',
    authors: 'Diez, L. et al.',
    year: '2014',
    title: 'Keep the nest clean',
    journal: 'Biology Letters',
  },
  {
    key: 'diez-2015',
    authors: 'Diez, L. et al.',
    year: '2015',
    title: 'Emergency measures',
    journal: 'Behavioural Processes',
  },
  {
    key: 'enzmann-nonacs-2010',
    authors: 'Enzmann, B. L. & Nonacs, P.',
    year: '2010',
    title:
      'Digging beneath the surface: incipient nest characteristics across three species of harvester ant that differ in colony founding strategy',
    journal: 'Insectes Sociaux 57:115-123',
    doi: '10.1007/s00040-009-0056-7',
  },
  {
    key: 'espinoza-santamarina-2010',
    authors: 'Espinoza, D. & Santamarina, J.',
    year: '2010',
    title: 'Ant tunneling, a granular media perspective',
  },
  {
    key: 'ferster-traniello-1995',
    authors: 'Ferster, B. & Traniello, J.',
    year: '1995',
    title: 'Polymorphism and foraging behavior in Pogonomyrmex badius',
    journal: 'Environmental Entomology',
  },
  {
    key: 'garcia-ibarra-2023',
    authors: 'García Ibarra, F. A. et al.',
    year: '2023',
    title: 'Experimental evidence that increased surface temperature affects bioturbation by ants',
  },
  {
    key: 'genzoni-2025',
    authors: 'Genzoni, E. et al.',
    year: '2025',
    title: 'Trophic eggs affect caste determination in the ant Pogonomyrmex rugosus',
    journal: 'eLife',
  },
  {
    key: 'halley-2005',
    authors: 'Halley, J. D., Burd, M. & Wells, P.',
    year: '2005',
    title: 'Excavation and architecture of Argentine ant nests',
    journal: 'Insectes Sociaux 52:350-356',
  },
  {
    key: 'bossert-wilson-1963',
    authors: 'Bossert, W. H. & Wilson, E. O.',
    year: '1963',
    title: 'The analysis of olfactory communication among animals',
    journal: 'Journal of Theoretical Biology 5:443-469',
  },
  {
    key: 'holldobler-wilson-1970',
    authors: 'Hölldobler, B. & Wilson, E. O.',
    year: '1970',
    title: 'Recruitment trails in the harvester ant Pogonomyrmex badius',
    journal: 'Psyche',
  },
  {
    key: 'khuong-2016',
    authors: 'Khuong, A. et al.',
    year: '2016',
    title: 'Stigmergic construction and topochemical information shape ant nest architecture',
    journal: 'PNAS',
  },
  {
    key: 'kwapich-2024',
    authors: 'Kwapich, C. L. et al.',
    year: '2024',
    title: 'A kleptoparasitic beetle larva exploits vertical division of labor',
    journal: 'Insectes Sociaux',
  },
  {
    key: 'lebrun-2025',
    authors: 'LeBrun, E. et al.',
    year: '2025',
    title: 'Social immunity in a supercolonial invasive ant',
    journal: 'Journal of Animal Ecology',
  },
  {
    key: 'leclerc-detrain-2016',
    authors: 'Leclerc, J.-B. & Detrain, C.',
    year: '2016',
    title: 'Ants detect but do not discriminate diseased workers',
    journal: 'The Science of Nature',
  },
  {
    key: 'leclerc-2017',
    authors: 'Leclerc, J.-B. et al.',
    year: '2017',
    title: 'Impact of colony size on survival and sanitary strategies',
    journal: 'Behavioral Ecology and Sociobiology',
  },
  {
    key: 'monaenkova-2015',
    authors: 'Monaenkova, D. et al.',
    year: '2015',
    title: 'Behavioral and mechanical determinants of collective subsurface nest excavation',
    journal: 'Journal of Experimental Biology',
  },
  {
    key: 'monnin-ratnieks-2001',
    authors: 'Monnin, T. & Ratnieks, F.',
    year: '2001',
    title: 'Policing in queenless ponerine ants',
    journal: 'Behavioral Ecology and Sociobiology',
  },
  {
    key: 'motro-2016',
    authors: 'Motro, M. et al.',
    year: '2016',
    title:
      'Decision making by young queens of the harvester ant Messor semirufus while searching for a suitable nesting site',
    journal: 'Insectes Sociaux',
  },
  {
    key: 'nickerson-fasulo-edis',
    authors: 'Nickerson, J. C. & Fasulo, T. R.',
    year: 'n.d.',
    title: 'Florida harvester ant, Pogonomyrmex badius',
    journal: 'UF/IFAS Extension, EDIS publication EENY-298 (IN536). A secondary account',
  },
  {
    key: 'pielstrom-roces-2013',
    authors: 'Pielström, S. & Roces, F.',
    year: '2013',
    title: 'Sequential soil transport',
    journal: 'PLoS ONE',
  },
  {
    key: 'rajendran-2025',
    authors: 'Rajendran, H. et al.',
    year: '2025',
    title: 'Colony demographics shape nest construction in Camponotus fellah ants',
    journal: 'eLife',
  },
  {
    key: 'rasse-deneubourg-2001',
    authors: 'Rasse, P. & Deneubourg, J.-L.',
    year: '2001',
    title: 'Dynamics of nest excavation and nest size regulation of Lasius niger',
    journal: 'Journal of Insect Behavior 14:433-449',
  },
  {
    key: 'sankovitz-purcell-2021',
    authors: 'Sankovitz, M. & Purcell, J.',
    year: '2021',
    title:
      'Ant nest architecture is shaped by local adaptation and plastic response to temperature',
    journal: 'Scientific Reports',
  },
  {
    key: 'smith-tschinkel-2006',
    authors: 'Smith, C. R. & Tschinkel, W. R.',
    year: '2006',
    title:
      'The sociometry and sociogenesis of reproduction in the Florida harvester ant, Pogonomyrmex badius',
    journal: 'Journal of Insect Science 6:32',
    doi: '10.1673/2006_06_32.1',
  },
  {
    key: 'stroeymeyt-2007',
    authors: 'Stroeymeyt, N. et al.',
    year: '2007',
    title: 'Selfish worker policing',
    journal: 'Behavioral Ecology and Sociobiology',
  },
  {
    key: 'sumpter-beekman-2003',
    authors: 'Sumpter, D. & Beekman, M.',
    year: '2003',
    title: 'From nonlinearity to optimality',
    journal: 'Animal Behaviour',
  },
  {
    key: 'tschinkel-1999',
    authors: 'Tschinkel, W. R.',
    year: '1999',
    title:
      'Sociometry and sociogenesis of Pogonomyrmex badius: distribution of workers, brood and seeds',
    journal: 'Ecological Entomology',
  },
  {
    key: 'tschinkel-2013',
    authors: 'Tschinkel, W. R.',
    year: '2013',
    title:
      'Florida harvester ant nest architecture, nest relocation and soil carbon dioxide gradients',
    journal: 'PLoS ONE',
  },
  {
    key: 'tschinkel-2014',
    authors: 'Tschinkel, W. R.',
    year: '2014',
    title: 'Nest relocation and excavation in the Florida harvester ant',
    journal: 'PLoS ONE',
  },
  {
    key: 'tschinkel-2015',
    authors: 'Tschinkel, W. R.',
    year: '2015',
    title: 'The architecture of subterranean ant nests',
    journal: 'Journal of Bioeconomics',
  },
  {
    key: 'tschinkel-2017',
    authors: 'Tschinkel, W. R.',
    year: '2017',
    title: 'Do Florida harvester ant colonies have a nest architecture "plan"?',
    journal: 'Ecology',
  },
  {
    key: 'tschinkel-kwapich-2016',
    authors: 'Tschinkel, W. R. & Kwapich, C. L.',
    year: '2016',
    title: 'The Florida harvester ant relies on germination to consume large seeds',
    journal: 'PLoS ONE',
  },
  {
    key: 'tschinkel-kwapich-2017',
    authors: 'Tschinkel, W. R. & Kwapich, C. L.',
    year: '2017',
    title: 'Vertical organization of the division of labor',
    journal: 'PLoS ONE',
  },
  {
    key: 'tschinkel-seal-2015',
    authors: 'Tschinkel, W. R. & Seal, J.',
    year: '2015',
    title: 'Sequential subterranean transport of excavated sand and foraged seeds',
    journal: 'PLoS ONE',
  },
  {
    key: 'mcgurk-1966',
    authors: 'McGurk, D. J. et al.',
    year: '1966',
    title:
      'Volatile compounds in ants: identification of 4-methyl-3-heptanone from Pogonomyrmex ants',
    journal: 'Journal of Insect Physiology',
  },
  {
    key: 'wilson-1958',
    authors: 'Wilson, E. O.',
    year: '1958',
    title:
      'A chemical releaser of alarm and digging behavior in the ant Pogonomyrmex badius (Latreille)',
    journal: 'Psyche 65:41-51',
  },
]

/** The five the model is actually built on. */
export function primaryReferences(): readonly Reference[] {
  return REFERENCES.filter((r) => r.primary === true)
}

/**
 * One line, in the form a reference list uses.
 *
 * `withDoi` is off where the panel renders the DOI separately as a link, and on in the written
 * report, where there is nothing to click and the identifier has to be in the text.
 */
export function formatReference(reference: Reference, withDoi = true): string {
  const parts = [`${reference.authors} (${reference.year})`, reference.title]
  if (reference.journal !== undefined) parts.push(reference.journal)
  const line = `${parts.join('. ')}.`
  return reference.doi === undefined || !withDoi ? line : `${line} doi:${reference.doi}`
}

/**
 * The standing notice about the papers themselves. Shown in the simulator and written into
 * every batch report, because a reader who wants the sources needs to be told plainly that they
 * are not in this repository, and where to find them instead.
 */
export const SOURCES_NOTICE =
  'No PDF of any cited paper comes with this software. Most are not ours to redistribute, and a copy would be no more citable than the original. Every value taken from them carries its own provenance tag in the parameter file. Follow the DOIs above to read the papers themselves.'
