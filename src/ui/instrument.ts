/**
 * The panel for the second audience.
 *
 * A browser tab runs one colony well and cannot run a study, and saying so plainly is
 * better than letting somebody discover it after leaving thirty tabs open overnight. So
 * this panel states the limit, states the reproducibility guarantee that makes the limit
 * bearable, and hands over the command that does the thing the tab cannot.
 */

import { SOURCES_NOTICE } from '../core/provenance/index.js'

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

export function createInstrumentSheet(repoUrl: string): () => void {
  const studyCommand = [
    `git clone ${repoUrl}`,
    'cd anthill-sim',
    'npm install',
    'npm run study -- --replicates 30 --years 12 --out out/my-study',
  ].join('\n')

  const dialog = el('dialog', 'sheet')

  const head = el('div', 'sheet-head')
  const close = el('button', 'sheet-close', 'Close')
  close.type = 'button'
  close.addEventListener('click', () => dialog.close())
  head.append(el('h2', undefined, 'Using this as an instrument'), close)

  const body = el('div', 'sheet-body')

  body.append(
    el('h3', undefined, 'What a browser tab can and cannot do'),
    el(
      'p',
      undefined,
      'This page runs one colony, and runs it properly: the same core, the same parameter file, the same seeded arithmetic as a headless run. What it cannot do is run a study. A colony of a few thousand workers on a one-minute timestep is on the order of a billion agent updates per simulated year, and replicates want a machine and a shell, not a tab and a laptop lid.',
    ),
    el('h3', undefined, 'Why a result here can be reproduced there'),
    el(
      'p',
      undefined,
      'One seeded generator, injected and never ambient. A fixed timestep. A system order fixed at construction. No unspecified maths: the trigonometric and exponential functions are the project’s own, because the standard library’s are not specified to be bit-identical between engines. The same seed and the same parameter file give a byte-identical run in Chrome, in Firefox and in Node, and a test asserts it rather than a README claiming it.',
    ),
    el('h3', undefined, 'Running a study'),
    el(
      'p',
      undefined,
      'Replicate runs are sharded by seed and are embarrassingly parallel. Every run writes its state digest at each checkpoint, so a reviewer can re-run one seed and verify it reproduces byte for byte.',
    ),
  )

  const pre = el('pre', 'command', studyCommand)
  body.append(pre)

  body.append(
    el('h3', undefined, 'What comes out'),
    el(
      'p',
      undefined,
      'A methods report in Markdown, a tidy CSV with one row per run-year, and the raw per-run records. The report states the parameter-file hash, the commit, the seed list, every invented value the run relied on, and the validation gates this model meets and the ones it does not, taken from the project’s own record rather than written fresh for the occasion.',
    ),
    el('h3', undefined, 'On what is not yet modelled'),
    el(
      'p',
      undefined,
      'Read the validation gates before using output for anything. Seed stores, germination and annual relocation are not built yet, and the food account that ought to connect foraging to larval survival is still a proxy. These are stated in the report the run writes, not buried.',
    ),
    el('h3', undefined, 'Sources'),
    el('p', undefined, SOURCES_NOTICE),
  )

  const link = el('a')
  link.href = repoUrl
  link.rel = 'noopener noreferrer'
  link.target = '_blank'
  link.textContent = repoUrl
  const linkLine = el('p')
  linkLine.append(document.createTextNode('Source, licence and citation file: '), link)
  body.append(linkLine)

  dialog.append(head, body)
  document.body.append(dialog)

  return () => {
    if (!dialog.open) dialog.showModal()
  }
}
