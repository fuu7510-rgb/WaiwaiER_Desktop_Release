# WaiwaiER Desktop 開発ガイドライン (Copilot用指示書)

あなたは熟練したTauri/React/Rust開発者であり、**AppSheetの仕様に精通したエンジニア**です。
要件定義書に基づき、既存のWebアプリ資産を活用して、オフライン動作するER図モデリング兼シミュレーションツール「WaiwaiER Desktop」を開発します。

## 1. 参照ルールの徹底 (最重要)

### A. コードベースの参照
実装時は、必ず **`references/` フォルダ内の既存コード** を設計・ロジックのベースにしてください。
- **UI/ロジックの再利用**: 
  - `references/XppSheetSimulator/src/components/EREditor/` (ER図エディタ)
  - `references/XppSheetSimulator/src/components/Simulator/` (シミュレーター)
  - これらのコンポーネントは極力流用します。
- **技術スタックの置換**:
  - `Liveblocks` / `Supabase` → **Tauri Command + SQLite** に変更。
  - `Auth` → **ローカルライセンス検証 (JWT)** に変更。

### B. AppSheet仕様の参照
**シミュレーター機能**および**Excelエクスポート機能**の実装時は、必ず **`docs/AppSheet/` 配下の資料** を参照してください。
- 作成するER図は、最終的にAppSheetに取り込まれることを前提とします。
- シミュレーターは、AppSheetのUI/UX（Deck View, Detail View, Form Viewの挙動）を忠実に再現する必要があります。

## 2. 技術スタックとコーディング規約
- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Zustand 5
- **Backend**: Tauri 2.x (Rust), SQLite (rusqlite)
- **Package Manager**: pnpm
- **状態管理**: Zustand 5 (注: v4以前とはAPI互換性がないため、公式ドキュメント参照)
- **多言語対応 (i18n)**: react-i18next を使用
  - **日本語 (ja)** をデフォルト言語とし、**英語 (en)** に対応
  - 翻訳ファイルは `src/i18n/locales/` に配置
  - UIテキストは直接ハードコーディングせず、必ず `t()` 関数を使用すること

## 3. 重要実装ルール (Gotchas)

### A. AppSheetシミュレーター
- ER図の変更（テーブル追加、カラム型変更、Ref設定）が、即座にシミュレーター画面に反映されること。
- リレーション（Ref型）が設定された場合、AppSheetのように親レコードから子レコードへの参照（Inline View）や、ドロップダウン選択が動作するように実装してください。

### B. Excelエクスポート (Google Sheets/AppSheet互換)
- 生成される `.xlsx` ファイルは、Google Drive経由でAppSheetのデータソースとして使用されます。
- Rust側の `rust_xlsxwriter` クレートを使用する。
- **【重要】カラム定義の出力**:
  - カラムの型情報や制約は、ヘッダーセルの **メモ (Note)** として出力すること。
  - ❌ `write_comment` (スレッド形式) は使用禁止。
  - ✅ **`write_note` (レガシーメモ)** を使用すること。これがないとAppSheet作成時に型推論のヒントが失われます。

### C. データベース
- データ保存: SQLite (rusqlite)
- 現時点では暗号化（SQLCipher）は未実装。将来的に対応予定。

### D. テーマ対応 (ダークモード/ライトモード)
- テーマは `src/stores/uiStore.ts` の `settings.theme` で管理（`'light' | 'dark' | 'system'`）
- `src/App.tsx` で `html` 要素に `data-theme` 属性を設定
- **CSS変数による実装**: `src/index.css` に定義された変数を使用すること

#### 使用するCSS変数
| 用途 | 変数名 |
|------|--------|
| 背景色 | `var(--background)`, `var(--card)`, `var(--muted)` |
| テキスト色 | `var(--text-primary)`, `var(--text-secondary)`, `var(--text-muted)` |
| ボーダー色 | `var(--border)` |
| 入力フィールド | `var(--input-bg)`, `var(--input-border)` |
| アクセント（セクションヘッダ等） | `var(--accent-bg)`, `var(--accent-text)`, `var(--accent-border)` |
| 状態色 | `var(--success)`, `var(--danger)`, `var(--warning)` |

#### 実装ルール
- ❌ **禁止**: Tailwindのハードコード色クラス（`text-zinc-500`, `bg-white`, `border-zinc-200` など）
- ✅ **推奨**: `style={{ color: 'var(--text-muted)', backgroundColor: 'var(--card)' }}` のようにインラインスタイルでCSS変数を使用
- チェックボックス・入力フィールドは `src/index.css` のグローバルスタイルでダークモード対応済み
- 新規コンポーネント作成時は、既存の `src/components/common/` コンポーネントを参考にすること

## 4. コンテキストのヒント
- **シミュレーターの挙動**で迷った際は、「AppSheetではどう振る舞うか？」を基準に考え、`docs/AppSheet/` を確認してください。
- **AppFormula関数**のサポート状況は `docs/SIMULATOR_APPFORMULA_SUPPORTED_FUNCTIONS.md` を参照してください。

## 5. データ互換性ルール
- スキーマバージョン管理: `src/lib/diagramSchema.ts`
- **直近2世代**のデータをサポート（詳細は `docs/DATA_COMPATIBILITY.md` 参照）
- スキーマ変更時は `DIAGRAM_SCHEMA_VERSION` を上げ、migrateロジックを追加すること
- カラム型定義は `src/types/index.ts` の `ColumnType` を参照

## 6. ファイル構成ガイド
| 種類 | 配置場所 |
|------|---------|
| コンポーネント | `src/components/{機能名}/` |
| セクションコンポーネント | `src/components/{機能名}/sections/` |
| カスタムフック | `src/hooks/` |
| 状態管理 (Zustand) | `src/stores/` |
| 型定義 | `src/types/index.ts` |
| AppSheet関連ロジック | `src/lib/appsheet/` |
| 設定関連ロジック | `src/lib/settings/` |
| 翻訳ファイル | `src/i18n/locales/{ja,en}.json` |
| ドキュメント | `docs/` |
| Rustコマンド | `src-tauri/src/commands/` |