# Simulator 現状挙動まとめ（WaiwaiER Desktop）

このドキュメントは、**現状のシミュレーター挙動**を「実装（React/Zustand）」ベースで簡易整理したものです。
修正計画書の前提（現状仕様/制約）として利用します。

対象実装（主要）:
- `src/components/Simulator/Simulator.tsx`
- `src/components/Simulator/TableView.tsx`
- `src/stores/erStore.ts`（sampleData / Ref正規化）
- `src/lib/sampleData.ts`（ダミーデータ生成）

---

## 1. 画面構成（現状）

- 画面切り替え
  - App全体は `viewMode === 'editor' ? EREditor : Simulator` の二択。
  - Simulator内での「Deck/Detail/Form」切り替えUIは **存在しない**。

- Simulator画面のレイアウト
  - 左ペイン: テーブル一覧（AppSheet風「VIEWS」）
  - 上部バー: 「＋追加」などの最低限の操作
  - 中央: TableView（表形式の一覧）
  - 右ペイン: 行選択時のみ表示される詳細/編集パネル

- `DeckView.tsx` / `DetailView.tsx` / `FormView.tsx` はコンポーネントとして存在するが、現状の `Simulator.tsx` からは利用されていない（exportはされている）。

---

## 2. テーブル選択・状態リセット

- 選択テーブル
  - `selectedTableId` がある場合それを使用。
  - `selectedTableId` が無い場合、`tables[0]` を選択扱い。

- テーブル切替時
  - `selectedTableId` 変更で、右ペインの選択状態をリセット:
    - selectedRow / selectedRowKey / selectedRowIndex
    - 編集状態（isEditing / draftRow）

---

## 3. ダミーデータ（sampleData）の扱い

### 3.1 保存場所と行数

- sampleData は Zustand store (`useERStore`) 内の `sampleDataByTableId` に保持される。
- 初期は 1テーブルあたり **5行（DEFAULT_SAMPLE_ROWS）** を生成する。
- 上限は **100行（MAX_SAMPLE_ROWS）**。

### 3.2 初期化・補完

- Simulator表示中、`tables` 変化時に `ensureSampleData()` が呼ばれる（requestAnimationFrame経由）。
- `ensureSampleData()` は「存在しないテーブルの sampleData を補完」し、最後に Ref正規化（後述）を行う。

### 3.3 永続化（重要）

- プロジェクト保存・読込（DB/LocalStorage）に **sampleData は含まれない**。
  - `saveDiagram()` で保存されるのは `{ tables, relations, memos }`。
  - `loadFromDB()` / `importDiagram()` の後、`sampleDataByTableId` は **テーブル定義から再生成**される。
- したがって、Simulator上で編集した値は、プロジェクト再読込/再起動では保持されない（現状）。

---

## 4. ER変更が sampleData に与える影響

### 4.1 テーブル/カラム操作での再生成（上書き）

`erStore` のテーブル/カラム操作は、`sampleDataByTableId[tableId]` を **テーブルスキーマに同期**する。
基本は「既存行を維持しつつ、足りない列だけ補完」するため、Simulator上の編集内容が失われにくい。

- `addTable()` → 新テーブル分を生成
- `duplicateTable()` → 複製先テーブル分を生成
- `addColumn()` / `updateColumn()` / `deleteColumn()` / `reorderColumn()`
  - 既存行を維持しつつ、スキーマ差分を補完

### 4.2 全テーブル再生成

- 「ダミー更新（全再生成）」UIは撤去済み。

---

## 5. TableView（一覧）の挙動

- 表の列
  - `table.columns` をそのまま表示
  - Key列はアイコン、必須は `*` 表示
  - 型名（`columnTypes.*`）を小さく表示

- 行データ
  - `Simulator.tsx` から `data={sampleDataByTableId[selectedTable.id]}` を渡す。

- 検索
  - `TableView` には検索用の `searchQuery` があるが、現状のSimulator UIからは利用していない。

- 行クリック
  - 右ペインを開く（selectedRowをセット）。
  - 選択識別子（selectedRowKey）は「Key列の値があればそれ」「なければ行index」。

- 行の並べ替え（DnD）
  - 一覧テーブルの行はドラッグ&ドロップで並べ替え可能。
  - フィルタ/検索中のような「表示行と実データのindexが一致しない状態」では、安全のため並べ替えを無効化する。

- Ref表示
  - 一覧セルで `column.type === 'Ref'` の場合、参照先行を `sampleDataByTableId` から引いてラベル表示に変換する。

---

## 6. 右ペイン（詳細・編集）の挙動

- 右ペインは行選択時のみ表示。
- ヘッダはテーブルカラーで着色。
- タイトル（レコードラベル）
  - `isLabel` の列があればそれらを連結、無ければ先頭列を使用。

### 6.1 編集の開始/キャンセル/保存

- 「編集」押下 → `draftRow = { ...selectedRow }` を作成し編集モードへ。
- 「キャンセル」 → 編集モード解除、draft破棄。
- 「保存」 → `updateSampleRow(tableId, rowIndex, draftRow)` を実行して store を更新。
  - 同時に `selectedRow` も draftRow に置き換える。
  - Key列が変更されると selectedRowKey を再計算し直す。

### 6.2 型ごとの入力UI（右ペイン）

- `Yes/No`
  - checkbox。
  - 保存値は `'Yes'` / `'No'` の文字列。

- `Enum`
  - `<Select>`（単一選択）。
  - 選択肢は `column.constraints.enumValues`。

- `EnumList`
  - checkbox群。
  - 保存値は `"a, b, c"` のような **カンマ区切り文字列**。

- `Ref`
  - `<Select>`（参照先テーブルの行を選択）。
  - option value は参照先の「Key列（または指定column）」の値（文字列）。
  - option label は参照先行の RowLabel。

- その他
  - `getInputType()` による `<input type=...>` の素朴な入力。

---

## 7. Ref（参照）値の扱い

### 7.1 表示（Ref → ラベル）

- Ref列の値（文字列）を参照先テーブルのKey値として扱い、
  対応行があれば RowLabel に変換して表示する。
- 対応行が無い場合は、生値（raw）をそのまま表示する。

### 7.2 Ref正規化（自動補正）

`ensureSampleData()` / `regenerateSampleData()` / `regenerateSampleDataForTable()` 実行時に
`normalizeRefValues()` が走り、以下の条件で Ref値が自動補正される。

- Ref列で `refTableId` がある
- Refの現在値が参照先Keyとして存在しない
- ただし **ユーザーが手入力したような値は保持**
  - 空文字 または `REF-\d+` のプレースホルダのみ補正対象
  - それ以外の「それっぽい文字列」は存在しなくても保持される

補正時は、参照先の行から `(rowIndex + refIndex) % refRows.length` を使って値を選ぶ。

---

## 8. 現状の前提・制約（修正計画に効くポイント）

- Simulatorは現状「表 + 右ペイン編集」に寄っており、AppSheetの Deck/Detail/Form の遷移モデルは未実装（コンポーネントはあるが未接続）。
- ER変更（特にカラム操作）で sampleData を再生成する箇所が多く、Simulator上の編集値が頻繁に失われる。
- sampleData はプロジェクトに保存されないため、編集値はセッション限定。
- Refは「表示ラベル化」と「プレースホルダ補正」はあるが、無効値の厳密な整合性担保はしていない（手入力は基本保持）。

---

## 9. 並べ替え（DnD）の方針

- 並べ替え操作は **ドラッグ&ドロップ優先**（補助として上/下ボタンを残すことはある）。
- Tauri(WebView)上の互換性のため、HTML5の`draggable`イベントに依存せず、ポインタベースのDnD（例: `@dnd-kit`）を採用する。
