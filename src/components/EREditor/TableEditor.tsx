import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore, useProjectStore } from '../../stores';
import { Button, Input, ConfirmDialog } from '../common';
import type { Table } from '../../types';

const tableColors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4',
];

export function TableEditor() {
  const { t } = useTranslation();
  const { tables, selectedTableId, updateTable, deleteTable, duplicateTable } = useERStore();
  const { currentProjectId, canAddTable } = useProjectStore();
  
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const handleUpdate = useCallback((updates: Partial<Table>) => {
    if (selectedTableId) {
      updateTable(selectedTableId, updates);
    }
  }, [selectedTableId, updateTable]);

  const handleDelete = useCallback(() => {
    if (selectedTableId) {
      deleteTable(selectedTableId);
    }
  }, [selectedTableId, deleteTable]);

  const handleDuplicate = useCallback(() => {
    if (selectedTableId && currentProjectId && canAddTable(currentProjectId, tables.length)) {
      duplicateTable(selectedTableId);
    }
  }, [selectedTableId, currentProjectId, canAddTable, tables.length, duplicateTable]);

  if (!selectedTable) {
    return (
      <div className="p-3 text-zinc-400 text-center text-xs">
        {t('table.table')}を選択してください
      </div>
    );
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="font-medium text-xs text-zinc-500 uppercase tracking-wide">{t('table.table')}設定</h3>
      
      {/* テーブル名 */}
      <Input
        label={t('editor.tableName')}
        value={selectedTable.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
      />
      
      {/* 色選択 */}
      <div>
        <label className="block text-xs font-medium text-zinc-500 mb-1.5">
          {t('table.color')}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {tableColors.map((color) => (
            <button
              key={color}
              className={`w-5 h-5 rounded-full border transition-all ${
                selectedTable.color === color ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color, borderColor: color }}
              onClick={() => handleUpdate({ color })}
            />
          ))}
        </div>
      </div>
      
      {/* 統計情報 */}
      <div className="bg-zinc-50 rounded p-2">
        <div className="text-[10px] text-zinc-500 space-y-0.5">
          <p>{t('column.columns')}: <span className="text-zinc-700 font-medium">{selectedTable.columns.length}</span></p>
          <p>作成日: <span className="text-zinc-700">{new Date(selectedTable.createdAt).toLocaleString()}</span></p>
          <p>更新日: <span className="text-zinc-700">{new Date(selectedTable.updatedAt).toLocaleString()}</span></p>
        </div>
      </div>
      
      {/* アクションボタン */}
      <div className="space-y-1.5 border-t border-zinc-100 pt-3">
        <Button variant="secondary" size="sm" onClick={handleDuplicate} className="w-full">
          {t('table.duplicateTable')}
        </Button>
        <Button variant="danger" size="sm" onClick={() => setIsDeleteDialogOpen(true)} className="w-full">
          {t('table.deleteTable')}
        </Button>
      </div>
      
      {/* 削除確認ダイアログ */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title={t('table.deleteTable')}
        message={t('table.deleteTableConfirm', { name: selectedTable.name })}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
