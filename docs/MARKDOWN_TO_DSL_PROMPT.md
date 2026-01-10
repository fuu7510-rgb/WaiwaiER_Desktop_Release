# データベース設計書(Markdown)からWaiwaiER DSLを生成するプロンプト

## 概要

このドキュメントでは、AI（Claude/ChatGPT等）に対して、Markdown形式のデータベース設計書からWaiwaiERで読み込み可能な**DSL（軽量テキスト）形式**を生成させるためのプロンプトを定義します。

DSL形式はJSON形式と比較して以下の利点があります：
- **トークン数が大幅に少ない**（AIとのやり取りに最適）
- **人間が読みやすい**
- **差分管理しやすい**
- **position/ID/タイムスタンプを省略**（インポート時に自動生成）

---

## プロンプトテンプレート

以下のプロンプトをAIに与えてください。`{{MARKDOWN_CONTENT}}`の部分をあなたのデータベース設計書の内容に置き換えます。

````markdown
# 指示

以下のデータベース設計書（Markdown形式）を読み取り、WaiwaiER（ER図モデリングツール）で読み込めるDSL形式に変換してください。

## DSL形式の構文

### テーブル定義

```
TABLE テーブル名 "説明" PK=主キーカラム名 LABEL=ラベルカラム名 [COLOR=#RRGGBB]
```

- `テーブル名`: 物理名（英数字・アンダースコア）
- `"説明"`: 論理名や用途（省略可）
- `PK=カラム名`: 主キーとなるカラム名
- `LABEL=カラム名`: ラベル列となるカラム名（表示に使用）
- `COLOR=#RRGGBB`: テーブルの色（省略可）

### 通常カラム定義

```
COL テーブル名.カラム名 型 [req] [uniq] [virtual] "説明"
```

- `テーブル名.カラム名`: どのテーブルのどのカラムか
- `型`: AppSheet互換の型名（後述）
- `req`: NOT NULL制約（省略可）
- `uniq`: UNIQUE制約（省略可）
- `virtual`: 仮想列（AppFormulaで計算する列、省略可）
- `"説明"`: カラムの説明（省略可）

### 外部キー（Ref型）定義

```
REF テーブル名.カラム名 -> 参照先テーブル.参照先カラム [req] "説明"
```

- `->` の左側: 外部キーを持つテーブル（子テーブル、N側）
- `->` の右側: 参照先テーブルの主キー（親テーブル、1側）
- `req`: NOT NULL制約（省略可）
- `"説明"`: カラムの説明（省略可）

### メモ定義

```
MEMO "メモ内容"
```

- 複数行は `\n` で表現

### コメント

```
# これはコメント（無視される）
// これもコメント
```

## 型のマッピングルール

データベースのデータ型を以下のAppSheet型に変換してください：

| DB型 | DSL型 |
|------|-------|
| BIGSERIAL, BIGINT, INTEGER, INT | Number |
| VARCHAR(n), CHAR(n), TEXT | Text |
| TEXT（長文用途） | LongText |
| BOOLEAN, BOOL | Yes/No |
| DATE | Date |
| TIMESTAMP, DATETIME | DateTime |
| TIME | Time |
| DECIMAL, NUMERIC, FLOAT, DOUBLE | Decimal |
| （メールアドレス用途） | Email |
| （電話番号用途） | Phone |
| （URL用途） | Url |

カラム名からも型を推測してください：
- `email`, `mail` → Email
- `phone`, `tel`, `mobile` → Phone
- `url`, `link`, `website` → Url
- `price`, `amount`, `cost` → Price
- `percent`, `rate`, `ratio`（%用途） → Percent
- `address` → Address
- `*_id`（外部キー） → REF行で定義
- `*_at`（日時系） → DateTime
- `*_date` → Date

## 主キー（PK）とラベル（LABEL）の判定

- **PK**: 以下の条件で判定
  - カラム名が `id` または `*_id`（主キー用途）
  - BIGSERIAL/SERIAL型
  - PRIMARY KEY制約がある

- **LABEL**: 以下の優先順位で1つ選択
  1. `name`, `title`, `label` という名前のカラム
  2. `*_name`, `*_title` というパターン
  3. 最初のText/VARCHAR型カラム

## 出力例

```
# ユーザー管理システム

TABLE orgs "組織" PK=id LABEL=org_name
COL orgs.id Number req uniq "主キー"
COL orgs.org_name Text req "組織名"
COL orgs.created_at DateTime req "作成日時"

TABLE users "ユーザー" PK=id LABEL=name
COL users.id Number req uniq "主キー"
COL users.name Text req "表示名"
COL users.email Email "メールアドレス"
COL users.phone Phone "電話番号"
REF users.org_id -> orgs.id req "所属組織"
COL users.is_active Yes/No req "有効フラグ"
COL users.created_at DateTime req "作成日時"

MEMO "設計方針:\n- 組織とユーザーは1対多\n- メールは任意入力"
```

## 重要な注意事項

- 各テーブルには必ず1つのPKを指定すること
- 各テーブルには必ず1つのLABELを指定すること
- 外部キーは必ずREF行で定義すること（COL行ではなく）
- テーブル定義(TABLE)の後にそのテーブルのカラム(COL/REF)を続けること
- 空行でテーブルを区切ると読みやすい

---

## 変換対象のデータベース設計書

{{MARKDOWN_CONTENT}}

---

## 出力

上記の設計書をWaiwaiER DSL形式に変換してください。
DSLのみを出力し、説明は不要です。
````

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
| org_id | BIGINT | NO | 所属組織（外部キー） |
| created_at | TIMESTAMP | NO | 作成日時 |

外部キー: org_id → orgs.id
```

### 期待される出力

```
TABLE lead_contacts "リード連絡先" PK=id LABEL=lead_code
COL lead_contacts.id Number req uniq "主キー"
COL lead_contacts.lead_code Text req uniq "リードコード（一意）"
COL lead_contacts.last_name Name req "姓"
COL lead_contacts.first_name Name req "名"
COL lead_contacts.email Email "メール"
COL lead_contacts.phone Phone "電話"
REF lead_contacts.org_id -> orgs.id req "所属組織"
COL lead_contacts.created_at DateTime req "作成日時"
```

---

## WaiwaiERでの読み込み方法

1. 生成されたDSLをクリップボードにコピー
2. WaiwaiERを開く
3. メニューから「インポート」を選択
4. DSLテキストを貼り付けてインポート（自動的にDSL形式を検出）

---

## JSON形式との比較

同じテーブル定義をJSON形式とDSL形式で比較：

### JSON形式（約800文字）

```json
{
  "tables": [{
    "id": "table-users",
    "name": "users",
    "description": "ユーザー",
    "columns": [
      {"id": "col-1", "name": "id", "type": "Number", "isKey": true, "isLabel": false, "constraints": {"required": true, "unique": true}, "order": 0},
      {"id": "col-2", "name": "name", "type": "Text", "isKey": false, "isLabel": true, "constraints": {"required": true}, "order": 1},
      {"id": "col-3", "name": "org_id", "type": "Ref", "isKey": false, "isLabel": false, "constraints": {"required": true, "refTableId": "table-orgs", "refColumnId": "col-orgs-id"}, "order": 2}
    ],
    "position": {"x": 0, "y": 0},
    "createdAt": "2026-01-09T00:00:00.000Z",
    "updatedAt": "2026-01-09T00:00:00.000Z"
  }],
  "relations": [{"id": "rel-1", "sourceTableId": "table-orgs", "sourceColumnId": "col-orgs-id", "targetTableId": "table-users", "targetColumnId": "col-3", "type": "one-to-many"}]
}
```

### DSL形式（約150文字）

```
TABLE users "ユーザー" PK=id LABEL=name
COL users.id Number req uniq
COL users.name Text req
REF users.org_id -> orgs.id req
```

**約80%のトークン削減**が可能です。

---

## トラブルシューティング

### インポートエラーが発生する場合

- TABLE行の後にそのテーブルのCOL/REF行が続いているか確認
- PK=とLABEL=が指定されているか確認
- REF行の `->` の前後にスペースがあるか確認
- 型名が正しいか確認（大文字小文字は区別しない）

### リレーションが表示されない場合

- REF行で参照先テーブルが先に定義されているか確認
- 参照先のカラム名が正しいか確認（通常は主キーの`id`）

---

## 利用可能な型一覧

| 型名 | 説明 |
|------|------|
| Text | 短いテキスト |
| LongText | 長文テキスト |
| Number | 整数 |
| Decimal | 小数 |
| Date | 日付 |
| DateTime | 日時 |
| Time | 時刻 |
| Yes/No | 真偽値 |
| Email | メールアドレス |
| Phone | 電話番号 |
| Url | URL |
| Address | 住所 |
| Name | 人名 |
| Price | 価格 |
| Percent | パーセント |
| Duration | 期間 |
| Enum | 選択肢（単一） |
| EnumList | 選択肢（複数） |
| Image | 画像 |
| File | ファイル |
| Color | 色 |
| LatLong | 緯度経度 |
| Progress | 進捗 |
| Signature | 署名 |
| Ref | 参照（REF行で使用） |
