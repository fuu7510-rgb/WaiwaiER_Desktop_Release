import { useTranslation } from 'react-i18next';
import { useEffect, useMemo, useState } from 'react';
import { useERStore } from '../../stores';
import { Button } from '../common';
import { TableView } from './TableView';
import { TABLE_BG_COLOR_CLASSES } from '../../lib/constants';
import { formatValue } from '../../lib';
import type { Column } from '../../types';
import { Select } from '../common/Select';
import { getRefDisplayLabel, getRowLabel } from './recordLabel';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function getInputType(column: Column): string {
  switch (column.type) {
    case 'Number':
    case 'Decimal':
    case 'Progress':
      return 'number';
    case 'Date':
      return 'date';
    case 'DateTime':
      return 'datetime-local';
    case 'Time':
      return 'time';
    case 'Email':
      return 'email';
    case 'Phone':
      return 'tel';
    case 'Url':
      return 'url';
    case 'Color':
      return 'color';
    default:
      return 'text';
  }
}

function parseEnumList(value: unknown): Set<string> {
  if (Array.isArray(value)) {
    return new Set(value.map(String).map((s) => s.trim()).filter(Boolean));
  }
  const s = String(value ?? '').trim();
  if (!s) return new Set();
  return new Set(
    s
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)
  );
}

function formatEnumList(values: Set<string>): string {
  return Array.from(values.values()).join(', ');
}

export function Simulator() {
  const { t } = useTranslation();
  const {
    tables,
    selectedTableId,
    selectTable,
    sampleDataByTableId,
    ensureSampleData,
    updateSampleRow,
    appendSampleRow,
    deleteSampleRow,
    deletedSampleRowStack,
    undoDeleteSampleRow,
    reorderSampleRows,
    reorderTables,
  } = useERStore();
    const lastDeletedSampleRow =
      deletedSampleRowStack.length > 0 ? deletedSampleRowStack[deletedSampleRowStack.length - 1] : null;
  const [selectedRow, setSelectedRow] = useState<Record<string, unknown> | null>(null);
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [draftRow, setDraftRow] = useState<Record<string, unknown> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );
  
  const selectedTable = tables.find((t) => t.id === selectedTableId) || tables[0];

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      setSelectedRow(null);
      setSelectedRowKey(null);
      setSelectedRowIndex(null);
      setIsEditing(false);
      setDraftRow(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [selectedTableId]);

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      ensureSampleData();
    });
    return () => cancelAnimationFrame(raf);
  }, [ensureSampleData, tables]);

  const tableRows = selectedTable?.id ? sampleDataByTableId[selectedTable.id] ?? [] : [];

  const selectedTableKeyColumnId = useMemo(() => {
    return selectedTable?.columns.find((c) => c.isKey)?.id ?? selectedTable?.columns[0]?.id;
  }, [selectedTable]);

  const makeSelectedRowKey = (row: Record<string, unknown>, rowIndex: number): string => {
    const keyValue = selectedTableKeyColumnId ? row[selectedTableKeyColumnId] : undefined;
    const keyString = String(keyValue ?? '').trim();
    return keyString ? `${selectedTableKeyColumnId}:${keyString}` : `row:${rowIndex}`;
  };

  if (!selectedTable) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-400 text-xs">
        <p>{t('editor.noTables')}</p>
      </div>
    );
  }

  const handleTableDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (!activeId || !overId || activeId === overId) return;
    reorderTables(activeId, overId);
  };

  return (
    <div className="flex-1 flex h-full bg-zinc-50 overflow-hidden">
      {/* AppSheet風: 左ナビ */}
      <aside className="w-[280px] bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
        <div className="px-3 py-2 border-b border-zinc-100">
          <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
            {t('simulator.title')}
          </div>
        </div>

        {/* Views (1 table = 1 view) */}
        <div className="px-2 pb-2">
          <div className="px-2 pb-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
            VIEWS
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          {tables.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-zinc-400">
              {t('common.noResults', '該当なし')}
            </div>
          ) : (
            <DndContext sensors={sensors} onDragEnd={handleTableDragEnd}>
              <SortableContext items={tables.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-zinc-100">
                  {tables.map((table, index) => {
                    const isSelected = table.id === selectedTable.id;
                    const canMoveUp = index > 0;
                    const canMoveDown = index >= 0 && index < tables.length - 1;
                    return (
                      <SortableSimulatorTableNavItem
                        key={table.id}
                        table={table}
                        isSelected={isSelected}
                        canMoveUp={canMoveUp}
                        canMoveDown={canMoveDown}
                        onSelect={() => selectTable(table.id)}
                        onMoveUp={() => {
                          if (!canMoveUp) return;
                          const overId = tables[index - 1]?.id;
                          if (!overId) return;
                          reorderTables(table.id, overId);
                        }}
                        onMoveDown={() => {
                          if (!canMoveDown) return;
                          const overId = tables[index + 1]?.id;
                          if (!overId) return;
                          reorderTables(table.id, overId);
                        }}
                      />
                    );
                  })}
                </ul>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </aside>

      {/* AppSheet風: メイン */}
      <section className="flex-1 flex flex-col overflow-hidden">
        <div className="bg-white border-b border-zinc-200 px-3 py-2 flex items-center gap-2">
          <Button
            variant="secondary"
            size="md"
            onClick={() => {
              if (!selectedTable?.id) return;
              appendSampleRow(selectedTable.id);
            }}
            disabled={!selectedTable?.id || tableRows.length >= 100}
            title={tableRows.length >= 100 ? '最大100行です' : undefined}
          >
            {t('simulator.addRow', '＋追加')}
          </Button>
        </div>

        {/* タイトル行（AppSheetのサブヘッダ風） */}
        <div className="bg-zinc-50 border-b border-zinc-200 px-3 py-2 flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-medium text-zinc-800 truncate">{selectedTable.name}</h2>
            <p className="text-[10px] text-zinc-400">
              {t('simulator.views.table')}
            </p>
          </div>

          {lastDeletedSampleRow && (
            <div className="shrink-0 flex items-center gap-2">
              <span className="hidden sm:inline text-[10px] text-zinc-400">
                削除しました
                {(() => {
                  const tbl = tables.find((tb) => tb.id === lastDeletedSampleRow.tableId);
                  return tbl ? `（${tbl.name}）` : '';
                })()}
              </span>
              <Button variant="ghost" size="sm" type="button" onClick={() => undoDeleteSampleRow()}>
                取り消し
              </Button>
            </div>
          )}
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <TableView
              table={selectedTable}
              tables={tables}
              sampleDataByTableId={sampleDataByTableId}
              data={tableRows}
              selectedRowKey={selectedRowKey}
              onReorderRows={(fromIndex, toIndex) => {
                if (!selectedTable?.id) return;
                reorderSampleRows(selectedTable.id, fromIndex, toIndex);

                // 選択中行はインデックス基準なので一旦リセット（Keyがある場合は後で選び直せる）
                setSelectedRow(null);
                setSelectedRowKey(null);
                setSelectedRowIndex(null);
                setIsEditing(false);
                setDraftRow(null);
              }}
              onRowClick={(row, rowKey, rowIndex) => {
                setSelectedRow(row);
                setSelectedRowKey(rowKey);
                setSelectedRowIndex(rowIndex);
                setIsEditing(false);
                setDraftRow(null);
              }}
            />
          </div>

          {selectedRow && (
            <div className="w-[380px] border-l border-zinc-200 bg-white overflow-auto">
              <div
                className={`px-4 py-3 text-white ${
                  TABLE_BG_COLOR_CLASSES[selectedTable.color || '#6366f1'] || 'bg-indigo-500'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium truncate">
                      {(() => {
                        return (
                          getRowLabel(selectedTable, selectedRow, { fallback: selectedTable.name }) ||
                          selectedTable.name
                        );
                      })()}
                    </h3>
                    <p className="text-[10px] opacity-75 truncate">{selectedTable.name}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    {!isEditing ? (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setIsEditing(true);
                            setDraftRow({ ...selectedRow });
                          }}
                        >
                          {t('common.edit', '編集')}
                        </Button>

                        <Button
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            if (!selectedTable.id) return;
                            if (selectedRowIndex === null) return;
                            deleteSampleRow(selectedTable.id, selectedRowIndex);
                            setSelectedRow(null);
                            setSelectedRowKey(null);
                            setSelectedRowIndex(null);
                            setIsEditing(false);
                            setDraftRow(null);
                          }}
                        >
                          {t('common.delete', '削除')}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setIsEditing(false);
                            setDraftRow(null);
                          }}
                        >
                          {t('common.cancel', 'キャンセル')}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            if (!selectedTable.id) return;
                            if (selectedRowIndex === null) return;
                            if (!draftRow) return;
                            updateSampleRow(selectedTable.id, selectedRowIndex, draftRow);
                            setSelectedRow(draftRow);
                            setSelectedRowKey(makeSelectedRowKey(draftRow, selectedRowIndex));
                            setIsEditing(false);
                            setDraftRow(null);
                          }}
                        >
                          {t('common.save', '保存')}
                        </Button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRow(null);
                        setSelectedRowKey(null);
                        setSelectedRowIndex(null);
                        setIsEditing(false);
                        setDraftRow(null);
                      }}
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

              <div className="divide-y divide-zinc-100">
                {selectedTable.columns.map((column) => (
                  <div key={column.id} className="px-4 py-2.5 flex items-start gap-3">
                    <div className="w-[120px] shrink-0">
                      <label className="flex items-center text-[10px] font-medium text-zinc-400">
                        {column.isKey && (
                          <svg className="w-2.5 h-2.5 text-amber-500 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                          </svg>
                        )}
                        <span className="truncate">{column.name}</span>
                        {column.constraints.required && <span className="text-red-400 ml-0.5">*</span>}
                      </label>
                      {column.description && (
                        <p className="mt-0.5 text-[9px] text-zinc-400 line-clamp-2">{column.description}</p>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 text-xs text-zinc-700 break-words">
                      {!isEditing ? (
                        column.type === 'Ref'
                          ? getRefDisplayLabel({
                              tables,
                              sampleDataByTableId,
                              column,
                              value: selectedRow[column.id],
                            })
                          : formatValue(selectedRow[column.id], column.type)
                      ) : (
                        (() => {
                          const currentValue = (draftRow ?? selectedRow)[column.id];

                          if (column.type === 'Yes/No') {
                            const checked =
                              currentValue === true ||
                              String(currentValue ?? '').toLowerCase() === 'yes' ||
                              String(currentValue ?? '').toLowerCase() === 'true' ||
                              String(currentValue ?? '').trim() === '1';
                            return (
                              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    const nextValue: unknown = e.target.checked ? 'Yes' : 'No';
                                    setDraftRow((prev) => ({
                                      ...(prev ?? { ...selectedRow }),
                                      [column.id]: nextValue,
                                    }));
                                  }}
                                  className="w-4 h-4 rounded border-zinc-300"
                                  aria-label={column.name}
                                  title={column.name}
                                />
                                <span className="text-xs text-zinc-600">{checked ? 'Yes' : 'No'}</span>
                              </label>
                            );
                          }

                          if (column.type === 'Enum') {
                            const options = column.constraints.enumValues ?? [];
                            return (
                              <Select
                                aria-label={column.name}
                                title={column.name}
                                value={String(currentValue ?? '')}
                                onChange={(e) => {
                                  const nextValue: unknown = e.target.value;
                                  setDraftRow((prev) => ({
                                    ...(prev ?? { ...selectedRow }),
                                    [column.id]: nextValue,
                                  }));
                                }}
                                options={[
                                  { value: '', label: t('common.select', '選択') },
                                  ...options.map((opt) => ({ value: opt, label: opt })),
                                ]}
                              />
                            );
                          }

                          if (column.type === 'EnumList') {
                            const options = column.constraints.enumValues ?? [];
                            const selected = parseEnumList(currentValue);
                            return (
                              <div className="space-y-1">
                                {options.length === 0 ? (
                                  <div className="text-xs text-zinc-400">{t('common.noOptions', '選択肢なし')}</div>
                                ) : (
                                  options.map((opt) => {
                                    const isChecked = selected.has(opt);
                                    return (
                                      <label key={opt} className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={(e) => {
                                            const next = new Set(selected);
                                            if (e.target.checked) next.add(opt);
                                            else next.delete(opt);
                                            const nextValue: unknown = formatEnumList(next);
                                            setDraftRow((prev) => ({
                                              ...(prev ?? { ...selectedRow }),
                                              [column.id]: nextValue,
                                            }));
                                          }}
                                          className="w-4 h-4 rounded border-zinc-300"
                                          aria-label={`${column.name}:${opt}`}
                                          title={`${column.name}:${opt}`}
                                        />
                                        <span className="text-xs text-zinc-600">{opt}</span>
                                      </label>
                                    );
                                  })
                                )}
                              </div>
                            );
                          }

                          if (column.type === 'Ref') {
                            const refTableId = column.constraints.refTableId;
                            const refTable = refTableId ? tables.find((tb) => tb.id === refTableId) : undefined;
                            const refRows = refTableId ? sampleDataByTableId[refTableId] ?? [] : [];
                            const refKeyColId =
                              column.constraints.refColumnId ??
                              refTable?.columns.find((c) => c.isKey)?.id ??
                              refTable?.columns[0]?.id;

                            const options = refTable && refKeyColId
                              ? refRows.map((r) => {
                                  const v = String(r[refKeyColId] ?? '').trim();
                                  const label = getRowLabel(refTable, r, { fallback: v }) || v;
                                  return { value: v, label };
                                }).filter((opt) => opt.value)
                              : [];

                            return (
                              <Select
                                aria-label={column.name}
                                title={column.name}
                                value={String(currentValue ?? '')}
                                onChange={(e) => {
                                  const nextValue: unknown = e.target.value;
                                  setDraftRow((prev) => ({
                                    ...(prev ?? { ...selectedRow }),
                                    [column.id]: nextValue,
                                  }));
                                }}
                                options={[
                                  { value: '', label: refTable ? `${refTable.name} ${t('common.select', '選択')}` : t('common.select', '選択') },
                                  ...options,
                                ]}
                              />
                            );
                          }

                          // それ以外はシンプル入力（従来どおり）
                          return (
                            <input
                              type={getInputType(column)}
                              aria-label={column.name}
                              title={column.name}
                              value={String(currentValue ?? '')}
                              onChange={(e) => {
                                const nextValue: unknown = e.target.value;
                                setDraftRow((prev) => ({
                                  ...(prev ?? { ...selectedRow }),
                                  [column.id]: nextValue,
                                }));
                              }}
                              className="w-full text-xs px-2 py-1 border border-zinc-200 rounded bg-white"
                            />
                          );
                        })()
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

    </div>
  );
}

function SortableSimulatorTableNavItem(props: {
  table: { id: string; name: string; color?: string };
  isSelected: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onSelect: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const { t } = useTranslation();
  const { table, isSelected, canMoveUp, canMoveDown, onSelect, onMoveUp, onMoveDown } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isOver, isDragging } = useSortable({
    id: table.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : undefined,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <button
        onClick={onSelect}
        {...attributes}
        {...listeners}
        className={`w-full flex items-center gap-2 px-4 py-2.5 text-left text-xs transition-colors
          ${isSelected ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-50'}
          ${isOver ? 'ring-2 ring-indigo-200 ring-inset' : ''}
        `}
      >
        <span
          className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${TABLE_BG_COLOR_CLASSES[table.color || '#6366f1'] || 'bg-indigo-500'}`}
          aria-hidden="true"
        />
        <span className="truncate">{table.name}</span>

        <span className="ml-auto flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            data-reorder-button="true"
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-md border
              bg-white text-zinc-500 transition-colors
              hover:bg-zinc-50 hover:text-zinc-700
              ${canMoveUp ? 'border-zinc-200' : 'border-zinc-100 opacity-30 cursor-not-allowed hover:bg-white hover:text-zinc-500'}
            `}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!canMoveUp) return;
              onMoveUp();
            }}
            aria-label={t('common.moveUp', '上に移動')}
            title={t('common.moveUp', '上に移動')}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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
            className={`
              inline-flex items-center justify-center w-7 h-7 rounded-md border
              bg-white text-zinc-500 transition-colors
              hover:bg-zinc-50 hover:text-zinc-700
              ${canMoveDown ? 'border-zinc-200' : 'border-zinc-100 opacity-30 cursor-not-allowed hover:bg-white hover:text-zinc-500'}
            `}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!canMoveDown) return;
              onMoveDown();
            }}
            aria-label={t('common.moveDown', '下に移動')}
            title={t('common.moveDown', '下に移動')}
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M10 16a1 1 0 01-.707-.293l-5-5a1 1 0 011.414-1.414L10 13.586l4.293-4.293a1 1 0 111.414 1.414l-5 5A1 1 0 0110 16z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </span>
      </button>
    </li>
  );
}
