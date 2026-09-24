import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(import.meta.dirname, '..')

function tracked(): string[] | null {
  try {
    return execFileSync('git', ['ls-files'], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .split('\n')
      .filter(Boolean)
  } catch {
    // Not a git checkout. A tarball is a legitimate way to receive this project and the
    // absence of git is not a test failure.
    return null
  }
}

/**
 * The primary sources are read locally and never redistributed.
 *
 * Most of them are not redistributable, and copying a paper into a repository does not make
 * it more citable. Everything the model takes from them lives in the parameter file with its
 * own provenance tag, and `docs/papers/README.md` carries the DOIs.
 *
 * `.gitignore` states the intent. This test enforces it, because `git add -f` exists and a
 * mistake here is one that reaches everybody who clones the repository.
 */
describe('the papers are cited, not redistributed', () => {
  it('tracks no PDF anywhere in the repository', () => {
    const files = tracked()
    if (files === null) return
    const pdfs = files.filter((f) => f.toLowerCase().endsWith('.pdf'))
    expect(pdfs).toEqual([])
  })

  it('keeps the notice and the DOIs that stand in for them', () => {
    const notice = readFileSync(join(ROOT, 'docs', 'papers', 'README.md'), 'utf8')
    expect(notice).toContain('not in this repository')
    // Every primary source has to be reachable by DOI, since the file itself is not here.
    // Checked against Crossref on 2026-09-11. Until then this list held two wrong DOIs, one for
    // a paper on killer whales and one for a paper on lizards, so the test was guarding the error.
    for (const doi of [
      '10.1093/jis/4.1.21',
      '10.1007/s000400050097',
      '10.1007/s00265-013-1611-9',
      '10.1007/s00265-015-2039-1',
      '10.2307/1941503',
    ]) {
      expect(notice).toContain(doi)
    }
  })

  it('ignores study output, so a run cannot be committed by accident', () => {
    const ignore = readFileSync(join(ROOT, '.gitignore'), 'utf8')
    expect(ignore).toContain('/out/')
    expect(ignore).toContain('docs/papers/*.pdf')
  })
})

/**
 * One version number, everywhere a reader or a citation manager looks for it.
 *
 * GitHub's "Cite this repository" button and Zenodo both read `CITATION.cff`, and the README
 * gives the citation by hand. A release that bumped one and not the others would archive a DOI
 * whose metadata names the wrong version, and a Zenodo record cannot be corrected afterwards.
 */
describe('the version is the same everywhere it is stated', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as { version: string }
  const cff = readFileSync(join(ROOT, 'CITATION.cff'), 'utf8')
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8')

  it('in the citation file', () => {
    expect(cff).toMatch(new RegExp(`^version: ${pkg.version.replaceAll('.', '\\.')}$`, 'm'))
  })

  it('in the README citation and status line', () => {
    expect(readme).toContain(`Version ${pkg.version}. Zenodo.`)
    expect(readme).toContain(`**Status: version ${pkg.version},`)
  })

  it('in the ODD description', () => {
    const odd = readFileSync(join(ROOT, 'docs', 'ODD.md'), 'utf8')
    expect(odd).toContain(`This describes Anthill ${pkg.version} `)
  })

  it('with the DOI that resolves to every version', () => {
    const conceptDoi = /^doi: (\S+)$/m.exec(cff)?.[1]
    expect(conceptDoi).toBeDefined()
    expect(readme).toContain(`https://doi.org/${conceptDoi}`)
  })
})
