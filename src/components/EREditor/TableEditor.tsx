import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore, useProjectStore, useUIStore } from '../../stores';
import { Button, Input, ConfirmDialog } from '../common';
import { TABLE_COLOR_PALETTE, TABLE_COLOR_PICKER_CLASSES } from '../../lib/constants';
import type { Table } from '../../types';

const ALL_EXPORT_TARGETS = ['excel', 'json', 'package'] as const;

export function TableEditor() {
  const { t } = useTranslation();
  const { tables, selectedTableId, updateTable, deleteTable, duplicateTable, applyCommonColumnsToTable } = useERStore();
  const { currentProjectId, canAddTable } = useProjectStore();
  const commonColumns = useUIStore((s) => s.settings.commonColumns) ?? [];
  
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

  const handleApplyCommonColumns = useCallback(() => {
    if (!selectedTableId) return;
    applyCommonColumnsToTable(selectedTableId);
  }, [selectedTableId, applyCommonColumnsToTable]);

  const exportTargets = selectedTable?.exportTargets ?? [...ALL_EXPORT_TARGETS];

  const handleToggleExportTarget = useCallback((target: (typeof ALL_EXPORT_TARGETS)[number]) => {
    const current = selectedTable?.exportTargets ?? [...ALL_EXPORT_TARGETS];
    const next = current.includes(target) ? current.filter((t) => t !== target) : [...current, target];
    handleUpdate({ exportTargets: next });
  }, [handleUpdate, selectedTable?.exportTargets]);

  if (!selectedTable) {
    return null;
  }

  return (
    <div className="p-4 space-y-4">
      <h3 
        className="font-bold text-xs uppercase tracking-wider mb-2"
        style={{ color: 'var(--text-muted)' }}
      >
        {t('table.settingsTitle')}
      </h3>
      
      {/* テーブル名 */}
      <Input
        label={t('editor.tableName')}
        value={selectedTable.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
      />
      
      {/* 色選択 */}
      <div>
        <label 
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('table.color')}
        </label>
        <div className="flex flex-wrap gap-1.5">
          {TABLE_COLOR_PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-5 h-5 rounded-full border transition-all ${TABLE_COLOR_PICKER_CLASSES[color]} ${
                selectedTable.color === color ? 'ring-2 ring-offset-1 ring-indigo-400 scale-110' : 'hover:scale-110'
              }`}
              onClick={() => handleUpdate({ color })}
              title={color}
              aria-label={color}
            />
          ))}
        </div>
      </div>

      {/* エクスポート先 */}
      <div>
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: 'var(--text-muted)' }}
        >
          {t('table.exportTargets')}
        </label>
        <div className="space-y-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportTargets.includes('excel')}
              onChange={() => handleToggleExportTarget('excel')}
              className="w-3.5 h-3.5 rounded"
            />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {t('export.formats.excel')}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportTargets.includes('json')}
              onChange={() => handleToggleExportTarget('json')}
              className="w-3.5 h-3.5 rounded"
            />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {t('export.formats.json')}
            </span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exportTargets.includes('package')}
              onChange={() => handleToggleExportTarget('package')}
              className="w-3.5 h-3.5 rounded"
            />
            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
              {t('export.formats.package')}
            </span>
          </label>
        </div>
      </div>
      
      {/* 統計情報 */}
      <div 
        className="rounded p-2"
        style={{ backgroundColor: 'var(--muted)' }}
      >
        <div className="text-[10px] space-y-0.5" style={{ color: 'var(--text-muted)' }}>
          <p>{t('column.columns')}: <span style={{ color: 'var(--text-secondary)' }} className="font-medium">{selectedTable.columns.length}</span></p>
          <p>{t('table.createdAt')}: <span style={{ color: 'var(--text-secondary)' }}>{new Date(selectedTable.createdAt).toLocaleString()}</span></p>
          <p>{t('table.updatedAt')}: <span style={{ color: 'var(--text-secondary)' }}>{new Date(selectedTable.updatedAt).toLocaleString()}</span></p>
        </div>
      </div>
      
      {/* アクションボタン */}
      <div 
        className="space-y-1.5 border-t pt-3"
        style={{ borderColor: 'var(--border)' }}
      >
        <Button variant="secondary" size="sm" onClick={handleApplyCommonColumns} className="w-full" disabled={commonColumns.length === 0}>
          {t('table.addCommonColumns')}
        </Button>
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
