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
      className="bg-white border-r border-gray-200 flex flex-col h-full"
      style={{ width: sidebarWidth }}
    >
      {/* Tables List Header */}
      <div className="p-4 border-b flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">
          {t('table.tables')} ({tables.length})
        </h2>
        <Button
          size="sm"
          onClick={() => setIsAddingTable(true)}
        >
          + {t('editor.addTable')}
        </Button>
      </div>

      {/* Add Table Form */}
      {isAddingTable && (
        <div className="p-4 border-b bg-blue-50">
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
          <div className="flex gap-2 mt-2">
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
          <div className="p-4 text-center text-gray-500 text-sm">
            {t('editor.noTables')}
          </div>
        ) : (
          <ul className="divide-y">
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
      <div className="border-t flex-1 overflow-y-auto max-h-[50%]">
        {selectedColumnId ? (
          <ColumnEditor />
        ) : selectedTableId ? (
          <TableEditor />
        ) : (
          <div className="p-4 text-gray-500 text-center text-sm">
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
        px-4 py-3 cursor-pointer transition-colors
        ${isSelected ? 'bg-blue-50 border-l-4 border-blue-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}
      `}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: table.color || '#6366f1' }}
        />
        <span className="font-medium text-gray-900">{table.name}</span>
        <span className="text-xs text-gray-400 ml-auto">
          {table.columns.length} cols
        </span>
      </div>
    </li>
  );
}
