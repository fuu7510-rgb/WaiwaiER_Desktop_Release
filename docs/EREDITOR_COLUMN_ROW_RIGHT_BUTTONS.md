# ERエディタ：カラム行の右側に出るボタン（ミニツールバー）

本ドキュメントは、ERエディタで**テーブル内のカラム行を選択したとき**に、そのカラム行の**右側に表示されるミニツールバー**（上下移動・Key/Label・データ型変更）について、**名前／機能／挙動**を整理したものです。

- 対象UI: テーブルノード内のカラム行（`ColumnRow`）
- 実装: `src/components/EREditor/TableNode.tsx`

---

## 表示条件と場所

- **表示条件**: 対象のカラム行が選択状態（`isSelected === true`）のときのみ表示
- **表示場所**: カラム行の「右側（外側）」に縦方向に並ぶ
  - 上段: ボタン群（上下移動 + Key/Label）
  - 下段: データ型セレクタ（プルダウン）

補足:
- 各ボタン操作は `stopPropagation()` されており、**押しても別のクリック処理（選択切替など）に波及しない**設計です。

---

## 1) 並び順変更（上へ / 下へ）

### 上へ移動（Move Up）
- 表示: ▲（上矢印）
- ツールチップ/ラベル: `common.moveUp`
- 機能: カラムの表示順（order）を 1 つ上へ移動します。
- 無効化条件: すでに先頭カラム（`isFirst === true`）の場合は disabled になり、押せません。
- 内部動作:
  - `reorderColumn(tableId, column.id, column.order - 1)` を呼びます。

### 下へ移動（Move Down）
- 表示: ▼（下矢印）
- ツールチップ/ラベル: `common.moveDown`
- 機能: カラムの表示順（order）を 1 つ下へ移動します。
- 無効化条件: すでに末尾カラム（`isLast === true`）の場合は disabled になり、押せません。
- 内部動作:
  - `reorderColumn(tableId, column.id, column.order + 1)` を呼びます。

影響範囲（ユーザー視点）:
- テーブル内のカラム表示順が変わります。
- エクスポートやシミュレーター側で「カラム順」を参照している箇所があれば、その順序にも影響します（※参照先の実装に依存）。

---

## 2) Key / Label トグル（ON/OFF）

### Key（キー）切替
- 表示: Key を表すアイコン（色: amber 系）
- ツールチップ/ラベル: `table.toggleKey`
- 機能: 選択中カラムの `isKey` を ON/OFF します。
- 見た目: ON のときはボタン背景がアクティブ色になります（`var(--section-bg-active)`）。
- 内部動作:
  - `updateColumn(tableId, column.id, { isKey: !column.isKey })`

影響範囲（重要）:
- `isKey` が ON のカラムは、カラム行の右側に **外向きリレーション用ハンドル（source handle）** が表示されます。
  - つまり「キーにする」ことで、他テーブルへの参照（リレーション）を張る起点になれます。

### Label（ラベル）切替
- 表示: Label を表すアイコン（色: indigo 系）
- ツールチップ/ラベル: `table.toggleLabel`
- 機能: 選択中カラムの `isLabel` を ON/OFF します。
- 見た目: ON のときはボタン背景がアクティブ色になります（`var(--section-bg-active)`）。
- 内部動作:
  - `updateColumn(tableId, column.id, { isLabel: !column.isLabel })`

補足:
- Key/Label の ON/OFF は、右ペイン（Column Editor）にも同じ状態として反映されます（同じカラム属性を更新するため）。

---

## 3) データ型変更（Type selector dropdown）

### データ型セレクタ
- 表示: 現在のデータ型を選べるプルダウン（Select）
- ツールチップ: `column.changeTypeTooltip`（デフォルト文言:「クリックしてデータ型を変更」）
- 機能: 選択中カラムの `type`（データ型）を変更します。

内部動作（重要）:
1. `nextType` が現在の `column.type` と異なるときのみ処理します。
2. `sanitizeForType(nextType, column.constraints, column.appSheet)` を実行し、
   - 新しい型に不整合な **constraints / AppSheetメモ設定（appSheet）** を調整（削除/初期化）します。
3. 最後に `updateColumn(tableId, column.id, { type: nextType, constraints, appSheet })` を呼び、型変更を確定します。

注意点:
- 型を変えると、型に依存する設定（例: Enum の選択肢、Ref の参照先、数値系の詳細など）が **自動調整（削除される場合あり）** されます。
  - これは「不整合を残さない」ための安全策です。

---

## 関連ドキュメント

- 右ペイン（Column Editor）の操作一覧: `docs/EREDITOR_COLUMN_RIGHT_PANE_BUTTONS.md`
