import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore, useProjectStore, useUIStore } from '../../stores';
import { Button, Input } from '../common';
import { TableEditor } from '../EREditor/TableEditor';
import { ColumnEditor } from '../EREditor/ColumnEditor';

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
      className="bg-white border-r border-zinc-200 flex flex-col h-full"
      style={{ width: sidebarWidth }}
    >
      {/* Tables List Header */}
      <div className="px-3 py-2 border-b border-zinc-100 flex items-center justify-between">
        <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          {t('table.tables')} <span className="text-zinc-400">({tables.length})</span>
        </h2>
        <Button
          size="sm"
          onClick={() => setIsAddingTable(true)}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {t('editor.addTable')}
        </Button>
      </div>

      {/* Add Table Form */}
      {isAddingTable && (
        <div className="p-2 border-b border-zinc-100 bg-indigo-50/50">
          <Input
            placeholder={t('editor.tableName')}
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddTable();
              if (e.key === 'Escape') setIsAddingTable(false);
            }}
            autoFocus
          />
          <div className="flex gap-1.5 mt-1.5">
            <Button size="sm" onClick={handleAddTable}>
              {t('common.create')}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsAddingTable(false)}>
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Tables List */}
      <div className="flex-1 overflow-y-auto">
        {tables.length === 0 ? (
          <div className="p-3 text-center text-zinc-400 text-xs">
            {t('editor.noTables')}
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
          <div className="p-3 text-zinc-400 text-center text-xs">
            テーブルまたはカラムを選択
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
        px-3 py-2 cursor-pointer transition-all duration-150
        ${isSelected 
          ? 'bg-indigo-50 border-l-2 border-indigo-500' 
          : 'hover:bg-zinc-50 border-l-2 border-transparent'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: table.color || '#6366f1' }}
        />
        <span className={`text-xs font-medium truncate ${isSelected ? 'text-indigo-700' : 'text-zinc-700'}`}>
          {table.name}
        </span>
        <span className="text-[10px] text-zinc-400 ml-auto shrink-0">
          {table.columns.length}
        </span>
      </div>
    </li>
  );
}
