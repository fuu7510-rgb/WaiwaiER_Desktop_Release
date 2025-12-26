# WaiwaiER Desktop リリースノート

## 概要
- リリース: v0.1.1
- チャネル: ALPHA
- 対象OS: Windows
- 配布形態: ストア不使用（手動アップデート）
- 配布物（MSI）: TBD

## ダウンロード
- GitHub Releases（このリポジトリのReleasesページ）からダウンロード
	- 配布物（MSI）: TBD

## 重要（必読）
- 破壊的変更の可能性: 本ビルドはALPHAのため、今後の更新でデータ形式（DB/プロジェクト/エクスポート）が破壊的に変更される可能性があります。
- アップデート前バックアップ推奨: 更新前に必ずエクスポート（JSON/パッケージ）などでバックアップしてください。
- コード署名: 本ビルドはコード署名を行っていません（アルファでは未対応）。

## インストール
1. 配布ZIP（MSI）を展開
2. 展開したMSIを実行

## 手動アップデート
- 手順は [docs/RELEASE_ALPHA_PLAN.md](docs/RELEASE_ALPHA_PLAN.md) を参照

## 変更点
### 追加
- Simulator: テーブルのドラッグ&ドロップ並べ替え
- Simulator: カラムのドラッグ&ドロップ並べ替え
- Simulator: レコード（行）のドラッグ&ドロップ並べ替え
- Simulator: サンプル行の追加（「＋追加」）
- Simulator: サンプル行の削除
- Simulator: サンプル行の削除取り消し（Undo）
- Simulator: テーブル順序の並べ替え（上/下ボタン）
- Simulator: カラム順序の並べ替え（上/下ボタン）
- ドキュメント追加
	- [docs/SIMULATOR_CURRENT_BEHAVIOR.md](docs/SIMULATOR_CURRENT_BEHAVIOR.md)
	- [docs/SIMULATOR_FIX_PLAN.md](docs/SIMULATOR_FIX_PLAN.md)

### 改善
- Simulator: サンプルデータを「テーブルスキーマに同期」する方式に変更（新規カラム追加などで既存行を維持しつつ不足値のみ補完）
- Simulator: Ref型のサンプル値を自動補正して参照が成立する確率を改善
- Simulator: レコード表示ラベルの判定を改善（意味のないID/自動補完キーに見える値を優先ラベルから除外）
- Undo/Redo の挙動を調整
	- Simulator表示中: `Ctrl+Z` / ヘッダーUndoは「サンプル行削除の取り消し」を優先
	- Simulator表示中: Redoは無効
	- 入力中（Input/Select/Textarea等）はショートカットを抑制
- i18n: Simulatorの「＋追加」文言を追加（ja/en）

### 変更（挙動）
- Simulator: 上部の「検索」と「サンプルデータ更新（全再生成）」UIを撤去（サンプル行は追加/削除/Undoで操作）
- サンプル行数の上限を100行に制限
- 並べ替え操作はドラッグ&ドロップを優先（上下ボタンも引き続き利用可能）

### 修正
- バージョンを 0.1.1 に更新
	- `package.json` / `package-lock.json`
	- `src-tauri/Cargo.toml` / `src-tauri/tauri.conf.json`

## 既知の制限
- ALPHAのため、互換性（DB/プロジェクト形式）が将来変更される可能性があります。
- Simulatorのサンプルデータはモデル（ER図）とは別扱いのため、アプリ再起動やプロジェクト再読み込み等でリセットされる可能性があります。

## 不具合報告
- 手順/期待/実際の結果、OS、バージョン（設定→バージョン情報の値）を添えて連絡
- 連絡先: GitHub Issues（配布用Publicリポジトリ）
- 注意: Issuesは公開されます。個人情報・社外秘情報・顧客データ等は記載しないでください。
