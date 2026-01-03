# ERエディタ：カラム選択時（プロパティエディタ）のボタン／操作一覧

補足:
- テーブル内の**カラム行の右側**に出る「上下移動 / Key・Label / データ型変更」のミニツールバーは、プロパティエディタ（ColumnEditor）とは別UIです。そちらは `docs/EREDITOR_COLUMN_ROW_RIGHT_BUTTONS.md` を参照してください。

本ドキュメントは、ERエディタで**カラムを選択したときに表示される編集パネル（Column Editor）**にある「押せるUI（ボタン・トグル・折りたたみ）」の**名前／機能／影響範囲**を、現行実装に基づいて整理したものです。

- 表示位置（現行実装）: 左サイドバー（`Sidebar`）の下側パネル（Property Editor）

- 対象UI: `ColumnEditor`（プロパティエディタ）
- 表示条件: `selectedTableId` と `selectedColumnId` が存在し、選択カラムが見つかる場合のみ表示（未選択時は `ColumnEditor` 自体が `null`）

---

## 1. プロパティエディタで使われている「ボタン」の種類

プロパティエディタ（ColumnEditor）には、見た目がボタンのもの以外にも「押せるUI」があります。ここでは種類別に分類します。

1) **通常ボタン（Button コンポーネント）**
- 例: 「サンプルデータ編集」「保存」「キャンセル」「カラム削除」

2) **折りたたみ（セクション開閉）ボタン（`<button>`）**
- セクション見出し行全体がボタンになっており、クリックで開閉します。
- 開閉状態は `localStorage` に保存されます（`collapsible-${storageKey}`）。

3) **トグル（チェックボックス）**
- 例: 「表示?」「キー」「編集可能」「Label」「Unique」「検索対象」など。
- 内部的には AppSheet の Note Parameters に書き出される値（例: `IsHidden`, `Show_If`, `Editable_If`）や、ER側の制約（例: `constraints.required`）を更新します。

4) **プルダウン（Select）／入力（Input, textarea）**
- 「ボタン」ではありませんが、右ペインの主要な操作なので併記します（押下・選択で状態が更新されます）。

---

## 2. 通常ボタン（Button）の一覧

### 2.1 サンプルデータ編集
- 表示名: **「サンプルデータ編集」**（英: Edit Sample Data）
- 場所: 「サンプルデータ」セクション右上
- 機能:
  - 選択カラムのサンプル値を**複数行テキスト**で編集するダイアログを開きます。
  - 1行 = 1値として扱われます（末尾の空行は保存時に除去）。
- 影響:
  - 変更は `setSampleRowsForTable(tableId, rows)` によりテーブルのサンプルデータへ反映されます。
  - シミュレーター表示、Excelエクスポートに利用されます。

### 2.2（ダイアログ）キャンセル
- 表示名: **「キャンセル」**
- 場所: サンプルデータ編集ダイアログのフッター
- 機能:
  - ダイアログを閉じます。
  - **編集中のテキストは保存しません**（右ペイン側の状態にのみ保持されます）。

### 2.3（ダイアログ）保存
- 表示名: **「保存」**
- 場所: サンプルデータ編集ダイアログのフッター
- 機能:
  - ダイアログ内テキストを行分割し、**行数に応じてサンプル行を再構成**して保存します。
  - 末尾の空行（空白のみの行）は保存前に削除され、余分な空行で行が増えるのを防ぎます。

### 2.4 カラム削除
- 表示名: **「カラム削除」**
- 場所: 右ペイン最下部
- 機能:
  - 選択中のカラムをテーブルから削除します。
- 影響（重要）:
  - テーブルの `columns` から該当カラムが除去されます。
  - サンプルデータはスキーマに同期され、削除カラム分のキーが行から取り除かれます。
  - そのカラムを source/target に含む **リレーション線も削除**されます。
  - 削除対象が選択中だった場合、`selectedColumnId` は `null` にクリアされます。

---

## 3. 折りたたみ（セクション開閉）ボタン

プロパティエディタには、以下の折りたたみセクションがあります。見出し行をクリックすると開閉します。

- **Data Validity（データ検証）**
- **Auto Compute（自動計算）**
- **Update Behavior（更新動作）**
- **Display（表示）**
- **Other Properties（その他のプロパティ）**
- **Type Details（型の詳細）** ※数値系の型のときのみ表示

補足:
- 開閉状態は `localStorage` に保存されるため、次回起動時も状態が維持されます。

---

## 4. トグル（チェックボックス）・主要な挙動

ここでは「ボタンではないが、押下で状態が切り替わる」UIを、ユーザー視点の名前と内部動作で整理します。

### 4.1 制約（Constraints）
- **Unique（ユニーク）**
  - `constraints.unique` を ON/OFF します。

### 4.2 AppSheetメモ設定（Note Parameters）

#### 表示
- **Show?（表示?）**
  - 役割: AppSheet Note Parameters の **`IsHidden`（非表示フラグ）** を切り替えるためのチェックです。
  - ON（表示）:
    - `IsHidden` を未設定（`undefined`）に戻します（= デフォルト動作で表示）。
    - `Show_If` は変更しません（既に設定されている表示条件は維持します）。
  - OFF（非表示）:
    - `IsHidden: true` を設定します。
    - `Show_If` と競合しないよう、`Show_If` は未設定にします。

- **Show_If（表示条件（数式））**
  - 入力が非空になったら:
    - `Show_If` をそのまま設定します。
    - `IsHidden` は未設定（`undefined`）に戻します（`Show_If` と `IsHidden` は排他）。
  - 入力が空になったら:
    - `Show_If` を空（未指定）に戻します（※`IsHidden` はそのまま）。

#### データ検証（Data Validity）
- **Require? (toggle)（必須（トグル））** ※Select（true/false/未指定）
  - `Required_If` が入力されている間は無効化されます。
  - true/false を明示した場合は `Required_If` を未設定にし、`constraints.required` を同期します。
- **Required_If（必須条件（数式））**
  - 入力が非空になったら:
    - `constraints.required` を false にします（トグル必須と数式必須は排他）。
    - `IsRequired`（トグル出力）を未指定（空）へ戻します。

#### 更新動作（Update Behavior）
- **Key（キー）**
  - `selectedColumn.isKey` を ON/OFF します。
- **Editable?（編集可能）**
  - OFF:
    - `Editable_If` を未設定にし、`Editable=false` をセットします。
  - ON:
    - `Editable_If` が空なら `"TRUE"` をセットします。
    - `Editable` は未設定（`undefined`）にします。
- **Reset on edit?（編集時リセット）**
  - ON:
    - `Reset_If` が空なら `"TRUE"` をセットします。
  - OFF:
    - `Reset_If` を未設定に戻します。

#### 表示（Display）
- **Label（ラベル）**
  - `selectedColumn.isLabel` を ON/OFF します。

#### その他（Other Properties）
- **Searchable（検索対象）**
  - OFFにすると `Searchable=false` を明示、ONは「未指定（空）」に戻す動きです。
- **Scannable（スキャン可）**
  - ONで `IsScannable=true`。
- **NFC Scannable（NFCスキャン可）**
  - ONで `IsNfcScannable=true`。
- **Sensitive data（機密データ）**
  - ONで `IsSensitive=true`。

---

## 5. 条件付きで表示される項目（参考）

プロパティエディタは、選択カラムの型により項目が増減します。

- `Enum` / `EnumList` の場合
  - 制約: EnumValues（選択肢入力 textarea）
  - Note Parameters: Enum / EnumList セクション（AllowOtherValues, EnumInputMode など）
- `Ref` の場合
  - Note Parameters: Ref セクション（ReferencedTableName, IsAPartOf, InputMode など）
- `LongText` の場合
  - Note Parameters: Text セクション（LongTextFormatting）
- 数値系（Number/Decimal/Percent/Price/Progress）の場合
  - 折りたたみ: Type Details（型の詳細）
- `Change...` 系の型の場合
  - ChangeColumns / ChangeValues の入力欄

---

## 6. 実装参照（メンテ向け）

- 右ペイン構成: `src/components/EREditor/ColumnEditor.tsx`
- サンプルデータ編集: `src/components/EREditor/ColumnEditorParts/SampleDataSection.tsx`, `SampleDataDialog.tsx`
- カラム削除: `src/components/EREditor/ColumnEditorParts/ColumnDeleteSection.tsx`（実処理は store の `deleteColumn`）
- 折りたたみ: `src/components/common/CollapsibleSection.tsx`
- カラム削除の副作用（リレーション削除/選択クリア/サンプル同期）: `src/stores/slices/columnSlice.ts`
