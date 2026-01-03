# Note Parameters サポート状況

このドキュメントは、AppSheet Note Parametersの各キーについて、WaiwaiER Desktopからのエクスポート時の動作検証結果を記録します。

> 重要: Note Parameters のキー名は大文字小文字を区別します。キー名を「すべて大文字（ALL CAPS）」にすると AppSheet が認識しないケースがあります。
> 特に初期値は `Default` が正で、`DEFAULT` は誤りです（キー名の検証結果）。

## ステータス凡例

| ステータス | 意味 |
|-----------|------|
| ✅ 確認済み | AppSheetで正しく認識されることを確認 |
| ⚠️ 不安定 | 環境によって動作したりしなかったりする |
| ❌ 未対応 | AppSheetで認識されない、または動作しない |
| 🔍 未検証 | まだテストしていない |

以降の表は、同じキーでも操作によって反映状況が変わることがあるため、
**「新規取り込み（Add a table等）」** と **「Regenerate schema（構造再生成）」** を分けて記録します。

## 基本設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `Type` | ✅ 確認済み | ❌ 未対応 | カラム型の設定。Regenerate schema では AppSheet 側の設定値が残り、Note Parameters は反映されない |
| `IsRequired` | ✅ 確認済み | ✅ 確認済み | 必須フラグ（トグル） |
| `Required_If` | ✅ 確認済み | ✅ 確認済み | 必須条件（数式）。新規取り込み/Regenerate schema とも Note Parameters が強制上書きされる |
| `IsHidden` | ✅ 確認済み | ❌ 未対応 | 非表示フラグ（トグル）。Regenerate schema では Note Parameters は反映されない |
| `Show_If` | ✅ 確認済み | ✅ 確認済み | 表示条件（数式）。トップレベルが不安定な場合、`TypeAuxData`（JSON文字列）内の `Show_If` で認識されるケースあり（例: `context(\"ViewType\") = \"Table\"`）。新規取り込み/Regenerate schema とも Note Parameters が強制上書きされる |
| `DisplayName` | ✅ 確認済み | ❌ 未対応 | 表示名。Regenerate schema では AppSheet 側の設定値が残り、Note Parameters は反映されない |
| `Description` | ✅ 確認済み | ✅ 確認済み | 説明文。新規取り込み/Regenerate schema とも Note Parameters が強制上書きされる |
| `Default` | ✅ 確認済み | ✅ 確認済み | 初期値（キー名は `Default`。`DEFAULT` は誤り）。新規取り込み/Regenerate schema とも Note Parameters が強制上書きされる |
| `AppFormula` | ✅ 確認済み | ✅ 確認済み | アプリ数式 |

## 識別・検索設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `IsKey` | ✅ 確認済み | 🔍 未検証 | キーカラム設定（ユーザー動作確認済み） |
| `IsLabel` | ❌ 未対応 | ❌ 未対応 | ラベル設定。Type が `Name` / `Drawing` の場合、AppSheet 側で自動的に Label が有効になることがある |
| `IsScannable` | ❌ 未対応 | 🔍 未検証 | スキャン可能設定（メモ出力しても反映されず） |
| `IsNfcScannable` | ❌ 未対応 | 🔍 未検証 | NFCスキャン設定（メモ出力しても反映されず） |
| `Searchable` | ❌ 未対応 | 🔍 未検証 | 検索可能設定（メモ出力しても反映されず） |
| `IsSensitive` | ❌ 未対応 | 🔍 未検証 | 機密データ設定（メモ出力しても反映されず） |

## バリデーション設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `Valid_If` | 🔍 未検証 | 🔍 未検証 | 有効性チェック数式 |
| `Error_Message_If_Invalid` | 🔍 未検証 | 🔍 未検証 | 無効値エラーメッセージ |
| `Suggested_Values` | 🔍 未検証 | 🔍 未検証 | 推奨値 |
| `Editable_If` | ✅ 確認済み | ✅ 確認済み | 編集可能条件。新規取り込み/Regenerate schema とも Note Parameters が強制上書きされる |
| `Reset_If` | ✅ 確認済み | ✅ 確認済み | リセット条件 |

## 数値型設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `MinValue` | 🔍 未検証 | 🔍 未検証 | 最小値 |
| `MaxValue` | 🔍 未検証 | 🔍 未検証 | 最大値 |
| `DecimalDigits` | 🔍 未検証 | 🔍 未検証 | 小数点以下桁数 |
| `NumericDigits` | 🔍 未検証 | 🔍 未検証 | 数値桁数 |
| `ShowThousandsSeparator` | 🔍 未検証 | 🔍 未検証 | 千の位区切り表示 |
| `NumberDisplayMode` | 🔍 未検証 | 🔍 未検証 | 表示モード |
| `StepValue` | 🔍 未検証 | 🔍 未検証 | 増減ステップ値 |

## Enum型設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `EnumValues` | 🔍 未検証 | 🔍 未検証 | 選択肢の配列 |
| `BaseType` | 🔍 未検証 | 🔍 未検証 | ベース型 |
| `EnumInputMode` | 🔍 未検証 | 🔍 未検証 | 入力モード（Auto, Buttons, Stack, Dropdown） |
| `AllowOtherValues` | 🔍 未検証 | 🔍 未検証 | その他の値を許可 |
| `AutoCompleteOtherValues` | 🔍 未検証 | 🔍 未検証 | その他の値の自動補完 |
| `ReferencedRootTableName` | 🔍 未検証 | 🔍 未検証 | 参照テーブル名（Enum/EnumList base type reference用） |

## Ref型設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `ReferencedTableName` | 🔍 未検証 | 🔍 未検証 | 参照先テーブル名（トップレベルキー） |
| `ReferencedKeyColumn` | 🔍 未検証 | 🔍 未検証 | 参照先キーカラム名 |
| `ReferencedType` | 🔍 未検証 | 🔍 未検証 | 参照先キーカラムの型 |
| `IsAPartOf` | 🔍 未検証 | 🔍 未検証 | パートオブ関係設定 |
| `InputMode` | 🔍 未検証 | 🔍 未検証 | 入力モード（Auto, Buttons, Dropdown） |

## テキスト型設定

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `LongTextFormatting` | 🔍 未検証 | 🔍 未検証 | フォーマット（Plain Text, Markdown, HTML） |
| `ItemSeparator` | 🔍 未検証 | 🔍 未検証 | 項目区切り文字 |

## メタキー（TypeAuxData等）

| キー名 | 新規取り込み | Regenerate schema | 備考 |
|--------|------------|------------------|------|
| `TypeAuxData` | 🔍 未検証 | 🔍 未検証 | データ型固有オプション（JSON文字列） |
| `BaseTypeQualifier` | 🔍 未検証 | 🔍 未検証 | ベース型修飾子 |

---

## 検証履歴

### 2025-12-30
- 初版作成
- `IsKey` を「確認済み」に更新（ユーザー動作確認）
- `IsLabel` を「不安定」に設定（MEMO_SETUP.md の記載に基づく）
- `IsScannable` / `IsNfcScannable` / `Searchable` / `IsSensitive` は「未対応」に設定（ユーザー検証: 反映されず）

### 2026-01-03
- Regenerate schema の検証結果を反映
	- `Type`: Regenerate schema では AppSheet 側の設定値が残る（新規取り込みは反映可）
	- `IsHidden`: Regenerate schema では Note Parameters は反映されない（新規取り込みは反映可）
	- `Required_If`: 新規取り込み/Regenerate schema とも Note Parameters が強制上書き
	- `Show_If`: 新規取り込み/Regenerate schema とも Note Parameters が強制上書き
	- `Reset_If`: 新規取り込み/Regenerate schema とも Note Parameters が強制上書き
	- `Default`: Regenerate schema で Note Parameters が強制上書き
	- `Default`: 新規取り込みでも Note Parameters が強制上書き
	- `DisplayName`: Regenerate schema では AppSheet 側の設定値が残る（新規取り込みは反映可）
	- `Description`: 新規取り込み/Regenerate schema とも Note Parameters が強制上書き
	- `Editable_If`: 新規取り込み/Regenerate schema とも Note Parameters が強制上書き
	- `IsLabel`: Regenerate schema では Note Parameters は反映されない

---

## Regenerate schema（構造再生成）時の挙動記録

AppSheet には、既存テーブルの列定義を更新するための「Regenerate schema / Regenerate structure（構造再生成）」相当の操作があります。
Note Parameters は「新規取り込み時は効くが、再生成では効かない（または一部だけ効く）」等の差が出ることがあるため、このセクションで結果を一元管理します。

### 記録テンプレ

```
### YYYY-MM-DD: Regenerate schema の検証
- 対象: （アプリ名 / テーブル名 / カラム名）
- 前提: （新規アプリ or 既存アプリ、列追加済み/未追加、AppSheet側での手動変更有無 など）
- 手順:
	1) （例: Excel→Drive→Sheets→AppSheetで取り込み）
	2) （例: AppSheetで Regenerate schema 相当の操作を実行）
- 期待: （例: Note Parameters が再適用される / されない）
- 結果: ✅ / ⚠️ / ❌
- 影響を受けたキー: （例: Type / IsLabel / EnumValues ...）
- 備考: （反映タイミング、キャッシュ、UI上の表示差、再読み込みで変わった等）
```

### 2026-01-03: Regenerate schema の検証

- 結果（キー別）
	- `Type`: AppSheet 側の設定値が残る（Note Parameters は反映されない）
	- `IsHidden`: Note Parameters は反映されない
	- `Required_If`: Note Parameters が強制上書き
	- `Show_If`: Note Parameters が強制上書き
	- `Reset_If`: Note Parameters が強制上書き
	- `Default`: Note Parameters が強制上書き
	- `DisplayName`: AppSheet 側の設定値が残る（Note Parameters は反映されない）
	- `Description`: Note Parameters が強制上書き
	- `Editable_If`: Note Parameters が強制上書き
	- `IsLabel`: Note Parameters は反映されない

### 観点メモ（任意）

| 観点 | 記録することの例 |
|------|------------------|
| 既存アプリの状態 | すでにデータ/列設定が存在するか、以前の取り込み履歴があるか |
| 操作の種類 | Regenerate schema / 列の追加 / 列の並べ替え / 再取り込み（Add a tableし直し） |
| 反映範囲 | 全キーが再適用されるか、一部のみか、全く変化しないか |
| 再現性 | 同じ手順で安定して再現するか |

---

## 検証方法

1. WaiwaiER Desktopで任意のER図を作成
2. Excelエクスポートで `.xlsx` を生成
3. Google Driveにアップロードし、Googleスプレッドシートとして開く
4. ヘッダーセルのメモ内容を確認
5. AppSheetで「Add a table」からシートを取り込み
6. AppSheetエディタでカラム設定が正しく反映されているか確認

### 検証結果の記録例

```
### YYYY-MM-DD: [キー名] の検証
- テスト内容: ...
- 結果: ✅ / ⚠️ / ❌
- 備考: ...
```
