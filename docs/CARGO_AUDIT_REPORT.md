# Cargo Audit レポート

**実行日**: 2026-01-07  
**対象**: WaiwaiER Desktop v0.1.6  
**Tauri**: v2.9.5

## サマリー

| 種別 | 件数 |
|------|------|
| 🔴 脆弱性 | 2 |
| ⚠️ 警告（メンテナンス終了等） | 18 |

## 脆弱性詳細

### 1. rkyv 0.7.45 - RUSTSEC-2026-0001

- **タイトル**: `Arc<T>`/`Rc<T>` の `from_value` 実装でOOM時に未定義動作の可能性
- **深刻度**: 不明
- **修正バージョン**: >=0.7.46, <0.8.0 OR >=0.8.13
- **依存経路**: tauri-plugin-log → byte-unit → rust_decimal → rkyv
- **対応**: 上流（tauri-plugin-log）のアップデート待ち

### 2. rsa 0.9.9 - RUSTSEC-2023-0071

- **タイトル**: Marvin Attack - タイミングサイドチャネルによる鍵復元の可能性
- **深刻度**: 5.9 (medium)
- **修正バージョン**: なし
- **依存経路**: tauri-plugin-sql → sqlx → sqlx-mysql → rsa
- **対応**: 修正版なし。本アプリケーションではMySQLは使用しておらず、SQLiteのみを使用しているため実質的なリスクは低い

## 警告（メンテナンス終了等）

### gtk-rs GTK3バインディング群

以下のクレートはGTK3バインディングとしてメンテナンス終了が宣言されています（Linux向け）:

- atk, atk-sys, gdk, gdk-sys, gdkwayland-sys, gdkx11, gdkx11-sys
- gtk, gtk-sys, gtk3-macros

**対応**: Tauriの依存関係であり、Tauri側の対応待ち。WindowsビルドではGTK3は使用されないため影響なし。

### その他のメンテナンス終了警告

| クレート | RUSTSEC ID | 依存元 |
|---------|-----------|--------|
| fxhash 0.2.1 | RUSTSEC-2025-0057 | wry → selectors → kuchikiki |
| proc-macro-error 1.0.4 | RUSTSEC-2024-0370 | glib-macros, gtk3-macros |
| unic-char-property 0.9.0 | RUSTSEC-2025-0081 | tauri-utils → urlpattern |
| unic-char-range 0.9.0 | RUSTSEC-2025-0075 | tauri-utils → urlpattern |
| unic-common 0.9.0 | RUSTSEC-2025-0080 | tauri-utils → urlpattern |
| unic-ucd-ident 0.9.0 | RUSTSEC-2025-0100 | tauri-utils → urlpattern |
| unic-ucd-version 0.9.0 | RUSTSEC-2025-0098 | tauri-utils → urlpattern |

### unsoundの警告

- **glib 0.18.5** (RUSTSEC-2024-0429): `VariantStrIter` のイテレータ実装に未定義動作の可能性

## 推奨アクション

1. **定期監視**: `cargo audit` をCI/CDまたは定期タスクで実行
2. **Tauriアップデート追跡**: Tauri v2.10以降で依存関係の更新を確認
3. **リリース前確認**: 新規リリース前に `cargo audit` を実行

## 補足

このプロジェクトの脆弱性の多くは間接依存（transitive dependencies）であり、Tauriエコシステムのアップデートを待つ必要があります。

- **rsa脆弱性**: 本アプリケーションではMySQL接続を使用しないため、実質的なリスクは極めて低い
- **gtk-rs警告**: Windowsビルドでは影響なし。Linux版配布時のみ注意

---

*このレポートは `cargo audit` v0.22.0 により生成されました。*
