# セキュリティ調査レポート（WaiwaiER Desktop）

- 調査日: 2026-01-05
- 対象: WaiwaiER Desktop リポジトリ（Tauri + React）
- 目的: 現時点のセキュリティ上のリスク洗い出しと優先度付け

## 前提（脅威モデル）

- デスクトップアプリ（Tauri WebView）で、基本はローカルデータを扱う。
- “攻撃”は主に以下を想定:
  - ユーザーが取り込む外部データ（JSONインポート、貼り付け、ファイル選択）に悪意ある入力が含まれる
  - UIのXSS/スクリプト注入が起点となり、Tauriプラグイン権限経由でローカルファイル/DBへアクセスされる
- 重大度は「成立した場合の影響 × 成立容易性（現状の設定）」で概算。

## 自動スキャン結果（依存関係）

- Node依存: `pnpm audit` / `pnpm audit --prod` は **No known vulnerabilities found**
- Rust依存: `cargo audit` は **未導入（cargo-audit がインストールされていない）**
  - 推奨: `cargo install cargo-audit` 後に `cargo audit` をCI/手元で実行

## 主要な発見事項（優先度順）

### 1) CSP が無効（高）

**根拠**
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json#L1) の `app.security.csp` が `null`

**リスク**
- 何らかのXSS/スクリプト注入が起きた場合、CSPでブロックできず成立しやすい。
- 本リポジトリは `tauri_plugin_fs` / `tauri_plugin_sql` を有効化しており、XSSが成立するとローカルファイル/DBアクセスへ連鎖しやすい。

**推奨対応**
- 本番用CSPを設定（最小構成から開始）
  - 例（方針）: `default-src 'self'`、`script-src 'self'`、必要な `connect-src` を明示
  - フレームワーク/プラグイン都合で緩和が必要なら、理由と例外を限定してドキュメント化

---

### 2) filesystem 権限が過大（高）

**根拠**
- [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json#L1) の `fs:scope` が `$HOME/**`, `$DESKTOP/**`, `$APPDATA/**`, `$APPLOCALDATA/**` 等を許可
- [src-tauri/src/lib.rs](src-tauri/src/lib.rs#L51) で `tauri_plugin_fs::init()` を有効化

**リスク**
- もしレンダラ側が乗っ取られると、ユーザーのホーム/デスクトップ/アプリデータ配下のファイルを読み書き可能。
- さらにCSP無効（上記 1）と組み合わさると、ローカルデータの外部送信（情報漏えい）や破壊が成立しやすい。

**推奨対応（優先）**
- `fs:scope` をアプリが必須で扱う範囲に絞る
  - 原則: アプリ管理領域（`app_data_dir`）中心
  - “ユーザーが明示的に選択したファイルだけ扱う”運用に寄せる
- 不要な権限（`fs:default` や広範囲の read/write）を削減
- どうしても任意パスへの書き込み（エクスポート先）を許す場合でも、範囲を `$DOCUMENT/**` / `$DOWNLOAD/**` 程度に抑える、あるいは機能側で保存先を制約する

---

### 3) `project_id` をファイルパスへ直結しており、パストラバーサル成立余地（高）

**根拠**
- [src-tauri/src/project_db.rs](src-tauri/src/project_db.rs#L14) にて `dir.join(format!("{project_id}.db"))`
- `project_id` に `../` やパス区切りを含めた場合、`projects` ディレクトリ外を指す可能性がある
  - その後の `Connection::open` / `remove_file` により、**任意パスの作成・読み書き・削除** に繋がりうる

**現状の軽減要素**
- フロント側では `uuidv4()` でIDを作っている箇所が多い（例: [src/stores/projectStore.ts](src/stores/projectStore.ts#L1)）
- ただし、インポート/復元/将来拡張/手動改変で `project_id` が汚染される余地を完全には否定できないため、Rust側での防御が必要。

**推奨対応（必須）**
- Rust側で `project_id` を厳格にバリデーション（UUID形式のみ許可等）
- 併せて「canonicalizeして `projects` 配下に収まることを検証」する防御（防衛的プログラミング）
- 削除API（`delete_project_db`）は特に危険なので、上記チェックが通らない場合は即エラーにする

---

### 4) SQL/FSプラグインの権限と利用範囲が広い（中）

**根拠**
- [src-tauri/capabilities/default.json](src-tauri/capabilities/default.json#L1) で `sql:allow-execute` / `sql:allow-select` 等を許可
- [src-tauri/src/lib.rs](src-tauri/src/lib.rs#L51) で `tauri_plugin_sql` を有効化
- フロント側 [src/lib/database.ts](src/lib/database.ts#L221) で `Database.load('sqlite:waiwaier.db')` を利用

**リスク**
- 直接のSQLインジェクションは、現在のコードはパラメータ化されている箇所が多い（例: `WHERE ... = $1`）ため低め。
- ただしレンダラが乗っ取られた場合、DBの全読み取り/破壊（`execute`）が可能。

**推奨対応**
- capabilitiesの `sql:*` を「必要な操作だけ」に絞る（可能なら `execute` を減らす、機能単位で分離）
- DB操作は可能な限りTauri command側（Rust）に寄せ、レンダラには限定APIだけを提供する（権限境界を明確化）

---

### 5) ライセンスキー（JWT）が localStorage に平文保存（中）

**根拠**
- [src/lib/license.ts](src/lib/license.ts#L255) で `licenseKey` を localStorage に保存

**リスク**
- XSSや依存コンポーネントの侵害が成立すると、ライセンスキー（Bearer相当）が窃取されやすい。
- デスクトップでもWebView内ストレージは“完全に安全”ではない。

**推奨対応**
- OSの資格情報ストア利用（Keychain/Windows Credential Manager）またはTauriのsecure-storage系プラグイン（導入可否を検討）
- 少なくとも「ローカル暗号化」＋「CSP/権限縮小」で連鎖を断つ

---

### 6) `withGlobalTauri: true` による露出面増（低〜中）

**根拠**
- [src-tauri/tauri.conf.json](src-tauri/tauri.conf.json#L1) の `app.withGlobalTauri: true`

**リスク**
- API露出が増え、XSS成立時の横展開が容易になるケースがある。

**推奨対応**
- 可能なら `withGlobalTauri` をオフにし、必要箇所のみ明示インポートで利用

## 機密情報（シークレット）混入チェック

簡易grepで以下を確認した範囲では、秘密鍵・APIキーっぽい固定値は見つかりませんでした。

- `BEGIN PRIVATE KEY`, `aws_secret_access_key`, `supabase` 等の典型パターン

注意: `references/` 配下には共有用・作業用ファイルも含まれているため、リリースパッケージに同梱されないこと（Tauri bundle対象外・配布物の除外）をリリース手順で明確化してください。

## 推奨アクション（優先度）

1. **CSPを有効化**（最低限の `default-src 'self'` から）
2. **capabilitiesのFS権限を縮小**（HOME/DESKTOP/APPDATA の無制限許可を撤廃）
3. **Rust側で `project_id` を検証**（UUIDのみ等）し、パストラバーサルを封じる
4. `cargo-audit` を導入してRust依存の脆弱性スキャンを定期化
5. ライセンスキーの保存先をsecure storageへ移行（中期）

## 付録: 調査に使ったコマンド

- `pnpm audit --prod`
- `pnpm audit`
- `cargo audit`（未導入のため失敗）
