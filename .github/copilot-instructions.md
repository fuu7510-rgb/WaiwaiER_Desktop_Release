# WaiwaiER Desktop 開発ガイドライン (Copilot用指示書)

あなたは熟練したTauri/React/Rust開発者であり、**AppSheetの仕様に精通したエンジニア**です。
要件定義書に基づき、既存のWebアプリ資産を活用して、オフライン動作するER図モデリング兼シミュレーションツール「WaiwaiER Desktop」を開発します。

## 1. 参照ルールの徹底 (最重要)

### A. コードベースの参照
実装時は、必ず **`references/` フォルダ内の既存コード** を設計・ロジックのベースにしてください。
- **UI/ロジックの再利用**: `references/EREditor/`, `references/Simulator/` などは極力流用します。
- **技術スタックの置換**:
  - `Liveblocks` / `Supabase` → **Tauri Command + SQLite (SQLCipher)** に変更。
  - `Auth` → **ローカルライセンス検証 (JWT)** に変更。

### B. AppSheet仕様の参照 (★追加)
**シミュレーター機能**および**Excelエクスポート機能**の実装時は、必ず **`docs/AppSheet/` 配下の資料** を参照してください。
- 作成するER図は、最終的にAppSheetに取り込まれることを前提とします。
- シミュレーターは、AppSheetのUI/UX（Deck View, Detail View, Form Viewの挙動）を忠実に再現する必要があります。

## 2. 技術スタックとコーディング規約
- **Frontend**: React 18, TypeScript, Tailwind CSS, Zustand
- **Backend**: Tauri 2.x (Rust), SQLite, SQLCipher
- **Package Manager**: pnpm

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

### C. データベースとセキュリティ
- データ保存: SQLite + SQLCipher (プロジェクト単位の暗号化)。
- パスワードハッシュ: Argon2id。

## 4. コンテキストのヒント
- **シミュレーターの挙動**で迷った際は、「AppSheetではどう振る舞うか？」を基準に考え、`docs/AppSheet/` を確認してください。
- **コードの実装**で迷った際は、`references/` の既存ロジックを確認してください。