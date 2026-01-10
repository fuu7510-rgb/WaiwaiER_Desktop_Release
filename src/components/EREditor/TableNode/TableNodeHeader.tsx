import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../../stores';
import { Tooltip } from '../../common';
import type { Table } from './types';

interface TableNodeHeaderProps {
  table: Table;
  colorClasses: { bg: string; border: string };
}

export const TableNodeHeader = memo(({ table, colorClasses }: TableNodeHeaderProps) => {
  const { t } = useTranslation();
  const updateTable = useERStore((state) => state.updateTable);
  const selectTable = useERStore((state) => state.selectTable);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(table.name);
  const isCollapsed = table.isCollapsed ?? false;

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

  const handleToggleCollapsed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      selectTable(table.id);
      updateTable(table.id, { isCollapsed: !isCollapsed });
    },
    [selectTable, table.id, isCollapsed, updateTable]
  );

  return (
    <div
      className={`px-2.5 py-1.5 rounded-t font-medium text-white text-xs flex items-center justify-between ${colorClasses.bg}`}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        {/* 同期テーブルインジケーター */}
        {table.syncGroupId && (
          <Tooltip content={t('table.syncTableTooltip')}>
            <span 
              className="flex-shrink-0 px-1 py-0.5 text-[8px] font-bold rounded bg-white/20 leading-none"
              title={t('table.syncTableTooltip')}
            >
              {t('table.syncIndicator')}
            </span>
          </Tooltip>
        )}
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
      </div>
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
  );
});

TableNodeHeader.displayName = 'TableNodeHeader';
