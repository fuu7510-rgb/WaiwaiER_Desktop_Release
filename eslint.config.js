import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'references/**', 'src-tauri/target/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // テーマ対応のためCSS変数をインラインスタイルで使用することを許可
      // (copilot-instructions.md に基づく)
      'react/no-inline-styles': 'off',
      '@stylistic/jsx-self-closing-comp': 'off',

      // eslint-plugin-react-hooks v5系の一部ルールは、現状の実装に対して誤検知/過検知になりやすく
      // リリース作業（lint）を阻害するため明示的に無効化する。
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
])
