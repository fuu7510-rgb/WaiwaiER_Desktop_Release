# AppSheetメモ設定ガイド（Note Parameters）

WaiwaiER Desktop で作成したER図から、AppSheetが解釈できる **Note Parameters（セルのノート）付きのExcel** を生成し、AppSheetへ取り込む手順を説明します。

## 概要

この機能では、ER図からExcel（.xlsx）をエクスポートすることで、以下を自動生成します：

1. **テーブル（シート）**: テーブル名=シート名、カラム名=1行目のヘッダー
2. **AppSheetメモ（Note Parameters）**: 各カラムのヘッダーセルにAppSheet設定ノート（Legacy Note）

AppSheetでは、Googleスプレッドシート/Excelの**セルのメモ（Note）**にNote Parameters（JSON）を書くことで、アプリのカラム設定を事前定義できます。

> 注意: ここで言う「メモ」は、Google Sheets の「メモ（Note）」、Excel の「ノート（旧コメント / Legacy Note）」を指します。スレッド型の「コメント（Comment）」とは別物です。

## 用語の注意（最重要）

AppSheetのNote Parametersは「セルのメモ（Note）」に書きます。似た用語が多いので混同しないでください。

- Google Sheets
   - ✅ メモ（Note）: AppSheetが読む対象
   - ❌ コメント（Comment）: 返信スレッドが付く方。基本的に対象外
- Excel
   - ✅ ノート（Note / 旧コメント）: AppSheetが読む対象（Google Driveにアップロード→シート化しても保持されやすい）
   - ❌ コメント（Comment / スレッド）: いわゆる新しいコメント。AppSheet側の期待とズレやすい

本リポジトリのExcelエクスポートは、AppSheet互換のため **`write_note`（レガシーメモ）を使用**し、`write_comment`（スレッド）を使用しません。

## Note Parametersとは

Note Parametersは、AppSheetでカラム設定を事前に定義するための強力なツールです。スプレッドシートのセルにメモとしてJSON形式で設定を記述することで、AppSheetが自動的にカラム設定を適用します。

### 使用タイミング

Note Parametersは以下のタイミングで最も効果的に機能します：

- **新規カラムの追加時**: 新しいカラムをテーブルに追加する際にNote Parametersを設定すると、AppSheetが自動的に設定を適用します
- **カラムの移動時**: 既存のカラムを移動する際に、Note Parametersを再設定できます
- **テーブルの再生成時**: テーブルを再生成する際に認識される場合もありますが、動作が一貫しないため推奨されません

> **重要**: テーブルの再生成に依存せず、新規カラム追加時や移動時にNote Parametersを設定することが推奨されます。

## Excelエクスポート時のメモ機能（推奨フロー）

Excelエクスポート機能でも、各カラムのヘッダーセルにAppSheetメモが自動的に**ノート（Note / レガシーメモ）**として追加されます。これにより：

- ExcelファイルをGoogleスプレッドシートにインポートした際も、メモが保持されます
- Excelでセルにマウスをホバーするとメモが表示されます
- メモの内容はAppSheetのNote Parameters形式です

## メモ形式

Note Parameters（AppSheetメモ）は以下の形式で記述します：

```
AppSheet:{"Type":"データ型","IsRequired":true,"TypeAuxData":"..."}
```

### 書式のポイント

- 先頭は必ず `AppSheet:` で始める
- 後続は **JSONオブジェクト**（`{...}`）
- キー名は **大文字小文字を区別**（例: `DisplayName` と `Displayname` は別）
- 文字列は **ダブルクォート**のみ（JSON準拠）
- 真偽値は `true/false`（小文字）
- 末尾カンマは不可（`{"a":1,}` はNG）

> 補足: 見た目のために `AppSheet: {\n  "Type": "Text"\n}` のように空白や改行を入れても、多くのケースで動きますが、トラブルを減らすため本ガイドでは**1行のJSON**を推奨します。

### 基本構造

メモは `AppSheet:` というプレフィックスで始まり、その後にJSONオブジェクトが続きます。JSONオブジェクトには、カラムの設定項目がキー・値のペアで記述されます。

## 設定項目一覧

Note Parametersで使用できる主要な設定項目は以下の通りです：

### 基本設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `Type` | Column Type | String | カラムのデータ型（ドロップダウンから選択した値そのまま） |
| `IsRequired` | Require? (toggle) | TRUE/FALSE | 必須項目フラグ（数式を使用する場合は `Required_If` を使用） |
| `Required_If` | Require? (formula) | String | 必須条件を数式で指定（数式を使用する場合のみ） |
| `IsHidden` | Show? (toggle) | TRUE/FALSE | 非表示フラグ（数式を使用する場合は `Show_If` を使用） |
| `Show_If` | Show? (formula) | String | 表示条件を数式で指定（数式を使用する場合のみ） |
| `DisplayName` | Display name | String | 表示名 |
| `Description` | Description | String | 説明文 |
| `DEFAULT` | Initial value | String | 初期値 |
| `AppFormula` | App formula | String | アプリ数式 |

### 識別・検索設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `IsKey` | Key | TRUE/FALSE | キーカラムとして設定 |
| `IsLabel` | Label | TRUE/FALSE | ラベルカラムとして設定 |
| `IsScannable` | Scannable | TRUE/FALSE | スキャン可能に設定 |
| `IsNfcScannable` | NFC Scannable | TRUE/FALSE | NFCスキャン可能に設定 |
| `Searchable` | Searchable | TRUE/FALSE | 検索可能に設定 |
| `IsSensitive` | Sensitive data | TRUE/FALSE | 機密データとして設定 |

### 表示・編集設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `Category` | Show (Category) | String | カテゴリ表示（ドロップダウンから選択した値そのまま） |
| `Content` | Show (Content) | String | コンテンツ表示 |
| `Editable_If` | Editable? (formula) | String | 編集可能条件を数式で指定 |
| `Reset_If` | Reset on edit? | String | 編集時にリセットする条件 |

### バリデーション設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `Valid_If` | Valid If | String | 有効性チェックの数式 |
| `Error_Message_If_Invalid` | Invalid value error | String | 無効値エラーメッセージ |
| `Suggested_Values` | Suggested values | String | 推奨値 |

### テキスト型の設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `LongTextFormatting` | Formatting | Enum string | フォーマット（Plain Text, Markdown, HTML） |
| `ItemSeparator` | Item separator | String | 項目区切り文字 |

### Enum型の設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `EnumValues` | Values | Array | 選択肢の配列（各項目はダブルクォートで囲む） |
| `BaseType` | Base type | String | ベース型（ドロップダウンから選択した値そのまま） |
| `ReferencedRootTableName` | Referenced table name | String | 参照テーブル名（enum/enumlist base type referenceの場合のみ） |
| `AllowOtherValues` | Allow other values | TRUE/FALSE | その他の値を許可 |
| `AutoCompleteOtherValues` | Auto-complete other values | TRUE/FALSE | その他の値の自動補完 |
| `EnumInputMode` | Input mode | Enum string | 入力モード（Auto, Buttons, Stack, Dropdown） |

### Ref型の設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `ReferencedTableName` | Referenced table name | String | 参照先テーブル名（REF型の場合のみ、テーブル名そのまま） |
| `ReferencedKeyColumn` | n/a | String | 参照先テーブルのキーカラム名 |
| `ReferencedType` | n/a | String | 参照先テーブルのキーカラムの型 |
| `IsAPartOf` | Is a part of? | TRUE/FALSE | パートオブ関係として設定 |
| `InputMode` | Input mode | Enum string | 入力モード（Auto, Buttons, Dropdown） |

### 数値型の設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `NumericDigits` | Numeric digits | Integer | 数値桁数 |
| `ShowThousandsSeparator` | Show thousands separator | TRUE/FALSE | 千の位区切りを表示 |
| `NumberDisplayMode` | Display mode | Enum string | 表示モード（Auto, Standard, Range, Label） |
| `MaxValue` | Maximum value | Integer/Decimal | 最大値 |
| `MinValue` | Minimum value | Integer/Decimal | 最小値 |
| `StepValue` | Increase/decrease step | Integer/Decimal | 増減ステップ値 |
| `DecimalDigits` | Decimal digits | Integer | 小数点以下の桁数 |
| `UpdateMode` | Update Mode | Enum string | 更新モード（Accumulate, Reset） |

### その他の設定

| キー名 | AppSheetエディタでの名称 | データ型 | 説明 |
|--------|-------------------------|----------|------|
| `ChangeColumns` | Columns | Array of strings | 変更カラム |
| `ChangeValues` | Values | Array of strings | 変更値 |

### メタオブジェクトキー

以下のキーは、AppSheetエディタには対応する要素がなく、JSONコードを機能させるためのメタキーです：

- `TypeAuxData`: データ型固有のオプション（JSON文字列として記述、ネストされたダブルクォートはエスケープが必要）
- `BaseTypeQualifier`: ベース型修飾子

> **重要**: `TypeAuxData` や `BaseTypeQualifier` を使用する場合、オブジェクト内のすべてのネストされたダブルクォートはエスケープする必要があります。

## JSON構文の重要性

Note Parametersの機能は、JSON構文の正確性に大きく依存します。1つの誤ったカンマ、不適切にエスケープされたダブルクォート、または小さな構文エラーでも、パラメータが機能しなくなる可能性があります。

### 構文チェックのベストプラクティス

- **構文の再確認**: JSONコードを挿入する前に、常に構文エラーがないか確認してください。JSONLintなどのツールを使用してJSON構文を検証できます
- **文字のエスケープ**: 特にJSON文字列内のダブルクォートなど、エスケープが必要な文字に注意してください
- **安定性が信頼性**: エラーのない安定したNote Parametersは、信頼性の高い動作をします。JSONコードを正しく記述するために時間をかけることは、長期的に見て価値があります

## ダブルクォートのエスケープ

Note ParametersやJSON全般で作業する際、ネストされたダブルクォートをエスケープすることは非常に重要です。エスケープしないとエラーが発生します。

### エスケープのルール（概念）

エスケープに必要なバックスラッシュ（`\`）の数は、レイヤーの深さによって異なります：

#### 第1レイヤー（外側）

- エスケープ不要（これらはJSONオブジェクトのキー名と値を囲むクォート）
- 例: `{"Key_Name": "My value here"}`

#### 第2レイヤー（1つネスト）

- 1つのバックスラッシュが必要
- 例: `{"Key_Name": "My value entry here, that includes some \"escaped double quotes\" for example."}`

#### 第3レイヤー（2つネスト）

- 3つのバックスラッシュが必要
- 例: `{"Key_Name": "{ \"Sub_Key_Name\": \"My value entry here, that includes some \\\"escaped double quotes\\\" for example.\" }"}`

#### 追加レイヤー

- 各追加レイヤーごとに2つのバックスラッシュを追加

### このプロジェクトで特にハマりやすい「層」

Note Parameters自体は単なるテキストですが、生成経路によっては「文字列リテラルの中に、さらにJSON文字列を入れる」構造になり、層が増えてエスケープが必要になります。

- 層A: セルのメモに入る最終テキスト（人間がシートで見る内容）
- 層B: GAS（JavaScript）の文字列リテラルに埋め込む（`"` が必要になる）
- 層C: Rustの文字列リテラルに埋め込む（同様にエスケープが必要。`r#"..."#` のようなraw文字列で回避可能）

本ガイドの例は基本的に「層A（セルのメモの最終形）」を示します。GASやRustに埋め込む場合は、言語側のエスケープを追加してください。

### エスケープが必要な理由

ダブルクォート（`"`）を入力すると、システムは次のダブルクォートを「閉じ」として使用します。最初のクォートが「開き」、2番目のクォートが「閉じ」として機能します。

バックスラッシュ（`\`）を含めることで、システムにそのクォートを閉じとして使用せず、代わりに実際の `"` 文字をテキストとして含めるように指示します。

### エスケープの例

```json
// TypeAuxData内でRefTableを指定する場合
AppSheet:{"Type":"Ref","TypeAuxData":"{\"RefTable\":\"顧客\"}"}

// TypeAuxData内でEnumValuesを指定する場合
AppSheet:{"Type":"Enum","TypeAuxData":"{\"EnumValues\":[\"選択肢1\",\"選択肢2\"],\"BaseType\":\"LongText\"}"}
```

## TypeAuxDataの詳細

`TypeAuxData` は、データ型固有のオプションをJSON文字列として記述するために使用されます。この中にネストされたJSONオブジェクトを含める場合、すべてのダブルクォートをエスケープする必要があります。

### 重要: `TypeAuxData` を使うべきか？（資料間の差分）

Note Parameter Workshop の資料では、`TypeAuxData` / `BaseTypeQualifier` は「AppSheetエディタに対応しないメタキー」とされています。
一方で、同資料の「Key Names For Column Settings」では、Ref/Enum等で **トップレベルに `ReferencedTableName` や `EnumValues` 等のキーを置く**形が示されています。

このため、本ガイドでは以下の優先度で整理します。

- 推奨（まず試す）: **Key Names表にあるトップレベルキー**を使う
- 代替（必要な場合）: `TypeAuxData` にJSON文字列として入れる（内部形式の可能性があり、互換性が変わるリスクがある）

> 確認事項（矛盾点として要注意）:
> - 既存のAppSheet環境/バージョンや、列型によってはトップレベルキーが効かず、`TypeAuxData` 形式でしか反映されないケースがあり得ます。
> - WaiwaiER側でどちらを「生成仕様」とするかは、実際のAppSheet取り込み結果に合わせて確定させるのが安全です。

### TypeAuxDataの例

#### Ref型（他テーブルへの参照）

```json
AppSheet:{"Type":"Ref","TypeAuxData":"{\"RefTable\":\"顧客\"}"}
```

#### Enum型（選択肢）

```json
AppSheet:{"Type":"Enum","TypeAuxData":"{\"EnumValues\":[\"電子機器\",\"衣料品\",\"食品\"],\"BaseType\":\"LongText\"}"}
```

#### Enum型（参照テーブルベース）

```json
AppSheet:{"Type":"Enum","TypeAuxData":"{\"ReferencedRootTableName\":\"カテゴリマスタ\",\"BaseType\":\"Text\"}"}
```

## 手順（Excel→AppSheet）

### 1. WaiwaiER Desktop からExcelをエクスポート

1. ERエディタでテーブルとカラムを設計
2. エクスポート機能で `.xlsx` を生成
3. 生成された各シートの1行目ヘッダーセルに、`AppSheet:{...}` のノートが付与されている（空は除外）

### 2. AppSheetに取り込む

1. AppSheetで新しいアプリを作成（または既存アプリにテーブル追加）
2. データソースとして、エクスポートしたExcel（またはGoogle Driveに置いたExcel）を選択
3. AppSheetがヘッダーセルのノート（Note Parameters）を読み取り、カラム設定に反映

## SQLデータソースとの連携

Note Parametersは現在、Google SheetsまたはExcelテーブルでのみ機能しますが、SQLデータソースでもNote Parametersの恩恵を受ける方法があります。

### SQLデータソースでNote Parametersを使用する手順

1. **Google SheetでNote Parametersを定義**
   - 新しいGoogle Sheetを作成し、各カラムのヘッダーにNote Parametersを追加
   - 必要なすべてのパラメータ（`IsRequired`、`DisplayName`、`Type`など）を設定

2. **AppSheetでGoogle Sheetテーブルを設定**
   - AppSheetのDataセクションで「Add a table」を選択
   - 作成したGoogle Sheetを選択
   - AppSheetがNote Parametersを読み取り、カラム設定を適用

3. **AppSheetの機能でSQLにコピー**
   - Dataセクションでテーブルを選択し、Table Settingsアイコンをクリック
   - 「Copy Data to New Source」ボタンをクリック
   - SQLサーバーを選択してコピーを実行
   - AppSheetが自動的にSQLテーブルを作成し、カラムとデータ型を設定し、レコードをコピー

4. **データソースをSQLに切り替え**
   - Table Settingsに戻る
   - Data Sourceを新しいSQLソースに変更
   - カラム名とデータ型が同じため、シームレスに移行できます

この方法により、Google Sheetsの柔軟性とNote Parametersの利点を活用しながら、最終的にはSQLデータソースを使用できます。

## 生成されるメモの例

### テキスト型（必須）

```json
AppSheet:{"IsRequired":true}
```

### テキスト型（表示名と説明付き）

```json
AppSheet:{"DisplayName":"顧客名","Description":"顧客の正式名称を入力してください"}
```

### Email型

```json
AppSheet:{"Type":"Email"}
```

### Email型（必須）

```json
AppSheet:{"Type":"Email","IsRequired":true}
```

### Ref型（参照）

```json
AppSheet:{"Type":"Ref","ReferencedTableName":"顧客"}
```

#### Ref型（参照）: 代替（TypeAuxData形式）

```json
AppSheet:{"Type":"Ref","TypeAuxData":"{\"RefTable\":\"顧客\"}"}
```

### Ref型（参照、キーカラム指定）

```json
AppSheet:{"Type":"Ref","ReferencedTableName":"顧客","ReferencedKeyColumn":"顧客ID","ReferencedType":"Text"}
```

#### Ref型（参照、キーカラム指定）: 代替（TypeAuxData形式）

```json
AppSheet:{"Type":"Ref","TypeAuxData":"{\"RefTable\":\"顧客\",\"RefKeyColumn\":\"顧客ID\",\"RefType\":\"Text\"}"}
```

### Enum型（選択肢）

```json
AppSheet:{"Type":"Enum","EnumValues":["電子機器","衣料品","食品"],"BaseType":"LongText"}
```

#### Enum型（選択肢）: 代替（TypeAuxData形式）

```json
AppSheet:{"Type":"Enum","TypeAuxData":"{\"EnumValues\":[\"電子機器\",\"衣料品\",\"食品\"],\"BaseType\":\"LongText\"}"}
```

### Enum型（ボタン入力モード）

```json
AppSheet:{"Type":"Enum","EnumValues":["未処理","処理中","完了"],"BaseType":"Text","EnumInputMode":"Buttons"}
```

#### Enum型（ボタン入力モード）: 代替（TypeAuxData形式）

```json
AppSheet:{"Type":"Enum","TypeAuxData":"{\"EnumValues\":[\"未処理\",\"処理中\",\"完了\"],\"BaseType\":\"Text\",\"EnumInputMode\":\"Buttons\"}"}
```

### Price型（必須）

```json
AppSheet:{"Type":"Price","IsRequired":true}
```

### Number型（範囲指定）

```json
AppSheet:{"Type":"Number","MinValue":0,"MaxValue":100,"DecimalDigits":2}
```

#### Number型（範囲指定）: 代替（TypeAuxData形式）

```json
AppSheet:{"Type":"Number","TypeAuxData":"{\"MinValue\":0,\"MaxValue\":100,\"DecimalDigits\":2}"}
```

### Date型（必須、初期値）

```json
AppSheet:{"Type":"Date","IsRequired":true,"DEFAULT":"TODAY()"}
```

### LongText型（Markdown形式）

```json
AppSheet:{"Type":"LongText","LongTextFormatting":"Markdown"}
```

#### LongText型（Markdown形式）: 代替（TypeAuxData形式）

```json
AppSheet:{"Type":"LongText","TypeAuxData":"{\"LongTextFormatting\":\"Markdown\"}"}
```

### キーカラム

```json
AppSheet:{"IsKey":true,"IsRequired":true}
```

### ラベルカラム

```json
AppSheet:{"IsLabel":true}
```

### 条件付き表示

```json
AppSheet:{"Show_If":"[ステータス]=\"処理中\""}
```

### 条件付き必須

```json
AppSheet:{"Required_If":"[カテゴリ]=\"重要\""}
```

## トラブルシューティング

### （削除）GAS関連エラーについて

本プロジェクトでは、GASでスプレッドシートへ書き込むフローは採用しません（Excelのレガシーノート出力を優先）。
そのため `openById` 等のGAS実行エラーは本ガイドの対象外です。

### AppSheetでメモが認識されない

- メモの形式が正しいか確認（`AppSheet:` プレフィックスが必要）
- JSON形式が正しいか確認（JSONLintなどのツールで検証）
- ダブルクォートが正しくエスケープされているか確認
- スプレッドシートをAppSheetで再読み込み
- メモが正しく設定されているか、スプレッドシートで確認
- 新規カラム追加時や移動時に設定したか確認（テーブル再生成時は認識されない場合がある）

### メモはあるのに反映されない（よくある原因）

- そもそも「コメント」に入れている（Google Sheets）
- Excelで「コメント（スレッド）」になっている（ノートではない）
- `IsHidden` と `Show_If`、`IsRequired` と `Required_If` を同時に入れている（資料では“数式を使うならトグル側は除外”が推奨）
- `TypeAuxData` 形式とトップレベルキー形式が環境に合っていない（上記の「重要: TypeAuxData を使うべきか？」参照）

### JSON構文エラー

- JSONLintなどのツールでJSON構文を検証
- カンマの位置を確認（最後の項目の後にカンマがないか）
- ダブルクォートのエスケープを確認
- 中括弧や角括弧の対応を確認

### 権限エラー

- Google Apps Scriptの実行権限を確認
- スプレッドシートへの編集権限があるか確認
- 初回実行時の承認を正しく行ったか確認

### UIアラートが表示されない

- スタンドアロンのスクリプトから実行する場合、UIアラートは表示されません
- 「表示」→「ログ」で実行結果を確認してください

### SQLデータソースへのコピー時の問題

- **データ型の競合**: AppSheetがデータ型の競合に遭遇した場合、コピープロセスが停止する可能性があります。問題のあるデータを確認し、必要に応じて再試行してください
- **検証**: データソースを切り替えた後、アプリ内で設定が期待通りに動作するか、特に特定のカラムに関連するバリデーションや数式を確認してください

## ベストプラクティス

### Note Parametersの効果的な使用

1. **新規カラム追加時に設定**: 新しいカラムを追加する際に、必ずNote Parametersを設定してください
2. **構文の検証**: JSONコードを挿入する前に、JSONLintなどのツールで構文を検証してください
3. **エスケープの確認**: `TypeAuxData` を使用する場合、ネストされたダブルクォートが正しくエスケープされているか確認してください
4. **段階的な設定**: 複雑な設定は、まず基本的な設定から始めて、徐々に追加していくことを推奨します

### 学習リソースの活用

- **Auto-Tableリソース**: 共有されているAuto-Tableリソースを探索することで、Note Parametersの実践的な応用例を学べます
- **コミュニティとの協力**: コミュニティと関わり、Note Parametersに関する発見や質問を共有することで、理解を深めることができます

## 参考

- [AppSheet公式ドキュメント](https://help.appsheet.com/)
- [Google Apps Script公式ドキュメント](https://developers.google.com/apps-script)
- [JSON公式サイト](https://www.json.org/json-en.html)
- [Note Parameter Workshop](https://community.appsheet-insider.com/c/note-parameter-workshop/14)
