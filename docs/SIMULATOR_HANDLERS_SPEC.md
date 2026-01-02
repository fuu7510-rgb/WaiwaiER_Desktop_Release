# ハンドラと接続ロジックの仕様 (Current State)

ERエディタにおけるテーブル間の接続（リレーション）と、それを制御するハンドラの現在の実装仕様をまとめます。

## 1. ハンドラの構成

ハンドラは `reactflow` の `Handle` コンポーネントを使用しており、各テーブルノード（`TableNode.tsx`）内に配置されています。

### A. ソースハンドラ（Source / 出力）
- **ID形式**: `{columnId}__source`
- **配置**: カラムの**右側** (`Position.Right`)
- **表示条件**: カラムが「主キー (`isKey: true`)」である場合のみ表示
- **スタイル**: 
    - 背景色: アンバー (`!bg-amber-400`)
    - ボーダー: 白 (`!border-white`)
    - ホバー時: `!bg-amber-500`
    - カーソル: `cursor-crosshair`
- **役割**: このカラムを「参照先」とするリレーションの開始点。

### B. ターゲットハンドラ（Target / 入力 - 既存カラム）
- **ID形式**: `{columnId}`
- **配置**: カラムの**左側** (`Position.Left`)
- **表示条件**: 常時表示（ただし、後述の「リターゲットオーバーレイ」が表示されている間は非表示/無効化）
- **スタイル**:
    - 背景色: グレー (`!bg-zinc-400`)
    - ボーダー: 白 (`!border-white`)
- **役割**: このカラムを `Ref` 型に変更し、ソースカラムを参照させる。

### C. ターゲットハンドラ（Target / 入力 - カラム追加）
- **ID形式**: `{tableId}__addColumn`
- **配置**: テーブル最下部の「+カラムを追加」ボタンの**左側**
- **表示条件**: 常時表示
- **スタイル**:
    - 背景色: グリーン (`!bg-green-400`)
    - ボーダー: 白 (`!border-white`)
- **役割**: 接続すると、ターゲットテーブルに新しいカラムを自動生成し、それを `Ref` 型としてソースカラムに接続する。

---

## 2. 接続ロジック (`EREditor.tsx`)

接続の有効性は `isValidConnection` で判定され、実際の処理は `onConnect` で行われます。

### 有効な接続の条件
- **ソース**: 必ず `isKey: true` のカラムであること（IDの末尾が `__source` であることで識別）。
- **ターゲット**: 既存のカラム、または「カラム追加」ハンドラであること。
- **制限事項**:
    - すでに他から参照されている（入力リレーションがある）カラムへの接続は不可。
    - 同一のカラムペア間での重複したリレーション作成は不可。

### 接続時の動作 (`onConnect`)
- **既存カラムに接続した場合**:
    1. そのカラムの型を `Ref` に変更。
    2. `constraints.refTableId` と `refColumnId` をソースの情報で更新。
    3. `relations` ストアに新しいリレーションを追加。
- **「カラム追加」に接続した場合**:
    1. ターゲットテーブルに、ソースカラム名と同じ名前の新しいカラムを作成。
    2. 作成したカラムを `Ref` 型に設定。
    3. `relations` ストアに新しいリレーションを追加。

---

## 3. 特殊な操作

### リターゲットオーバーレイ (Retarget Overlay)
既存の入力リレーションがあるカラムでは、通常のグレーのハンドラの代わりに**プライマリカラー（青紫）**の円が表示されます。

- **表示条件**: `hasIncomingRelation` が `true` のカラム。
- **見た目**:
    - 背景色: プライマリカラー（青紫）
    - ボーダー: 白（ライト/ダークで変化しない）
    - サイズ: 直径 14px
- **挙動**: 
    - この円は「既にリレーションが存在する」ことを示すインジケータです。
    - **ドラッグ不可**: この円を直接ドラッグして付け替える機能は廃止されました。リレーションの付け替えは後述の「エッジの端（Edge Updater）」を使用してください。

### エッジの端（Edge Updater / 付け替えハンドル）
既存の「線（エッジ）」の端をドラッグして、別のカラムへリレーションを繋ぎ変える機能です。**リレーションの付け替え（リターゲット）を行う唯一の方法です。**

- **外観**: エッジの両端に配置される（見た目は非表示の）円。マウスを近づけると操作可能になります。
    - React Flow内部クラス: `.react-flow__edgeupdater`
    - 補足: 視覚的な円はCSSで `fill/stroke: transparent` にして非表示化しています（機能は維持）。
- **ヒント表示**: 端にホバーした瞬間、およびドラッグ中に、カーソル近くへ短い説明が表示されます（`ja/en`対応）。
- 反応半径: 10px (`edgeUpdaterRadius={10}`)
- **挙動 (`onEdgeUpdate`)**:
    - 端をドラッグして他の有効なハンドラ（カラム）にドロップすると、リレーションが更新されます。
    - **ターゲット側（参照元）の付け替え**:
        - 新しいターゲットが「カラム追加」ハンドラの場合、新規カラムを自動作成して接続します。
        - 既存のカラムにドロップした場合、そのカラムを `Ref` に変更して接続します。
        - **重要**: 付け替え前の「旧ターゲットカラム」が `Ref` 型だった場合、そのリレーションが解消されるため、自動的に `Text` 型へリセットされます。
    - **ソース側（参照先）の付け替え**:
        - 参照先のテーブルや主キーカラムを変更できます。
- **失敗時の動作**: 有効なハンドラ以外（何もない場所など）で離した場合、そのリレーションは削除（`detachRelation`）されます。

---

## 4. 視覚的フィードバック

- **禁止マーク**: 接続ドラッグ中に `isValidConnection` が `false` を返す場所（自分自身や既に参照されているカラムなど）にカーソルを合わせると、カーソルの横に「×」マークが表示されます。
- **フラッシュ**: 無効な場所にドロップしようとした際、その場所に一時的に「×」マークがフラッシュ表示されます。

---

## 5. 実装上の注意事項

### エッジ更新時の `updateEdge` 使用禁止

React Flow の `updateEdge` ユーティリティ関数は使用しないでください。

**問題**:
`updateEdge` を呼び出すと、React Flow が内部で新しいエッジIDを自動生成します（`reactflow__edge-...` 形式）。
これにより、ストア（`relations`）で管理しているリレーションIDとReact Flowのエッジ内部IDが不整合を起こし、
以降のエッジ操作（付け替え、削除など）で「relation not found」エラーが発生します。

**正しい実装**:
`onEdgeUpdate` コールバックでは、ストアの `updateRelation` のみを呼び出し、`updateEdge` は呼び出しません。
ストアの `relations` が更新されると、`useEffect` が自動的に `setEdges(relations.map(relationToEdge))` を呼び出し、
エッジが正しく同期されます。

```typescript
const onEdgeUpdate = useCallback(
  (oldEdge: Edge, newConnection: Connection) => {
    edgeUpdateSuccessfulRef.current = true;
    retargetRelationFromEdgeUpdate(oldEdge.id, newConnection);
    // updateEdge(oldEdge, newConnection, eds) は呼ばない
  },
  [retargetRelationFromEdgeUpdate]
);
```

### クロージャによる古い状態参照の問題

`useCallback` 内で `tables` や `relations` を参照する場合、ストア更新後もクロージャが古い値を参照し続けることがあります。
ストア更新直後に最新の状態が必要な場合は、`useERStore.getState()` を使用して最新の状態を取得してください。

```typescript
// 例: updateColumn/updateRelation 呼び出し後に最新の状態を取得
const latestState = useERStore.getState();
const latestTables = latestState.tables;
const latestRelations = latestState.relations;
```