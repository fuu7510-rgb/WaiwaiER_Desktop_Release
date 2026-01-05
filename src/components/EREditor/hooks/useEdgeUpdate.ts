import { useState, useRef, useCallback, useEffect } from 'react';
import type { Edge } from 'reactflow';
import type { Connection } from 'reactflow';
import type { Relation, Table } from '../../../types';
import { useERStore } from '../../../stores';

interface UseEdgeUpdateReturn {
  isEdgeUpdating: boolean;
  edgeUpdatePos: { x: number; y: number } | null;
  isEdgeUpdaterHovering: boolean;
  edgeUpdaterHoverPos: { x: number; y: number } | null;
  isEdgeUpdatingRef: React.MutableRefObject<boolean>;
  isEdgeUpdaterHoveringRef: React.MutableRefObject<boolean>;
  activeEdgeUpdateIdRef: React.MutableRefObject<string | null>;
  setEdgeUpdatePos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  setIsEdgeUpdaterHovering: React.Dispatch<React.SetStateAction<boolean>>;
  setEdgeUpdaterHoverPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  onEdgeUpdateStart: (_: unknown, edge: Edge) => void;
  onEdgeUpdate: (oldEdge: Edge, newConnection: Connection) => void;
  onEdgeUpdateEnd: (event: MouseEvent | TouchEvent, edge: Edge) => void;
  detachRelation: (relationId: string) => void;
}

interface UseEdgeUpdateParams {
  tables: Table[];
  relations: Relation[];
  addColumn: (tableId: string, columnData: Record<string, unknown>) => string | null;
  updateColumn: (tableId: string, columnId: string, updates: Record<string, unknown>) => void;
  updateRelation: (relationId: string, updates: Partial<Relation>) => void;
  deleteRelation: (relationId: string) => void;
  lastPointerPosRef: React.MutableRefObject<{ x: number; y: number } | null>;
}

export function useEdgeUpdate({
  tables,
  relations,
  addColumn,
  updateColumn,
  updateRelation,
  deleteRelation,
  lastPointerPosRef,
}: UseEdgeUpdateParams): UseEdgeUpdateReturn {
  const activeEdgeUpdateIdRef = useRef<string | null>(null);
  const edgeUpdateSuccessfulRef = useRef(true);

  const [isEdgeUpdating, setIsEdgeUpdating] = useState(false);
  const isEdgeUpdatingRef = useRef(false);
  const [edgeUpdatePos, setEdgeUpdatePos] = useState<{ x: number; y: number } | null>(null);
  const [isEdgeUpdaterHovering, setIsEdgeUpdaterHovering] = useState(false);
  const isEdgeUpdaterHoveringRef = useRef(false);
  const [edgeUpdaterHoverPos, setEdgeUpdaterHoverPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    isEdgeUpdatingRef.current = isEdgeUpdating;
  }, [isEdgeUpdating]);

  useEffect(() => {
    isEdgeUpdaterHoveringRef.current = isEdgeUpdaterHovering;
  }, [isEdgeUpdaterHovering]);

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

  const onEdgeUpdateStart = useCallback((_: unknown, edge: Edge) => {
    activeEdgeUpdateIdRef.current = edge.id;
    edgeUpdateSuccessfulRef.current = false;
    setIsEdgeUpdating(true);
    const pos = lastPointerPosRef.current;
    setEdgeUpdatePos(pos ? { x: pos.x, y: pos.y } : null);
  }, [lastPointerPosRef]);

  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      edgeUpdateSuccessfulRef.current = true;
      retargetRelationFromEdgeUpdate(oldEdge.id, newConnection);
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

  return {
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
  };
}
