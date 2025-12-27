# WaiwaiER Desktop リリースノート

## 概要
- リリース: v0.1.3
- チャネル: ALPHA
- 対象OS: Windows
- 配布形態: ストア不使用（手動アップデート）
- 配布物（MSI）: TBD
- 配布物（NSIS）: TBD
- 配布ZIP（MSI）: TBD
- 配布ZIP（NSIS）: TBD

## ダウンロード
- GitHub Releases（このリポジトリのReleasesページ）からダウンロード
	- 配布ZIP（MSI）: TBD
	- 配布ZIP（NSIS）: TBD

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
### 改善
- ERエディタ（React Flow）: `nodeTypes` / `edgeTypes` の参照を安定化し、開発時警告（React Flow error #002）の発生を抑止

### 修正
- ERエディタ（カラム設定）: 選択が変化したタイミングで `Rendered fewer hooks than expected` が発生し画面が落ちることがある問題を修正
- ERエディタ（カラム設定）: 一部チェックボックスで controlled/uncontrolled 警告が出る可能性を低減（`checked` を boolean に正規化）
- ERエディタ（サイドバー）: 折りたたみ操作で `Rendered fewer hooks than expected` が発生し画面が真っ白になる問題を修正

### 開発（Lint）
- Sidebar（テーブル並べ替え）: 存在しないESLintルール（`no-inline-styles`）の無効化コメントを削除

## 既知の制限
- ALPHAのため、互換性（DB/プロジェクト形式）が将来変更される可能性があります。

## 不具合報告
- 手順/期待/実際の結果、OS、バージョン（設定→バージョン情報の値）を添えて連絡
- 連絡先: GitHub Issues（配布用Publicリポジトリ）
- 注意: Issuesは公開されます。個人情報・社外秘情報・顧客データ等は記載しないでください。
