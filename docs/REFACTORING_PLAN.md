# リファクタリング計画書

**作成日**: 2025年12月31日  
**ブランチ**: `refactor/cleanup`

---

## 概要

リポジトリ全体を調査した結果、以下の問題点を特定しました。優先順位と理由を付けて整理しています。

---

## 🔴 優先度: 高

### 1. `erStore.ts` の分割 (1,365行)

**ファイル**: `src/stores/erStore.ts`

**問題点**:
- ストア全体が巨大すぎる（1365行）
- テーブル操作、カラム操作、サンプルデータ操作、リレーション操作、メモ操作、履歴操作、永続化がすべて1ファイルに集約

**推奨される修正**:
責務ごとにスライス化:
- `stores/slices/tableSlice.ts`
- `stores/slices/columnSlice.ts`
- `stores/slices/sampleDataSlice.ts`
- `stores/slices/relationSlice.ts`
- `stores/slices/historySlice.ts`
- `stores/slices/persistenceSlice.ts`

**理由**: 
- 変更時の影響範囲を限定できる
- テストが書きやすくなる
- 複数人での作業時にコンフリクトを減らせる

---

### 2. `Simulator.tsx` のコンポーネント分割 (1,006行)

**ファイル**: `src/components/Simulator/Simulator.tsx`

**問題点**:
- 1つのファイルに1000行超のコンポーネント
- Detail View、Form View、テーブルナビ、行編集ロジックがすべて混在

**推奨される修正**:
- `SimulatorNavPanel.tsx` - テーブルナビゲーション
- `SimulatorDetailPanel.tsx` - Detail View表示
- `SimulatorRowForm.tsx` - 行編集フォーム
- `SimulatorRelatedRecords.tsx` - 関連レコード表示

**理由**:
- 各Viewの責務が明確になる
- AppSheetの仕様に合わせた改修が容易になる
- コンポーネント単位でのテストが可能になる

---

### 3. `appFormula.ts` の分割 (891行)

**ファイル**: `src/lib/appsheet/appFormula.ts`

**問題点**:
- AppSheet式の評価エンジンが巨大
- Tokenizer、Parser、Evaluatorが混在

**推奨される修正**:
```
src/lib/appsheet/
├── appFormula.ts        # メインエントリ（ファサード）
├── tokenizer.ts         # トークナイザー
├── parser.ts            # パーサー
├── evaluator.ts         # 評価器
└── functions/
    ├── index.ts
    ├── text.ts          # TEXT, CONCATENATE等
    ├── math.ts          # SUM, AVERAGE等
    ├── logical.ts       # IF, AND, OR等
    └── datetime.ts      # NOW, TODAY等
```

**理由**:
- 新しい関数の追加が容易になる
- 各フェーズのテストが独立して書ける
- バグの特定が容易になる

---

### 4. テストの追加

**問題点**:
- テストファイルが存在しない（`*.test.ts`, `*.spec.ts` がない）

**推奨される修正**:
優先度順にテストを追加:
1. `appFormula.ts` のパーサー/評価器
2. `erStore.ts` のコアロジック
3. `diagramSchema.ts` のマイグレーション
4. Rust側の `excel.rs` Note生成ロジック

**理由**:
- リファクタリングによるデグレを防止
- 複雑なロジック（式評価）の正確性を担保
- 将来の機能追加時の安全網

---

### 5. エラーハンドリングの改善

**ファイル**: 複数

| ファイル | 問題点 |
|---------|--------|
| `erStore.ts` | `catch (e) { console.error(...) }` - エラーをログに出すだけでユーザーに通知しない |
| `projectStore.ts` | `saveDiagram()` のエラーは `lastSaveError` に保存されるが、UIで表示されていない |
| 暗号化プロジェクト | パスフレーズ誤りのエラーメッセージが汎用的 |

**推奨される修正**:
- トースト通知を追加
- UIストアの `error` 状態を活用
- ユーザーフレンドリーなエラーメッセージとリトライUIを追加

**理由**:
- ユーザーが問題に気づける
- データ損失リスクを軽減

---

## 🟡 優先度: 中

### 6. コードの重複解消

| 重複箇所 | 内容 | 修正方法 |
|---------|------|---------|
| `erStore.ts` 複数箇所 | `invoke() + saveDiagram()` の呼び出しパターンが10回以上重複 | ヘルパー関数 `invokeAndSave()` を作成 |
| `TableNode.tsx` / `constants.ts` | テーブルカラー用のクラスマッピングが重複定義 | `constants.ts` に統一 |
| `Simulator.tsx` / `appFormula.ts` | `getRecordLabel()` のロジックが重複 | `recordLabel.ts` にユーティリティ関数として抽出 |
| `projectStore.ts` / `licenseStore.ts` | `isValidLicense`, `licenseInfo` が両ストアに重複 | ライセンス関連は `licenseStore` に統一 |

---

### 7. 型安全性の向上

| ファイル | 問題点 | 修正方法 |
|---------|--------|---------|
| `erStore.ts` 全体 | `Record<string, unknown>` が多用されており、サンプルデータの型が弱い | `SampleRow` 型を定義 |
| `diagramSchema.ts` | `as DiagramData` のような型アサーションが多い | Zodなどでランタイムバリデーションを追加 |
| `appFormula.ts` | 評価結果が `unknown[]` で型が曖昧 | 再帰的な型定義を導入 |

---

### 8. パフォーマンス最適化

| ファイル | 問題点 | 修正方法 |
|---------|--------|---------|
| `Simulator.tsx` | `useMemo` が毎回 `evaluateFormulas` を呼び出し | 依存配列を最適化、遅延評価を検討 |
| `appFormula.ts` | 評価キャッシュがグローバルMapで無制限に成長 | LRUキャッシュ（最大1000件など）に変更 |
| `erStore.ts` | 履歴が100件まで保持される | 差分保存またはスナップショット間隔を調整 |
| `database.ts` | `loadDiagram` がテーブル切り替え時に毎回呼ばれる | デバウンスまたはキャッシュを追加 |

---

### 9. `database.ts` の分割 (524行)

**ファイル**: `src/lib/database.ts`

**問題点**:
- LocalStorage版とSQLite版の両実装が混在

**推奨される修正**:
```
src/lib/database/
├── index.ts           # ファサード
├── localStorage.ts    # LocalStorage実装
└── sqlite.ts          # SQLite実装
```

---

### 10. `excel.rs` の分割 (736行)

**ファイル**: `src-tauri/src/excel.rs`

**問題点**:
- Excel出力ロジックが巨大
- Note生成、サポート状況判定、データ書き込みが混在

**推奨される修正**:
```
src-tauri/src/excel/
├── mod.rs
├── note_generator.rs
├── workbook_writer.rs
└── note_param_status.rs
```

---

## 🟢 優先度: 低

### 11. 命名規則の統一

| 対象 | 問題点 | 修正方法 |
|-----|--------|---------|
| `types/index.ts` | `ColorName` 型の用途が不明確 | ドキュメントまたはリネーム |
| `constants.ts` | `TABLE_COLORS` vs `TABLE_COLOR_CLASSES` が紛らわしい | 意図を明確化した命名に変更 |
| Rust↔TypeScript間 | 一部で `#[serde(rename_all = "camelCase")]` が欠落 | 全structに適用 |

---

### 12. 未使用コードの削除

| ファイル | 内容 |
|---------|------|
| `crypto.ts` | `PUBLIC_KEY` がプレースホルダーのまま |
| `license.ts` | `validateLicense`, `getLicenseInfo`, `refreshLicense` がスタブ実装 |
| `project_db.rs` | `encrypted` パラメータが未使用 |

---

### 13. 翻訳の完全化

**問題点**:
- 一部UIテキストがハードコードされている（`'削除しました'` など）
- Tailwindのハードコード色（`text-zinc-500`, `bg-white` など）がダークモード対応に影響

**修正方法**:
- 全てのUIテキストを翻訳ファイルに移動
- CSS変数（`var(--text-muted)`）に統一

---

## 推奨実施順序

### Phase 1: 安全網の構築
1. [ ] `appFormula.ts` のユニットテスト追加
2. [ ] `diagramSchema.ts` のマイグレーションテスト追加

### Phase 2: 大規模分割
3. [ ] `erStore.ts` のスライス分割
4. [ ] `Simulator.tsx` のコンポーネント分割
5. [ ] `appFormula.ts` のモジュール分割

### Phase 3: 品質向上
6. [ ] コードの重複解消
7. [ ] エラーハンドリングの改善
8. [ ] 型安全性の向上

### Phase 4: 仕上げ
9. [ ] パフォーマンス最適化
10. [ ] 命名規則の統一
11. [ ] 未使用コードの削除
12. [ ] 翻訳の完全化

---

## 見積もり工数

| Phase | 内容 | 見積もり |
|-------|------|---------|
| Phase 1 | テスト追加 | 2-3日 |
| Phase 2 | 大規模分割 | 3-5日 |
| Phase 3 | 品質向上 | 2-3日 |
| Phase 4 | 仕上げ | 1-2日 |
| **合計** | | **8-13日** |

---

## 注意事項

- 各Phaseの完了後にマージを検討し、長期間のブランチ乖離を避ける
- リファクタリング中は新機能追加を凍結することを推奨
- テストを先に書いてからリファクタリングを行うことでデグレを防止
