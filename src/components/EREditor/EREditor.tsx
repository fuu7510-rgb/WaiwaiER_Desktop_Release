import { useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
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
  const { tables, relations, memos, moveTable, moveMemo, addMemo, addRelation, addColumn, updateColumn, selectTable, selectedTableId } = useERStore();
  const {
    isRelationHighlightEnabled,
    toggleRelationHighlight,
    isGridVisible,
    toggleGridVisible,
    isMemosVisible,
    toggleMemosVisible,
    settings,
  } = useUIStore();
  const zoom = useReactFlowStore((state) => state.transform[2]);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

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

  // テーブルをReact Flowノードに変換
  const tableToNode = useCallback((table: Table): Node => {
    const isGraphSelected = selectedTableId === table.id;
    const isUpstream = relatedGraph.hasSelection && relatedGraph.upstreamTableIds.has(table.id);
    const isDownstream = relatedGraph.hasSelection && relatedGraph.downstreamTableIds.has(table.id);
    const isRelated = isGraphSelected || isUpstream || isDownstream;
    const isDimmed = relatedGraph.hasSelection && !isRelated;

    return {
      id: table.id,
      type: 'tableNode',
      position: table.position,
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
  }, [relatedGraph, selectedTableId]);

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
    
    return {
      id: relation.id,
      source: relation.sourceTableId,
      target: relation.targetTableId,
      sourceHandle: `${relation.sourceColumnId}__source`,
      targetHandle: relation.targetColumnId,
      type: 'relationEdge',
      animated: true,
      style: edgeStyle,
      data: {
        label: effectiveLabel,
        rawLabel: relation.label,
        autoLabel,
        offsetIndex: offsetInfo.offsetIndex,
        totalEdges: offsetInfo.totalEdges,
        isDimmed,
      },
    };
  }, [edgeOffsetMap, relatedGraph]);

  const [nodes, setNodes] = useNodesState([
    ...tables.map(tableToNode),
    ...(isMemosVisible ? memos.map(memoToNode) : []),
  ]);
  const [edges, setEdges] = useEdgesState(relations.map(relationToEdge));

  // ストアの変更を監視してノードとエッジを更新
  useEffect(() => {
    setNodes([
      ...tables.map(tableToNode),
      ...(isMemosVisible ? memos.map(memoToNode) : []),
    ]);
  }, [isMemosVisible, memos, memoToNode, tables, tableToNode, setNodes]);

  useEffect(() => {
    setEdges(relations.map(relationToEdge));
  }, [relations, relationToEdge, setEdges]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const onNodeDragStop = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.type === 'memoNode') {
        moveMemo(node.id, node.position);
      } else {
        moveTable(node.id, node.position);
      }
    },
    [moveMemo, moveTable]
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds));
    },
    [setEdges]
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
          // 既存のカラムに接続された場合：カラムの型をRefに変更
          updateColumn(connection.target, targetColumnId, {
            type: 'Ref',
            constraints: {
              refTableId: connection.source,
              refColumnId: sourceColumnId,
            },
          });
        }
        
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
      setEdges((eds) => addEdge(connection, eds));
    },
    [addRelation, addColumn, settings.relationLabelInitialCustomText, settings.relationLabelInitialMode, updateColumn, setEdges, tables]
  );

  const onPaneClick = useCallback(() => {
    selectTable(null);
  }, [selectTable]);

  return (
    <div ref={reactFlowWrapper} className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onConnect={onConnect}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode="Delete"
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
