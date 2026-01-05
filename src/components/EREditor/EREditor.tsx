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
} from 'reactflow';
import type { Connection, Edge, Node, NodeChange, EdgeChange } from 'reactflow';
import 'reactflow/dist/style.css';

import { useERStore } from '../../stores';
import { useUIStore } from '../../stores';
import { Button } from '../common/Button';
import { TableNode } from './TableNode';
import { MemoNode } from './MemoNode';
import { RelationEdge } from './RelationEdge';
import type { Table, Relation, Memo } from '../../types';
import { useTranslation } from 'react-i18next';

function EREditorInner() {
  const { t } = useTranslation();
  const {
    tables,
    relations,
    memos,
    moveTable,
    moveMemo,
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
    selectedTableId,
    selectedColumnId,
    selectedRelationId,
    pendingSelectedTableIds,
    clearPendingSelectedTableIds,
  } = useERStore();
  const {
    isRelationHighlightEnabled,
    toggleRelationHighlight,
    isGridVisible,
    toggleGridVisible,
    isMemosVisible,
    toggleMemosVisible,
    settings,
  } = useUIStore();

  const isEdgeAnimationEnabled = settings.edgeAnimationEnabled ?? true;
  const isEdgeFollowerIconEnabled = settings.edgeFollowerIconEnabled ?? false;
  // ユーザー設定の追従アイコン設定（デフォルト用）
  const defaultFollowerIconName = settings.edgeFollowerIconName ?? 'arrow-right';
  const defaultFollowerIconSize = settings.edgeFollowerIconSize ?? 14;
  const defaultFollowerIconSpeed = settings.edgeFollowerIconSpeed ?? 90;
  // パフォーマンス最適化: shallow比較で同じ値なら再レンダリングをスキップ
  const zoom = useReactFlowStore((state) => state.transform[2], (a, b) => a === b);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const connectFlashTimerRef = useRef<number | null>(null);
  const [connectFlashPos, setConnectFlashPos] = useState<{ x: number; y: number } | null>(null);

  const activeEdgeUpdateIdRef = useRef<string | null>(null);
  const edgeUpdateSuccessfulRef = useRef(true);

  const [isConnectDragging, setIsConnectDragging] = useState(false);
  const [isConnectDragNotAllowed, setIsConnectDragNotAllowed] = useState(false);
  const isConnectDragNotAllowedRef = useRef(false);
  const pointerRafRef = useRef<number | null>(null);
  const [connectDragPos, setConnectDragPos] = useState<{ x: number; y: number } | null>(null);
  const [isEdgeUpdating, setIsEdgeUpdating] = useState(false);
  const isEdgeUpdatingRef = useRef(false);
  const [edgeUpdatePos, setEdgeUpdatePos] = useState<{ x: number; y: number } | null>(null);
  const [isEdgeUpdaterHovering, setIsEdgeUpdaterHovering] = useState(false);
  const isEdgeUpdaterHoveringRef = useRef(false);
  const [edgeUpdaterHoverPos, setEdgeUpdaterHoverPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    isConnectDragNotAllowedRef.current = isConnectDragNotAllowed;
  }, [isConnectDragNotAllowed]);

  useEffect(() => {
    isEdgeUpdatingRef.current = isEdgeUpdating;
  }, [isEdgeUpdating]);

  useEffect(() => {
    isEdgeUpdaterHoveringRef.current = isEdgeUpdaterHovering;
  }, [isEdgeUpdaterHovering]);

  const flashConnectNotAllowed = useCallback(() => {
    const pos = lastPointerPosRef.current;
    if (!pos) return;

    setConnectFlashPos({ x: pos.x, y: pos.y });

    if (connectFlashTimerRef.current !== null) {
      window.clearTimeout(connectFlashTimerRef.current);
    }
    connectFlashTimerRef.current = window.setTimeout(() => {
      setConnectFlashPos(null);
      connectFlashTimerRef.current = null;
    }, 800);
  }, []);

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target || !connection.sourceHandle || !connection.targetHandle) {
        setIsConnectDragNotAllowed(false);
        return false;
      }

      // ハンドル付け替えは独自実装で処理する（ReactFlowの接続開始に依存しない）

      const sourceHandleParts = connection.sourceHandle.split('__');
      const sourceColumnId = sourceHandleParts[0];
      const sourceTable = tables.find((t) => t.id === connection.source);
      const sourceColumn = sourceTable?.columns.find((c) => c.id === sourceColumnId);
      if (!sourceTable || !sourceColumn || !sourceColumn.isKey) {
        setIsConnectDragNotAllowed(true);
        return false;
      }

      const isAddColumnTarget = connection.targetHandle.endsWith('__addColumn');
      if (isAddColumnTarget) {
        setIsConnectDragNotAllowed(false);
        return true;
      }

      const targetColumnId = connection.targetHandle;

      const ignoreRelationId = activeEdgeUpdateIdRef.current;

      // 既に他テーブルから参照されているカラムへの「上書き」を禁止
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
    [relations, tables]
  );

  const detachRelation = useCallback(
    (relationId: string) => {
      const relation = relations.find((r) => r.id === relationId);
      if (!relation) {
        deleteRelation(relationId);
        return;
      }

      const targetTable = tables.find((t) => t.id === relation.targetTableId);
      const targetColumn = targetTable?.columns.find((c) => c.id === relation.targetColumnId);

      // 線=外部キー(Ref)とみなして、Refのときは解除する
      const isRefWithSameTarget =
        targetColumn?.type === 'Ref' &&
        targetColumn.constraints.refTableId === relation.sourceTableId &&
        targetColumn.constraints.refColumnId === relation.sourceColumnId;

      // 参照制約が何らかの理由でズレていても、当該カラムに incoming relation が無ければ
      // 「線を外した=Ref解除」とみなして確実にリセットする。
      const hasOtherIncomingRelationToTargetColumn = relations.some(
        (r) => r.id !== relationId && r.targetTableId === relation.targetTableId && r.targetColumnId === relation.targetColumnId
      );

      const shouldResetTargetColumnRef =
        !!targetColumn && targetColumn.type === 'Ref' && (isRefWithSameTarget || !hasOtherIncomingRelationToTargetColumn);

      if (targetColumn && shouldResetTargetColumnRef) {
        updateColumn(relation.targetTableId, relation.targetColumnId, {
          type: 'Text',
          constraints: {
            ...targetColumn.constraints,
            refTableId: undefined,
            refColumnId: undefined,
          },
        });
        // updateColumn側でtargetColumnIdを参照するrelationsを掃除するため、ここではdeleteRelationしない。
        return;
      }

      deleteRelation(relationId);
    },
    [deleteRelation, relations, tables, updateColumn]
  );

  const retargetRelationFromEdgeUpdate = useCallback(
    (relationId: string, next: Connection) => {
      const relation = relations.find((r) => r.id === relationId);
      if (!relation) return;
      if (!next.source || !next.target || !next.sourceHandle || !next.targetHandle) return;
      const prevTargetTableId = relation.targetTableId;
      const prevTargetColumnId = relation.targetColumnId;

      const sourceColumnId = next.sourceHandle.split('__')[0];

      const sourceTable = tables.find((t) => t.id === next.source);
      const sourceColumn = sourceTable?.columns.find((c) => c.id === sourceColumnId);
      if (!sourceTable || !sourceColumn || !sourceColumn.isKey) return;

      const isAddColumnTarget = next.targetHandle.endsWith('__addColumn');
      let targetColumnId = next.targetHandle;

      if (isAddColumnTarget) {
        const newColumnId = addColumn(next.target, {
          name: sourceColumn.name,
          type: 'Ref',
          isKey: false,
          isLabel: false,
          constraints: {
            refTableId: next.source,
            refColumnId: sourceColumnId,
          },
        });
        if (!newColumnId) return;
        targetColumnId = newColumnId;
      } else {
        // 既に参照されているカラムへ上書きする操作は禁止（自分自身のリレーションは除外）
        const hasIncomingRelationToTargetColumn = relations.some(
          (r) => r.id !== relationId && r.targetTableId === next.target && r.targetColumnId === targetColumnId
        );
        if (hasIncomingRelationToTargetColumn) return;

        updateColumn(next.target, targetColumnId, {
          type: 'Ref',
          constraints: {
            refTableId: next.source,
            refColumnId: sourceColumnId,
          },
        });
      }

      updateRelation(relationId, {
        sourceTableId: next.source,
        sourceColumnId,
        targetTableId: next.target,
        targetColumnId,
      });

      // 旧ターゲット側のRefを解除（新ターゲットと同一なら何もしない）
      // ※ updateColumn(type:Text) は targetColumnId に紐づく relations を自動掃除するため、
      //    先に updateRelation で付け替え完了させてから実行する。
      // ※ 上の updateColumn/updateRelation 呼び出し後は tables/relations がクロージャで古い値を
      //    参照している可能性があるため、useERStore.getState() で最新の状態を取得する。
      if (prevTargetTableId !== next.target || prevTargetColumnId !== targetColumnId) {
        const latestState = useERStore.getState();
        const latestTables = latestState.tables;
        const latestRelations = latestState.relations;
        const oldTargetTable = latestTables.find((t) => t.id === prevTargetTableId);
        const oldTargetColumn = oldTargetTable?.columns.find((c) => c.id === prevTargetColumnId);

        // 旧ターゲットカラムが Ref 型で、かつ他のリレーションから参照されていなければ Text にリセット
        const hasOtherIncomingRelation = latestRelations.some(
          (r) => r.id !== relationId && r.targetTableId === prevTargetTableId && r.targetColumnId === prevTargetColumnId
        );

        if (oldTargetColumn && oldTargetColumn.type === 'Ref' && !hasOtherIncomingRelation) {
          updateColumn(prevTargetTableId, prevTargetColumnId, {
            type: 'Text',
            constraints: {
              ...oldTargetColumn.constraints,
              refTableId: undefined,
              refColumnId: undefined,
            },
          });
        }
      }
    },
    [addColumn, relations, tables, updateColumn, updateRelation]
  );

  // Keep these objects referentially stable to avoid React Flow warning #002.
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

  const relatedGraph = useMemo(() => {
    const upstreamTableIds = new Set<string>();
    const downstreamTableIds = new Set<string>();
    const relatedEdgeIds = new Set<string>();

    if (!selectedTableId || !isRelationHighlightEnabled) {
      return {
        hasSelection: false,
        upstreamTableIds,
        downstreamTableIds,
        relatedEdgeIds,
      };
    }

    const upstreamVisited = new Set<string>([selectedTableId]);
    const downstreamVisited = new Set<string>([selectedTableId]);

    // 上流（参照元=source）を辿る: target -> source
    const upstreamQueue: string[] = [selectedTableId];
    while (upstreamQueue.length > 0) {
      const current = upstreamQueue.shift()!;
      for (const relation of relations) {
        if (relation.targetTableId !== current) continue;
        relatedEdgeIds.add(relation.id);
        if (!upstreamVisited.has(relation.sourceTableId)) {
          upstreamVisited.add(relation.sourceTableId);
          upstreamTableIds.add(relation.sourceTableId);
          upstreamQueue.push(relation.sourceTableId);
        }
      }
    }

    // 下流（参照先=target）を辿る: source -> target
    const downstreamQueue: string[] = [selectedTableId];
    while (downstreamQueue.length > 0) {
      const current = downstreamQueue.shift()!;
      for (const relation of relations) {
        if (relation.sourceTableId !== current) continue;
        relatedEdgeIds.add(relation.id);
        if (!downstreamVisited.has(relation.targetTableId)) {
          downstreamVisited.add(relation.targetTableId);
          downstreamTableIds.add(relation.targetTableId);
          downstreamQueue.push(relation.targetTableId);
        }
      }
    }

    return {
      hasSelection: true,
      upstreamTableIds,
      downstreamTableIds,
      relatedEdgeIds,
    };
  }, [isRelationHighlightEnabled, relations, selectedTableId]);

  // 選択されたテーブルは常に最前面（zIndex最大）になるようにする。
  // これにより、選択時に表示されるミニツールバーが他テーブルの下に潜ってクリック不能になる問題を回避する。
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

  // アニメーション一時停止（設定は変更しない）
  const [isAnimationTemporarilyEnabled, setIsAnimationTemporarilyEnabled] = useState(true);

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

    return {
      id: relation.id,
      source: relation.sourceTableId,
      target: relation.targetTableId,
      sourceHandle: `${relation.sourceColumnId}__source`,
      targetHandle: relation.targetColumnId,
      type: 'relationEdge',
      updatable: true,
      selected: relation.id === selectedRelationId,
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
      },
    };
  }, [edgeOffsetMap, isAnimationTemporarilyEnabled, isEdgeAnimationEnabled, isEdgeFollowerIconEnabled, defaultFollowerIconName, defaultFollowerIconSize, defaultFollowerIconSpeed, relatedGraph, selectedRelationId]);

  // パフォーマンス最適化: ノードとエッジを useMemo で計算し、依存関係が変わらない限り同じ参照を維持
  const computedNodes = useMemo(() => [
    ...tables.map(tableToNode),
    ...(isMemosVisible ? memos.map(memoToNode) : []),
  ], [tables, tableToNode, memos, memoToNode, isMemosVisible]);

  const computedEdges = useMemo(() => relations.map(relationToEdge), [relations, relationToEdge]);

  const [nodes, setNodes] = useNodesState(computedNodes);
  const [edges, setEdges] = useEdgesState(computedEdges);

  // ストアの変更を監視してノードとエッジを更新
  // 計算済みの配列を直接使用して不要な再計算を防止
  useEffect(() => {
    setNodes(computedNodes);
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

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, _node: Node, nodes: Node[]) => {
      // 複数ノードがドラッグされた場合はすべてのノードの位置を保存
      for (const n of nodes) {
        if (n.type === 'memoNode') {
          moveMemo(n.id, n.position);
        } else {
          moveTable(n.id, n.position);
        }
      }
    },
    [moveMemo, moveTable]
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

  const onEdgeUpdateStart = useCallback((_: unknown, edge: Edge) => {
    activeEdgeUpdateIdRef.current = edge.id;
    edgeUpdateSuccessfulRef.current = false;
    setIsEdgeUpdating(true);
    const pos = lastPointerPosRef.current;
    setEdgeUpdatePos(pos ? { x: pos.x, y: pos.y } : null);
  }, []);

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessfulRef.current = true;
      retargetRelationFromEdgeUpdate(oldEdge.id, newConnection);
      // Note: updateEdge を呼ばない。ストアの relations が更新されると、
      // useEffect が setEdges を呼んでエッジが正しく同期される。
      // updateEdge を呼ぶと React Flow が新しい ID を生成してしまい、
      // ストアのリレーションIDとの整合性が失われる。
    },
    [retargetRelationFromEdgeUpdate]
  );

  const onEdgeUpdateEnd = useCallback((event: MouseEvent | TouchEvent, edge: Edge) => {
    if (!edgeUpdateSuccessfulRef.current) {
      const targetEl = (event as MouseEvent).target as HTMLElement | null;
      const droppedOnHandle = targetEl?.closest?.('.react-flow__handle') != null;
      if (!droppedOnHandle) {
        detachRelation(edge.id);
      }
    }
    activeEdgeUpdateIdRef.current = null;
    edgeUpdateSuccessfulRef.current = true;
    setIsEdgeUpdating(false);
    setEdgeUpdatePos(null);
  }, [detachRelation]);

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

  const onConnectStart = useCallback(() => {
    setIsConnectDragging(true);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnectDragging(false);
    setIsConnectDragNotAllowed(false);
    setConnectDragPos(null);
  }, []);

  const onPaneClick = useCallback(() => {
    selectTable(null);
  }, [selectTable]);

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.stopPropagation();
      selectRelation(edge.id);
    },
    [selectRelation]
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
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        isValidConnection={isValidConnection}
        onPaneClick={onPaneClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
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
        <div
          className="pointer-events-none absolute z-50 flex items-center justify-center rounded-full border text-xs"
          style={{
            left: connectDragPos.x + 10,
            top: connectDragPos.y + 10,
            width: 24,
            height: 24,
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          aria-hidden="true"
        >
          ×
        </div>
      )}

      {connectFlashPos && (
        <div
          className="pointer-events-none absolute z-50 flex items-center justify-center rounded-full border text-xs"
          style={{
            left: connectFlashPos.x + 10,
            top: connectFlashPos.y + 10,
            width: 24,
            height: 24,
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          aria-hidden="true"
        >
          ×
        </div>
      )}

      {isEdgeUpdating && edgeUpdatePos && (
        <div
          className="pointer-events-none absolute z-50 select-none rounded-md border px-2 py-1 text-xs shadow-sm"
          style={{
            left: edgeUpdatePos.x + 12,
            top: edgeUpdatePos.y + 12,
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          aria-hidden="true"
        >
          {t('editor.edgeRetargetHint')}
        </div>
      )}

      {!isEdgeUpdating && isEdgeUpdaterHovering && edgeUpdaterHoverPos && (
        <div
          className="pointer-events-none absolute z-50 select-none rounded-md border px-2 py-1 text-xs shadow-sm"
          style={{
            left: edgeUpdaterHoverPos.x + 12,
            top: edgeUpdaterHoverPos.y + 12,
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          aria-hidden="true"
        >
          {t('editor.edgeRetargetHint')}
        </div>
      )}

      <div className="absolute left-16 bottom-3 z-10 flex flex-col gap-2">
        <div 
          className="select-none rounded-md border px-2 py-1 text-xs shadow-sm"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          {t('editor.zoomLevel', { percent: Math.round(zoom * 100) })}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggleMemosVisible}
          aria-pressed={isMemosVisible}
          title={isMemosVisible ? t('editor.hideMemos') : t('editor.showMemos')}
        >
          {t('editor.memo')}: {isMemosVisible ? 'ON' : 'OFF'}
        </Button>

        {isMemosVisible && (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            const offset = memos.length * 24;
            addMemo({ x: 200 + offset, y: 200 + offset });
          }}
          title={t('editor.addMemoTooltip')}
        >
          {t('editor.addMemo')}
        </Button>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggleRelationHighlight}
          aria-pressed={isRelationHighlightEnabled}
          title={
            isRelationHighlightEnabled
              ? t('editor.disableRelationHighlight')
              : t('editor.enableRelationHighlight')
          }
        >
          {t('editor.relationHighlight')}: {isRelationHighlightEnabled ? 'ON' : 'OFF'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={toggleGridVisible}
          aria-pressed={isGridVisible}
          title={isGridVisible ? t('editor.hideGrid') : t('editor.showGrid')}
        >
          {t('editor.grid')}: {isGridVisible ? 'ON' : 'OFF'}
        </Button>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setIsAnimationTemporarilyEnabled((v) => !v)}
          aria-pressed={isAnimationTemporarilyEnabled}
          title={
            isAnimationTemporarilyEnabled
              ? t('editor.disableAnimations')
              : t('editor.enableAnimations')
          }
        >
          {t('editor.animations')}: {isAnimationTemporarilyEnabled ? 'ON' : 'OFF'}
        </Button>
      </div>
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
