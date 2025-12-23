# WaiwaiER Desktop

オフラインファーストのER図エディタ デスクトップアプリケーション

## 概要

WaiwaiER Desktopは、ネットワーク不要で動作するER図（Entity-Relationship Diagram）エディタです。
Tauri 2.x + React + TypeScriptで構築されています。

## 機能

- **ビジュアルERエディタ**: ドラッグ&ドロップでテーブルを配置
- **リレーション管理**: テーブル間のリレーションを視覚的に設定
- **Undo/Redo**: 操作履歴管理（Ctrl+Z / Ctrl+Y）
- **シミュレーター**: テーブル・デッキ・詳細・フォームビュー
- **プロジェクト管理**: 複数プロジェクトの作成・管理
- **暗号化**: プロジェクト単位でのデータ暗号化（オプション）
- **多言語対応**: 日本語・英語

## 技術スタック

- **Framework**: Tauri 2.x (Rust backend)
- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **i18n**: i18next

## 開発

### 必要条件

- Node.js 18+
- Rust (Tauri用)
- pnpm / npm / yarn

### セットアップ

```bash
# 依存関係のインストール
npm install

# 開発サーバー起動（Webのみ）
npm run dev

# Tauri開発モード
npm run tauri:dev

# ビルド
npm run tauri:build
```

### プロジェクト構造

```
src/
├── components/
│   ├── EREditor/      # ER図エディタ
│   ├── Simulator/     # シミュレーター
│   ├── Layout/        # レイアウト
│   ├── Project/       # プロジェクト管理
│   ├── Settings/      # 設定
│   └── common/        # 共通コンポーネント
├── stores/            # Zustand stores
├── types/             # TypeScript型定義
├── i18n/              # 多言語対応
└── lib/               # ユーティリティ

src-tauri/             # Rustバックエンド
├── src/
└── Cargo.toml
```

## ライセンス

Copyright © 2025 Fuaze. All rights reserved.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
