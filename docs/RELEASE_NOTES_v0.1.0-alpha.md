# WaiwaiER Desktop リリースノート

## 概要
- リリース: v0.1.0
- チャネル: ALPHA
- 対象OS: Windows
- 配布形態: ストア不使用（手動アップデート）
- 配布物（MSI）: `WaiwaiER-Desktop-0.1.0-alpha-win64-msi.zip`

## ダウンロード
- GitHub Releases（このリポジトリのReleasesページ）からダウンロード
	- 配布物（MSI）: `WaiwaiER-Desktop-0.1.0-alpha-win64-msi.zip`

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
- リリースチャネル表示（ALPHA/BETA/STABLE）
- バージョン情報（About/Version）表示

### 改善
- 公開/運用ドキュメント整備（ストア不使用・手動アップデート前提）

### 修正
- Windowsビルドのbundle identifier設定

## 既知の制限
- ALPHAのため、互換性（DB/プロジェクト形式）が将来変更される可能性があります。

## 不具合報告
- 手順/期待/実際の結果、OS、バージョン（設定→バージョン情報の値）を添えて連絡
- 連絡先: GitHub Issues（配布用Publicリポジトリ）
- 注意: Issuesは公開されます。個人情報・社外秘情報・顧客データ等は記載しないでください。
