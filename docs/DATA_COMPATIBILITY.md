# データ互換性・マイグレーション運用ルール

WaiwaiER Desktop のローカル保存データ（ER図JSON・`.waiwai`パッケージ）を、アプリ更新で壊さないための運用ルールです。

本プロジェクトでは「読み込み時に最新版へ段階変換（migrate）する」方式を採用し、**直近2世代**のデータをサポートします。

---

## 1. サポート方針（直近2世代）

- **サポート対象**: 現行スキーマ `current` と、その直前2世代 `current-1`, `current-2`
- **非サポート**: `current-3` 以前（古すぎる）/ `current+1` 以降（新しすぎる）
- **扱い**:
  - 新しすぎる場合: 「アプリをアップデートしてください」と明確にエラー
  - 古すぎる場合: 「中間バージョンを経由してアップデートしてください」と明確にエラー

このルールにより、互換性維持のコストを抑えつつ、ユーザーのデータ破損を回避します。

---

## 1.1 段階アップデート（ブリッジ版）で「できるだけ全部」に近づける

「1つのアプリバージョンが直近2世代しか読めない」方針でも、**中間バージョン（ブリッジ版）を経由して保存し直す**ことで、より古いデータを最終的に最新へ持ち上げられます。

### ユーザー向けの手順（基本形）

1. 最新版で読み込みを試す
2. 「古すぎるため読み込めません。中間バージョンを経由して…」というエラーが出たら、エラー内の **データ世代（例: v1）** を確認する
3. その世代をサポートする中間版（例: **サポート: v1〜v3** のように表示される版）を入手して起動する
4. 中間版でデータを読み込み、**保存（または .waiwai にエクスポート）** して最新版形式に変換する
5. 変換後のデータを最新版で読み込む

ポイント:
- 変換の本体は「読み込み時の migrate + 保存は常に最新」という仕組みです。
- したがって、中間版では“開いて保存し直す”だけで最新版形式へ近づきます。

### 開発/運用ルール（ブリッジ版を提供する側）

- **古いインストーラ/リリース成果物を継続公開**する（GitHub Releases 等に残す）
- リリースノートに、少なくとも次を明記する
  - 現行データ世代 `DIAGRAM_SCHEMA_VERSION`
  - 読み込み可能な下限 `MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION`
  - （.waiwai について）パッケージ形式世代の範囲
- 互換性を大きく壊す変更（ID体系変更など）を入れる場合は、
  - その直前に **ブリッジ専用の安定版**（変換目的で配布する版）を用意し、ユーザーに案内できる状態にする

この方式なら、アプリ本体の互換コードを無制限に増やさずに、実運用としては「できるだけ古いデータも最終的に救える」形にできます。

---

## 2. 互換性の対象を分ける

互換性は大きく2つあります。

1. **ER図JSONのスキーマ互換**
   - `tables/relations/memos` などの構造変更に対応
   - 実装は `src/lib/diagramSchema.ts`

2. **パッケージ形式（.waiwai）の互換**
   - メタデータやファイル構造（将来ZIP化等）に対応
   - 実装は `src/lib/package.ts`

（SQLiteのテーブル/列互換も将来増えますが、当面は ER図JSON と `.waiwai` を優先します）

---

## 3. ER図JSONスキーマ運用（diagram schema）

### 3.1 保存フォーマット（envelope）

保存時は、ER図をそのまま保存せず **envelope形式**で保存します。

- 形式: `{"schemaVersion": number, "diagram": ERDiagram}`
- 書き込みは常に最新: `schemaVersion === DIAGRAM_SCHEMA_VERSION`

### 3.2 マイグレーションのルール

- 読込時は常に `decodeAndMigrateDiagram()` を通す
- migrateは**段階的**に書く（例: `v1→v2→v3` のように1ステップずつ）
- migrateは**破壊的変更をしない**（意味が変わる変換は避け、必要なら新フィールド追加＋既定値）
- `normalize`（欠損値の補完/既定値付与）はmigrateの中に含めて良い

### 3.3 スキーマバージョンを上げる基準

次のような変更をしたら `DIAGRAM_SCHEMA_VERSION` を上げます。

- フィールドの必須化（例: `memos` を必須にする）
- フィールド名の変更/移動
- 型の変更（例: string → object / number → string 等）
- 解釈が変わる変更（例: enum値の変更、ID構造の変更）

逆に、単なる「任意フィールド追加」など、旧データがそのまま動作する変更はバージョンを上げない場合があります（ただし迷うなら上げる方が安全）。

---

## 4. `.waiwai` パッケージ運用（package format）

### 4.1 メタデータ

`.waiwai` の `metadata` には次を持ちます。

- `packageFormatVersion`（パッケージ形式の世代）
- `diagramSchemaVersion`（ER図JSONスキーマの世代）

旧パッケージにこれらが無い場合は、後方互換のために推定/既定値で扱います（`diagramSchemaVersion` は 0 扱いなど）。

### 4.2 世代チェック

import時は、以下を満たすときだけ読み込み・migrateを行います。

- `MIN_SUPPORTED_PACKAGE_FORMAT_VERSION ≤ packageFormatVersion ≤ PACKAGE_FORMAT_VERSION`
- `MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION ≤ diagramSchemaVersion ≤ DIAGRAM_SCHEMA_VERSION`

---

## 5. リリース前チェックリスト

互換性を壊さないため、リリース前に最低限次を確認します。

- `src/lib/diagramSchema.ts`:
  - `DIAGRAM_SCHEMA_VERSION` を上げたなら、`current-1` と `current-2` からの migrate が存在する
  - `MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION` が「直近2世代」になっている
- `src/lib/package.ts`:
  - `PACKAGE_FORMAT_VERSION` を上げたなら、直近2世代の import を許可する条件になっている
- 手動動作確認:
  - 旧データ（JSON/パッケージ）を読み込んで編集→保存→再読込できる

---

## 6. 実装箇所（コードの参照）

- ER図スキーマ互換: `src/lib/diagramSchema.ts`
- 保存/復元（DB/LocalStorage）: `src/lib/database.ts`
- パッケージ入出力: `src/lib/package.ts`

---

## 7. よくある落とし穴

- 「保存時に旧形式も書く」は禁止（保存は常に最新）。分岐が増えて破綻します。
- migrateでデータを削らない（ユーザーが入力した情報が失われると復旧が困難）。
- `current+1`（未来版）を読もうとしない。必ずエラーでアップデート誘導します。
