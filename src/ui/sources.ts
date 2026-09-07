/**
 * Sources, provenance, and what this model refuses to do.
 *
 * This panel is not documentation bolted onto a simulation. It is the reason the project
 * exists: every mechanic on screen is either measured in this species, borrowed from
 * another ant, or invented, and a reader who cannot tell which is looking at a cartoon.
 *
 * Three tabs, and the third is the one that matters most. What a model declines to do is
 * as instructive as what it does, and several of the assumptions listed there were tested
 * in the field and rejected rather than merely being absent from the literature.
 */

import {
  NOT_MODELLED,
  REFERENCES,
  SOURCES_NOTICE,
  formatReference,
} from '../core/provenance/index.js'
import { allRules, ruleTagCounts } from '../core/provenance/index.js'
import type { Tag } from '../core/params/index.js'

/** Tag tallies from the parameter loader. */
export type ProvenanceCounts = Readonly<Record<Tag, number>>

type TabKey = 'sources' | 'provenance' | 'refused'

const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'sources', label: 'Sources' },
  { key: 'provenance', label: 'Where the numbers come from' },
  { key: 'refused', label: 'What this refuses to model' },
]

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className !== undefined) node.className = className
  if (text !== undefined) node.textContent = text
  return node
}

function renderSources(): DocumentFragment {
  const frag = document.createDocumentFragment()

  frag.append(
    el(
      'p',
      undefined,
      'The biology in this model is not ours. It is overwhelmingly the field work of Walter R. Tschinkel and Christina L. Kwapich in the Apalachicola National Forest, north Florida, over some three decades. Cite them, not this software, for any biological claim.',
    ),
  )

  frag.append(el('h3', undefined, 'The five this model is built on'))
  for (const ref of REFERENCES.filter((r) => r.primary === true)) {
    const row = el('div', 'ref ref--primary')
    row.append(el('div', undefined, formatReference(ref, false)))
    if (ref.usedFor !== undefined) row.append(el('p', 'used-for', ref.usedFor))
    if (ref.doi !== undefined) {
      const link = el('a')
      link.href = `https://doi.org/${ref.doi}`
      link.rel = 'noopener noreferrer'
      link.target = '_blank'
      link.textContent = `doi.org/${ref.doi}`
      row.append(link)
    }
    frag.append(row)
  }

  frag.append(el('h3', undefined, 'Also cited'))
  for (const ref of REFERENCES.filter((r) => r.primary !== true)) {
    frag.append(el('div', 'ref', formatReference(ref)))
  }

  frag.append(el('h3', undefined, 'On the papers themselves'))
  frag.append(el('p', undefined, SOURCES_NOTICE))
  return frag
}

function renderProvenance(counts: ProvenanceCounts): DocumentFragment {
  const frag = document.createDocumentFragment()

  frag.append(
    el(
      'p',
      undefined,
      'Every biological constant lives in one parameter file and carries its own tag, and no biological constant is hard-coded anywhere in the source. A test fails the build if one is. The tag travels with the number to the point where it is used, which is what stops a value and its provenance drifting apart.',
    ),
  )

  const grid = el('div', 'summary-grid')
  const tally: [string, number][] = [
    ['[A] measured in this species', counts.A],
    ['[B] from another ant', counts.B],
    ['[C] invented', counts.C],
  ]
  for (const [label, value] of tally) {
    const cell = el('div', 'summary-cell')
    cell.append(el('div', 'k', label), el('div', 'v', String(value)))
    grid.append(cell)
  }
  frag.append(grid)

  frag.append(el('h3', undefined, 'What the tags mean'))
  frag.append(
    el(
      'p',
      undefined,
      '[A] is documented for Pogonomyrmex badius specifically. [B] is generalised from a different ant because no badius measurement exists. [C] is invented for tractability or playability and has no evidential basis at all. A [C] value is not a failure of research; it is a place where the literature is silent, and it is marked so that a reader can disagree with it.',
    ),
  )

  const ruleCounts = ruleTagCounts()
  frag.append(el('h3', undefined, 'Rules an ant can be following'))
  frag.append(
    el(
      'p',
      undefined,
      `${allRules().length} rules are registered, of which ${ruleCounts.A} are measured in this species, ${ruleCounts.B} are generalised from another ant, and ${ruleCounts.C} are invented. Each carries its own citation.`,
    ),
  )

  frag.append(el('h3', undefined, 'The largest invented element'))
  frag.append(
    el(
      'p',
      undefined,
      'Digging ants behave differently at depth, and nobody knows how a real ant senses how deep it is. The obvious candidate, a carbon dioxide gradient, was tested by venting it away and by reversing it, and nest architecture was unchanged. This simulation hands a digging ant its own depth as an admitted stand-in for a cue nobody has identified.',
    ),
  )

  return frag
}

function renderRefused(): DocumentFragment {
  const frag = document.createDocumentFragment()
  frag.append(
    el(
      'p',
      undefined,
      'Every claim below is intuitive, commonly believed, and wrong for this species. The ones marked as tested were not merely absent from the literature; somebody went out and checked, and the answer was no.',
    ),
  )

  for (const item of NOT_MODELLED) {
    const row = el('div', 'refused')
    const claim = el('div', 'refused-claim')
    claim.append(document.createTextNode(item.assumption))
    if (item.experimentallyRejected) claim.append(el('span', 'tested', 'tested and rejected'))
    row.append(claim, el('p', 'refused-why', item.reason), el('p', 'refused-cite', item.citation))
    frag.append(row)
  }
  return frag
}

/**
 * Builds the sheet once and returns a function that opens it on a chosen tab. Building it
 * once matters: the reference list is long, and rebuilding it on every open would throw
 * away the reader's scroll position each time they came back to it.
 */
export function createSourcesSheet(counts: ProvenanceCounts): (tab?: TabKey) => void {
  const dialog = el('dialog', 'sheet')

  const head = el('div', 'sheet-head')
  const heading = el('h2', undefined, 'Sources and provenance')
  const close = el('button', 'sheet-close', 'Close')
  close.type = 'button'
  close.addEventListener('click', () => dialog.close())
  head.append(heading, close)

  const tabs = el('div', 'tabs')
  tabs.role = 'tablist'
  const body = el('div', 'sheet-body')

  const panels: Record<TabKey, () => DocumentFragment> = {
    sources: renderSources,
    provenance: () => renderProvenance(counts),
    refused: renderRefused,
  }

  const buttons = new Map<TabKey, HTMLButtonElement>()
  let rendered: TabKey | null = null

  function show(key: TabKey): void {
    if (rendered === key) return
    rendered = key
    for (const [k, button] of buttons) button.ariaSelected = String(k === key)
    body.replaceChildren(panels[key]())
    body.scrollTop = 0
  }

  for (const tab of TABS) {
    const button = el('button', undefined, tab.label)
    button.type = 'button'
    button.role = 'tab'
    button.addEventListener('click', () => show(tab.key))
    buttons.set(tab.key, button)
    tabs.append(button)
  }

  dialog.append(head, tabs, body)
  document.body.append(dialog)

  return (tab: TabKey = 'sources') => {
    show(tab)
    if (!dialog.open) dialog.showModal()
  }
}
