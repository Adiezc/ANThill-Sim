/**
 * Ambient types for the Vite-specific globals the page uses.
 *
 * Declared here rather than by adding `vite/client` to the app's `types`, because that
 * would also pull in ambient module declarations for every asset type Vite can import, and
 * the point of the narrow `types: []` in tsconfig.app.json is that this build has no
 * ambient surface it did not ask for.
 */

interface ImportMetaEnv {
  /** True under `vite dev`, false in a production build, so guarded blocks are removed. */
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
  readonly BASE_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
