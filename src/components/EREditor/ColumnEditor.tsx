import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore } from '../../stores';
import { Button, Input, Select } from '../common';
import type { Column, ColumnType, ColumnConstraints } from '../../types';

const columnTypes: ColumnType[] = [
  'Text', 'Number', 'Decimal', 'Date', 'DateTime', 'Time', 'Duration',
  'Email', 'Phone', 'Url', 'Image', 'File', 'Enum', 'EnumList',
  'Yes/No', 'Color', 'LatLong', 'Address', 'Ref',
  'ChangeCounter', 'ChangeLocation', 'ChangeTimestamp', 'Progress', 'UniqueID'
];

export function ColumnEditor() {
  const { t } = useTranslation();
  const { tables, selectedTableId, selectedColumnId, updateColumn, deleteColumn } = useERStore();
  
  const selectedTable = tables.find((t) => t.id === selectedTableId);
  const selectedColumn = selectedTable?.columns.find((c) => c.id === selectedColumnId);

  const handleUpdate = useCallback((updates: Partial<Column>) => {
    if (selectedTableId && selectedColumnId) {
      updateColumn(selectedTableId, selectedColumnId, updates);
    }
  }, [selectedTableId, selectedColumnId, updateColumn]);

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
    return (
      <div className="p-4 text-gray-500 text-center">
        {t('column.column')}を選択してください
      </div>
    );
  }

  const typeOptions = columnTypes.map((type) => ({
    value: type,
    label: t(`columnTypes.${type}`),
  }));

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-semibold text-lg">{t('column.column')}設定</h3>
      
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
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedColumn.isKey}
            onChange={(e) => handleUpdate({ isKey: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm">{t('table.isKey')}</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selectedColumn.isLabel}
            onChange={(e) => handleUpdate({ isLabel: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm">{t('table.isLabel')}</span>
        </label>
      </div>
      
      {/* 制約設定 */}
      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">{t('table.constraints')}</h4>
        
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedColumn.constraints.required}
              onChange={(e) => handleConstraintUpdate({ required: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{t('column.constraints.required')}</span>
          </label>
          
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selectedColumn.constraints.unique}
              onChange={(e) => handleConstraintUpdate({ unique: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm">{t('column.constraints.unique')}</span>
          </label>
          
          <Input
            label={t('column.constraints.defaultValue')}
            value={selectedColumn.constraints.defaultValue || ''}
            onChange={(e) => handleConstraintUpdate({ defaultValue: e.target.value })}
          />
          
          {/* Enum選択肢（Enum/EnumListの場合） */}
          {(selectedColumn.type === 'Enum' || selectedColumn.type === 'EnumList') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('column.constraints.enumValues')}
              </label>
              <textarea
                value={selectedColumn.constraints.enumValues?.join('\n') || ''}
                onChange={(e) => handleConstraintUpdate({
                  enumValues: e.target.value.split('\n').filter(v => v.trim())
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                placeholder="選択肢を1行に1つ入力"
              />
            </div>
          )}
        </div>
      </div>
      
      {/* 削除ボタン */}
      <div className="border-t pt-4">
        <Button variant="danger" onClick={handleDelete} className="w-full">
          {t('column.deleteColumn')}
        </Button>
      </div>
    </div>
  );
}
