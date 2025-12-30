# Note Parameters サポート状況

このドキュメントは、AppSheet Note Parametersの各キーについて、WaiwaiER Desktopからのエクスポート時の動作検証結果を記録します。

## ステータス凡例

| ステータス | 意味 |
|-----------|------|
| ✅ 確認済み | AppSheetで正しく認識されることを確認 |
| ⚠️ 不安定 | 環境によって動作したりしなかったりする |
| ❌ 未対応 | AppSheetで認識されない、または動作しない |
| 🔍 未検証 | まだテストしていない |

## 基本設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `Type` | ✅ 確認済み | カラム型の設定。AppSheet UIのドロップダウン値と一致させる |
| `IsRequired` | 🔍 未検証 | 必須フラグ（トグル） |
| `Required_If` | 🔍 未検証 | 必須条件（数式） |
| `IsHidden` | 🔍 未検証 | 非表示フラグ（トグル） |
| `Show_If` | 🔍 未検証 | 表示条件（数式） |
| `DisplayName` | 🔍 未検証 | 表示名 |
| `Description` | 🔍 未検証 | 説明文 |
| `DEFAULT` | 🔍 未検証 | 初期値 |
| `AppFormula` | 🔍 未検証 | アプリ数式 |

## 識別・検索設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `IsKey` | 🔍 未検証 | キーカラム設定 |
| `IsLabel` | ⚠️ 不安定 | ラベル設定。環境によって反映されないケースあり |
| `IsScannable` | ❌ 未対応 | スキャン可能設定（メモ出力しても反映されず） |
| `IsNfcScannable` | ❌ 未対応 | NFCスキャン設定（メモ出力しても反映されず） |
| `Searchable` | ❌ 未対応 | 検索可能設定（メモ出力しても反映されず） |
| `IsSensitive` | ❌ 未対応 | 機密データ設定（メモ出力しても反映されず） |

## バリデーション設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `Valid_If` | 🔍 未検証 | 有効性チェック数式 |
| `Error_Message_If_Invalid` | 🔍 未検証 | 無効値エラーメッセージ |
| `Suggested_Values` | 🔍 未検証 | 推奨値 |
| `Editable_If` | 🔍 未検証 | 編集可能条件 |
| `Reset_If` | 🔍 未検証 | リセット条件 |

## 数値型設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `MinValue` | 🔍 未検証 | 最小値 |
| `MaxValue` | 🔍 未検証 | 最大値 |
| `DecimalDigits` | 🔍 未検証 | 小数点以下桁数 |
| `NumericDigits` | 🔍 未検証 | 数値桁数 |
| `ShowThousandsSeparator` | 🔍 未検証 | 千の位区切り表示 |
| `NumberDisplayMode` | 🔍 未検証 | 表示モード |
| `StepValue` | 🔍 未検証 | 増減ステップ値 |

## Enum型設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `EnumValues` | 🔍 未検証 | 選択肢の配列 |
| `BaseType` | 🔍 未検証 | ベース型 |
| `EnumInputMode` | 🔍 未検証 | 入力モード（Auto, Buttons, Stack, Dropdown） |
| `AllowOtherValues` | 🔍 未検証 | その他の値を許可 |
| `AutoCompleteOtherValues` | 🔍 未検証 | その他の値の自動補完 |
| `ReferencedRootTableName` | 🔍 未検証 | 参照テーブル名（Enum/EnumList base type reference用） |

## Ref型設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `ReferencedTableName` | 🔍 未検証 | 参照先テーブル名（トップレベルキー） |
| `ReferencedKeyColumn` | 🔍 未検証 | 参照先キーカラム名 |
| `ReferencedType` | 🔍 未検証 | 参照先キーカラムの型 |
| `IsAPartOf` | 🔍 未検証 | パートオブ関係設定 |
| `InputMode` | 🔍 未検証 | 入力モード（Auto, Buttons, Dropdown） |

## テキスト型設定

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `LongTextFormatting` | 🔍 未検証 | フォーマット（Plain Text, Markdown, HTML） |
| `ItemSeparator` | 🔍 未検証 | 項目区切り文字 |

## メタキー（TypeAuxData等）

| キー名 | ステータス | 備考 |
|--------|-----------|------|
| `TypeAuxData` | 🔍 未検証 | データ型固有オプション（JSON文字列） |
| `BaseTypeQualifier` | 🔍 未検証 | ベース型修飾子 |

---

## 検証履歴

### 2025-12-30
- 初版作成
- `IsLabel` を「不安定」に設定（MEMO_SETUP.md の記載に基づく）
- `IsScannable` / `IsNfcScannable` / `Searchable` / `IsSensitive` は「未対応」に設定（ユーザー検証: 反映されず）

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
