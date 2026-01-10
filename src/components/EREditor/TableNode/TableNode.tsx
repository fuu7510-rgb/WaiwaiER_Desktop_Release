import { memo, useCallback } from 'react';
import { Handle, Position } from 'reactflow';
import type { NodeProps } from 'reactflow';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../../stores';
import { TABLE_NODE_STYLE_CLASSES, DEFAULT_TABLE_COLOR } from '../../../lib/constants';
import { TableNodeHeader } from './TableNodeHeader';
import { CollapsedColumnHandles } from './CollapsedColumnHandles';
import { SortableColumns } from './SortableColumns';
import type { TableNodeData } from './types';

export const TableNode = memo(({ data, selected }: NodeProps<TableNodeData>) => {
  const { table } = data;
  const { t } = useTranslation();
  
  const addColumn = useERStore((state) => state.addColumn);
  const isTableSelected = useERStore((state) => state.selectedTableId === table.id);

  const handleAddColumn = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    addColumn(table.id);
  }, [table.id, addColumn]);

  const isCollapsed = table.isCollapsed ?? false;
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
    >
      {/* Header */}
      <TableNodeHeader table={table} colorClasses={colorClasses} />

      {/* Columns */}
      {isCollapsed ? <CollapsedColumnHandles table={table} /> : <SortableColumns table={table} />}

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
