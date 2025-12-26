# Simulator 修正計画書（案）

作成日: 2025-12-26

この計画書は、ユーザーが挙げた問題点（6点）を「実装可能なタスク」に落とし込み、影響範囲と受け入れ条件を明確化するためのものです。

関連実装（現状）:
- `src/components/Simulator/Simulator.tsx`（左ナビ + TableView + 右ペイン編集）
- `src/components/Simulator/TableView.tsx`（一覧表示、検索、Refラベル表示）
- `src/stores/erStore.ts`（sampleDataByTableId、reorderTables、reorderColumn、reorderSampleRows）
- `src/lib/sampleData.ts`（サンプルデータ生成）
- 既存の並べ替えUI例:
  - `src/components/Layout/Sidebar.tsx`（テーブルの並べ替え: DnD優先 + 上下ボタン）
  - `src/components/EREditor/TableNode.tsx`（カラムの並べ替え: DnD優先 + 上下ボタン）

---

## ゴール

- シミュレーターのサンプルデータが「固定5行」ではなく、初期は5行程度で、最大100行まで扱える。
- 自動生成文字列が“ランダムで役に立たない”問題を解消し、原則「空欄」ベースにする（必要最小限のみ生成）。
- 「サンプルデータ更新」ボタンを廃止し、全体再生成に頼らない。
- Ref表示で、祖先（親の親など）のラベルがID羅列になるケースを改善する。
- Simulator上で、テーブル順／カラム順を入れ替え可能にする。

---

## 問題点→対応方針

### 1) 1テーブル5行固定（初期5行、固定ではない。上限100行）

現状:
- `generateSampleData(table, 5)` が複数箇所にハードコード。
- カラム変更等で sampleData が“再生成（5行で上書き）”されるため、仮に行数を増やしても維持できない。

方針:
- `DEFAULT_SAMPLE_ROWS = 5` / `MAX_SAMPLE_ROWS = 100` を導入。
- 「再生成＝常に5行」から脱却し、
  - 既存の行数があるならその行数を維持（ただし最大100）
  - 無い場合のみ初期5行
  という生成ポリシーに変更する。

追加検討（UI）:
- 行数が可変である以上、Simulatorに最低限の行追加手段が必要。
  - 案A（最小）: 上部バーに「行追加」ボタン（最大100、超過は無効化）。
  - 案B: 右ペインに「削除」も追加して実運用しやすくする。

受け入れ条件:
- 新規/読込直後は各テーブル5行が生成される。
- 行数を増やした後、カラム追加/更新/削除/順序変更をしても行数が維持される（上限100）。

主な変更箇所（予定）:
- `src/stores/erStore.ts`（generateSampleData呼び出しの集約/置換、行数維持）
- `src/components/Simulator/Simulator.tsx`（行追加UIを入れる場合）

---

### 2) 自動生成文字が適当すぎる → それなら空欄が良い

現状:
- `src/lib/sampleData.ts` がfaker等でそれっぽい値を生成（ID風/人名/会社名など）。

方針:
- 原則「空欄」生成に切替。
- 例外（必要最小限のみ生成）:
  - Ref整合性のためのキー（参照先のkey列が空だとRefが成立しない）
  - ただし“ランダムID”ではなく、**決定的で読みやすい**値にする（例: `ROW-0001` など）
  - `dummyValues`（ユーザーが明示したサンプル候補）がある場合はそれを優先

受け入れ条件:
- Text/Number/Dateなど、ほとんどの型が空欄で初期化される。
- Ref列は（空欄でも）正規化で有効な参照になる。
- 参照先のkey列が空欄だらけになってRefが成立しない、が起きない。

主な変更箇所（予定）:
- `src/lib/sampleData.ts`

---

### 3) サンプルデータ更新ボタン不要（全体更新しない）

現状:
- （v0.1.1時点）Simulator上部の「サンプルデータ更新（全再生成）」UIは撤去済み。

方針:
- ボタンとConfirmDialogを削除。
- “更新”が必要なケースは、
  - schema変更時の最小更新（後述の「行数維持 + 列差分マージ」）
  - 必要ならテーブル単位の再生成（`regenerateSampleDataForTable`）
  に限定する。

受け入れ条件:
- Simulator上から全体再生成を起動するUIが無い。

主な変更箇所（予定）:
- `src/components/Simulator/Simulator.tsx`

---

### 4) 親の親テーブルのラベルがID羅列になってしまう

現状（推測含む）:
- `getRowLabel()` は `isLabel` 列（無ければ先頭列）を連結。
- デフォルトでは先頭列が `isKey && isLabel` になりやすく、
  そこにID風の値が入ると「IDだけのラベル」になりやすい。
- Ref表示は `getRefDisplayLabel()` が参照先RowLabelを使う。

方針:
- 2) の「空欄化・IDの決定化」で“ランダムID羅列”自体を減らす。
- 追加で、RowLabelの選択戦略を改善:
  - `isLabel` 列の値が空/無意味（例: ランダムIDパターン）なら、
    次候補（非key列、または最初に埋まっている列）を使う。
  - それでも空なら最終fallback。

受け入れ条件:
- 例に挙がったような `C644L9TN 3TRX7MFL` 的な「意味のないID羅列」が、同条件で再現しにくくなる。

主な変更箇所（予定）:
- `src/components/Simulator/recordLabel.ts`（RowLabelの改善）
- `src/lib/sampleData.ts`（ランダムIDを減らす）

---

### 5) テーブルの順番を入れ替えられるようにしたい

現状:
- Storeに `reorderTables(activeTableId, overTableId)` がある。
- EditorのSidebarでは上下移動ボタンで実装済み（`src/components/Layout/Sidebar.tsx`）。
- Simulator左ナビは現状ボタンなし。

方針:
- Simulator左ナビの各テーブル行を **ドラッグ&ドロップ** で並べ替え可能にする。
- 既存の「上へ/下へ」ボタンは互換のため残してよい（DnDが主導）。
- 実装はStoreの `reorderTables(activeTableId, overTableId)` を呼ぶ。

受け入れ条件:
- Simulator左ナビでドラッグ&ドロップで入れ替えでき、順序が即時反映される。

主な変更箇所（予定）:
- `src/components/Simulator/Simulator.tsx`

---

### 6) カラムの順番を入れ替えられるようにしたい

現状:
- Storeに `reorderColumn(tableId, columnId, newOrder)` がある。
- Editorの `TableNode` で上下移動ボタン実装済み（`src/components/EREditor/TableNode.tsx`）。
- Simulatorの `TableView` は列ヘッダにボタンなし。

方針:
- `TableView` の列ヘッダを **ドラッグ&ドロップ** で並べ替え可能にする。
- 既存の上下移動ボタンは互換のため残してよい（DnDが主導）。
- `reorderColumn(tableId, columnId, newOrder)` を呼んで、順序変更が即時テーブル表示に反映されるようにする。

受け入れ条件:
- Simulatorの一覧テーブル上で列順を入れ替えられる。

主な変更箇所（予定）:
- `src/components/Simulator/TableView.tsx`

---

## 実装ステップ（提案）

1. サンプルデータ更新ボタン削除（低リスク・早期にUX固定）
2. サンプルデータ生成の空欄化 + 読みやすいキー生成（sampleData.ts）
3. RowLabel戦略改善（recordLabel.ts）
4. sampleData生成の「行数維持 + 上限100」対応（erStore.ts）
5. Simulatorでのテーブル順入れ替え（Simulator.tsx、Sidebar実装流用）
6. Simulatorでのカラム順入れ替え（TableView.tsx、TableNode実装流用）
7. （必要なら）行追加UI（Simulator.tsx）

---

## 未決定（最小限の確認が必要）

- 「行数可変」を満たすために、行追加UIを入れるかどうか（入れない場合、内部的には可変でもユーザーが増やせない）。
  - 本計画書では **入れる前提（案A: 行追加ボタン）** を推奨。
