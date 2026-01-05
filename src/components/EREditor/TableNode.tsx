import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Handle, Position, useStore as useReactFlowStore } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import type { Table, Column, ColumnType } from '../../types';
import { TABLE_NODE_STYLE_CLASSES, DEFAULT_TABLE_COLOR } from '../../lib/constants';
import { useColumnEditorLabels } from './ColumnEditorParts/hooks/useColumnEditorLabels';
import { useColumnEditorOptions } from './ColumnEditorParts/hooks/useColumnEditorOptions';
import { useAppSheetSanitizer } from './ColumnEditorParts/hooks/useAppSheetSanitizer';
import { Tooltip } from '../common';

interface TableNodeData {
  table: Table;
  highlight?: {
    isGraphSelected: boolean;
    isUpstream: boolean;
    isDownstream: boolean;
    isRelated: boolean;
    isDimmed: boolean;
  };
}

const columnTypeClasses: Record<ColumnType, string> = {
  Text: 'bg-blue-500',
  LongText: 'bg-blue-500',
  Show: 'bg-blue-500',
  Name: 'bg-blue-500',
  App: 'bg-blue-500',
  Number: 'bg-emerald-500',
  Decimal: 'bg-emerald-500',
  Percent: 'bg-emerald-500',
  Price: 'bg-emerald-500',
  Date: 'bg-amber-500',
  DateTime: 'bg-amber-500',
  Time: 'bg-amber-500',
  Duration: 'bg-amber-500',
  Email: 'bg-violet-500',
  Phone: 'bg-violet-500',
  Url: 'bg-violet-500',
  Image: 'bg-pink-500',
  Thumbnail: 'bg-pink-500',
  Video: 'bg-pink-500',
  File: 'bg-pink-500',
  Drawing: 'bg-pink-500',
  Signature: 'bg-pink-500',
  Enum: 'bg-indigo-500',
  EnumList: 'bg-indigo-500',
  'Yes/No': 'bg-red-500',
  Color: 'bg-orange-500',
  LatLong: 'bg-teal-500',
  XY: 'bg-teal-500',
  Address: 'bg-teal-500',
  Ref: 'bg-cyan-500',
  ChangeCounter: 'bg-slate-500',
  ChangeLocation: 'bg-slate-500',
  ChangeTimestamp: 'bg-slate-500',
  Progress: 'bg-green-500',
  UniqueID: 'bg-purple-500',
};



export const TableNode = memo(({ data, selected }: NodeProps<TableNodeData>) => {
  const { table } = data;
  const { t } = useTranslation();
  // パフォーマンス最適化: 各アクションを個別のセレクタで購読
  const selectTable = useERStore((state) => state.selectTable);
  const addColumn = useERStore((state) => state.addColumn);
  const updateTable = useERStore((state) => state.updateTable);
  // selectedTableIdはテーブルの選択状態を判定するために必要
  const isTableSelected = useERStore((state) => state.selectedTableId === table.id);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectTable(table.id);
  }, [table.id, selectTable]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditName(table.name);
  }, [table.name]);

  const handleNameSubmit = useCallback(() => {
    if (editName.trim() && editName !== table.name) {
      updateTable(table.id, { name: editName.trim() });
    }
    setIsEditing(false);
  }, [editName, table.id, table.name, updateTable]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditName(table.name);
    }
  }, [handleNameSubmit, table.name]);

  const handleAddColumn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addColumn(table.id);
  }, [table.id, addColumn]);

  const isCollapsed = table.isCollapsed ?? false;
  const handleToggleCollapsed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectTable(table.id);
      updateTable(table.id, { isCollapsed: !(table.isCollapsed ?? false) });
    },
    [selectTable, table.id, table.isCollapsed, updateTable]
  );

  const isSelected = isTableSelected || selected;
  const highlight = data.highlight;
  const isDimmed = highlight?.isDimmed ?? false;
  const isRelated = highlight?.isRelated ?? false;
  const colorClasses = TABLE_NODE_STYLE_CLASSES[table.color?.toLowerCase() || DEFAULT_TABLE_COLOR] || TABLE_NODE_STYLE_CLASSES[DEFAULT_TABLE_COLOR];

  return (
    <div
      className={`
        rounded-md shadow-lg min-w-[180px] max-w-[280px]
        border-2 border-solid transition-all duration-200
        ${isSelected ? 'ring-2 ring-indigo-400/50 ring-offset-1' : isRelated ? 'ring-1 ring-indigo-300/40' : 'hover:shadow-xl'}
        ${isDimmed ? 'opacity-30 saturate-50' : ''}
        ${colorClasses.border}
      `}
      style={{ backgroundColor: 'var(--card)' }}
      onClick={handleClick}
    >
      {/* Header */}
      <div
        className={`px-2.5 py-1.5 rounded-t font-medium text-white text-xs flex items-center justify-between ${colorClasses.bg}`}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none text-white w-full text-xs"
            autoFocus
            aria-label={t('editor.tableName')}
          />
        ) : (
          <span className="truncate">{table.name}</span>
        )}
        <span className="flex items-center gap-1.5">
          <Tooltip content={isCollapsed ? t('table.expand') : t('table.collapse')}>
            <button
              type="button"
              onClick={handleToggleCollapsed}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="p-0.5 rounded-sm transition-colors hover:bg-white/10"
              aria-label={isCollapsed ? t('table.expand') : t('table.collapse')}
              title={isCollapsed ? t('table.expand') : t('table.collapse')}
            >
              {isCollapsed ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </Tooltip>
          <span className="text-[10px] opacity-70 ml-0.5 tabular-nums">{table.columns.length}</span>
        </span>
      </div>

      {/* Columns */}
      {isCollapsed ? <CollapsedColumnHandles table={table} /> : <TableNodeSortableColumns table={table} />}

      {/* Add Column Button */}
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          id={`${table.id}__addColumn`}
          className="!bg-green-400 !border !border-white !rounded-full"
          style={{ width: 8, height: 8, minWidth: 8, minHeight: 8, maxWidth: 8, maxHeight: 8, left: -5 }}
          title="ここに接続すると新しいカラムを作成"
        />
        <button
          onClick={handleAddColumn}
          className="w-full px-2.5 py-1 text-[10px] transition-colors rounded-b flex items-center justify-center gap-1"
          style={{ color: 'var(--text-muted)' }}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('table.addColumn')}
        </button>
      </div>
    </div>
  );
});

TableNode.displayName = 'TableNode';

function CollapsedColumnHandles(props: { table: Table }) {
  const { table } = props;

  const stripHeight = 28;

  return (
    <div
      className="relative nodrag"
      style={{ height: stripHeight, backgroundColor: 'var(--card)' }}
      aria-hidden
    >
      {/* Minimal visual cue */}
      <div
        className="absolute inset-0 flex items-center justify-center text-[10px]"
        style={{ color: 'var(--text-muted)' }}
      >
        …
      </div>

      {table.columns.map((column) => {
        return (
          <div key={column.id}>
            <Handle
              type="target"
              position={Position.Left}
              id={column.id}
              className="!bg-zinc-400 !border !border-white !rounded-full"
              style={{
                width: 8,
                height: 8,
                minWidth: 8,
                minHeight: 8,
                maxWidth: 8,
                maxHeight: 8,
                left: -5,
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
              isConnectable={false}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            />

            {column.isKey && (
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.id}__source`}
                className="!bg-amber-400 !border !border-white hover:!bg-amber-500 cursor-crosshair !rounded-full"
                style={{
                  width: 8,
                  height: 8,
                  minWidth: 8,
                  minHeight: 8,
                  maxWidth: 8,
                  maxHeight: 8,
                  right: -5,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
                isConnectable
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function TableNodeSortableColumns(props: { table: Table }) {
  const { table } = props;
  // パフォーマンス最適化: 個別のセレクタで購読
  const reorderColumn = useERStore((state) => state.reorderColumn);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId || !overId || activeId === overId) return;
    const toIndex = table.columns.findIndex((c) => c.id === overId);
    if (toIndex < 0) return;
    reorderColumn(table.id, activeId, toIndex);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={table.columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-zinc-100 nodrag overflow-visible">
          {table.columns.map((column, index) => (
            <ColumnRow
              key={column.id}
              column={column}
              tableId={table.id}
              index={index}
              isFirst={index === 0}
              isLast={index === table.columns.length - 1}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface ColumnRowProps {
  column: Column;
  tableId: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

const ColumnRow = memo(({ column, tableId, index, isFirst, isLast }: ColumnRowProps) => {
  const { t, i18n } = useTranslation();
  // パフォーマンス最適化: アクション関数は安定した参照を持つため直接購読
  const selectColumn = useERStore((state) => state.selectColumn);
  const reorderColumn = useERStore((state) => state.reorderColumn);
  const updateColumn = useERStore((state) => state.updateColumn);
  const deleteColumn = useERStore((state) => state.deleteColumn);
  const duplicateColumn = useERStore((state) => state.duplicateColumn);

  // パフォーマンス最適化: セレクタをuseCallbackでメモ化して安定した参照を保つ
  const isSelectedSelector = useCallback(
    (state: { selectedColumnId: string | null }) => state.selectedColumnId === column.id,
    [column.id]
  );
  const isSelected = useERStore(isSelectedSelector);

  // 着信リレーションの有無のみを購読（relations配列全体ではなくbooleanで）
  const hasIncomingRelationSelector = useCallback(
    (state: { relations: { targetTableId: string; targetColumnId: string }[] }) =>
      state.relations.some((r) => r.targetTableId === tableId && r.targetColumnId === column.id),
    [tableId, column.id]
  );
  const hasIncomingRelation = useERStore(hasIncomingRelationSelector);

  // パフォーマンス最適化: zoomはドラッグ中のtransform調整にのみ必要
  // shallow比較で同じ値なら再レンダリングをスキップさせる
  const zoom = useReactFlowStore((state) => state.transform[2], (a, b) => a === b) ?? 1;
  const typeClass = columnTypeClasses[column.type] || 'bg-slate-500';

  const showRetargetOverlay = hasIncomingRelation;

  // Use same options as ColumnEditor for consistency
  const { labelEnJa, labelEnJaNoSpace, tEn, tJa } = useColumnEditorLabels(i18n);
  const { typeOptions } = useColumnEditorOptions({ labelEnJa, labelEnJaNoSpace, tEn, tJa });
  const { sanitizeForType, pruneAppSheet } = useAppSheetSanitizer();

  const isShown = useMemo(() => {
    const isHiddenVal = (column.appSheet as Record<string, unknown> | undefined)?.IsHidden;
    return isHiddenVal !== true;
  }, [column.appSheet]);

  const showIfNonEmpty = useMemo(() => {
    const v = (column.appSheet as Record<string, unknown> | undefined)?.Show_If;
    return typeof v === 'string' && v.trim().length > 0;
  }, [column.appSheet]);

  const editableState = useMemo((): 'unset' | 'true' | 'false' => {
    const appSheet = column.appSheet as Record<string, unknown> | undefined;
    const editableIf = typeof appSheet?.Editable_If === 'string' ? appSheet.Editable_If.trim() : '';
    const editableUpper = editableIf.toUpperCase();
    if (editableUpper === 'TRUE') return 'true';
    if (editableUpper === 'FALSE') return 'false';
    // Fallback to legacy Editable key for compatibility
    const editableVal = appSheet?.Editable;
    if (editableVal === true) return 'true';
    if (editableVal === false) return 'false';
    return 'unset';
  }, [column.appSheet]);

  const editableHasFormula = useMemo(() => {
    const v = (column.appSheet as Record<string, unknown> | undefined)?.Editable_If;
    if (typeof v !== 'string') return false;
    const trimmed = v.trim();
    const upper = trimmed.toUpperCase();
    // TRUE/FALSE are not formulas, only other non-empty strings are formulas
    return trimmed.length > 0 && upper !== 'TRUE' && upper !== 'FALSE';
  }, [column.appSheet]);

  const isRequired = !!column.constraints.required;

  const requiredIfNonEmpty = useMemo(() => {
    const v = (column.appSheet as Record<string, unknown> | undefined)?.Required_If;
    return typeof v === 'string' && v.trim().length > 0;
  }, [column.appSheet]);

  const currentAppFormula = useMemo(() => {
    const v = (column.appSheet as Record<string, unknown> | undefined)?.AppFormula;
    return typeof v === 'string' ? v : '';
  }, [column.appSheet]);

  const currentDisplayName = useMemo(() => {
    const v = (column.appSheet as Record<string, unknown> | undefined)?.DisplayName;
    return typeof v === 'string' ? v : '';
  }, [column.appSheet]);

  const currentDescription = useMemo(() => {
    const v = (column.appSheet as Record<string, unknown> | undefined)?.Description;
    return typeof v === 'string' ? v : '';
  }, [column.appSheet]);

  const currentInitialValue = useMemo(() => {
    return column.constraints.defaultValue ?? '';
  }, [column.constraints.defaultValue]);

  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: column.id,
  });

  const adjustedTransform = useMemo(() => {
    if (!transform) return null;
    const safeZoom = zoom > 0 ? zoom : 1;
    return {
      ...transform,
      x: transform.x / safeZoom,
      y: transform.y / safeZoom,
    };
  }, [transform, zoom]);

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(adjustedTransform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleteHintPos, setDeleteHintPos] = useState<{ x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  type MiniMetaTab = 'formula' | 'initialValue' | 'displayName' | 'description';
  const [miniMetaTab, setMiniMetaTab] = useState<MiniMetaTab>('formula');
  const [isEditingMiniMeta, setIsEditingMiniMeta] = useState(false);
  const [miniMetaDraft, setMiniMetaDraft] = useState('');
  const miniMetaInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    if (!isSelected) {
      Promise.resolve().then(() => {
        setDeleteArmed(false);
        setDeleteHintPos(null);
      });
    }
  }, [isSelected]);

  useEffect(() => {
    Promise.resolve().then(() => {
      setDeleteArmed(false);
      setDeleteHintPos(null);
    });
  }, [column.id]);

  useEffect(() => {
    if (!deleteArmed) return;

    const handleMove = (e: MouseEvent) => {
      setDeleteHintPos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
    };
  }, [deleteArmed]);

  const currentMiniMetaValue = useMemo(() => {
    switch (miniMetaTab) {
      case 'formula':
        return currentAppFormula;
      case 'initialValue':
        return currentInitialValue;
      case 'displayName':
        return currentDisplayName;
      case 'description':
        return currentDescription;
      default:
        return '';
    }
  }, [currentAppFormula, currentDescription, currentDisplayName, currentInitialValue, miniMetaTab]);

  useEffect(() => {
    if (!isEditingMiniMeta) {
      Promise.resolve().then(() => {
        setMiniMetaDraft(currentMiniMetaValue);
      });
    }
  }, [currentMiniMetaValue, isEditingMiniMeta]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectColumn(tableId, column.id);
  }, [tableId, column.id, selectColumn]);

  const handleNameDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectColumn(tableId, column.id);
    setIsEditingName(true);
    setEditName(column.name);
  }, [column.id, column.name, selectColumn, tableId]);

  const handleNameSubmit = useCallback(() => {
    const next = editName.trim();
    if (!next) {
      setIsEditingName(false);
      setEditName(column.name);
      return;
    }

    if (next !== column.name) {
      updateColumn(tableId, column.id, { name: next });
    }
    setIsEditingName(false);
  }, [column.id, column.name, editName, tableId, updateColumn]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSubmit();
    } else if (e.key === 'Escape') {
      e.stopPropagation();
      setIsEditingName(false);
      setEditName(column.name);
    }
  }, [column.name, handleNameSubmit]);

  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);
    if (!isFirst) {
      reorderColumn(tableId, column.id, index - 1);
    }
  }, [tableId, column.id, index, isFirst, reorderColumn]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);
    if (!isLast) {
      reorderColumn(tableId, column.id, index + 1);
    }
  }, [tableId, column.id, index, isLast, reorderColumn]);

  const handleToggleKey = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);
    updateColumn(tableId, column.id, { isKey: !column.isKey });
  }, [column.id, column.isKey, tableId, updateColumn]);

  const handleToggleLabel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);
    updateColumn(tableId, column.id, { isLabel: !column.isLabel });
  }, [column.id, column.isLabel, tableId, updateColumn]);

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!deleteArmed) {
      setDeleteArmed(true);
      setDeleteHintPos({ x: e.clientX, y: e.clientY });
      return;
    }

    setDeleteArmed(false);
    setDeleteHintPos(null);
    deleteColumn(tableId, column.id);
  }, [column.id, deleteArmed, deleteColumn, tableId]);

  const handleDuplicate = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);
    const newId = duplicateColumn(tableId, column.id);
    if (newId) {
      selectColumn(tableId, newId);
    }
  }, [column.id, duplicateColumn, selectColumn, tableId]);

  const handleToggleShow = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);

    const appSheet = column.appSheet as Record<string, unknown> | undefined;
    const showIf = typeof appSheet?.Show_If === 'string' ? appSheet.Show_If.trim() : '';
    if (showIf.length > 0) {
      // Keep consistent with ColumnEditor: when Show_If is present, Show? (toggle) must be Unset and immutable.
      return;
    }
    const isHiddenVal = appSheet?.IsHidden;
    const currentlyShown = isHiddenVal !== true;

    if (currentlyShown) {
      // Hide: set IsHidden=true and ensure it doesn't conflict with Show_If.
      const nextAppSheet = pruneAppSheet({ ...(appSheet ?? {}), IsHidden: true }, ['Show_If']);
      updateColumn(tableId, column.id, { appSheet: nextAppSheet });
      return;
    }

    // Show: remove IsHidden (default behavior).
    const nextAppSheet = pruneAppSheet(appSheet, ['IsHidden']);
    updateColumn(tableId, column.id, { appSheet: nextAppSheet });
  }, [column.appSheet, column.id, pruneAppSheet, tableId, updateColumn]);

  const handleToggleEditable = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);

    if (editableHasFormula) {
      // Keep consistent with ColumnEditor: when Editable_If contains an expression (not TRUE/FALSE), toggle is locked.
      return;
    }

    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    // Cycle through 3 states: unset → true → false → unset
    let nextAppSheet: Record<string, unknown> | undefined;
    if (editableState === 'unset') {
      // unset → true
      nextAppSheet = pruneAppSheet({ ...(appSheet ?? {}), Editable_If: 'TRUE' }, ['Editable']);
    } else if (editableState === 'true') {
      // true → false
      nextAppSheet = pruneAppSheet({ ...(appSheet ?? {}), Editable_If: 'FALSE' }, ['Editable']);
    } else {
      // false → unset
      nextAppSheet = pruneAppSheet(appSheet, ['Editable_If', 'Editable']);
    }

    updateColumn(tableId, column.id, { appSheet: nextAppSheet });
  }, [column.appSheet, column.id, editableHasFormula, editableState, pruneAppSheet, tableId, updateColumn]);

  const handleToggleRequired = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteArmed(false);
    setDeleteHintPos(null);

    const nextRequired = !isRequired;
    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    const requiredIf = typeof appSheet?.Required_If === 'string' ? appSheet.Required_If.trim() : '';
    if (requiredIf.length > 0) {
      // Keep consistent with ColumnEditor: when Required_If is present, Require? (toggle) must be Unset and immutable.
      return;
    }

    const nextAppSheet = nextRequired
      ? pruneAppSheet({ ...(appSheet ?? {}), IsRequired: true }, ['Required_If'])
      : pruneAppSheet(appSheet, ['IsRequired', 'Required_If']);

    updateColumn(tableId, column.id, {
      constraints: { ...column.constraints, required: nextRequired },
      appSheet: nextAppSheet,
    });
  }, [column.appSheet, column.constraints, column.id, isRequired, pruneAppSheet, tableId, updateColumn]);

  const isInitialValueDisabled = useMemo(() => {
    return miniMetaTab === 'initialValue' && currentAppFormula.trim().length > 0;
  }, [currentAppFormula, miniMetaTab]);

  const commitMiniMeta = useCallback(() => {
    if (miniMetaTab === 'initialValue' && currentAppFormula.trim().length > 0) {
      // Keep consistent with ColumnEditor: Initial Value is disabled when AppFormula is set.
      return;
    }

    const raw = miniMetaDraft;
    const trimmed = raw.trim();
    const appSheet = column.appSheet as Record<string, unknown> | undefined;

    if (miniMetaTab === 'initialValue') {
      const nextDefault = trimmed.length > 0 ? raw : undefined;
      const nextConstraints = {
        ...column.constraints,
        defaultValue: nextDefault,
      };
      updateColumn(tableId, column.id, { constraints: nextConstraints });
      return;
    }

    const key =
      miniMetaTab === 'formula'
        ? 'AppFormula'
        : miniMetaTab === 'displayName'
          ? 'DisplayName'
          : 'Description';

    if (trimmed.length === 0) {
      const nextAppSheet = pruneAppSheet(appSheet, [key]);
      if (nextAppSheet !== appSheet) {
        updateColumn(tableId, column.id, { appSheet: nextAppSheet });
      }
      return;
    }

    const nextAppSheet = { ...(appSheet ?? {}), [key]: raw };

    if (miniMetaTab === 'formula' && (column.constraints.defaultValue ?? '').trim().length > 0) {
      // Same behavior as ColumnEditor: prefer AppFormula over Initial Value.
      const nextConstraints = { ...column.constraints, defaultValue: undefined };
      updateColumn(tableId, column.id, { appSheet: nextAppSheet, constraints: nextConstraints });
      return;
    }

    updateColumn(tableId, column.id, { appSheet: nextAppSheet });
  }, [column.appSheet, column.constraints, column.id, currentAppFormula, miniMetaDraft, miniMetaTab, pruneAppSheet, tableId, updateColumn]);

  const handleMiniMetaKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitMiniMeta();
        setIsEditingMiniMeta(false);
        miniMetaInputRef.current?.blur();
      } else if (e.key === 'Escape') {
        e.stopPropagation();
        setMiniMetaDraft(currentMiniMetaValue);
        setIsEditingMiniMeta(false);
        miniMetaInputRef.current?.blur();
      }
    },
    [commitMiniMeta, currentMiniMetaValue]
  );

  const handleMiniMetaTabClick = useCallback(
    (next: MiniMetaTab) => (e: React.MouseEvent) => {
      e.stopPropagation();
      if (next === miniMetaTab) return;

      if (isEditingMiniMeta) {
        commitMiniMeta();
        setIsEditingMiniMeta(false);
      }

      setMiniMetaTab(next);
    },
    [commitMiniMeta, isEditingMiniMeta, miniMetaTab]
  );

  const dragListeners = isEditingName ? undefined : listeners;

  return (
    <div
        ref={setNodeRef}
        style={{
          ...style,
          backgroundColor: isSelected ? 'var(--section-bg-active)' : undefined,
        }}
        className={`
          relative px-2 py-1 flex items-center gap-1.5 cursor-pointer
          transition-colors
          ${isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''}
          nodrag
        `}
        onClick={handleClick}
        {...attributes}
      >
      {/* Left Handle (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id={column.id}
        className={
          showRetargetOverlay
            ? '!bg-transparent !border-0 !opacity-0 !pointer-events-none'
            : '!bg-zinc-400 !border !border-white !rounded-full'
        }
        style={
          showRetargetOverlay
            ? { width: 1, height: 1, left: -6 }
            : { width: 8, height: 8, minWidth: 8, minHeight: 8, maxWidth: 8, maxHeight: 8, left: -5 }
        }
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Retarget overlay: 既存リレーションがある列だけ「ハンドルを掴んで付け替え/削除」 */}
      {showRetargetOverlay && (
        <div
          className="absolute z-30"
          style={{
            width: 8,
            height: 8,
            borderRadius: 9999,
            boxSizing: 'border-box',
            backgroundColor: 'var(--primary)',
            border: '1px solid #fff',
            cursor: 'default',
            left: -5,
            top: '50%',
            transform: 'translateY(-50%)',
          }}
          title={t('table.hasIncomingRelation', '他テーブルから参照されています')}
        />
      )}

      {/* Reorder buttons (visible when selected) */}
      <div
        className={`${isSelected ? 'flex' : 'hidden'} absolute left-full top-1/2 -translate-y-1/2 flex-col items-start gap-1 z-10 ml-1`}
      >
        {/* Move up/down and Key/Label buttons */}
        <div
          className="flex shadow-sm border rounded overflow-hidden"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="flex flex-col">
            <button
              onClick={handleMoveUp}
              disabled={isFirst}
              data-reorder-button="true"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-0.5 ${isFirst ? 'opacity-20 cursor-not-allowed' : ''}`}
              style={{ color: 'var(--text-muted)' }}
              title={t('common.moveUp')}
              aria-label={t('common.moveUp')}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
            <button
              onClick={handleMoveDown}
              disabled={isLast}
              data-reorder-button="true"
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className={`p-0.5 border-t ${isLast ? 'opacity-20 cursor-not-allowed' : ''}`}
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
              title={t('common.moveDown')}
              aria-label={t('common.moveDown')}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div className="flex flex-col">
            <div className="flex border-l" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={handleDuplicate}
                data-reorder-button="true"
                onPointerDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                className="p-0.5 flex items-center justify-center border-r"
                style={{
                  borderColor: 'var(--border)',
                  color: 'var(--text-muted)',
                }}
                title={t('column.duplicateColumn')}
                aria-label={t('column.duplicateColumn')}
              >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 8h10v10H8z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 16H5a1 1 0 01-1-1V5a1 1 0 011-1h10a1 1 0 011 1v1" />
                </svg>
              </button>

              <div className="flex flex-col">
                <div className="flex">
                  <button
                    onClick={handleToggleKey}
                    data-reorder-button="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-0.5 flex items-center justify-center"
                    style={{
                      backgroundColor: column.isKey ? 'var(--section-bg-active)' : 'transparent',
                    }}
                    title={t('table.toggleKey')}
                    aria-label={t('table.toggleKey')}
                  >
                    <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <Tooltip disabled={!showIfNonEmpty} content={t('table.lockedByShowIf')}>
                    <button
                      type="button"
                      onClick={handleToggleShow}
                      data-reorder-button="true"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={`p-0.5 border-l flex items-center justify-center ${showIfNonEmpty ? 'opacity-40 cursor-not-allowed' : ''}`}
                      style={{
                        borderColor: 'var(--border)',
                        backgroundColor: isShown ? 'var(--section-bg-active)' : 'transparent',
                        color: isShown ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                      aria-label={
                        showIfNonEmpty
                          ? labelEnJa("Show toggle locked by Show_If", 'Show_Ifでロック中（表示トグル変更不可）')
                          : `${t('table.toggleShow')}: ${isShown ? t('common.on') : t('common.off')}`
                      }
                    >
                      {isShown ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10.477 10.477A3 3 0 0012 15a3 3 0 002.523-4.523"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6.228 6.228C4.434 7.36 3.091 9.06 2.458 12c1.274 4.057 5.065 7 9.542 7 1.63 0 3.16-.39 4.5-1.08"
                          />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.88 9.88A3 3 0 0115 12" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.772 17.772C19.566 16.64 20.909 14.94 21.542 12 20.268 7.943 16.477 5 12 5c-1.63 0-3.16.39-4.5 1.08"
                          />
                        </svg>
                      )}
                    </button>
                  </Tooltip>
                </div>

                <div className="flex border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    onClick={handleToggleLabel}
                    data-reorder-button="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className="p-0.5 flex items-center justify-center"
                    style={{
                      backgroundColor: column.isLabel ? 'var(--section-bg-active)' : 'transparent',
                    }}
                    title={t('table.toggleLabel')}
                    aria-label={t('table.toggleLabel')}
                  >
                    <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </button>

                  <Tooltip disabled={!editableHasFormula} content={t('table.lockedByEditableIf')}>
                    <button
                      type="button"
                      onClick={handleToggleEditable}
                      data-reorder-button="true"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className={`p-0.5 border-l flex items-center justify-center ${editableHasFormula ? 'opacity-40 cursor-not-allowed' : ''}`}
                      style={{
                        borderColor: 'var(--border)',
                        backgroundColor: editableState === 'false' ? 'transparent' : 'var(--section-bg-active)',
                        color: editableState === 'true' ? '#4ade80' : editableState === 'unset' ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                      aria-label={
                        editableHasFormula
                          ? labelEnJa('Editable toggle locked by Editable_If', 'Editable_Ifでロック中（編集トグル変更不可）')
                          : `${t('table.toggleEditable')}: ${editableState === 'true' ? 'TRUE' : editableState === 'false' ? 'FALSE' : 'Unset'}`
                      }
                    >
                      {editableState === 'false' ? (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 20l1-4 7.5-7.5" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.5 5.5l4 4" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20h9" />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"
                          />
                        </svg>
                      )}
                    </button>
                  </Tooltip>
                </div>
              </div>

              <div className="flex flex-col border-l self-stretch" style={{ borderColor: 'var(--border)' }}>
                <Tooltip disabled={!requiredIfNonEmpty} content={t('table.lockedByRequiredIf')}>
                  <button
                    type="button"
                    onClick={handleToggleRequired}
                    data-reorder-button="true"
                    onPointerDown={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    className={`p-0.5 flex-1 flex items-center justify-center ${requiredIfNonEmpty ? 'opacity-40 cursor-not-allowed' : ''}`}
                    style={{
                      backgroundColor: isRequired ? 'var(--section-bg-active)' : 'transparent',
                      color: isRequired ? 'var(--text-primary)' : 'var(--text-muted)',
                    }}
                    aria-label={
                      requiredIfNonEmpty
                        ? labelEnJa('Required toggle locked by Required_If', 'Required_Ifでロック中（必須トグル変更不可）')
                        : `${t('table.toggleRequired')}: ${isRequired ? t('common.on') : t('common.off')}`
                    }
                  >
                    <span className="text-[10px] font-bold leading-none" aria-hidden="true">*</span>
                  </button>
                </Tooltip>

                <button
                  type="button"
                  onClick={handleDelete}
                  data-reorder-button="true"
                  onPointerDown={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="p-0.5 flex-1 border-t flex items-center justify-center"
                  style={{
                    borderColor: deleteArmed ? 'var(--destructive)' : 'var(--border)',
                    backgroundColor: deleteArmed ? 'var(--section-bg-active)' : 'transparent',
                    color: deleteArmed ? 'var(--destructive)' : 'var(--text-muted)',
                  }}
                  title={deleteArmed ? t('table.deleteColumnArmedHint') : t('common.delete', '削除')}
                  aria-label={deleteArmed ? t('table.deleteColumnArmedHint') : t('common.delete', '削除')}
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 11v6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 11v6" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7l1 14h10l1-14" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7V4h6v3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {deleteArmed && deleteHintPos && typeof document !== 'undefined' &&
            createPortal(
              <div
                className="fixed px-1 py-[1px] rounded border whitespace-nowrap pointer-events-none"
                style={{
                  left: deleteHintPos.x + 12,
                  top: deleteHintPos.y + 12,
                  backgroundColor: 'var(--card)',
                  borderColor: 'var(--destructive)',
                  color: 'var(--destructive)',
                  zIndex: 99999,
                }}
              >
                {t('table.deleteColumnArmedHint')}
              </div>,
              document.body
            )}
        </div>

        {/* Type selector dropdown + Formula */}
        <div className="flex flex-col gap-1">
          <select
            value={column.type}
            onChange={(e) => {
              e.stopPropagation();
              const nextType = e.target.value as ColumnType;
              if (nextType !== column.type) {
                const { constraints, appSheet } = sanitizeForType(
                  nextType,
                  column.constraints,
                  column.appSheet as Record<string, unknown> | undefined
                );
                updateColumn(tableId, column.id, { type: nextType, constraints, appSheet });
              }
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-[9px] px-1 py-0.5 rounded border shadow-sm cursor-pointer nodrag nopan"
            style={{
              backgroundColor: 'var(--card)',
              borderColor: 'var(--border)',
              color: 'var(--text-primary)',
              minWidth: '80px',
            }}
            title={t('column.changeTypeTooltip', 'クリックしてデータ型を変更')}
          >
            {typeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          <input
            ref={miniMetaInputRef}
            type="text"
            value={miniMetaDraft}
            disabled={isInitialValueDisabled}
            onFocus={() => setIsEditingMiniMeta(true)}
            onBlur={() => {
              commitMiniMeta();
              setIsEditingMiniMeta(false);
            }}
            onChange={(e) => setMiniMetaDraft(e.target.value)}
            onKeyDown={handleMiniMetaKeyDown}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            className="text-[9px] px-1 py-0.5 rounded border shadow-sm nodrag nopan"
            style={{
              backgroundColor: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--text-primary)',
              minWidth: '140px',
              opacity: isInitialValueDisabled ? 0.5 : 1,
              cursor: isInitialValueDisabled ? 'not-allowed' : 'text',
            }}
            placeholder={
              miniMetaTab === 'formula'
                ? t('column.formulaPlaceholder')
                : miniMetaTab === 'initialValue'
                  ? t('column.initialValuePlaceholder')
                  : miniMetaTab === 'displayName'
                    ? t('column.displayNamePlaceholder')
                    : t('column.descriptionPlaceholder')
            }
            aria-label={
              miniMetaTab === 'formula'
                ? t('column.formula')
                : miniMetaTab === 'initialValue'
                  ? t('column.initialValue')
                  : miniMetaTab === 'displayName'
                    ? t('column.displayName')
                    : t('common.description')
            }
            title={
              miniMetaTab === 'formula'
                ? t('column.formula')
                : miniMetaTab === 'initialValue'
                  ? t('column.initialValue')
                  : miniMetaTab === 'displayName'
                    ? t('column.displayName')
                    : t('common.description')
            }
          />

          <div
            className="flex border rounded overflow-hidden"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {(
              [
                { key: 'formula' as const, label: t('column.formula') },
                { key: 'initialValue' as const, label: t('column.initialValue') },
                { key: 'displayName' as const, label: t('column.displayName') },
                { key: 'description' as const, label: t('common.description') },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={handleMiniMetaTabClick(tab.key)}
                className="px-1 py-0.5 text-[9px] border-r last:border-r-0"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: miniMetaTab === tab.key ? 'var(--section-bg-active)' : 'transparent',
                  color: miniMetaTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
                aria-pressed={miniMetaTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key/Label indicators */}
      <div className="flex gap-0.5 w-6 justify-center">
        {column.isKey && (
          <span title={t('table.isKey')}>
            <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </span>
        )}
        {column.isLabel && (
          <span title={t('table.isLabel')}>
            <svg className="w-3 h-3 text-indigo-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>
        )}
      </div>

      {/* Column name */}
      <span 
        className="flex-1 min-w-0 text-[11px]" 
        style={{ color: 'var(--text-secondary)' }}
        onDoubleClick={handleNameDoubleClick}
        ref={setActivatorNodeRef}
        {...(dragListeners ?? {})}
      >
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full rounded px-1 py-0.5 text-[11px] outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 border"
            style={{ 
              backgroundColor: 'var(--input-bg)', 
              borderColor: 'var(--input-border)',
              color: 'var(--text-primary)',
            }}
            aria-label={t('table.columnName')}
          />
        ) : (
          <span className="flex min-w-0 items-center gap-0.5">
            <span className="min-w-0 truncate">{column.name}</span>
            {column.constraints.required && (
              <span
                className="shrink-0 text-[10px] font-bold"
                style={{ color: 'var(--text-primary)' }}
                aria-label={t('column.constraints.required')}
                title={t('column.constraints.required')}
              >
                *
              </span>
            )}
          </span>
        )}
      </span>

      {/* Column type badge */}
      <span
        className={`text-[9px] px-1 py-0.5 rounded font-medium text-white/90 ${typeClass}`}
      >
        {t(`columnTypes.${column.type}`)}
      </span>

      {/* Right Handle (for outgoing connections) - only for key columns */}
      {column.isKey && (
        <Handle
          type="source"
          position={Position.Right}
          id={`${column.id}__source`}
          className="!bg-amber-400 !border !border-white hover:!bg-amber-500 cursor-crosshair !rounded-full"
          style={{ width: 8, height: 8, minWidth: 8, minHeight: 8, maxWidth: 8, maxHeight: 8, right: -5 }}
          title="ドラッグして他のテーブルのカラムに接続"
          onPointerDown={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
    </div>
  );
});

ColumnRow.displayName = 'ColumnRow';
