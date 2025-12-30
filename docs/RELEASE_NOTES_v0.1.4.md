# WaiwaiER Desktop リリースノート

## 概要
- リリース: v0.1.4
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

## 変更点
### 追加
- 設定: ユーザー設定のエクスポート/インポート（JSON）を追加
- 設定: 「共通カラム」を追加（テーブル作成時/作成後に、設定したカラムを各テーブルの末尾へ自動追加）
- 設定: 「共通カラム」編集画面を追加（追加/削除/順序変更/型・制約の編集）
- 設定: 「文字の大きさ」設定を追加（小/中/大の3段階で切り替え可能）
- Excelエクスポート: Note Parametersサポート状況パネルを追加（出力されるパラメーターを事前に確認可能）
- ERエディタ: カラム設定項目にNote Parametersステータスバッジを追加（Type/Key/Label/Requiredの出力状況を表示）
- ドキュメント: Note Parametersサポート状況トラッキング用ドキュメントを追加

### 改善
- 設定: 「新規作成時のルール」「バックアップ」を折りたたみ（開閉）できるように改善
- 設定: テーブル名/キーカラム名のプレフィックス・サフィックスを横並びにし、「入力したテーブル名/キーカラム名」のガイドを表示
- 設定: 「テーブル名」「キーカラム名」「線ラベル」の見出しを太字化
- ERエディタ/設定: カラム型の選択肢をAppSheetのTypeドロップダウン（34種）に準拠
- ERエディタ/設定: 日本語表示時の型ラベルを `English(日本語)` 形式に統一
- ERエディタ: カラム設定パネルをAppSheetエディタの構成に近づけてリニューアル
  - 「Data Validity」「Auto Compute」「Update Behavior」「Display」「Other Properties」等のセクションに整理
  - 各セクションを折りたたみ可能に（CollapsibleSection）
  - Key/Label/Editable/Reset on edit などの設定にヘルプツールチップを追加
  - 不要なキー（Category/Content/ResetOnEdit）をappSheetから自動除去するクリーンアップ処理を追加
  - Show/Required/Editable などの競合しやすいキーを自動調整（`Show_If` と `IsHidden`、`Required_If` と `IsRequired`、`Editable_If` と `Editable` の両立を避ける）
- ドキュメント: AppSheet Note Parameters（メモ）ガイドとキー一覧を更新（不要キー `Category`/`Content` を削除）
- Excelエクスポート: Note Parametersの出力を検証済み（Verified）パラメーターのみに限定（未検証パラメーターによる不具合を防止）
- Excelエクスポート: 真偽値を `true/false`（小文字）で出力するように変更（AppSheetの認識精度向上）
- ERエディタ: サイドバーのプロパティエディタ下部スクロールを改善

### 修正
- Simulator: DOMネストエラーを修正（`<button>` 内に `<button>` がネストされていた問題）
- Simulator: TableViewでDndContext（ドラッグ&ドロップ）のAccessibility要素がテーブル構造を壊していた問題を修正（`<tr>` / `<table>` 内に `<div>` が配置される警告を解消）
- 開発: `npm run lint` が失敗する問題を修正（React Hooks の依存配列/Effect内setState、AppSheet式評価の型安全性を改善）

## 既知の制限
- ALPHAのため、互換性（DB/プロジェクト形式）が将来変更される可能性があります。

## 不具合報告
- 手順/期待/実際の結果、OS、バージョン（設定→バージョン情報の値）を添えて連絡
- 連絡先: GitHub Issues（配布用Publicリポジトリ）
- 注意: Issuesは公開されます。個人情報・社外秘情報・顧客データ等は記載しないでください。
