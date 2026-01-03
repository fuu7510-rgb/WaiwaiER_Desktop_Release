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
- コード署名: 本ビルドはコード署名を行っていません（ALPHAでは未対応）。

## インストール
1. 配布ZIP（MSI/NSIS）を展開
2. 展開したインストーラを実行
  - MSI版: `.msi`
  - NSIS版: `.exe`

## 変更点
### 追加
- 設定: テーマ設定（ライト/ダーク/システム）を追加
- React FlowのMiniMap/Controlsにダークテーマ対応を追加
- ERエディタ: 既存リレーションの参照先をドラッグで付け替えできるUIを追加（対象列にオーバーレイハンドルを表示）
- スクロールバーのダークテーマ対応を追加
- チェックボックスのダークテーマスタイリングを追加
- 開発: Biome設定（`biome.json`）を追加

### 改善
- 共通: ツールチップ（InfoTooltip）のテーマ表示・操作性を改善（ホバー/フォーカスで表示、配色をCSS変数に統一）
- 共通: Selectのdisabled表示を改善（背景/文字色/カーソル）
- 設定: Note Parameters 出力設定のUIを改善
  - 新規取り込み（Import）/構造再生成（Regenerate）での反映可否（✓/✕）と備考を一覧表示
  - 旧キー `DEFAULT` を正しい `Default` に移行（後方互換）
- 全コンポーネントをCSS変数ベースのテーマシステムに移行
  - 共通コンポーネント（Dialog, Input, Select, Button, CollapsibleSection）
  - レイアウト（MainLayout, Header, Sidebar）
  - ERエディタ（EREditor, TableNode, TableEditor, ColumnEditor, 全ColumnEditorPartsサブコンポーネント）
  - シミュレータ（Simulator, TableView）
  - 設定ダイアログ、プロジェクトダイアログ
- ERエディタ: リレーション接続のバリデーションを強化
  - キー列のみ接続元として許可
  - 参照先カラムが既に他テーブルから参照されている場合の上書きを禁止
  - 重複リレーションは追加せず既存を利用
- ERエディタ: リレーション/エッジの操作性を改善（当たり判定拡大、エッジ更新ハンドルの視認性調整）
- ERエディタ: カラム行ミニツールバーを拡張
  - SHOW（表示/非表示）, Editable（編集可/不可）, Require?（必須）のON/OFFをアイコンで切り替え
  - データ型セレクタ直下に、タブ切替式の入力欄を追加（Formula / Initial Value / Display Name / Description）
- Simulator: サンプルデータ型を `SampleRow` / `SampleDataByTableId` に統一して型安全性・安定性を改善
- 開発: copilot-instructions.mdにテーマ実装ガイドラインを追記

### 修正
- ERエディタ: カラム行ミニツールバーのトグル（SHOW/Editable/必須）が、`Show_If`/`Editable_If`/`Required_If` 設定時に変更できてしまう問題を修正
  - ロック中である旨をツールチップで表示
- ERエディタ: カラム設定の `Required_If` 欄に文字が入力できない問題を修正
  - 原因: 1つの入力イベント内で複数のAppSheet値更新が競合し、入力値が上書きされていた
  - 対策: 関連キー更新を原子的（バッチ）に行うよう統一
- ERエディタ: AppSheetメモ設定のトグル系（Show?/Editable?/Reset on edit?/Require?）を Unset/true/false の3値に対応
  - 数式（`Show_If`/`Editable_If`/`Required_If`/任意式の`Reset_If`）が入っている場合は、対応トグルは常に Unset かつ変更不可
  - 数式が入っている間に勝手に true/false へ変化しないよう、競合解決ロジックとUI制御を調整
- ERエディタ: Editable? トグルの動作を改善
  - `Editable_If` が `TRUE`/`FALSE` の場合はトグル操作可能（式が入っている場合のみロック）
  - トグル操作は `Editable_If` を `TRUE`/`FALSE` に設定する方式へ統一（旧 `Editable` キーを整理）
- Excelエクスポート/プレビュー: Note Parameters の `Default` キー名を正として扱う（旧 `DEFAULT` は後方互換で吸収）
- Excelエクスポート: 式系キー（`Show_If`/`Required_If`/`Editable_If`/`Reset_If`）を `TypeAuxData` に正しく集約するため、ユーザー指定の式が出力設定により欠落しないよう修正
- ドキュメント: AppSheetメモ（Note Parameters/TypeAuxData）の説明を拡充（TypeAuxDataのキー一覧、エスケープ早見表、サポート状況更新）
- ERエディタ: ズーム中のカラム並び替え（ドラッグ&ドロップ）で移動量がズレる問題を修正
- ERエディタ: カラムの接続ハンドル周辺のクリック/ドラッグの競合を軽減（イベント伝播の抑制、当たり判定・位置の微調整）
- ERエディタ: 既存リレーションあり列のインジケータ（青紫）の枠線色がテーマで変化する問題を修正（常に白枠）
- ERエディタ: 既存リレーションあり列のインジケータ（青紫）が小さく見える問題を修正（サイズ調整）
- ERエディタ: 選択中カラムに削除ボタンを表示
- ERエディタ: カラム削除の誤操作を防止（2回クリックで削除、1回目は赤色+カーソル付近に説明を表示）
- ERエディタ: エッジ（リレーション線）を付け替え後、旧ターゲットカラムのRef型が解除されない問題を修正
  - 原因: React Flow の `updateEdge` を使用すると内部で新しいエッジIDが生成され、ストアのリレーションIDと不整合が発生していた
  - 対策: `updateEdge` を使用せず、ストアの `relations` 更新後に `useEffect` でエッジを同期する方式に変更
- Simulator: TableViewのカラム並び替えUIをフォーカスでも操作しやすいように改善（focus-withinで操作ボタンを表示、ドラッグ開始時にフォーカス付与）
- Simulator: 行未選択時に編集開始できてしまうケースを防止
- Simulator: TableViewヘッダーの不要な `tabIndex` を削除
- 設定: 折りたたみセクション（見出し/アイコン）のダークテーマ表示を調整

## 既知の制限
- ALPHAのため、互換性（DB/プロジェクト形式）が将来変更される可能性があります。

## 不具合報告
- 手順/期待/実際の結果、OS、バージョン（設定→バージョン情報の値）を添えて連絡
- 連絡先: GitHub Issues（配布用Publicリポジトリ）
- 注意: Issuesは公開されます。個人情報・社外秘情報・顧客データ等は記載しないでください。
