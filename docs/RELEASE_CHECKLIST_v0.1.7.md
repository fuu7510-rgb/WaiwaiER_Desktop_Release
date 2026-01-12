# v0.1.7 リリース手順（Windows / ALPHA）

## 1) 版数の整合
- package.json の version が 0.1.7
- src-tauri/tauri.conf.json の version が 0.1.7
- src-tauri/Cargo.toml の package.version が 0.1.7

## 2) ビルド（インストーラ生成）
```powershell
corepack pnpm tauri:build
```
- 期待成果物
  - src-tauri/target/release/bundle/msi/WaiwaiER Desktop_0.1.7_x64_en-US.msi
  - src-tauri/target/release/bundle/nsis/WaiwaiER Desktop_0.1.7_x64-setup.exe

## 3) 配布ZIP作成
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-release.ps1 -Channel alpha -OutDir release
```
- 期待成果物（release/）
  - release/WaiwaiER-Desktop-0.1.7-alpha-win64-msi.zip
  - release/WaiwaiER-Desktop-0.1.7-alpha-win64-nsis.zip

## 4) リリースノート
- docs/RELEASE_NOTES/RELEASE_NOTES_v0.1.7.md を GitHub Releases の本文へ貼り付け

## 5) GitHub Releases（手動）
- Tag: v0.1.7
- Title: v0.1.7 (alpha)
- Assets:
  - release/WaiwaiER-Desktop-0.1.7-alpha-win64-msi.zip
  - release/WaiwaiER-Desktop-0.1.7-alpha-win64-nsis.zip

## 6) 最低限の動作確認（推奨）
- どちらか一方のインストーラでインストール→起動
- 設定画面/Aboutでバージョンが 0.1.7 と表示される
- 既存プロジェクトの読み込み、Excelエクスポート、Simulator表示が最低限動く
