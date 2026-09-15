/**
 * Sources, provenance, and what this model refuses to do.
 *
 * This panel is not documentation bolted onto a simulation. It is the reason the project
 * exists. Every mechanic on screen is measured in this species, borrowed from another ant or
 * invented, and a reader who cannot tell which is looking at a cartoon.
 *
 * Three tabs, and the third matters most. What a model declines to do teaches as much as
 * what it does, and several of the assumptions listed there were tested in the field and
 * rejected, not merely missing from the literature.
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
  { key: 'refused', label: 'What the model leaves out' },
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
      'The biology in this model is not ours. Almost all of it comes from three decades of field work by Walter R. Tschinkel and Christina L. Kwapich in the Apalachicola National Forest, north Florida. Cite them, not this software, for any claim about the ants.',
    ),
  )

  frag.append(el('h3', undefined, 'The five papers the model is built on'))
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

  frag.append(el('h3', undefined, 'About the papers'))
  frag.append(el('p', undefined, SOURCES_NOTICE))
  return frag
}

function renderProvenance(counts: ProvenanceCounts): DocumentFragment {
  const frag = document.createDocumentFragment()

  frag.append(
    el(
      'p',
      undefined,
      'Every biological number lives in one parameter file, with a label saying where it came from. None is typed directly into the code, and the build fails if one ever is. The label travels with the number to wherever the model uses it, so a value and its source cannot drift apart.',
    ),
  )

  const grid = el('div', 'summary-grid')
  const tally: [string, number][] = [
    ['[A] Measured in this species', counts.A],
    ['[B] Borrowed from another ant', counts.B],
    ['[C] Invented', counts.C],
  ]
  for (const [label, value] of tally) {
    const cell = el('div', 'summary-cell')
    cell.append(el('div', 'k', label), el('div', 'v', String(value)))
    grid.append(cell)
  }
  frag.append(grid)

  frag.append(el('h3', undefined, 'What the labels mean'))
  frag.append(
    el(
      'p',
      undefined,
      '[A] was measured in Pogonomyrmex badius itself. [B] comes from a different ant, because nobody has measured it in this one. [C] is invented to make the model work and has no evidence behind it. An invented value is not a research failure. It marks a gap in the literature, labelled so that you can disagree with it.',
    ),
  )

  const ruleCounts = ruleTagCounts()
  frag.append(el('h3', undefined, 'The rules an ant can follow'))
  frag.append(
    el(
      'p',
      undefined,
      `The model has ${allRules().length} behaviour rules. ${ruleCounts.A} are measured in this species, ${ruleCounts.B} are borrowed from other ants and ${ruleCounts.C} are invented. Click an ant in the simulator to see which one it is following and where it comes from.`,
    ),
  )

  frag.append(el('h3', undefined, 'The biggest invention'))
  frag.append(
    el(
      'p',
      undefined,
      'Digging ants behave differently at depth, and nobody knows how a real ant senses how deep it is. The obvious candidate, a gradient of carbon dioxide, was tested by venting the gas away and by reversing the gradient, and the shape of the nest did not change. So the model simply tells each digging ant its depth, and says so here.',
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
      'Each claim below sounds reasonable, is widely believed and is wrong for this species. The ones marked as tested were checked in the field, and the answer was no.',
    ),
  )

  for (const item of NOT_MODELLED) {
    const row = el('div', 'refused')
    const claim = el('div', 'refused-claim')
    claim.append(document.createTextNode(item.assumption))
    if (item.experimentallyRejected) claim.append(el('span', 'tested', 'Tested and rejected'))
    row.append(claim, el('p', 'refused-why', item.reason), el('p', 'refused-cite', item.citation))
    frag.append(row)
  }
  return frag
}

/**
 * Builds the sheet once and returns a function that opens it on a chosen tab. Building it
 * once keeps the reader's place: the reference list is long, and rebuilding it on every
 * open would throw away the scroll position each time they came back.
 */
export function createSourcesSheet(counts: ProvenanceCounts): (tab?: TabKey) => void {
  const dialog = el('dialog', 'sheet')

  const head = el('div', 'sheet-head')
  const heading = el('h2', undefined, 'Sources and evidence')
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
