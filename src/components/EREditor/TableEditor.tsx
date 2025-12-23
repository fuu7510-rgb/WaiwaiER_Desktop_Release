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
      <div className="p-4 text-gray-500 text-center">
        {t('table.table')}を選択してください
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-lg">{t('table.table')}設定</h3>
      
      {/* テーブル名 */}
      <Input
        label={t('editor.tableName')}
        value={selectedTable.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
      />
      
      {/* 色選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('table.color')}
        </label>
        <div className="flex flex-wrap gap-2">
          {tableColors.map((color) => (
            <button
              key={color}
              className={`w-8 h-8 rounded-full border-2 transition-transform ${
                selectedTable.color === color ? 'ring-2 ring-offset-2 ring-blue-400 scale-110' : ''
              }`}
              style={{ backgroundColor: color, borderColor: color }}
              onClick={() => handleUpdate({ color })}
            />
          ))}
        </div>
      </div>
      
      {/* 統計情報 */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-sm text-gray-600 space-y-1">
          <p>{t('column.columns')}: {selectedTable.columns.length}</p>
          <p>作成日: {new Date(selectedTable.createdAt).toLocaleString()}</p>
          <p>更新日: {new Date(selectedTable.updatedAt).toLocaleString()}</p>
        </div>
      </div>
      
      {/* アクションボタン */}
      <div className="space-y-2 border-t pt-4">
        <Button variant="secondary" onClick={handleDuplicate} className="w-full">
          {t('table.duplicateTable')}
        </Button>
        <Button variant="danger" onClick={() => setIsDeleteDialogOpen(true)} className="w-full">
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
