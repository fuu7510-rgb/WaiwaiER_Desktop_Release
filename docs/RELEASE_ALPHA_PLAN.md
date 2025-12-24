# WaiwaiER Desktop アルファ版 公開計画書（ストア不使用）

作成日: 2025-12-24

## 目的
- ER図モデリング + AppSheet互換シミュレーター/Excelエクスポートの「オフライン版」初期ユーザー検証を開始する。
- ストアを使わず、直接配布（ダウンロード）でフィードバックループを回す。

## 公開形態（ストア不使用）
- Windows: `tauri build` で生成される **MSIインストーラ** をZIPで配布（本公開ではMSIを正とする）
- 配布チャネル: GitHub Releases（本リポジトリのReleasesにアップロード）
- 更新: アルファでは自動更新なし（手動で差し替え）

## リリースチャネル運用（VITE_RELEASE_CHANNEL）
- `VITE_RELEASE_CHANNEL=alpha|beta|stable` を利用して、ヘッダー表示と注意バナー表示を切り替える
- アルファ公開では `alpha` 固定を推奨
- 設定方法（例）
  - `.env` を作成して `VITE_RELEASE_CHANNEL=alpha` を記入（`.env.example` をコピー）
  - もしくはビルド時に環境変数で指定
    - PowerShell例: `$env:VITE_RELEASE_CHANNEL='alpha'; npm run tauri:build`

## 手動アップデート手順（ストア不使用）
1. アプリを終了する
2. 可能なら事前にバックアップを取る（推奨）
  - プロジェクトのエクスポート（JSON / パッケージ）
  - OSのバックアップ/スナップショット
3. 新しい配布ZIPをダウンロード
4. 既存版を上書き/差し替え
  - インストーラ方式の場合: 新しいインストーラを実行（必要に応じて旧版をアンインストール）
  - ポータブル方式の場合: 旧フォルダを退避して新フォルダへ差し替え
5. 起動して動作確認（プロジェクト読み込み、エクスポート等）

※ 破壊的変更が入る可能性があるため、アップデート前バックアップを必須運用とすること。

## 配布ZIPの作り方（Windows）
1. 前提チェック
  - `npm run lint` が成功
  - `npm run build` が成功
2. リリースビルド
  - `npm run tauri:build`
3. 成果物の確認（目安）
  - `src-tauri/target/release/bundle/` 配下にインストーラ等が出力される
  - Windows（今回のビルド例）
    - MSI: `src-tauri/target/release/bundle/msi/WaiwaiER Desktop_0.1.0_x64_en-US.msi`
    - セットアップEXE（NSIS）: `src-tauri/target/release/bundle/nsis/WaiwaiER Desktop_0.1.0_x64-setup.exe`（参考）
  - 本公開（MSI配布）では、MSIのみを配布対象とする
4. ZIP化
  - 推奨: 付属スクリプトでZIPを生成する
    - `npm run release:zip`
    - 環境変数でチャネルを指定する場合（PowerShell例）:
      - `$env:VITE_RELEASE_CHANNEL='alpha'; npm run release:zip`
  - 出力先: `release/`
  - ZIP名にバージョンとチャネルを含める（例）
    - `WaiwaiER-Desktop-0.1.0-alpha-win64-msi.zip`
  - 配布対象（MSI）: `WaiwaiER-Desktop-0.1.0-alpha-win64-msi.zip`
5. 第三者PCで起動確認
  - 起動/終了
  - プロジェクト作成→保存→再起動→復元
  - Excelエクスポート

## リリースノート
- 雛形: [docs/RELEASE_NOTES_TEMPLATE.md](docs/RELEASE_NOTES_TEMPLATE.md)

## 公開前チェック（不足しがちなポイント）
- バージョン表示: UI上で常に現在のアプリバージョンを確認できる
- リリース段階表示: 画面上で「ALPHA」を明示（誤利用/誤期待の防止）
- 既知の制限/未実装: READMEまたはリリースノートで明記
- データ互換性: 破壊的変更（DBスキーマ/プロジェクト形式）があり得る旨を明記（アプリ内にも常時表示）
- バックアップ/復旧: 破損時の復旧手段（自動バックアップ・手動エクスポート）を提示
- ライセンス: オフライン検証、期限、プラン制限、問い合わせ先の提示
- セキュリティ注意: 暗号化プロジェクトのパスフレーズ紛失は復旧不可であることを明記
- 配布物の信頼性: コード署名は不要（アルファでは未対応）

## 実装タスク（MVP / アルファに必要な範囲）
### 1. UI
- ロゴに「ALPHA」表記を追加（ヘッダー）
- バージョン情報画面（ダイアログ）を追加
  - 表示項目: アプリ名 / 版本 / ビルド日時 / リリース段階

### 2. i18n
- 新規追加UI文言の英訳を追加
- 既存UIで未翻訳が出ていないか確認（キー欠落/ハードコード文言）

### 3. ビルド/リリース手順
- `npm run lint` / `npm run build` / `npm run tauri:build` の成功
- 生成物の場所をドキュメント化（Windowsなら `src-tauri/target/release/bundle/...`）

### 4. ドキュメント
- リリースノート（必須）
  - 対象OS
  - 既知の制限
  - 破壊的変更の可能性
  - 不具合報告方法（Issue/フォーム/メール）

## 検証（アルファ公開前の最低ライン）
- 起動/終了が安定
- 新規プロジェクト作成 → 保存 → 再起動 → 復元
- 暗号化プロジェクトの作成/復号の導線
- Excelエクスポート生成（AppSheet互換のNote出力を含む）
- シミュレーターでRef関係が反映される

## 1週間スケジュール例（小規模）
- Day 1: UI（ALPHA表記/バージョン画面）+ i18n差分
- Day 2: バージョン一元化、リリース手順整備、lint/build安定化
- Day 3: 主要フロー手動テスト、既知の制限の棚卸し
- Day 4: 修正、配布パッケージ作成、リリースノート作成
- Day 5: 限定公開（数名）→ フィードバック収集

## 完了条件（Go/No-Go）
- UIで「ALPHA」とバージョンが確認できる
- 配布物を第三者PCで起動できる
- 重大データ損失リスクがドキュメント化されている
