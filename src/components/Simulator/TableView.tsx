import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/core';
import type { Table } from '../../types';
import { getRefDisplayLabel } from './recordLabel';
import { useERStore, useUIStore } from '../../stores';
import { previewExcelColumnNotesLocal } from '../../lib/appsheet/excelNotePreview';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TableViewProps {
  table: Table;
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  searchQuery?: string;
  data?: Record<string, unknown>[];
  selectedRowKey?: string | null;
  onRowClick?: (row: Record<string, unknown>, rowKey: string, rowIndex: number) => void;
  onReorderRows?: (fromIndex: number, toIndex: number) => void;
}

export function TableView({
  table,
  tables,
  sampleDataByTableId,
  searchQuery = '',
  data,
  selectedRowKey = null,
  onRowClick,
  onReorderRows,
}: TableViewProps) {
  const { t } = useTranslation();
  const { reorderColumn } = useERStore();
  const { settings } = useUIStore();
  const noteParamOutputSettings = settings.noteParamOutputSettings;
  const rows = useMemo(() => data ?? sampleDataByTableId[table.id] ?? [], [data, sampleDataByTableId, table.id]);

  const [notePreviewByColumnId, setNotePreviewByColumnId] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const result = await invoke<Record<string, Record<string, string>>>(
          'preview_excel_column_notes',
          {
            request: {
              tables,
              sampleData: {},
              includeData: false,
              noteParamOutputSettings: noteParamOutputSettings,
            },
          }
        );

        if (cancelled) return;
        setNotePreviewByColumnId(result?.[table.id] ?? {});
      } catch {
        // invokeが失敗するケース（ブラウザdev / capabilities設定 / 起動直後など）では
        // フロント側で同等の最小ロジックでプレビューを生成して表示する。
        if (cancelled) return;
        const local = previewExcelColumnNotesLocal(tables, noteParamOutputSettings);
        setNotePreviewByColumnId(local?.[table.id] ?? {});
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [table.id, tables, noteParamOutputSettings]);

  const keyColumnId = useMemo(() => {
    return table.columns.find((c) => c.isKey)?.id ?? table.columns[0]?.id;
  }, [table]);

  const indexedRows = useMemo(() => rows.map((row, index) => ({ row, index })), [rows]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const columnById = useMemo(() => {
    const m = new Map<string, (typeof table.columns)[number]>();
    for (const c of table.columns) m.set(c.id, c);
    return m;
  }, [table]);

  const handleColumnDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId || !overId || activeId === overId) return;
    const overColumn = columnById.get(overId);
    if (!overColumn) return;
    reorderColumn(table.id, activeId, overColumn.order);
  };

  const filteredData = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return indexedRows;
    return indexedRows.filter(({ row }) =>
      table.columns.some((column) => String(row[column.id] ?? '').toLowerCase().includes(q))
    );
  }, [indexedRows, searchQuery, table.columns]);

  const rowSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const canReorderRows = Boolean(onReorderRows) && searchQuery.trim() === '' && Boolean(data);

  const handleRowDragEnd = (event: DragEndEvent) => {
    if (!canReorderRows) return;
    const { active, over } = event;
    if (!over) return;
    const fromIndex = Number(String(active.id));
    const toIndex = Number(String(over.id));
    if (!Number.isFinite(fromIndex) || !Number.isFinite(toIndex)) return;
    if (fromIndex === toIndex) return;
    onReorderRows?.(fromIndex, toIndex);
  };

  const getRowKey = (row: Record<string, unknown>, fallbackIndex: number): string => {
    const keyValue = keyColumnId ? row[keyColumnId] : undefined;
    const keyString = String(keyValue ?? '').trim();
    return keyString ? `${keyColumnId}:${keyString}` : `row:${fallbackIndex}`;
  };

  // DndContextのaccessibility機能を無効化（テーブル内での<div>生成を防ぐ）
  const noAccessibility = {
    screenReaderInstructions: { draggable: '' },
    announcements: {
      onDragStart: () => '',
      onDragOver: () => '',
      onDragEnd: () => '',
      onDragCancel: () => '',
    },
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleColumnDragEnd} accessibility={noAccessibility}>
      <DndContext sensors={rowSensors} onDragEnd={handleRowDragEnd} accessibility={noAccessibility}>
        <div 
          className="h-full border overflow-auto"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <div className="min-w-full">
            <table className="min-w-full border-collapse">
              <thead 
                className="sticky top-0 z-10 border-b"
                style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
              >
                <tr>
                  <SortableContext items={table.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
                    {table.columns.map((column, columnIndex) => (
                      <SortableTableHeaderCell
                        key={column.id}
                        tableId={table.id}
                        column={column}
                        columnIndex={columnIndex}
                        totalColumns={table.columns.length}
                        onMoveUp={() => reorderColumn(table.id, column.id, column.order - 1)}
                        onMoveDown={() => reorderColumn(table.id, column.id, column.order + 1)}
                      />
                    ))}
                  </SortableContext>
                </tr>

                {/* Excelに書き込む予定のNoteParameters（ヘッダーセルのメモ）プレビュー */}
                {notePreviewByColumnId && (
                  <tr style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }} className="border-t">
                    {table.columns.map((column) => {
                      const noteText = notePreviewByColumnId[column.id] ?? '';
                      const display = noteText.length > 60 ? `${noteText.slice(0, 60)}…` : (noteText || '—');
                      return (
                        <th
                          key={column.id}
                          className="px-3 py-1 text-left text-[9px] font-normal whitespace-nowrap"
                          style={{ color: 'var(--text-muted)' }}
                          title={noteText || undefined}
                        >
                          {display}
                        </th>
                      );
                    })}
                  </tr>
                )}
              </thead>
              <SortableContext items={filteredData.map(({ index }) => String(index))} strategy={verticalListSortingStrategy}>
                <tbody style={{ backgroundColor: 'var(--card)' }}>
                  {filteredData.length === 0 ? (
                    <tr>
                      <td 
                        colSpan={table.columns.length} 
                        className="px-3 py-8 text-center text-xs"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        {t('simulator.noData')}
                      </td>
                    </tr>
                  ) : (
                    filteredData.map(({ row, index: originalIndex }) => (
                      <SortableTableRow
                        key={originalIndex}
                        rowId={String(originalIndex)}
                        row={row}
                        isSelected={selectedRowKey === getRowKey(row, originalIndex)}
                        isClickable={Boolean(onRowClick)}
                        canDrag={canReorderRows}
                        columns={table.columns}
                        tables={tables}
                        sampleDataByTableId={sampleDataByTableId}
                        onClick={() => {
                          if (!onRowClick) return;
                          onRowClick(row, getRowKey(row, originalIndex), originalIndex);
                        }}
                      />
                    ))
                  )}
                </tbody>
              </SortableContext>
            </table>
          </div>
        </div>
      </DndContext>
    </DndContext>
  );
}

function SortableTableRow(props: {
  rowId: string;
  row: Record<string, unknown>;
  isSelected: boolean;
  isClickable: boolean;
  canDrag: boolean;
  columns: Table['columns'];
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  onClick: () => void;
}) {
  const { rowId, row, isSelected, isClickable, canDrag, columns, tables, sampleDataByTableId, onClick } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: rowId,
    disabled: !canDrag,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <tr
      ref={setNodeRef}
      style={{
        ...style,
        borderColor: 'var(--border)',
        backgroundColor: isSelected ? 'var(--muted)' : undefined,
      }}
      onClick={onClick}
      className={`border-b ${isClickable ? 'cursor-pointer' : ''} ${isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''}`}
      {...attributes}
      {...listeners}
    >
      {columns.map((column) => (
        <td 
          key={column.id} 
          className="px-3 py-2 text-xs whitespace-nowrap"
          style={{ color: 'var(--text-secondary)' }}
        >
          {column.type === 'Ref'
            ? getRefDisplayLabel({
                tables,
                sampleDataByTableId,
                column,
                value: row[column.id],
              })
            : String(row[column.id] ?? '')}
        </td>
      ))}
    </tr>
  );
}

function SortableTableHeaderCell(props: {
  tableId: string;
  column: Table['columns'][number];
  columnIndex: number;
  totalColumns: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation();
  const { column, columnIndex, totalColumns, onMoveUp, onMoveDown } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } = useSortable({
    id: column.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <th
      ref={setNodeRef}
      style={style}
      className={`px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wider whitespace-nowrap ${
        isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''
      }`}
    >
      <div
        className="flex items-center gap-1 group"
        style={{ color: 'var(--text-muted)' }}
        tabIndex={0}
        onPointerDownCapture={(e) => {
          (e.currentTarget as HTMLDivElement).focus();
        }}
        {...attributes}
        {...listeners}
      >
        {column.isKey && (
          <svg className="w-3 h-3 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        )}
        {column.name}
        {column.constraints.required && <span className="text-red-400">*</span>}

        <span className="ml-1 hidden group-focus-within:inline-flex items-center gap-0.5 align-middle">
          <button
            type="button"
            data-reorder-button="true"
            className={`inline-flex items-center justify-center w-4 h-4 rounded border bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 ${
              columnIndex > 0 ? 'border-zinc-200' : 'border-zinc-100 opacity-30 cursor-not-allowed'
            }`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (columnIndex <= 0) return;
              onMoveUp();
            }}
            aria-label={t('common.moveUp', '上に移動')}
            title={t('common.moveUp', '上に移動')}
            disabled={columnIndex <= 0}
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 4a1 1 0 01.707.293l5 5a1 1 0 11-1.414 1.414L10 6.414 5.707 10.707A1 1 0 114.293 9.293l5-5A1 1 0 0110 4z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          <button
            type="button"
            data-reorder-button="true"
            className={`inline-flex items-center justify-center w-4 h-4 rounded border bg-white text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700 ${
              columnIndex < totalColumns - 1 ? 'border-zinc-200' : 'border-zinc-100 opacity-30 cursor-not-allowed'
            }`}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (columnIndex >= totalColumns - 1) return;
              onMoveDown();
            }}
            aria-label={t('common.moveDown', '下に移動')}
            title={t('common.moveDown', '下に移動')}
            disabled={columnIndex >= totalColumns - 1}
          >
            <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 16a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 13.586l4.293-4.293a1 1 0 111.414 1.414l-5 5A1 1 0 0110 16z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </span>
      </div>
      <div className="text-zinc-400 font-normal normal-case text-[9px]">{t(`columnTypes.${column.type}`)}</div>
    </th>
  );
}
