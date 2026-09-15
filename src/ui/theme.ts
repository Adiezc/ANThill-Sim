/**
 * The two themes, and the one place that decides which is showing.
 *
 * Dark is the default. The nest is sand-coloured and lit, so against a dark surround it is the
 * brightest thing on the screen, which is where the eye should go. A reader who prefers a
 * light page can switch, and the choice is remembered in this browser.
 *
 * The canvases draw their own sky and ruler, so they need telling when the theme changes.
 * That is what the listeners are for.
 */

import { DEFAULT_THEME } from '../render/nest-view.js'
import type { NestViewTheme } from '../render/nest-view.js'

export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'anthill-theme'
const listeners: ((theme: Theme) => void)[] = []

export function currentTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** The remembered choice. Storage can be unavailable, and any failure means dark. */
export function storedTheme(): Theme {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** Applies the remembered theme on load, without writing anything. */
export function initTheme(): void {
  document.documentElement.dataset.theme = storedTheme()
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme
  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // A private window or blocked storage. The page still switches, it just will not remember.
  }
  for (const listener of listeners) listener(theme)
}

export function toggleTheme(): void {
  applyTheme(currentTheme() === 'dark' ? 'light' : 'dark')
}

/** Calls back whenever the theme changes, and returns a function that stops it. */
export function onThemeChange(listener: (theme: Theme) => void): () => void {
  listeners.push(listener)
  return () => {
    const i = listeners.indexOf(listener)
    if (i >= 0) listeners.splice(i, 1)
  }
}

/** The label for a button that switches to the other theme. */
export function themeToggleLabel(): string {
  return currentTheme() === 'dark' ? 'Light theme' : 'Dark theme'
}

/**
 * The nest canvas in each theme. The sand, the cavities and the brood keep their colours in
 * both, because they are the specimen. Only the sky above the ground line and the ruler change,
 * so the picture sits in the page rather than on top of it.
 */
export function nestThemeFor(theme: Theme): NestViewTheme {
  if (theme === 'light') return DEFAULT_THEME
  return {
    ...DEFAULT_THEME,
    sky: '#1c2226',
    rule: 'rgba(236,232,223,0.45)',
    ruleText: 'rgba(236,232,223,0.8)',
  }
}
