# 変更概要

- 

# 動作確認

- [ ] `npm run -s build` が通る
- [ ] 主要機能の手動確認（該当箇所）

# データ互換性チェック（必須：保存形式/スキーマに触れた場合）

## 対象

- [ ] ER図JSON（diagram schema）
- [ ] `.waiwai` パッケージ（package format）
- [ ] SQLiteスキーマ（テーブル/列）

## 直近2世代サポート

- [ ] **新しすぎるデータ**（`current+1`）は「アップデートしてください」で明示的に失敗する
- [ ] **古すぎるデータ**（`current-3`以下）は「中間バージョン経由」で明示的に失敗する

## ER図JSON（diagram schema）

- [ ] `src/lib/diagramSchema.ts` の `DIAGRAM_SCHEMA_VERSION` を上げた／上げていない理由が説明できる
- [ ] migrateが段階的（例：`v1→v2→v3`）になっている（ワンショット変換にしない）
- [ ] 保存（write）は常に最新envelope形式（旧形式を書かない）
- [ ] 読み込み（read）は必ず `decodeAndMigrateDiagram()` を通す
- [ ] データ削除や意味変更が必要な場合、代替（新フィールド追加＋既定値）で回避できている

## `.waiwai` パッケージ（package format）

- [ ] `metadata.packageFormatVersion` / `metadata.diagramSchemaVersion` の扱いが正しい
- [ ] import時に packageFormatVersion / diagramSchemaVersion の世代チェックが入っている
- [ ] export時に diagram は常に envelope 形式で格納される

## 互換テスト（最低限の確認）

- [ ] **旧JSON**を読み込み→編集→保存→再読み込みできる
- [ ] **旧`.waiwai`**をインポート→編集→保存→再読み込みできる

# リスク/ロールバック

- 互換性リスク:
  - 
- ロールバック方針（必要な場合）:
  - 

# 関連ドキュメント

- [ ] `docs/DATA_COMPATIBILITY.md` の運用ルールに反していない
