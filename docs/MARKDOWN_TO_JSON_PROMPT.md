# データベース設計書(Markdown)からWaiwaiER JSONを生成するプロンプト

## 概要

このドキュメントでは、AI（Claude/ChatGPT等）に対して、Markdown形式のデータベース設計書からWaiwaiERで読み込み可能なJSON形式を生成させるためのプロンプトを定義します。

---

## プロンプトテンプレート

以下のプロンプトをAIに与えてください。`{{MARKDOWN_CONTENT}}`の部分をあなたのデータベース設計書の内容に置き換えます。

```markdown
# 指示

以下のデータベース設計書（Markdown形式）を読み取り、WaiwaiER（ER図モデリングツール）で読み込めるJSON形式に変換してください。

## 出力形式

以下のJSON構造で出力してください（エンベロープなしの`ERDiagram`形式）：

```json
{
  "tables": [...],
  "relations": [...],
  "memos": []
}
```

### テーブル（tables）の構造

各テーブルは以下の形式で定義してください：

```json
{
  "id": "一意のUUID（例: 550e8400-e29b-41d4-a716-446655440000）",
  "name": "テーブル名（物理名）",
  "description": "テーブルの説明（論理名や用途）",
  "columns": [...],
  "position": { "x": 数値, "y": 数値 },
  "createdAt": "ISO8601形式の日時",
  "updatedAt": "ISO8601形式の日時"
}
```

テーブルの配置（position）は、読みやすさを考慮して自動的に計算してください：
- 1行に3〜4テーブル配置
- x座標: 0, 400, 800, 1200...（400px間隔）
- y座標: 行ごとに500px増加

### カラム（columns）の構造

各カラムは以下の形式で定義してください：

```json
{
  "id": "一意のUUID",
  "name": "カラム名（物理名）",
  "description": "カラムの説明",
  "type": "AppSheet互換の型名",
  "isKey": true/false（主キーの場合true）,
  "isLabel": true/false（ラベル列の場合true、最初のテキスト系カラムを推奨）,
  "isVirtual": false,
  "constraints": {
    "required": true/false（NOT NULLの場合true）,
    "unique": true/false（UNIQUE制約の場合true）
  },
  "order": 0から始まる連番
}
```

### 型のマッピングルール

データベースのデータ型をAppSheet型に変換してください：

| DB型 | AppSheet型 |
|------|-----------|
| BIGSERIAL, BIGINT, INTEGER, INT | Number |
| VARCHAR(n), CHAR(n), TEXT | Text |
| TEXT（長文用途） | LongText |
| BOOLEAN, BOOL | Yes/No |
| DATE | Date |
| TIMESTAMP, DATETIME | DateTime |
| TIME | Time |
| DECIMAL, NUMERIC, FLOAT, DOUBLE | Decimal |
| （メールアドレス用途のVARCHAR） | Email |
| （電話番号用途のVARCHAR） | Phone |
| （URL用途のVARCHAR） | Url |

カラム名からも型を推測してください：
- `email`, `mail` → Email
- `phone`, `tel`, `mobile` → Phone
- `url`, `link`, `website` → Url
- `price`, `amount`, `cost` → Price
- `percent`, `rate`, `ratio`（%用途） → Percent
- `postal_code`, `zip` → Text
- `address` → Address
- `*_id`（外部キー） → Ref（後述）
- `*_at`（日時系） → DateTime
- `*_date` → Date

### 外部キー（Ref型）の処理

外部キー制約があるカラムは以下のように設定してください：

1. `type` を `"Ref"` に設定
2. `constraints.refTableId` に参照先テーブルのIDを設定
3. `constraints.refColumnId` に参照先テーブルの主キーカラムIDを設定

### リレーション（relations）の構造

外部キー関係がある場合、以下の形式でリレーションを定義してください：

```json
{
  "id": "一意のUUID",
  "sourceTableId": "参照先テーブルのID（親テーブル、1側）",
  "sourceColumnId": "参照先の主キーカラムのID",
  "targetTableId": "外部キーを持つテーブルのID（子テーブル、N側）",
  "targetColumnId": "外部キーカラムのID",
  "type": "one-to-many"
}
```

**重要**: WaiwaiERのリレーション定義では：
- `source` = 親テーブル（参照先、1側）
- `target` = 子テーブル（外部キーを持つ側、N側）

リレーションタイプ：
- 通常の外部キー: `"one-to-many"`（1対多の関係）
- 1対1の明示がある場合: `"one-to-one"`
- 中間テーブル経由の多対多: `"many-to-many"`

### 主キー（isKey）とラベル（isLabel）の判定

- **isKey**: 以下の条件でtrueにする
  - カラム名が `id` または `*_id`（主キー用途）
  - BIGSERIAL/SERIAL型
  - PRIMARY KEY制約がある
  - `*_code` で一意制約がある場合も候補

- **isLabel**: 以下の優先順位で1つだけtrueにする
  1. `name`, `title`, `label` という名前のカラム
  2. `*_name`, `*_title` というパターン
  3. 最初のText/VARCHAR型カラム

### メモ（memos）

設計書の「概要」「設計方針」「検討事項」などをメモとして出力できます（任意）：

```json
{
  "id": "一意のUUID",
  "text": "メモの内容",
  "position": { "x": 数値, "y": 数値 },
  "width": 300,
  "height": 200,
  "createdAt": "ISO8601形式の日時",
  "updatedAt": "ISO8601形式の日時"
}
```

---

## 変換対象のデータベース設計書

{{MARKDOWN_CONTENT}}

---

## 出力

上記の設計書をWaiwaiER JSON形式に変換してください。
JSONのみを出力し、説明は不要です。
```

---

## 使用例

### 入力（設計書の一部を例として）

```markdown
### lead_contacts（リード連絡先）

| カラム名 | データ型 | NULL | 説明 |
|----------|----------|------|------|
| id | BIGSERIAL | NO | 主キー |
| lead_code | VARCHAR(30) | NO | リードコード（一意） |
| last_name | VARCHAR(50) | NO | 姓 |
| first_name | VARCHAR(50) | NO | 名 |
| email | VARCHAR(254) | YES | メール |
| phone | VARCHAR(30) | YES | 電話 |
| created_at | TIMESTAMP | NO | 作成日時 |
| updated_at | TIMESTAMP | NO | 更新日時 |
```

### 期待される出力（抜粋）

```json
{
  "tables": [
    {
      "id": "table-lead-contacts",
      "name": "lead_contacts",
      "description": "リード連絡先",
      "columns": [
        {
          "id": "col-lead-contacts-id",
          "name": "id",
          "description": "主キー",
          "type": "Number",
          "isKey": true,
          "isLabel": false,
          "isVirtual": false,
          "constraints": { "required": true, "unique": true },
          "order": 0
        },
          {
            "id": "col-lead-contacts-lead-code",
            "name": "lead_code",
            "description": "リードコード（一意）",
            "type": "Text",
            "isKey": false,
            "isLabel": true,
            "isVirtual": false,
            "constraints": { "required": true, "unique": true },
            "order": 1
          },
          {
            "id": "col-lead-contacts-last-name",
            "name": "last_name",
            "description": "姓",
            "type": "Name",
            "isKey": false,
            "isLabel": false,
            "isVirtual": false,
            "constraints": { "required": true },
            "order": 2
          },
          {
            "id": "col-lead-contacts-email",
            "name": "email",
            "description": "メール",
            "type": "Email",
            "isKey": false,
            "isLabel": false,
            "isVirtual": false,
            "constraints": { "required": false },
            "order": 4
          },
          {
            "id": "col-lead-contacts-phone",
            "name": "phone",
            "description": "電話",
            "type": "Phone",
            "isKey": false,
            "isLabel": false,
            "isVirtual": false,
            "constraints": { "required": false },
            "order": 5
          },
          {
            "id": "col-lead-contacts-created-at",
            "name": "created_at",
            "description": "作成日時",
            "type": "DateTime",
            "isKey": false,
            "isLabel": false,
            "isVirtual": false,
            "constraints": { "required": true },
            "order": 6
          }
        ],
        "position": { "x": 0, "y": 0 },
        "createdAt": "2026-01-09T00:00:00.000Z",
        "updatedAt": "2026-01-09T00:00:00.000Z"
      }
    ],
    "relations": [],
    "memos": []
  }
}
```

---

## 追加のヒント

### 外部キーの検出

設計書内で以下のようなパターンを外部キーとして検出してください：

1. カラム説明に「FK」や「外部キー」と記載がある
2. カラム名が `*_id` で、他のテーブル名と一致する（例: `school_id` → `schools`テーブルへの参照）
3. 設計書内に外部キー制約の記載がある

### 複数テーブルの配置

複数テーブルがある場合、以下のルールで自動配置してください：

```
テーブル1(x:0, y:0)    テーブル2(x:400, y:0)    テーブル3(x:800, y:0)
テーブル4(x:0, y:500)  テーブル5(x:400, y:500)  テーブル6(x:800, y:500)
```

関連するテーブル（リレーションがあるもの）は近くに配置することを推奨します。

### IDの生成

IDはUUID v4形式（例: `550e8400-e29b-41d4-a716-446655440000`）を使用してください。
読みやすさのため、`table-{テーブル名}` や `col-{テーブル名}-{カラム名}` のような形式でも構いません。

---

## WaiwaiERでの読み込み方法

1. 生成されたJSONをクリップボードにコピー
2. WaiwaiERを開く
3. メニューから「JSONインポート」を選択（または対応するキーボードショートカット）
4. JSONを貼り付けてインポート

---

## エラー検知と自動修正プロンプト

WaiwaiERのインポート機能には、AI生成JSONのバリデーション機能が組み込まれています。

### 検出されるエラー

| エラー種別 | 説明 |
|-----------|------|
| envelope_format | `schemaVersion`/`diagram`形式で出力してしまった |
| invalid_column_type | カラム型がAppSheet型と一致しない |
| multiple_keys | 1つのテーブルに複数のisKey=trueがある |
| ref_missing_target | Ref型なのにrefTableId/refColumnIdがない |
| invalid_ref_table | 参照先テーブルIDが存在しない |
| invalid_relation_* | リレーションのテーブル/カラムIDが存在しない |
| duplicate_table_id | テーブルIDが重複 |
| duplicate_column_id | カラムIDが重複 |

### 修正プロンプトの使い方

1. エラーが発生すると、「AI修正プロンプト」セクションが表示されます
2. 「プロンプトを表示」をクリックして内容を確認
3. 「コピー」ボタンでプロンプトをクリップボードにコピー
4. AIにこのプロンプトと元のJSONを渡して再生成を依頼

---

## トラブルシューティング

### インポートエラーが発生する場合

- **`schemaVersion`/`diagram`形式になっていないか確認**: WaiwaiERは `{ "tables": [...] }` 形式を期待します
- すべてのテーブル/カラムに `id` があるか確認
- `constraints` オブジェクトが空の場合でも `{}` として定義されているか確認
- `position` に数値が設定されているか確認
- `createdAt`/`updatedAt` がISO8601形式か確認

### リレーションが表示されない場合

- `sourceTableId`/`targetTableId` が実在するテーブルIDと一致しているか確認
- `sourceColumnId`/`targetColumnId` が実在するカラムIDと一致しているか確認
- Ref型カラムの `constraints.refTableId`/`refColumnId` も設定されているか確認

