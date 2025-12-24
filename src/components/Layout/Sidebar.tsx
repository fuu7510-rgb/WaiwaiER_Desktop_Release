import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore, useProjectStore, useUIStore } from '../../stores';
import { Button, Input } from '../common';
import { TableEditor } from '../EREditor/TableEditor';
import { ColumnEditor } from '../EREditor/ColumnEditor';
import { TABLE_BG_COLOR_CLASSES } from '../../lib/constants';

export function Sidebar() {
  const { t } = useTranslation();
  const { isSidebarOpen, settings } = useUIStore();
  const { tables, addTable, selectedTableId, selectedColumnId, reorderTables } = useERStore();
  const { currentProjectId, canAddTable } = useProjectStore();
  
  const [newTableName, setNewTableName] = useState('');
  const [isAddingTable, setIsAddingTable] = useState(false);

  const handleAddTable = useCallback(() => {
    if (!newTableName.trim()) return;
    if (currentProjectId && !canAddTable(currentProjectId, tables.length)) {
      alert(t('project.limits.maxTables', { max: 5 }));
      return;
    }
    
    const x = 100 + (tables.length % 5) * 250;
    const y = 100 + Math.floor(tables.length / 5) * 300;
    const tablePrefix = settings.tableNamePrefix || '';
    const tableSuffix = settings.tableNameSuffix || '';
    const baseName = newTableName.trim();
    const fullTableName = `${tablePrefix}${baseName}${tableSuffix}`;
    
    // キーカラム名を生成: プレフィックス + ベース名 + サフィックス
    // defaultKeyColumnNameが設定されている場合はそちらを優先
    let keyColumnName: string | undefined;
    if (settings.defaultKeyColumnName) {
      keyColumnName = settings.defaultKeyColumnName;
    } else {
      const keyPrefix = settings.keyColumnPrefix || '';
      const keySuffix = settings.keyColumnSuffix || '';
      if (keyPrefix || keySuffix) {
        keyColumnName = `${keyPrefix}${baseName}${keySuffix}`;
      }
    }
    addTable(fullTableName, { x, y }, { keyColumnName });
    setNewTableName('');
    setIsAddingTable(false);
  }, [newTableName, currentProjectId, canAddTable, tables.length, addTable, t, settings.tableNamePrefix, settings.tableNameSuffix, settings.keyColumnPrefix, settings.keyColumnSuffix, settings.defaultKeyColumnName]);

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside className="bg-white border-r border-zinc-200 flex flex-col h-full w-[280px]">
      {/* Tables List Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <h2 className="text-sm font-bold text-zinc-600 uppercase tracking-wider mt-[6px] mb-[6px] ml-[6px] mr-[6px] align-bottom">
          {t('table.tables')} <span className="text-zinc-400 ml-1">({tables.length})</span>
        </h2>
        <Button
          size="sm"
          onClick={() => setIsAddingTable(true)}
          className="shadow-none text-[11.4px] px-3 py-1.5 m-[6px]"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('editor.addTable')}
        </Button>
      </div>

      {/* Add Table Form */}
      {isAddingTable && (
        <div className="p-4 border-b border-zinc-100 bg-indigo-50/30">
          <Input
            placeholder={t('editor.tableName')}
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTable();
              if (e.key === 'Escape') setIsAddingTable(false);
            }}
            autoFocus
            className="mb-3"
          />
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="secondary" onClick={() => setIsAddingTable(false)} className="m-[3px]">
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleAddTable} className="m-[3px]">
              {t('common.create')}
            </Button>
          </div>
        </div>
      )}

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto">
        {tables.length === 0 ? (
          <div className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-zinc-100 mb-3 text-zinc-400 align-middle">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-zinc-500 mb-1 font-medium align-middle">{t('editor.noTables')}</p>
            <p className="text-xs text-zinc-400 align-middle">
              {t('editor.clickAddTable')}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {tables.map((table, index) => (
              <TableListItem
                key={table.id}
                table={table}
                isSelected={table.id === selectedTableId}
                canMoveUp={index > 0}
                canMoveDown={index < tables.length - 1}
                onMoveUp={() => reorderTables(table.id, tables[index - 1].id)}
                onMoveDown={() => reorderTables(table.id, tables[index + 1].id)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Property Editor */}
      <div className="border-t border-zinc-200 flex-1 overflow-y-auto max-h-[50%] bg-zinc-50/50">
        {selectedColumnId ? (
          <ColumnEditor />
        ) : selectedTableId ? (
          <TableEditor />
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-8 text-zinc-400">
            <svg className="w-8 h-8 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <p className="text-xs text-center">テーブルまたはカラムを選択して編集</p>
          </div>
        )}
      </div>
    </aside>
  );
}

interface TableListItemProps {
  table: {
    id: string;
    name: string;
    color?: string;
    columns: { id: string }[];
  };
  isSelected: boolean;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

function TableListItem({
  table,
  isSelected,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: TableListItemProps) {
  const { selectTable } = useERStore();

  return (
    <li
      onClick={() => selectTable(table.id)}
      className={`
        px-4 py-3 cursor-pointer transition-all duration-150
        ${isSelected 
          ? 'bg-indigo-50 border-l-4 border-indigo-500 pl-3' 
          : 'hover:bg-zinc-50 border-l-4 border-transparent pl-3'
        }
      `}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${TABLE_BG_COLOR_CLASSES[table.color || '#6366f1'] || 'bg-indigo-500'}`}
        />
        <span className={`text-sm font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-zinc-700'}`}>
          {table.name}
        </span>
        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-md border
              bg-white text-zinc-500 transition-colors
              hover:bg-zinc-50 hover:text-zinc-700
              focus:outline-none focus:ring-2 focus:ring-indigo-200
              ${canMoveUp ? 'border-zinc-200' : 'border-zinc-100 opacity-30 cursor-not-allowed hover:bg-white hover:text-zinc-500'}
            `}
            onClick={(e) => {
              e.stopPropagation();
              if (!canMoveUp) return;
              onMoveUp?.();
            }}
            aria-label="上に移動"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 4a1 1 0 01.707.293l5 5a1 1 0 11-1.414 1.414L10 6.414 5.707 10.707A1 1 0 114.293 9.293l5-5A1 1 0 0110 4z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-md border
              bg-white text-zinc-500 transition-colors
              hover:bg-zinc-50 hover:text-zinc-700
              focus:outline-none focus:ring-2 focus:ring-indigo-200
              ${canMoveDown ? 'border-zinc-200' : 'border-zinc-100 opacity-30 cursor-not-allowed hover:bg-white hover:text-zinc-500'}
            `}
            onClick={(e) => {
              e.stopPropagation();
              if (!canMoveDown) return;
              onMoveDown?.();
            }}
            aria-label="下に移動"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 16a1 1 0 01-.707-.293l-5-5a1 1 0 111.414-1.414L10 13.586l4.293-4.293a1 1 0 111.414 1.414l-5 5A1 1 0 0110 16z"
                clipRule="evenodd"
              />
            </svg>
          </button>
          <span className="text-[10px] text-zinc-400 pl-1">
            {table.columns.length}
          </span>
        </span>
      </div>
    </li>
  );
}
