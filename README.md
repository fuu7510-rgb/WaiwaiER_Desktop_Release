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

データ互換性（直近2世代のマイグレーション運用）: `docs/DATA_COMPATIBILITY.md`

### 必要条件

- Node.js 18+
- Rust (Tauri用)
- pnpm / npm / yarn

※ `npm run tauri:dev` / `npm run tauri:build` は内部で `corepack pnpm ...` を実行します。初回は `corepack` を有効化してください（`corepack: command not found` が出る環境では `npm i -g corepack` が必要です）。

Windowsで `npm` が認識されない場合は、Node.js（npm同梱）が未インストール、または `PATH` 未設定の可能性があります。Node.jsをインストール後、ターミナル/VS Codeを開き直して `node -v` / `npm -v` で確認してください。

複数プロジェクトでNodeのバージョンを切り替える場合は、Windows向けのNodeバージョンマネージャ（例: nvm-windows）を利用するのが簡単です。本リポジトリには `.nvmrc`（推奨メジャーバージョン）が含まれます。

### セットアップ

```bash
# pnpm を使えるようにする（初回のみ）
npm i -g corepack
corepack enable
corepack prepare pnpm@latest --activate

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

## リリース運用（ストア不使用）

- 本アプリはストア配布を前提とせず、手動アップデート（差し替え）で運用します。
- リリースチャネルは環境変数 `VITE_RELEASE_CHANNEL` で切り替えます（`alpha|beta|stable`、既定: `alpha`）。
  - `.env.example` を `.env` にコピーして利用してください。
  - 例（PowerShell）: `$env:VITE_RELEASE_CHANNEL='alpha'; npm run tauri:build`

詳しい手順は `docs/RELEASE_ALPHA_PLAN.md` を参照してください。

## ライセンス

Copyright © 2025 Fuaze. All rights reserved.
