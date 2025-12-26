import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import { Button, Dialog, Input, Select } from '../common';
import type { Column, ColumnType, ColumnConstraints } from '../../types';

const columnTypes: ColumnType[] = [
  'Text', 'Number', 'Decimal', 'Date', 'DateTime', 'Time', 'Duration',
  'Email', 'Phone', 'Url', 'Image', 'File', 'Enum', 'EnumList',
  'Yes/No', 'Color', 'LatLong', 'Address', 'Ref',
  'ChangeCounter', 'ChangeLocation', 'ChangeTimestamp', 'Progress', 'UniqueID'
];

export function ColumnEditor() {
  const { t } = useTranslation();
  const {
    tables,
    selectedTableId,
    selectedColumnId,
    updateColumn,
    deleteColumn,
    ensureSampleData,
    sampleDataByTableId,
    setSampleRowsForTable,
  } = useERStore();
  
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedColumn = selectedTable?.columns.find((c) => c.id === selectedColumnId);

  const [isDummyValuesDialogOpen, setIsDummyValuesDialogOpen] = useState(false);
  const [dummyValuesDialogText, setDummyValuesDialogText] = useState('');

  useEffect(() => {
    ensureSampleData();
  }, [ensureSampleData]);

  const handleUpdate = useCallback((updates: Partial<Column>) => {
    if (selectedTableId && selectedColumnId) {
      updateColumn(selectedTableId, selectedColumnId, updates);
    }
  }, [selectedTableId, selectedColumnId, updateColumn]);

  const columnSampleValuesPreview = useMemo(() => {
    if (!selectedTableId || !selectedColumnId) return [];
    const rows = sampleDataByTableId[selectedTableId] ?? [];
    return rows.map((r) => String(r?.[selectedColumnId] ?? ''));
  }, [sampleDataByTableId, selectedColumnId, selectedTableId]);

  const openDummyValuesDialog = useCallback(() => {
    if (!selectedColumn) return;
    const rows = selectedTableId ? sampleDataByTableId[selectedTableId] ?? [] : [];
    const text = selectedColumnId
      ? rows.map((r) => String(r?.[selectedColumnId] ?? '')).join('\n')
      : '';
    setDummyValuesDialogText(text);
    setIsDummyValuesDialogOpen(true);
  }, [sampleDataByTableId, selectedColumn, selectedColumnId, selectedTableId]);

  const closeDummyValuesDialog = useCallback(() => {
    setIsDummyValuesDialogOpen(false);
  }, []);

  const saveDummyValuesFromDialog = useCallback(() => {
    if (!selectedTableId || !selectedColumnId || !selectedColumn) return;

    const lines = dummyValuesDialogText.split('\n');
    // Avoid creating an extra row from trailing newlines.
    while (lines.length > 0 && String(lines[lines.length - 1] ?? '').trim().length === 0) {
      lines.pop();
    }

    const currentRows = sampleDataByTableId[selectedTableId] ?? [];
    const desiredCount = lines.length;
    const nextRows: Record<string, unknown>[] = [];
    for (let i = 0; i < desiredCount; i++) {
      const base = currentRows[i] ?? {};
      nextRows.push({ ...base, [selectedColumnId]: lines[i] ?? '' });
    }

    setSampleRowsForTable(selectedTableId, nextRows);
    setIsDummyValuesDialogOpen(false);
  }, [dummyValuesDialogText, sampleDataByTableId, selectedColumn, selectedColumnId, selectedTableId, setSampleRowsForTable]);

  const handleConstraintUpdate = useCallback((updates: Partial<ColumnConstraints>) => {
    if (selectedColumn) {
      handleUpdate({
        constraints: { ...selectedColumn.constraints, ...updates }
      });
    }
  }, [selectedColumn, handleUpdate]);

  const handleDelete = useCallback(() => {
    if (selectedTableId && selectedColumnId) {
      deleteColumn(selectedTableId, selectedColumnId);
    }
  }, [selectedTableId, selectedColumnId, deleteColumn]);

  if (!selectedColumn) {
    return null;
  }

  const typeOptions = columnTypes.map((type) => ({
    value: type,
    label: t(`columnTypes.${type}`),
  }));

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-xs text-zinc-500 uppercase tracking-wider mb-2">{t('column.column')}設定</h3>
      
      {/* カラム名 */}
      <Input
        label={t('table.columnName')}
        value={selectedColumn.name}
        onChange={(e) => handleUpdate({ name: e.target.value })}
      />
      
      {/* データ型 */}
      <Select
        label={t('table.columnType')}
        value={selectedColumn.type}
        options={typeOptions}
        onChange={(e) => handleUpdate({ type: e.target.value as ColumnType })}
      />
      
      {/* キー設定 */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedColumn.isKey}
            onChange={(e) => handleUpdate({ isKey: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">{t('table.isKey')}</span>
        </label>
        
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={selectedColumn.isLabel}
            onChange={(e) => handleUpdate({ isLabel: e.target.checked })}
            className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
          />
          <span className="text-xs text-zinc-600">{t('table.isLabel')}</span>
        </label>
      </div>
      
      {/* 制約設定 */}
      <div className="border-t border-zinc-100 pt-3">
        <h4 className="font-medium text-xs text-zinc-500 mb-2">{t('table.constraints')}</h4>
        
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedColumn.constraints.required}
              onChange={(e) => handleConstraintUpdate({ required: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-zinc-600">{t('column.constraints.required')}</span>
          </label>
          
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedColumn.constraints.unique}
              onChange={(e) => handleConstraintUpdate({ unique: e.target.checked })}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
            />
            <span className="text-xs text-zinc-600">{t('column.constraints.unique')}</span>
          </label>
          
          <Input
            label={t('column.constraints.defaultValue')}
            value={selectedColumn.constraints.defaultValue || ''}
            onChange={(e) => handleConstraintUpdate({ defaultValue: e.target.value })}
          />
          
          {/* Enum選択肢（Enum/EnumListの場合） */}
          {(selectedColumn.type === 'Enum' || selectedColumn.type === 'EnumList') && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                {t('column.constraints.enumValues')}
              </label>
              <textarea
                value={selectedColumn.constraints.enumValues?.join('\n') || ''}
                onChange={(e) => handleConstraintUpdate({
                  enumValues: e.target.value.split('\n').filter(v => v.trim())
                })}
                className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                rows={3}
                placeholder="選択肢を1行に1つ入力"
              />
            </div>
          )}
        </div>
      </div>

      {/* サンプルデータ */}
      <div className="border-t border-zinc-100 pt-3">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h4 className="font-medium text-xs text-zinc-500">{t('column.dummyData')}</h4>
          <Button variant="secondary" size="sm" onClick={openDummyValuesDialog}>
            サンプルデータ編集
          </Button>
        </div>

        <div className="mb-2">
          <div className="text-[10px] text-zinc-400 mb-1">{t('column.dummyDataPreview')}</div>
          <div className="text-xs text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-1.5">
            {columnSampleValuesPreview.length === 0 ? (
              <div className="text-zinc-400">-</div>
            ) : (
              <div className="space-y-0.5">
                {columnSampleValuesPreview.map((v, i) => (
                  <div key={i} className="truncate">{v}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-[10px] text-zinc-400">{t('column.dummyDataPlaceholder')}</div>
      </div>

      <Dialog
        isOpen={isDummyValuesDialogOpen}
        onClose={closeDummyValuesDialog}
        title="サンプルデータ編集"
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={closeDummyValuesDialog}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" size="sm" onClick={saveDummyValuesFromDialog}>
              {t('common.save')}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <div className="text-[10px] text-zinc-400">{t('column.dummyDataPreview')}</div>
          <div className="text-xs text-zinc-700 bg-white border border-zinc-200 rounded px-2 py-1.5 max-h-32 overflow-y-auto">
            {columnSampleValuesPreview.length === 0 ? (
              <div className="text-zinc-400">-</div>
            ) : (
              <div className="space-y-0.5">
                {columnSampleValuesPreview.map((v, i) => (
                  <div key={i} className="truncate">{v}</div>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              {t('column.dummyData')}
            </label>
            <textarea
              value={dummyValuesDialogText}
              onChange={(e) => setDummyValuesDialogText(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 min-h-[320px]"
              placeholder={t('column.dummyDataPlaceholder')}
            />
            <div className="text-[10px] text-zinc-400 mt-1">1行に1つ入力</div>
          </div>
        </div>
      </Dialog>
      
      {/* 削除ボタン */}
      <div className="border-t border-zinc-100 pt-3">
        <Button variant="danger" size="sm" onClick={handleDelete} className="w-full">
          {t('column.deleteColumn')}
        </Button>
      </div>
    </div>
  );
}
