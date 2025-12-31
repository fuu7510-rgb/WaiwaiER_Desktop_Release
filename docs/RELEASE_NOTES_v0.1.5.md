# WaiwaiER Desktop リリースノート

## 概要
- リリース: v0.1.5
- チャネル: ALPHA
- 対象OS: Windows
- 配布形態: ストア不使用（手動アップデート）
- 配布ZIP（MSI）: WaiwaiER-Desktop-0.1.5-alpha-win64-msi.zip
- 配布ZIP（NSIS）: WaiwaiER-Desktop-0.1.5-alpha-win64-nsis.zip

## ダウンロード
- GitHub Releases（このリポジトリのReleasesページ）からダウンロード
  - 配布ZIP（MSI）: WaiwaiER-Desktop-0.1.5-alpha-win64-msi.zip
  - 配布ZIP（NSIS）: WaiwaiER-Desktop-0.1.5-alpha-win64-nsis.zip

## 重要（必読）
- 破壊的変更の可能性: 本ビルドはALPHAのため、今後の更新でデータ形式（DB/プロジェクト/エクスポート）が破壊的に変更される可能性があります。
- アップデート前バックアップ推奨: 更新前に必ずエクスポート（JSON/パッケージ）などでバックアップしてください。
- コード署名: 本ビルドはコード署名を行っていません（アルファでは未対応）。

## インストール
1. 配布ZIP（MSI）を展開
2. 展開したMSIを実行

## 変更点
### 追加
- テーマ: ダークテーマ（ダークモード）を追加
- 設定: テーマ設定（ライト/ダーク/システム）を追加
  - 「システム」選択時はOSのダークモード設定に自動追従

### 改善
- 全コンポーネントをCSS変数ベースのテーマシステムに移行
  - 共通コンポーネント（Dialog, Input, Select, Button, CollapsibleSection）
  - レイアウト（MainLayout, Header, Sidebar）
  - ERエディタ（EREditor, TableNode, TableEditor, ColumnEditor, 全ColumnEditorPartsサブコンポーネント）
  - シミュレータ（Simulator, TableView）
  - 設定ダイアログ、プロジェクトダイアログ
- React FlowのMiniMap/Controlsにダークテーマ対応を追加
- スクロールバーのダークテーマ対応を追加
- チェックボックスのダークテーマスタイリングを追加
- 開発: copilot-instructions.mdにテーマ実装ガイドラインを追記

## 既知の制限
- ALPHAのため、互換性（DB/プロジェクト形式）が将来変更される可能性があります。

## 不具合報告
- 手順/期待/実際の結果、OS、バージョン（設定→バージョン情報の値）を添えて連絡
- 連絡先: GitHub Issues（配布用Publicリポジトリ）
- 注意: Issuesは公開されます。個人情報・社外秘情報・顧客データ等は記載しないでください。
