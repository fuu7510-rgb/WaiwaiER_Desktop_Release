import { memo, useCallback, useState } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import type { Table, Column, ColumnType } from '../../types';

interface TableNodeData {
  table: Table;
}

const columnTypeColors: Record<ColumnType, string> = {
  Text: '#3b82f6',
  Number: '#10b981',
  Decimal: '#10b981',
  Date: '#f59e0b',
  DateTime: '#f59e0b',
  Time: '#f59e0b',
  Duration: '#f59e0b',
  Email: '#8b5cf6',
  Phone: '#8b5cf6',
  Url: '#8b5cf6',
  Image: '#ec4899',
  File: '#ec4899',
  Enum: '#6366f1',
  EnumList: '#6366f1',
  'Yes/No': '#ef4444',
  Color: '#f97316',
  LatLong: '#14b8a6',
  Address: '#14b8a6',
  Ref: '#06b6d4',
  ChangeCounter: '#64748b',
  ChangeLocation: '#64748b',
  ChangeTimestamp: '#64748b',
  Progress: '#22c55e',
  UniqueID: '#a855f7',
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
  const borderColor = table.color || '#6366f1';

  return (
    <div
      className={`
        bg-white rounded-lg shadow-md min-w-[200px] max-w-[300px]
        border-2 transition-all duration-200
        ${isSelected ? 'ring-2 ring-blue-400 ring-offset-2' : ''}
      `}
      style={{ borderColor }}
      onClick={handleClick}
    >
      {/* Header */}
      <div
        className="px-3 py-2 rounded-t-md font-semibold text-white flex items-center justify-between"
        style={{ backgroundColor: borderColor }}
        onDoubleClick={handleDoubleClick}
      >
        {isEditing ? (
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleKeyDown}
            className="bg-transparent border-none outline-none text-white w-full"
            autoFocus
          />
        ) : (
          <span className="truncate">{table.name}</span>
        )}
        <span className="text-xs opacity-75 ml-2">
          {table.columns.length} {t('column.columns')}
        </span>
      </div>

      {/* Columns */}
      <div className="divide-y divide-gray-100">
        {table.columns.map((column) => (
          <ColumnRow key={column.id} column={column} tableId={table.id} />
        ))}
      </div>

      {/* Add Column Button */}
      <button
        onClick={handleAddColumn}
        className="w-full px-3 py-2 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors rounded-b-md"
      >
        + {t('table.addColumn')}
      </button>
    </div>
  );
});

TableNode.displayName = 'TableNode';

interface ColumnRowProps {
  column: Column;
  tableId: string;
}

const ColumnRow = memo(({ column, tableId }: ColumnRowProps) => {
  const { t } = useTranslation();
  const { selectColumn, selectedColumnId } = useERStore();
  const isSelected = selectedColumnId === column.id;
  const typeColor = columnTypeColors[column.type] || '#64748b';

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    selectColumn(tableId, column.id);
  }, [tableId, column.id, selectColumn]);

  return (
    <div
      className={`
        relative px-3 py-1.5 flex items-center gap-2 cursor-pointer
        hover:bg-gray-50 transition-colors
        ${isSelected ? 'bg-blue-50' : ''}
      `}
      onClick={handleClick}
    >
      {/* Left Handle (for incoming connections) */}
      <Handle
        type="target"
        position={Position.Left}
        id={column.id}
        className="!w-2 !h-2 !bg-gray-400 !border-2 !border-white"
      />

      {/* Key/Label indicators */}
      <div className="flex gap-0.5">
        {column.isKey && (
          <span className="text-yellow-500 text-xs" title={t('table.isKey')}>🔑</span>
        )}
        {column.isLabel && (
          <span className="text-blue-500 text-xs" title={t('table.isLabel')}>🏷️</span>
        )}
      </div>

      {/* Column name */}
      <span className="flex-1 text-sm truncate">{column.name}</span>

      {/* Column type badge */}
      <span
        className="text-xs px-1.5 py-0.5 rounded text-white"
        style={{ backgroundColor: typeColor }}
      >
        {t(`columnTypes.${column.type}`)}
      </span>

      {/* Required indicator */}
      {column.constraints.required && (
        <span className="text-red-500 text-xs">*</span>
      )}

      {/* Right Handle (for outgoing connections) */}
      <Handle
        type="source"
        position={Position.Right}
        id={column.id}
        className="!w-2 !h-2 !bg-gray-400 !border-2 !border-white"
      />
    </div>
  );
});

ColumnRow.displayName = 'ColumnRow';
