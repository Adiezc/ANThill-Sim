/**
 * The panel for the second audience.
 *
 * A browser tab runs one colony well and cannot run a study. Saying so plainly beats letting
 * somebody find out after leaving thirty tabs open overnight. So this panel states the
 * limit, explains the reproducibility guarantee that makes the limit bearable, and hands
 * over the command that does what the tab cannot.
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

/** The folder `git clone` creates, which is the last part of the repository address. */
function cloneFolder(repoUrl: string): string {
  const last = repoUrl.replace(/\/+$/, '').split('/').pop()
  return last !== undefined && last !== '' && !last.includes('.') ? last : 'ANThill-Sim'
}

export function createInstrumentSheet(repoUrl: string): () => void {
  const studyCommand = [
    `git clone ${repoUrl}`,
    `cd ${cloneFolder(repoUrl)}`,
    'npm install',
    'npm run study -- --replicates 30 --years 12 --out out/my-study',
  ].join('\n')

  const dialog = el('dialog', 'sheet')

  const head = el('div', 'sheet-head')
  const close = el('button', 'sheet-close', 'Close')
  close.type = 'button'
  close.addEventListener('click', () => dialog.close())
  head.append(el('h2', undefined, 'Run your own study'), close)

  const body = el('div', 'sheet-body')

  body.append(
    el('h3', undefined, 'Why the browser runs only one colony'),
    el(
      'p',
      undefined,
      'This page runs exactly the same model as the command line, with the same parameters and the same random numbers. What it cannot do is run many colonies. A colony of a few thousand workers, each moving once a simulated minute, makes around a billion updates a year, and a study needs dozens of colonies.',
    ),
    el('h3', undefined, 'Your computer will get the same answer'),
    el(
      'p',
      undefined,
      'Every run draws on one seeded random number generator and moves forward in fixed one-minute steps, in a fixed order. The project even carries its own maths functions, because browsers are not required to compute a sine or an exponential identically. Everything the model does is arithmetic that every engine must get exactly right, so the same seed and parameter file give the same run, bit for bit, in Chrome, Firefox and Node. A test pins the result of a seeded run, so any change that alters it fails the build.',
    ),
    el('h3', undefined, 'Running a study'),
    el(
      'p',
      undefined,
      'Each replicate is one seed, so a study splits across as many machines as you have and the pieces join up afterwards. Every run records a fingerprint of its state at each checkpoint, so anyone can rerun a seed and confirm it matches.',
    ),
  )

  body.append(el('pre', 'command', studyCommand))

  body.append(
    el('h3', undefined, 'What you get'),
    el(
      'p',
      undefined,
      'A methods report in Markdown, a spreadsheet-ready CSV with one row per colony per year, and the full record of every run. The report lists the code version, the fingerprint of the parameter file, the seeds, every invented value the results depend on, and which of the model’s own validation checks it currently passes and fails.',
    ),
    el('h3', undefined, 'What the model gets wrong'),
    el(
      'p',
      undefined,
      'Read the validation gates before using output for anything. Colonies that pass 700 workers, the size at which they rear queens and males, fall back the following year, where real colonies hold about 4300, and the seed on the ground that lets them grow is invented and fitted. How fast a seed germinates in a packed chamber is calibrated against one field count rather than measured, and how much seed makes an ant is invented. Moving house costs a colony nothing. These are stated in the report the run writes, not buried.',
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
  linkLine.append(document.createTextNode('Code, licence and citation details at '), link)
  body.append(linkLine)

  dialog.append(head, body)
  document.body.append(dialog)

  return () => {
    if (!dialog.open) dialog.showModal()
  }
}
