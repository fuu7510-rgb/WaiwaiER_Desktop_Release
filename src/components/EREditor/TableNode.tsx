import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import type { Table, Column, ColumnType } from '../../types';

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
  Number: 'bg-emerald-500',
  Decimal: 'bg-emerald-500',
  Date: 'bg-amber-500',
  DateTime: 'bg-amber-500',
  Time: 'bg-amber-500',
  Duration: 'bg-amber-500',
  Email: 'bg-violet-500',
  Phone: 'bg-violet-500',
  Url: 'bg-violet-500',
  Image: 'bg-pink-500',
  File: 'bg-pink-500',
  Enum: 'bg-indigo-500',
  EnumList: 'bg-indigo-500',
  'Yes/No': 'bg-red-500',
  Color: 'bg-orange-500',
  LatLong: 'bg-teal-500',
  Address: 'bg-teal-500',
  Ref: 'bg-cyan-500',
  ChangeCounter: 'bg-slate-500',
  ChangeLocation: 'bg-slate-500',
  ChangeTimestamp: 'bg-slate-500',
  Progress: 'bg-green-500',
  UniqueID: 'bg-purple-500',
};

const tableColorClasses: Record<string, { border: string; bg: string }> = {
  '#6366f1': { border: 'border-indigo-500', bg: 'bg-indigo-500' },
  '#8b5cf6': { border: 'border-violet-500', bg: 'bg-violet-500' },
  '#ec4899': { border: 'border-pink-500', bg: 'bg-pink-500' },
  '#ef4444': { border: 'border-red-500', bg: 'bg-red-500' },
  '#f97316': { border: 'border-orange-500', bg: 'bg-orange-500' },
  '#f59e0b': { border: 'border-amber-500', bg: 'bg-amber-500' },
  '#84cc16': { border: 'border-lime-500', bg: 'bg-lime-500' },
  '#22c55e': { border: 'border-green-500', bg: 'bg-green-500' },
  '#14b8a6': { border: 'border-teal-500', bg: 'bg-teal-500' },
  '#06b6d4': { border: 'border-cyan-500', bg: 'bg-cyan-500' },
};

export const TableNode = memo(({ data, selected }: NodeProps<TableNodeData>) => {
  const { table } = data;
  const { t } = useTranslation();
  const { selectTable, selectedTableId, addColumn, updateTable } = useERStore();
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

  const isSelected = selectedTableId === table.id || selected;
  const highlight = data.highlight;
  const isDimmed = highlight?.isDimmed ?? false;
  const isUpstream = highlight?.isUpstream ?? false;
  const isDownstream = highlight?.isDownstream ?? false;
  const isRelated = highlight?.isRelated ?? false;
  const colorClasses = tableColorClasses[table.color?.toLowerCase() || '#6366f1'] || tableColorClasses['#6366f1'];

  return (
    <div
      className={`
        bg-white rounded-md shadow-lg min-w-[180px] max-w-[280px]
        border transition-all duration-200
        ${isSelected ? 'ring-2 ring-indigo-400/50 ring-offset-1' : isRelated ? 'ring-1 ring-indigo-300/40' : 'hover:shadow-xl'}
        ${isUpstream && !isDownstream ? 'border-dashed' : ''}
        ${isDownstream && !isUpstream ? 'border-solid' : ''}
        ${isDimmed ? 'opacity-30 saturate-50' : ''}
        ${colorClasses.border}
      `}
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
        <span className="text-[10px] opacity-70 ml-1.5 tabular-nums">
          {table.columns.length}
        </span>
      </div>

      {/* Columns */}
      <TableNodeSortableColumns table={table} />

      {/* Add Column Button */}
      <div className="relative">
        <Handle
          type="target"
          position={Position.Left}
          id={`${table.id}__addColumn`}
          className="!w-3 !h-3 !bg-green-400 !border-2 !border-white !-left-1.5"
          title="ここに接続すると新しいカラムを作成"
        />
        <button
          onClick={handleAddColumn}
          className="w-full px-2.5 py-1 text-[10px] text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50 transition-colors rounded-b flex items-center justify-center gap-1"
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

function TableNodeSortableColumns(props: { table: Table }) {
  const { table } = props;
  const { reorderColumn } = useERStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const columnById = useMemo(() => {
    const m = new Map<string, (typeof table.columns)[number]>();
    for (const c of table.columns) m.set(c.id, c);
    return m;
  }, [table]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId || !overId || activeId === overId) return;
    const overColumn = columnById.get(overId);
    if (!overColumn) return;
    reorderColumn(table.id, activeId, overColumn.order);
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <SortableContext items={table.columns.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-zinc-100 nodrag">
          {table.columns.map((column, index) => (
            <ColumnRow
              key={column.id}
              column={column}
              tableId={table.id}
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
  isFirst: boolean;
  isLast: boolean;
}

const ColumnRow = memo(({ column, tableId, isFirst, isLast }: ColumnRowProps) => {
  const { t } = useTranslation();
  const { selectColumn, selectedColumnId, reorderColumn, updateColumn } = useERStore();
  const isSelected = selectedColumnId === column.id;
  const typeClass = columnTypeClasses[column.type] || 'bg-slate-500';

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: column.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState(column.name);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditingName]);

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
    if (!isFirst) {
      reorderColumn(tableId, column.id, column.order - 1);
    }
  }, [tableId, column.id, column.order, isFirst, reorderColumn]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isLast) {
      reorderColumn(tableId, column.id, column.order + 1);
    }
  }, [tableId, column.id, column.order, isLast, reorderColumn]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative px-2 py-1 flex items-center gap-1.5 cursor-pointer
        hover:bg-zinc-50 transition-colors group
        ${isSelected ? 'bg-indigo-50' : ''}
        ${isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''}
        nodrag
      `}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      {/* Left Handle (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id={column.id}
        className="!w-3 !h-3 !bg-zinc-300 !border-2 !border-white"
      />

      {/* Reorder buttons (visible on hover) */}
      <div className="hidden group-hover:flex flex-col absolute -left-4 bg-white shadow-sm border border-zinc-200 rounded overflow-hidden z-10">
        <button
          onClick={handleMoveUp}
          disabled={isFirst}
          data-reorder-button="true"
          onPointerDown={(e) => e.stopPropagation()}
          className={`p-0.5 hover:bg-zinc-100 ${isFirst ? 'opacity-20 cursor-not-allowed' : 'text-zinc-500'}`}
          title={t('common.moveUp')}
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
          className={`p-0.5 border-t border-zinc-100 hover:bg-zinc-100 ${isLast ? 'opacity-20 cursor-not-allowed' : 'text-zinc-500'}`}
          title={t('common.moveDown')}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
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
      <span className="flex-1 min-w-0 text-[11px] text-zinc-700" onDoubleClick={handleNameDoubleClick}>
        {isEditingName ? (
          <input
            ref={inputRef}
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-white border border-zinc-200 rounded px-1 py-0.5 text-[11px] text-zinc-700 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
            aria-label={t('table.columnName')}
          />
        ) : (
          <span className="block truncate">{column.name}</span>
        )}
      </span>

      {/* Column type badge */}
      <span
        className={`text-[9px] px-1 py-0.5 rounded font-medium text-white/90 ${typeClass}`}
      >
        {t(`columnTypes.${column.type}`)}
      </span>

      {/* Required indicator */}
      {column.constraints.required && (
        <span className="text-red-400 text-[10px] font-bold">*</span>
      )}

      {/* Right Handle (for outgoing connections) - only for key columns */}
      {column.isKey && (
        <Handle
          type="source"
          position={Position.Right}
          id={`${column.id}__source`}
          className="!w-3 !h-3 !bg-amber-400 !border-2 !border-white hover:!bg-amber-500 cursor-crosshair"
          title="ドラッグして他のテーブルのカラムに接続"
        />
      )}
    </div>
  );
});

ColumnRow.displayName = 'ColumnRow';
