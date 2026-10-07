import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default [
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'node_modules/**',
      'playwright-report/**',
      // The server is TypeScript, checked by its own compiler.
      'server/**',
      // Bundles, built from source that is linted.
      'plugin/server/**',
      'vscode/dist/**',
    ],
  },

  js.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  // Last, so it can turn off the rules that fight Prettier.
  skipFormatting,

  {
    // Node context: config files and Playwright specs run outside the browser.
    files: [
      '*.config.js',
      'e2e/**/*.js',
      '.claude/hooks/*.mjs',
      'scripts/*.mjs',
      'scripts/video/*.mjs',
      'scripts/video/*.js',
      'bin/*.mjs',
      'vscode/src/**/*.js',
      'vscode/test/*.js',
      '.github/actions/**/*.mjs',
    ],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        // Playwright evaluates these inside the page, not in Node.
        document: 'readonly',
        window: 'readonly',
        getComputedStyle: 'readonly',
      },
    },
  },

  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        structuredClone: 'readonly',
        globalThis: 'readonly',
        File: 'readonly',
        FileReader: 'readonly',
        Image: 'readonly',
        Event: 'readonly',
        KeyboardEvent: 'readonly',
        URL: 'readonly',
        crypto: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
        Blob: 'readonly',
        Response: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        requestAnimationFrame: 'readonly',
      },
    },
    rules: {
      // Components here are named by their file, and several are single words.
      'vue/multi-word-component-names': 'off',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
]
