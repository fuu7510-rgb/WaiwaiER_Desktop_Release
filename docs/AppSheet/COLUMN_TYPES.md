# AppSheet カラムのデータ型（Column Type）一覧

このドキュメントは、AppSheetの「カラムのデータ型」選択肢（Typeドロップダウン）を、添付画像に基づいて一覧化したものです。

- 目的: WaiwaiER Desktop 側の型体系・UI・Excelエクスポート・シミュレーター挙動を、AppSheetの型と整合させるための基礎資料にする
- 注意: AppSheet本体は更新される可能性があります。ここは **画像に写っている型名** を一次情報として固定し、追加/変更が見つかったら更新します。

## 型一覧（画像準拠）

以下の34種類が、添付画像で確認できるAppSheetのカラム型です（表記はAppSheet UIの英語表記に合わせています）。

- Address
- App
- ChangeCounter
- ChangeLocation
- ChangeTimestamp
- Color
- Date
- DateTime
- Decimal
- Drawing
- Duration
- Email
- Enum
- EnumList
- File
- Image
- LatLong
- LongText
- Name
- Number
- Percent
- Phone
- Price
- Progress
- Ref
- Show
- Signature
- Text
- Thumbnail
- Time
- Url
- Video
- XY
- Yes/No

## 日本語化リスト（英日対訳）

WaiwaiER Desktop 側のUI表示用に、日本語ラベル案を併記します。

- 互換性のため、**データとして保持する型キーは英語（AppSheet表記）** を推奨します
- 日本語は表示名（ラベル）として利用する想定です

| AppSheet Type | 日本語ラベル（案） |
|---|---|
| Address | 住所 |
| App | アプリ |
| ChangeCounter | 変更カウント |
| ChangeLocation | 変更位置 |
| ChangeTimestamp | 変更日時 |
| Color | 色 |
| Date | 日付 |
| DateTime | 日時 |
| Decimal | 小数 |
| Drawing | 描画 |
| Duration | 期間 |
| Email | メール |
| Enum | 列挙 |
| EnumList | 列挙リスト |
| File | ファイル |
| Image | 画像 |
| LatLong | 緯度経度 |
| LongText | 長文テキスト |
| Name | 名前 |
| Number | 数値 |
| Percent | パーセント |
| Phone | 電話 |
| Price | 価格 |
| Progress | 進捗 |
| Ref | 参照 |
| Show | 表示 |
| Signature | 署名 |
| Text | テキスト |
| Thumbnail | サムネイル |
| Time | 時刻 |
| Url | URL |
| Video | 動画 |
| XY | XY |
| Yes/No | はい/いいえ |

## 型の意味（簡潔な解釈）

ここでは「AppSheet上でどういう値として扱われやすいか」を、実装側で参照しやすいように短く整理します。

> 重要: 詳細な検証（入力UI、フォーマット、集計、ソート、式での扱い等）はアプリ/設定/ロケールに依存することがあります。挙動の差分が問題になる場合は、別途 `docs/SIMULATOR_CURRENT_BEHAVIOR.md` 等に“観測結果”として追記してください。

### 文字列系（主にテキストとして保持）

- Text: 1行テキストの一般的な型
- LongText: 複数行テキスト向け
- Email: メールアドレス表現
- Url: URL表現
- Phone: 電話番号表現
- Address: 住所表現
- Name: 人名表現
- Color: 色コード/色選択向け
- App: App参照/リンク用途の型（アプリ内リンク等に用いられることがあります）
- Show: 表示専用（計算/表示目的の型として扱われることがあります）

### 数値系（数値として保持・表示書式が付く）

- Number: 整数/一般数値
- Decimal: 小数を含む数値
- Percent: %表記の数値
- Price: 通貨表記の数値
- Progress: 進捗（進捗バー等の表示目的で用いられることがあります）

### 日付/時刻系

- Date: 日付
- Time: 時刻
- DateTime: 日付+時刻
- Duration: 期間（経過時間）

### 真偽

- Yes/No: 真偽（boolean）

### 位置/座標

- LatLong: 緯度経度
- XY: XY座標

### 列挙（選択肢）

- Enum: 単一選択
- EnumList: 複数選択（リスト）

### 参照（リレーション）

- Ref: 他テーブル（他行）参照

### 添付/メディア

- File: ファイル
- Image: 画像
- Thumbnail: サムネイル
- Video: 動画
- Drawing: 手書き（描画）
- Signature: 署名

### 変更追跡/監査（システム的な値）

- ChangeTimestamp: 変更時刻
- ChangeLocation: 変更位置
- ChangeCounter: 変更回数

## WaiwaiER Desktop での利用（今後の整合ポイント）

この一覧は、次の領域で「AppSheetと一致しているか」の判定基準になります。

- ERエディタ: カラム型の選択肢と名称（この一覧と一致）
- Excelエクスポート: 型/制約情報をヘッダーのNote（メモ）に出力（※プロジェクト方針: `write_note`）
- シミュレーター: Ref/Enum/EnumList/添付系の入力UIやInline View等の再現

---

更新履歴
- 2025-12-27: 初版（添付画像に基づく型一覧を作成）
