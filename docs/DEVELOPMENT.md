# WaiwaiER Desktop 開発ガイド

このドキュメントでは、WaiwaiER Desktopの開発環境のセットアップから日常的な開発作業までの手順を説明します。

---

## 目次

1. [前提条件](#前提条件)
2. [環境構築](#環境構築)
3. [開発の開始](#開発の開始)
4. [開発コマンド一覧](#開発コマンド一覧)
5. [開発フロー](#開発フロー)
6. [プロジェクト構造](#プロジェクト構造)
7. [デバッグ方法](#デバッグ方法)
8. [ビルドと配布](#ビルドと配布)
9. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

以下のソフトウェアがインストールされている必要があります。

### 必須ソフトウェア

| ソフトウェア | バージョン | インストール方法 |
|-------------|-----------|-----------------|
| **Node.js** | 18.x 以上 | [公式サイト](https://nodejs.org/) または nvm |
| **Rust** | 最新版 | [rustup](https://rustup.rs/) を使用 |
| **Visual Studio Build Tools** | 2022 | [Visual Studio Installer](https://visualstudio.microsoft.com/downloads/) (C++ ビルドツール) |
| **WebView2** | 最新版 | Windows 10/11には通常プリインストール済み |

### Rust のインストール

```powershell
# Windows PowerShell で実行
winget install Rustlang.Rustup

# または rustup-init.exe をダウンロードして実行
# https://rustup.rs/

# インストール確認
rustc --version
cargo --version
```

### Visual Studio Build Tools

Tauri（Rust）のビルドに必要です。

#### 方法1: winget でインストール（推奨）

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --override "--wait --passive --add Microsoft.VisualStudio.Workload.VCTools --add Microsoft.VisualStudio.Component.VC.Tools.x86.x64 --add Microsoft.VisualStudio.Component.Windows11SDK.22621"
```

#### 方法2: 手動インストール

1. [Visual Studio ダウンロードページ](https://visualstudio.microsoft.com/downloads/) にアクセス
2. 「Build Tools for Visual Studio 2022」をダウンロード
3. インストーラーを実行
4. **「C++ によるデスクトップ開発」** ワークロードを選択してインストール

> ⚠️ **注意**: 既にBuild Toolsがインストールされている場合は、Visual Studio Installerを開いて「変更」をクリックし、「C++ によるデスクトップ開発」ワークロードを追加してください。

---

## 環境構築

### 1. リポジトリのクローン

```powershell
git clone <repository-url>
cd WaiwaiER_Desktop
```

### 2. 依存関係のインストール

```powershell
# Node.js 依存関係
npm install

# Rust 依存関係（初回は自動でダウンロードされます）
# tauri dev 実行時に自動インストール
```

### 3. 環境変数の設定（必要に応じて）

現時点では特別な環境変数は不要です。

---

## 開発の開始

### 推奨: Tauri 開発モード（フルアプリ）

```powershell
npm run tauri:dev
```

このコマンドを実行すると：
1. Vite 開発サーバーが起動（http://localhost:5173）
2. Rust バックエンドがコンパイル
3. デスクトップアプリウィンドウが起動
4. ホットリロードが有効（フロントエンドの変更は即座に反映）

> ⚠️ **初回起動時の注意**: 初回は Rust クレートのダウンロードとコンパイルに **5〜10分程度** かかります。
> 2回目以降はキャッシュが効くため、数秒〜数十秒で起動します。

### PATH が通っていない場合

新しくRustをインストールした直後など、ターミナルでPATHが更新されていない場合は、以下のコマンドでPATHを再読み込みしてから実行してください：

```powershell
# PATHを再読み込みしてから実行
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
npm run tauri:dev
```

または、**VS Codeを再起動**するか、**新しいターミナルウィンドウを開く**ことでPATHが反映されます。

### フロントエンドのみの開発

Rust バックエンドの機能が不要な場合、ブラウザで開発できます：

```powershell
npm run dev
```

ブラウザで http://localhost:5173 を開いてください。

> ⚠️ **注意**: Tauri API（ファイル操作、SQLite等）はブラウザモードでは動作しません。

---

## 開発コマンド一覧

| コマンド | 説明 |
|---------|------|
| `npm run dev` | Vite 開発サーバー起動（ブラウザ用） |
| `npm run tauri:dev` | Tauri 開発モード（デスクトップアプリ） |
| `npm run build` | フロントエンドのプロダクションビルド |
| `npm run tauri:build` | デスクトップアプリのプロダクションビルド |
| `npm run lint` | ESLint によるコード検証 |
| `npm run preview` | ビルド結果のプレビュー |
| `npx tsc --noEmit` | TypeScript 型チェックのみ実行 |

---

## 開発フロー

### 日常的な開発サイクル

```
1. npm run tauri:dev でアプリを起動
2. コードを編集（ホットリロードで自動反映）
3. 変更を確認
4. git commit
```

### フロントエンド変更時

- React コンポーネント、CSS の変更は即座に反映されます
- 新しいパッケージを追加した場合は、開発サーバーを再起動してください

### Rust バックエンド変更時

- `src-tauri/src/*.rs` を変更すると、自動で再コンパイルされます
- コンパイルには数秒〜数十秒かかります
- 新しい Tauri コマンドを追加した場合は、アプリを再起動してください

### 型チェック

コミット前に型エラーがないか確認することを推奨します：

```powershell
npx tsc --noEmit
```

---

## プロジェクト構造

```
WaiwaiER_Desktop/
├── docs/                    # ドキュメント
│   ├── LOCAL_APP_REQUIREMENTS.md  # 要件定義書
│   ├── DEVELOPMENT.md       # このファイル
│   └── AppSheet/            # AppSheet関連資料
├── public/                  # 静的ファイル
├── references/              # 参照用既存コード
│   └── XppSheetSimulator/   # 既存Webアプリのソース
├── src/                     # フロントエンドソース
│   ├── components/          # React コンポーネント
│   │   ├── EREditor/        # ER図エディタ
│   │   ├── Simulator/       # AppSheetシミュレーター
│   │   ├── Layout/          # レイアウト
│   │   ├── Project/         # プロジェクト管理
│   │   ├── Settings/        # 設定
│   │   ├── Export/          # エクスポート機能
│   │   └── common/          # 共通コンポーネント
│   ├── stores/              # Zustand ストア
│   ├── types/               # TypeScript 型定義
│   ├── i18n/                # 多言語対応
│   ├── lib/                 # ユーティリティ
│   ├── App.tsx              # メインアプリ
│   └── main.tsx             # エントリーポイント
├── src-tauri/               # Rust バックエンド
│   ├── src/
│   │   ├── main.rs          # Rust エントリーポイント
│   │   ├── lib.rs           # Tauri コマンド定義
│   │   └── excel.rs         # Excelエクスポート
│   ├── Cargo.toml           # Rust 依存関係
│   └── tauri.conf.json      # Tauri 設定
├── package.json             # Node.js 依存関係
├── vite.config.ts           # Vite 設定
├── tsconfig.json            # TypeScript 設定
└── tailwind.config.js       # Tailwind CSS 設定
```

---

## デバッグ方法

### フロントエンドのデバッグ

1. **開発者ツール**: アプリ起動中に `F12` または `Ctrl+Shift+I`
2. **React DevTools**: ブラウザ拡張機能をインストール
3. **コンソールログ**: `console.log()` で確認

### Rust バックエンドのデバッグ

1. **ログ出力**: `log::info!()`, `log::debug!()` マクロを使用
2. **パニック時のバックトレース**:
   ```powershell
   $env:RUST_BACKTRACE = 1
   npm run tauri:dev
   ```

### Tauri コマンドのテスト

フロントエンドから Tauri コマンドを呼び出してテスト：

```typescript
import { invoke } from '@tauri-apps/api/core';

// 例: Rust 側の greet コマンドを呼び出し
const result = await invoke('greet', { name: 'World' });
console.log(result);
```

---

## ビルドと配布

### 開発ビルド（テスト用）

```powershell
npm run tauri:build
```

ビルド成果物の場所：
- `src-tauri/target/release/` - 実行ファイル
- `src-tauri/target/release/bundle/` - インストーラー

### リリースビルド

```powershell
npm run tauri:build -- --release
```

### ビルド成果物

| 形式 | パス | 用途 |
|-----|------|------|
| EXE | `target/release/WaiwaiER Desktop.exe` | 直接実行 |
| MSI | `target/release/bundle/msi/` | Windowsインストーラー |
| NSIS | `target/release/bundle/nsis/` | NullSoft インストーラー |

---

## トラブルシューティング

### よくある問題と解決策

#### 1. `npm run tauri:dev` が失敗する

**症状**: Rust コンパイルエラー

**解決策**:
```powershell
# Rust ツールチェーンを更新
rustup update

# Cargo のキャッシュをクリア
cargo clean
```

#### 2. WebView2 関連のエラー

**症状**: アプリが起動しない

**解決策**:
- [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) をインストール

#### 3. ホットリロードが効かない

**症状**: ファイルを変更しても反映されない

**解決策**:
```powershell
# 開発サーバーを再起動
# Ctrl+C で停止後、再度実行
npm run tauri:dev
```

#### 4. TypeScript エラー

**症状**: 型エラーが発生

**解決策**:
```powershell
# 型チェックを実行して詳細を確認
npx tsc --noEmit

# node_modules を再インストール
Remove-Item -Recurse -Force node_modules
npm install
```

#### 5. Tauri API が動作しない（ブラウザモード）

**症状**: `invoke` でエラーが発生

**原因**: Tauri API はデスクトップアプリ内でのみ動作します

**解決策**: `npm run tauri:dev` を使用してください

---

## 参考リンク

- [Tauri 公式ドキュメント](https://v2.tauri.app/)
- [React 公式ドキュメント](https://react.dev/)
- [Zustand](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vite](https://vitejs.dev/)

---

## 更新履歴

| 日付 | 内容 |
|-----|------|
| 2025-12-24 | 初版作成 |
