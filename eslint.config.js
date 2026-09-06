// @ts-check
import js from '@eslint/js'
import tseslint from 'typescript-eslint'

/**
 * The boundaries encoded here are not style. They are the two guarantees the project
 * makes to anyone using it as a research instrument:
 *
 *   1. /core is pure: no DOM, no wall clock, no ambient randomness.
 *   2. /core is deterministic across JavaScript engines, which means no unspecified
 *      transcendental Math calls. See docs/DETERMINISM.md.
 *
 * Violations are build failures, not review comments.
 */

/** Math members that ECMA-262 does NOT require to be bit-identical across engines. */
const UNSPECIFIED_MATH = [
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  'exp',
  'expm1',
  'pow',
  'log',
  'log2',
  'log10',
  'log1p',
  'cbrt',
  'hypot',
]

const CORE_BANNED_GLOBALS = [
  'window',
  'document',
  'navigator',
  'location',
  'localStorage',
  'sessionStorage',
  'fetch',
  'performance',
  'requestAnimationFrame',
  'setTimeout',
  'setInterval',
  'queueMicrotask',
  'crypto',
  'process',
]

export default tseslint.config(
  { ignores: ['dist/', '.tsbuild/', 'coverage/', 'node_modules/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      eqeqeq: ['error', 'always'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: {
      'no-restricted-globals': [
        'error',
        ...CORE_BANNED_GLOBALS.map((name) => ({
          name,
          message: `/core must run unchanged in Node and in a Worker. "${name}" is not available there. See docs/ARCHITECTURE.md.`,
        })),
        {
          name: 'Date',
          message:
            '/core has no wall clock. Simulated time comes from the Clock. See docs/ARCHITECTURE.md.',
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            '/core takes its randomness from the injected Prng. Math.random breaks reproducibility.',
        },
        ...UNSPECIFIED_MATH.map((property) => ({
          object: 'Math',
          property,
          message: `Math.${property} is not specified to be bit-identical across engines and would silently diverge a seeded run between Chrome, Firefox and Node. Use src/core/math instead. See docs/DETERMINISM.md.`,
        })),
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/render/**', '**/ui/**', '**/worker/**', 'node:*'],
              message: '/core may not depend on the renderer, the UI or Node built-ins.',
            },
          ],
        },
      ],
    },
  },
  {
    // The deterministic math module is the one place allowed to touch the host Math,
    // and only to build its tables offline. Its runtime path must not.
    files: ['src/core/math/reference.ts', 'tools/**/*.ts'],
    rules: { 'no-restricted-properties': 'off' },
  },
  {
    files: ['src/render/**/*.ts', 'src/ui/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/core/**/mutate*', '**/core/**/step*'],
              message: 'The renderer and UI read core state. They never advance or mutate it.',
            },
          ],
        },
      ],
    },
  },
)
