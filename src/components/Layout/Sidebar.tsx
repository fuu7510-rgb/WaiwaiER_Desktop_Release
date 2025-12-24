import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore, useProjectStore, useUIStore } from '../../stores';
import { Button, Input } from '../common';
import { TableEditor } from '../EREditor/TableEditor';
import { ColumnEditor } from '../EREditor/ColumnEditor';
import { TABLE_BG_COLOR_CLASSES } from '../../lib/constants';

export function Sidebar() {
  const { t } = useTranslation();
  const { isSidebarOpen, sidebarWidth } = useUIStore();
  const { tables, addTable, selectedTableId, selectedColumnId } = useERStore();
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
    addTable(newTableName.trim(), { x, y });
    setNewTableName('');
    setIsAddingTable(false);
  }, [newTableName, currentProjectId, canAddTable, tables.length, addTable, t]);

  if (!isSidebarOpen) {
    return null;
  }

  return (
    <aside
      className="bg-white border-r border-zinc-200 flex flex-col h-full w-[280px]"
    >
      {/* Tables List Header */}
      <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-white sticky top-0 z-10">
        <h2 className="text-sm font-bold text-zinc-600 uppercase tracking-wider mt-[6px] mb-[6px] ml-[6px] mr-[6px]">
          {t('table.tables')} <span className="text-zinc-400 ml-1">({tables.length})</span>
        </h2>
        <Button
          size="sm"
          onClick={() => setIsAddingTable(true)}
          className="shadow-none text-[11.4px] pt-[3px] pb-[3px] pl-[6px] pr-[6px] m-[6px]"
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
            <Button size="sm" variant="secondary" onClick={() => setIsAddingTable(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleAddTable}>
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
            {tables.map((table) => (
              <TableListItem
                key={table.id}
                table={table}
                isSelected={table.id === selectedTableId}
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
}

function TableListItem({ table, isSelected }: TableListItemProps) {
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
        <span className="text-[10px] text-zinc-400 ml-auto shrink-0">
          {table.columns.length}
        </span>
      </div>
    </li>
  );
}
