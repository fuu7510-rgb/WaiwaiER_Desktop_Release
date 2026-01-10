import { useCallback, useRef, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  useStore as useReactFlowStore,
  useReactFlow,
  SelectionMode,
} from 'reactflow';
import type { Connection, Edge, Node, NodeChange, EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';

import { useERStore } from '../../stores';
import { useUIStore } from '../../stores';
import { TableNode } from './TableNode';
import { MemoNode } from './MemoNode';
import { RelationEdge } from './RelationEdge';
import { EditorToolbar } from './EditorToolbar';
import {
  ConnectDragOverlay,
  ConnectFlashOverlay,
  EdgeUpdateOverlay,
  EdgeUpdaterHoverOverlay,
} from './EditorOverlays';
import { useConnectDrag, useEdgeUpdate, useRelatedGraph } from './hooks';
import type { Table, Relation, Memo } from '../../types';

function EREditorInner() {
  const {
    tables,
    relations,
    memos,
    moveTables,
    moveMemos,
    addMemo,
    addRelation,
    addColumn,
    updateColumn,
    updateRelation,
    deleteTable,
    deleteColumn,
    deleteRelation,
    selectTable,
    selectRelation,
    selectRelations,
    selectedTableId,
    selectedColumnId,
    selectedRelationId,
    selectedRelationIds,
    pendingSelectedTableIds,
    clearPendingSelectedTableIds,
    setAllTablesCollapsed,
  } = useERStore();
  const {
    isRelationHighlightEnabled,
    toggleRelationHighlight,
    isGridVisible,
    toggleGridVisible,
    isMemosVisible,
    toggleMemosVisible,
    isNameMaskEnabled,
    toggleNameMask,
    settings,
  } = useUIStore();

  const isEdgeAnimationEnabled = settings.edgeAnimationEnabled ?? true;
  const isEdgeFollowerIconEnabled = settings.edgeFollowerIconEnabled ?? false;
  const defaultFollowerIconName = settings.edgeFollowerIconName ?? 'arrow-right';
  const defaultFollowerIconSize = settings.edgeFollowerIconSize ?? 14;
  const defaultFollowerIconSpeed = settings.edgeFollowerIconSpeed ?? 90;
  
  const zoom = useReactFlowStore((state) => state.transform[2], (a, b) => a === b);
  const { getNodes } = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const pointerRafRef = useRef<number | null>(null);
  
  // ノードドラッグ中かどうかを追跡（ドラッグ中は位置の同期をスキップするため）
  const isNodeDraggingRef = useRef(false);

  // カスタムフックの使用
  const {
    isConnectDragging,
    isConnectDragNotAllowed,
    connectDragPos,
    connectFlashPos,
    isConnectDragNotAllowedRef,
    setIsConnectDragNotAllowed,
    setConnectDragPos,
    flashConnectNotAllowed,
    onConnectStart,
    onConnectEnd,
  } = useConnectDrag(lastPointerPosRef);

  const {
    isEdgeUpdating,
    edgeUpdatePos,
    isEdgeUpdaterHovering,
    edgeUpdaterHoverPos,
    isEdgeUpdatingRef,
    isEdgeUpdaterHoveringRef,
    activeEdgeUpdateIdRef,
    setEdgeUpdatePos,
    setIsEdgeUpdaterHovering,
    setEdgeUpdaterHoverPos,
    onEdgeUpdateStart,
    onEdgeUpdate,
    onEdgeUpdateEnd,
    detachRelation,
  } = useEdgeUpdate({
    tables,
    relations,
    addColumn,
    updateColumn,
    updateRelation,
    deleteRelation,
    lastPointerPosRef,
  });

  const relatedGraph = useRelatedGraph(selectedTableId, relations, isRelationHighlightEnabled);

  const [isAnimationTemporarilyEnabled, setIsAnimationTemporarilyEnabled] = useState(true);

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        setIsConnectDragNotAllowed(false);
        return false;
      }

      const isAddColumnTarget = connection.targetHandle.endsWith('__addColumn');

      const sourceHandleParts = connection.sourceHandle.split('__');
      const sourceColumnId = sourceHandleParts[0];
      const sourceTable = tables.find((t) => t.id === connection.source);
      const targetTable = tables.find((t) => t.id === connection.target);

      if (targetTable?.isCollapsed && !isAddColumnTarget) {
        setIsConnectDragNotAllowed(true);
        return false;
      }

      const sourceColumn = sourceTable?.columns.find((c) => c.id === sourceColumnId);
      if (!sourceTable || !sourceColumn || !sourceColumn.isKey) {
        setIsConnectDragNotAllowed(true);
        return false;
      }
      if (isAddColumnTarget) {
        setIsConnectDragNotAllowed(false);
        return true;
      }

      const targetColumnId = connection.targetHandle;
      const ignoreRelationId = activeEdgeUpdateIdRef.current;

      const hasIncomingRelationToTargetColumn = relations.some(
        (r) =>
          r.id !== ignoreRelationId && r.targetTableId === connection.target && r.targetColumnId === targetColumnId
      );
      if (hasIncomingRelationToTargetColumn) {
        setIsConnectDragNotAllowed(true);
        return false;
      }

      const isDuplicate = relations.some(
        (r) =>
          r.id !== ignoreRelationId &&
          r.sourceTableId === connection.source &&
          r.sourceColumnId === sourceColumnId &&
          r.targetTableId === connection.target &&
          r.targetColumnId === targetColumnId
      );
      setIsConnectDragNotAllowed(isDuplicate);
      return !isDuplicate;
    },
    [activeEdgeUpdateIdRef, relations, setIsConnectDragNotAllowed, tables]
  );

  // ノードタイプの定義（参照安定性のため）
  const nodeTypes = useMemo(
    () => ({
      tableNode: TableNode,
      memoNode: MemoNode,
    }),
    []
  );

  const edgeTypes = useMemo(
    () => ({
      relationEdge: RelationEdge,
    }),
    []
  );

  // 選択されたテーブルは常に最前面（zIndex最大）になるようにする
  const zIndexCounterRef = useRef(1);
  const [tableNodeZIndexMap, setTableNodeZIndexMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!selectedTableId) return;
    const nextZIndex = zIndexCounterRef.current++;
    setTableNodeZIndexMap((prev) => ({ ...prev, [selectedTableId]: nextZIndex }));
  }, [selectedTableId]);

  // テーブルをReact Flowノードに変換
  const tableToNode = useCallback((table: Table): Node => {
    const isGraphSelected = selectedTableId === table.id;
    const isReactFlowSelected = isGraphSelected && !selectedColumnId;
    const isUpstream = relatedGraph.hasSelection && relatedGraph.upstreamTableIds.has(table.id);
    const isDownstream = relatedGraph.hasSelection && relatedGraph.downstreamTableIds.has(table.id);
    const isRelated = isGraphSelected || isUpstream || isDownstream;
    const isDimmed = relatedGraph.hasSelection && !isRelated;
    const zIndex = tableNodeZIndexMap[table.id] ?? 0;

    return {
      id: table.id,
      type: 'tableNode',
      position: table.position,
      zIndex,
      selected: isReactFlowSelected,
      data: {
        table,
        highlight: {
          isGraphSelected,
          isUpstream,
          isDownstream,
          isRelated,
          isDimmed,
        },
      },
    };
  }, [relatedGraph, selectedColumnId, selectedTableId, tableNodeZIndexMap]);

  // カラム選択中は Delete を「カラム削除」として扱う（テーブル削除を優先させない）
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Delete') return;

      const target = e.target as HTMLElement | null;
      const isTypingTarget =
        !!target &&
        (target.isContentEditable ||
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT');
      if (isTypingTarget) return;

      if (!selectedTableId || !selectedColumnId) return;

      e.preventDefault();
      e.stopPropagation();
      // ReactFlow側の削除処理に先行して止める
      (e as unknown as { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();

      deleteColumn(selectedTableId, selectedColumnId);
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [deleteColumn, selectedColumnId, selectedTableId]);

  const memoToNode = useCallback((memo: Memo): Node => {
    return {
      id: memo.id,
      type: 'memoNode',
      position: memo.position,
      dragHandle: '.memo-drag-handle',
      data: {
        memo,
      },
    };
  }, []);

  // 同じテーブルペア間のリレーション数をカウントするマップを作成
  const edgeOffsetMap = useMemo(() => {
    const pairCount = new Map<string, number>();
    const pairIndex = new Map<string, number>();
    
    // まず各テーブルペアのリレーション数をカウント
    relations.forEach((relation) => {
      // テーブルIDをソートして一意のペアキーを作成
      const pairKey = [relation.sourceTableId, relation.targetTableId].sort().join('__');
      pairCount.set(pairKey, (pairCount.get(pairKey) || 0) + 1);
    });
    
    // 各リレーションにインデックスを割り当て
    const result = new Map<string, { offsetIndex: number; totalEdges: number }>();
    relations.forEach((relation) => {
      const pairKey = [relation.sourceTableId, relation.targetTableId].sort().join('__');
      const total = pairCount.get(pairKey) || 1;
      const index = pairIndex.get(pairKey) || 0;
      
      result.set(relation.id, { offsetIndex: index, totalEdges: total });
      pairIndex.set(pairKey, index + 1);
    });
    
    return result;
  }, [relations]);

  // リレーションをReact Flowエッジに変換
  const relationToEdge = useCallback((relation: Relation): Edge => {
    const offsetInfo = edgeOffsetMap.get(relation.id) || { offsetIndex: 0, totalEdges: 1 };
    const autoLabel = relation.type === 'one-to-many' ? '1:N' : relation.type === 'one-to-one' ? '1:1' : 'N:M';
    // label の扱い:
    // - undefined: 自動ラベルを表示
    // - ''      : ラベル非表示
    // - それ以外: 任意ラベルを表示
    const effectiveLabel = relation.label === undefined ? autoLabel : relation.label;

    const isDimmed = relatedGraph.hasSelection && !relatedGraph.relatedEdgeIds.has(relation.id);
    const edgeStyle = relatedGraph.hasSelection
      ? {
          opacity: isDimmed ? 0.15 : 1,
          strokeWidth: isDimmed ? 1.5 : 2.5,
        }
      : undefined;

    const lineStyle = relation.edgeLineStyle ?? 'solid';
    const lineStyleCSS: React.CSSProperties =
      lineStyle === 'dashed'
        ? { strokeDasharray: '8 4' }
        : lineStyle === 'dotted'
          ? { strokeDasharray: '1 6', strokeLinecap: 'round' }
          : {};

    // ReactFlow標準の animated=true は dashoffset を固定値で動かすため、
    // こちらのdashパターン(8 4 / 1 6)と周期が合わずギクシャクしやすい。
    // そのため、破線/点線のみ独自のdashoffsetアニメーションを適用する。
    const canAnimate = lineStyle !== 'solid';
    const shouldAnimate =
      isAnimationTemporarilyEnabled && canAnimate
        ? (relation.edgeAnimationEnabled ?? isEdgeAnimationEnabled)
        : false;

    const animationCSS: React.CSSProperties = shouldAnimate
      ? lineStyle === 'dashed'
        ? { animation: 'waiwai-edge-dash-12 0.9s linear infinite' }
        : lineStyle === 'dotted'
          ? { animation: 'waiwai-edge-dash-7 0.55s linear infinite' }
          : {}
      : {};

    const mergedStyle = {
      ...lineStyleCSS,
      ...animationCSS,
      ...(edgeStyle ?? {}),
    };

    const hasMergedStyle = Object.keys(mergedStyle).length > 0;

    // 追従アイコンの有効/無効判定
    // edgeFollowerIconEnabled: undefined=デフォルト, true=ON, false=OFF
    const followerIconEnabled =
      isAnimationTemporarilyEnabled && (relation.edgeFollowerIconEnabled ?? isEdgeFollowerIconEnabled);

    // 追従アイコンの設定値
    // ONの場合: エッジ独自の値（未設定時はデフォルト値）
    // デフォルト/OFFの場合: ユーザー設定の値
    const isFollowerIconON = relation.edgeFollowerIconEnabled === true;
    const followerIconName = isFollowerIconON
      ? (relation.edgeFollowerIconName ?? defaultFollowerIconName)
      : defaultFollowerIconName;
    const followerIconSize = isFollowerIconON
      ? (relation.edgeFollowerIconSize ?? defaultFollowerIconSize)
      : defaultFollowerIconSize;
    const followerIconSpeed = isFollowerIconON
      ? (relation.edgeFollowerIconSpeed ?? defaultFollowerIconSpeed)
      : defaultFollowerIconSpeed;

    // 根本のみ表示モードでは付け替え機能を無効化（クリック選択のみ）
    const isRootOnly = relation.edgeVisibility === 'rootOnly';

    // 複数選択または単一選択をチェック
    const isSelected = selectedRelationIds.has(relation.id) || relation.id === selectedRelationId;

    return {
      id: relation.id,
      source: relation.sourceTableId,
      target: relation.targetTableId,
      sourceHandle: `${relation.sourceColumnId}__source`,
      targetHandle: relation.targetColumnId,
      type: 'relationEdge',
      updatable: !isRootOnly,
      selected: isSelected,
      // 標準 animated は使わず、style側のanimationで制御する。
      animated: false,
      style: hasMergedStyle ? mergedStyle : undefined,
      data: {
        label: effectiveLabel,
        rawLabel: relation.label,
        autoLabel,
        offsetIndex: offsetInfo.offsetIndex,
        totalEdges: offsetInfo.totalEdges,
        isDimmed,
        followerIconEnabled,
        followerIconName,
        followerIconSize,
        followerIconSpeed,
        edgeVisibility: relation.edgeVisibility,
      },
    };
  }, [edgeOffsetMap, isAnimationTemporarilyEnabled, isEdgeAnimationEnabled, isEdgeFollowerIconEnabled, defaultFollowerIconName, defaultFollowerIconSize, defaultFollowerIconSpeed, relatedGraph, selectedRelationId, selectedRelationIds]);

  // パフォーマンス最適化: ノードとエッジを useMemo で計算し、依存関係が変わらない限り同じ参照を維持
  const computedNodes = useMemo(() => [
    ...tables.map(tableToNode),
    ...(isMemosVisible ? memos.map(memoToNode) : []),
  ], [tables, tableToNode, memos, memoToNode, isMemosVisible]);

  const computedEdges = useMemo(() => relations.map(relationToEdge), [relations, relationToEdge]);

  const [nodes, setNodes] = useNodesState(computedNodes);
  const [edges, setEdges] = useEdgesState(computedEdges);

  // ストアの変更を監視してノードとエッジを更新
  // 
  // 選択状態の管理戦略:
  // - 単一選択: ストアの selectedTableId を信頼できるソースとする（computedNodesから）
  // - 複数選択: ReactFlowの選択状態を維持（currentNodesから）
  // 
  // 位置の同期戦略:
  // - ドラッグ中: 位置の同期をスキップ（onNodesChangeで位置が管理される）
  // - ドラッグ後: ストア(tables)の位置を使用（ただし移動済みのノードは現在位置を維持）
  useEffect(() => {
    // ドラッグ中は位置の同期をスキップ
    if (isNodeDraggingRef.current) {
      return;
    }
    
    setNodes((currentNodes) => {
      // 現在のReactFlowノードをマップ化（位置と選択状態を取得するため）
      const currentNodeMap = new Map<string, Node>();
      for (const node of currentNodes) {
        currentNodeMap.set(node.id, node);
      }
      
      // 複数選択中かどうかを判定（2つ以上のノードが選択されている場合）
      const selectedCount = currentNodes.filter(n => n.selected).length;
      const isMultiSelect = selectedCount > 1;

      // computedNodes をマップ化
      const computedNodeMap = new Map<string, Node>();
      for (const node of computedNodes) {
        computedNodeMap.set(node.id, node);
      }
      
      // 新規ノードの追加と既存ノードの更新
      const resultNodes: Node[] = [];
      const processedIds = new Set<string>();
      
      for (const computedNode of computedNodes) {
        const currentNode = currentNodeMap.get(computedNode.id);
        processedIds.add(computedNode.id);
        
        if (!currentNode) {
          // 新規ノード: computedNode をそのまま追加
          resultNodes.push(computedNode);
        } else {
          // 既存ノード: 位置は currentNode から継承、その他は computedNode から
          // （ストアとReactFlowの位置が同じなら問題なし、ドラッグ直後でも currentNode の位置が正しい）
          const selected = isMultiSelect 
            ? (currentNode.selected ?? false)
            : computedNode.selected;
          
          resultNodes.push({
            ...computedNode,
            position: currentNode.position, // ReactFlow側の位置を維持
            selected,
          });
        }
      }
      
      return resultNodes;
    });
  }, [computedNodes, setNodes]);

  // pendingSelectedTableIds がセットされたときにノードの選択状態を更新
  useEffect(() => {
    if (pendingSelectedTableIds.size > 0) {
      // ノードの選択状態を更新
      setNodes((currentNodes) =>
        currentNodes.map((node) => ({
          ...node,
          selected: pendingSelectedTableIds.has(node.id),
        }))
      );
      // 選択状態を適用したらクリア
      clearPendingSelectedTableIds();
    }
  }, [pendingSelectedTableIds, clearPendingSelectedTableIds, setNodes]);

  useEffect(() => {
    setEdges(computedEdges);
  }, [computedEdges, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const removed = changes.filter((c) => c.type === 'remove');
      if (removed.length > 0) {
        for (const change of removed) {
          const isTableNode = tables.some((t) => t.id === change.id);
          if (isTableNode) {
            deleteTable(change.id);
          }
        }
      }
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [deleteTable, setNodes, tables]
  );

  // ノードドラッグ開始時にフラグをセット
  const onNodeDragStart = useCallback(() => {
    isNodeDraggingRef.current = true;
  }, []);

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
      // draggedNodes には実際にドラッグされたすべてのノードが含まれる
      // （複数選択時は選択されたすべてのノード）
      // 注意: draggedNodes が空の場合は _node を使用（単一ノードドラッグの場合）
      const nodeIdsToUpdate = draggedNodes.length > 0 
        ? draggedNodes.map(n => n.id) 
        : [_node.id];
      
      // ReactFlowの内部ストアから最新のノード位置を取得
      // （draggedNodes の position は古い値を持っている可能性があるため）
      const currentNodes = getNodes();
      const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
      
      const tableMoves: Array<{ id: string; position: { x: number; y: number } }> = [];
      const memoMoves: Array<{ id: string; position: { x: number; y: number } }> = [];
      
      for (const nodeId of nodeIdsToUpdate) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;
        
        if (node.type === 'memoNode') {
          memoMoves.push({ id: node.id, position: node.position });
        } else {
          tableMoves.push({ id: node.id, position: node.position });
        }
      }
      
      // バッチ更新（履歴保存は各メソッド内で1回のみ）
      if (tableMoves.length > 0) {
        moveTables(tableMoves);
      }
      if (memoMoves.length > 0) {
        moveMemos(memoMoves);
      }
      
      // ストア更新後にドラッグフラグをリセット
      // 遅延を入れることで、ストアの更新がReactに伝播してから
      // useEffectで位置同期が行われるようにする
      requestAnimationFrame(() => {
        isNodeDraggingRef.current = false;
      });
    },
    [getNodes, moveMemos, moveTables]
  );

  // 範囲選択でのドラッグ開始時にフラグをセット
  const onSelectionDragStart = useCallback(() => {
    isNodeDraggingRef.current = true;
  }, []);

  // 範囲選択でのドラッグ終了時に位置を保存
  const onSelectionDragStop = useCallback(
    (_: React.MouseEvent, selectedNodes: Node[]) => {
      // ReactFlowの内部ストアから最新のノード位置を取得
      const currentNodes = getNodes();
      const nodeMap = new Map(currentNodes.map(n => [n.id, n]));
      
      const tableMoves: Array<{ id: string; position: { x: number; y: number } }> = [];
      const memoMoves: Array<{ id: string; position: { x: number; y: number } }> = [];
      
      for (const selectedNode of selectedNodes) {
        const node = nodeMap.get(selectedNode.id);
        if (!node) continue;
        
        if (node.type === 'memoNode') {
          memoMoves.push({ id: node.id, position: node.position });
        } else {
          tableMoves.push({ id: node.id, position: node.position });
        }
      }
      
      // バッチ更新
      if (tableMoves.length > 0) {
        moveTables(tableMoves);
      }
      if (memoMoves.length > 0) {
        moveMemos(memoMoves);
      }
      
      requestAnimationFrame(() => {
        isNodeDraggingRef.current = false;
      });
    },
    [getNodes, moveMemos, moveTables]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const removed = changes.filter((c) => c.type === 'remove');
      if (removed.length > 0) {
        for (const change of removed) {
          detachRelation(change.id);
        }
      }
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [detachRelation, setEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target && connection.sourceHandle && connection.targetHandle) {
        // ソースハンドルIDからカラムIDを抽出（format: columnId__source）
        const sourceHandleParts = connection.sourceHandle.split('__');
        const sourceColumnId = sourceHandleParts[0];
        
        // ターゲットハンドルが「+カラムを追加」かどうかをチェック
        const isAddColumnTarget = connection.targetHandle.endsWith('__addColumn');
        
        // ソーステーブルとソースカラム（キーカラム）を取得
        const sourceTable = tables.find(t => t.id === connection.source);
        const sourceColumn = sourceTable?.columns.find(c => c.id === sourceColumnId);
        
        if (!sourceTable || !sourceColumn || !sourceColumn.isKey) {
          // キーカラムからの接続のみ許可
          flashConnectNotAllowed();
          return;
        }

        let targetColumnId = connection.targetHandle;
        
        if (isAddColumnTarget) {
          // 「+カラムを追加」に接続された場合：新しいカラムを作成
          const newColumnId = addColumn(connection.target, {
            name: sourceColumn.name,
            type: 'Ref',
            isKey: false,
            isLabel: false,
            constraints: {
              refTableId: connection.source,
              refColumnId: sourceColumnId,
            },
          });
          
          if (!newColumnId) return;
          targetColumnId = newColumnId;
        } else {
          // 既に参照されているカラムへ上書きする操作は禁止
          const hasIncomingRelationToTargetColumn = relations.some(
            (r) => r.targetTableId === connection.target && r.targetColumnId === targetColumnId
          );
          if (hasIncomingRelationToTargetColumn) {
            flashConnectNotAllowed();
            return;
          }

          // 既存のカラムに接続された場合：カラムの型をRefに変更
          updateColumn(connection.target, targetColumnId, {
            type: 'Ref',
            constraints: {
              refTableId: connection.source,
              refColumnId: sourceColumnId,
            },
          });
        }

        // 重複チェックは isValidConnection と store 側で実施
        
        // リレーションを追加
        addRelation({
          sourceTableId: connection.source,
          sourceColumnId: sourceColumnId,
          targetTableId: connection.target,
          targetColumnId: targetColumnId,
          type: 'one-to-many',
          label:
            settings.relationLabelInitialMode === 'auto'
              ? undefined
              : settings.relationLabelInitialMode === 'hidden'
                ? ''
                : settings.relationLabelInitialCustomText.trim().length > 0
                  ? settings.relationLabelInitialCustomText.trim()
                  : '',
        });
      }
    },
    [addRelation, addColumn, flashConnectNotAllowed, relations, settings.relationLabelInitialCustomText, settings.relationLabelInitialMode, updateColumn, tables]
  );

  // ノードクリック時のハンドラ
  // Shift/Ctrl/Meta + クリックで複数選択をサポート
  // 単一選択は onNodeMouseDown で確定（微小ドラッグ扱いで onNodeClick が落ちるケース対策）
  const onNodeMouseDown = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        return;
      }

      // ReactFlowの選択状態を即座に更新（ストア同期は後追いでもOK）
      setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === node.id })));

      // memoNode はストアのテーブル選択とは別扱いにしておく
      if (node.type === 'memoNode') {
        selectTable(null);
        return;
      }

      selectTable(node.id);
    },
    [setNodes, selectTable]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      if (!(event.shiftKey || event.ctrlKey || event.metaKey)) {
        return;
      }

      // 複数選択: 現在の選択状態をトグル
      // ストアの選択をクリア（複数選択時はストアの単一選択とは別管理）
      selectTable(null);
      setNodes((nds) =>
        nds.map((n) =>
          n.id === node.id ? { ...n, selected: !n.selected } : n
        )
      );
    },
    [setNodes, selectTable]
  );

  const onPaneClick = useCallback(() => {
    // ストアの選択をクリア
    selectTable(null);
    // エッジ選択もクリア
    selectRelations(new Set());
    // ReactFlowの複数選択状態もクリア
    setNodes((nds) => nds.map((n) => ({ ...n, selected: false })));
  }, [selectTable, selectRelations, setNodes]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      if (event.shiftKey || event.ctrlKey || event.metaKey) {
        // 複数選択: 現在の選択状態にトグル
        const newIds = new Set(selectedRelationIds);
        if (newIds.has(edge.id)) {
          newIds.delete(edge.id);
        } else {
          newIds.add(edge.id);
        }
        selectRelations(newIds);
      } else {
        // 単一選択
        selectRelation(edge.id);
      }
    },
    [selectRelation, selectRelations, selectedRelationIds]
  );

  // 範囲選択によるエッジ選択を処理
  const onSelectionChange = useCallback(
    ({ edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      if (selectedEdges.length > 0) {
        const edgeIds = new Set(selectedEdges.map((e) => e.id));
        selectRelations(edgeIds);
      }
    },
    [selectRelations]
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="w-full h-full relative"
      onMouseMove={(e) => {
        const rect = reactFlowWrapper.current?.getBoundingClientRect();
        if (!rect) return;
        lastPointerPosRef.current = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        };

        // Detect hover over edge updater handles (before drag starts)
        // Note: edge updater elements are created by React Flow inside an SVG.
        const targetEl = e.target as Element | null;
        const hoveredUpdater =
          targetEl?.closest?.('.react-flow__edgeupdater-source, .react-flow__edgeupdater-target') != null;
        if (!isEdgeUpdatingRef.current) {
          if (hoveredUpdater !== isEdgeUpdaterHoveringRef.current) {
            setIsEdgeUpdaterHovering(hoveredUpdater);
            if (!hoveredUpdater) {
              setEdgeUpdaterHoverPos(null);
            }
          }
        }

        const needsOverlayUpdate =
          (isConnectDragging && isConnectDragNotAllowedRef.current) ||
          isEdgeUpdatingRef.current ||
          (!isEdgeUpdatingRef.current && hoveredUpdater);
        if (!needsOverlayUpdate) return;
        if (pointerRafRef.current !== null) return;
        pointerRafRef.current = window.requestAnimationFrame(() => {
          pointerRafRef.current = null;
          const pos = lastPointerPosRef.current;
          if (!pos) return;

          if (isConnectDragging && isConnectDragNotAllowedRef.current) {
            setConnectDragPos({ x: pos.x, y: pos.y });
          }
          if (isEdgeUpdatingRef.current) {
            setEdgeUpdatePos({ x: pos.x, y: pos.y });
          }
          if (!isEdgeUpdatingRef.current && hoveredUpdater) {
            setEdgeUpdaterHoverPos({ x: pos.x, y: pos.y });
          }
        });
      }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onEdgeUpdate={onEdgeUpdate}
        onEdgeUpdateStart={onEdgeUpdateStart}
        onEdgeUpdateEnd={onEdgeUpdateEnd}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onSelectionDragStart={onSelectionDragStart}
        onSelectionDragStop={onSelectionDragStop}
        onNodeMouseDown={onNodeMouseDown}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        onSelectionChange={onSelectionChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
        selectionOnDrag
        panOnDrag={[1]}
        selectionMode={SelectionMode.Partial}
        nodeDragThreshold={5}
        // Increase edge-updater hit radius (visual is hidden via CSS).
        edgeUpdaterRadius={10}
        style={{ backgroundColor: 'var(--background)' }}
      >
        {isGridVisible && (
          <Background
            color="var(--text-muted)"
            gap={15}
            lineWidth={2}
          />
        )}
        <Controls />
        <MiniMap
          nodeStrokeColor={(n) => {
            if (n.data?.table?.color) return n.data.table.color;
            return '#6366f1';
          }}
          nodeColor={(n) => {
            if (n.data?.table?.color) return n.data.table.color;
            return 'var(--card)';
          }}
        />
      </ReactFlow>

      {isConnectDragging && isConnectDragNotAllowed && connectDragPos && (
        <ConnectDragOverlay position={connectDragPos} />
      )}

      {connectFlashPos && (
        <ConnectFlashOverlay position={connectFlashPos} />
      )}

      {isEdgeUpdating && edgeUpdatePos && (
        <EdgeUpdateOverlay position={edgeUpdatePos} />
      )}

      {!isEdgeUpdating && isEdgeUpdaterHovering && edgeUpdaterHoverPos && (
        <EdgeUpdaterHoverOverlay position={edgeUpdaterHoverPos} />
      )}

      <EditorToolbar
        zoom={zoom}
        isMemosVisible={isMemosVisible}
        isRelationHighlightEnabled={isRelationHighlightEnabled}
        isGridVisible={isGridVisible}
        isAnimationTemporarilyEnabled={isAnimationTemporarilyEnabled}
        isNameMaskEnabled={isNameMaskEnabled}
        memosLength={memos.length}
        tablesCount={tables.length}
        toggleMemosVisible={toggleMemosVisible}
        toggleRelationHighlight={toggleRelationHighlight}
        toggleGridVisible={toggleGridVisible}
        toggleNameMask={toggleNameMask}
        toggleAnimationEnabled={() => setIsAnimationTemporarilyEnabled((v) => !v)}
        addMemo={addMemo}
        setAllTablesCollapsed={setAllTablesCollapsed}
      />
    </div>
  );
}

export function EREditor() {
  return (
    <ReactFlowProvider>
      <EREditorInner />
    </ReactFlowProvider>
  );
}
