import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import { formatValue } from '../../lib';
import type { Column, SampleDataByTableId, SampleRow, Table } from '../../types';
import { getRefDisplayLabel, getRowLabel } from './recordLabel';
import { SimulatorRowForm } from './SimulatorRowForm';
import { SimulatorRelatedRecords, type RelatedSection } from './SimulatorRelatedRecords';

interface SimulatorDetailPanelProps {
  table: Table;
  tables: Table[];
  sampleDataByTableId: SampleDataByTableId;
  selectedRow: SampleRow;
  computedSelectedRow: Record<string, unknown> | null;
  computedDraftRow: Record<string, unknown> | null;
  isEditing: boolean;
  draftRow: SampleRow | null;
  relatedSections: RelatedSection[];
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onClose: () => void;
  onDraftChange: (updater: (prev: SampleRow | null) => SampleRow) => void;
  onAddRelatedRow: (section: RelatedSection) => void;
  onSelectRelatedRow: (tableId: string, row: SampleRow, rowIndex: number) => void;
}

export function SimulatorDetailPanel({
  table,
  tables,
  sampleDataByTableId,
  selectedRow,
  computedSelectedRow,
  computedDraftRow,
  isEditing,
  draftRow,
  relatedSections,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onClose,
  onDraftChange,
  onAddRelatedRow,
  onSelectRelatedRow,
}: SimulatorDetailPanelProps) {
  const { t } = useTranslation();

  return (
    <div
      className="w-[380px] border-l overflow-auto"
      style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 text-white"
        style={{ backgroundColor: table.color || '#6366f1' }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">
              {getRowLabel(table, computedSelectedRow ?? selectedRow, { fallback: table.name }) ||
                table.name}
            </h3>
            <p className="text-[10px] opacity-75 truncate">{table.name}</p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            {!isEditing ? (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={onEdit}>
                  {t('common.edit', '編集')}
                </Button>

                <Button type="button" variant="danger" size="sm" onClick={onDelete}>
                  {t('common.delete', '削除')}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
                  {t('common.cancel', 'キャンセル')}
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={onSave}>
                  {t('common.save', '保存')}
                </Button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-1 rounded hover:bg-white/10"
              aria-label={t('common.close', '閉じる')}
              title={t('common.close', '閉じる')}
            >
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 10-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="divide-y theme-divide-y">
        {table.columns.map((column) => (
          <div key={column.id} className="px-4 py-2.5 flex items-start gap-3">
            <div className="w-[120px] shrink-0">
              <label className="flex items-center text-[10px] font-medium theme-text-muted">
                {column.isKey && (
                  <svg
                    className="w-2.5 h-2.5 text-amber-500 mr-0.5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                <span className="truncate">{column.name}</span>
                {column.constraints.required && <span className="text-red-400 ml-0.5">*</span>}
              </label>
              {column.description && (
                <p className="mt-0.5 text-[9px] theme-text-muted line-clamp-2">{column.description}</p>
              )}
            </div>
            <div className="flex-1 min-w-0 text-xs theme-text-primary break-words">
              {!isEditing ? (
                <ColumnValueDisplay
                  column={column}
                  tables={tables}
                  sampleDataByTableId={sampleDataByTableId}
                  row={computedSelectedRow ?? selectedRow}
                />
              ) : (
                <SimulatorRowForm
                  column={column}
                  tables={tables}
                  sampleDataByTableId={sampleDataByTableId}
                  selectedRow={selectedRow}
                  draftRow={draftRow}
                  computedDraftRow={computedDraftRow}
                  computedSelectedRow={computedSelectedRow}
                  onDraftChange={onDraftChange}
                />
              )}
            </div>
          </div>
        ))}

        {!isEditing && relatedSections.length > 0 && (
          <SimulatorRelatedRecords
            tables={tables}
            sampleDataByTableId={sampleDataByTableId}
            relatedSections={relatedSections}
            onAddRelatedRow={onAddRelatedRow}
            onSelectRelatedRow={onSelectRelatedRow}
          />
        )}
      </div>
    </div>
  );
}

interface ColumnValueDisplayProps {
  column: Column;
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  row: Record<string, unknown>;
}

function ColumnValueDisplay({ column, tables, sampleDataByTableId, row }: ColumnValueDisplayProps) {
  if (column.type === 'Ref') {
    return (
      <>
        {getRefDisplayLabel({
          tables,
          sampleDataByTableId,
          column,
          value: row[column.id],
        })}
      </>
    );
  }
  return <>{formatValue(row[column.id], column.type)}</>;
}
