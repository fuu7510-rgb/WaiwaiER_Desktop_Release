import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useERStore } from '../../stores';
import { Button } from '../common';
import { TableView } from './TableView';
import type { Table } from '../../types';
import { computeRowWithAppFormulas, getAppFormulaString } from '../../lib/appsheet/expression';
import { SimulatorNavPanel } from './SimulatorNavPanel';
import { SimulatorDetailPanel } from './SimulatorDetailPanel';
import type { RelatedSection } from './SimulatorRelatedRecords';

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
  const [pendingSelection, setPendingSelection] = useState<{
    tableId: string;
    rowIndex: number;
    startEditing?: boolean;
  } | null>(null);

  const selectedTable = tables.find((tb) => tb.id === selectedTableId) || tables[0];

  const getTableKeyColumnId = useCallback(
    (table: Table | undefined): string | undefined => {
      if (!table) return undefined;
      return table.columns.find((c) => c.isKey)?.id ?? table.columns[0]?.id;
    },
    []
  );

  const makeRowKeyForTable = useCallback(
    (table: Table | undefined, row: Record<string, unknown>, rowIndex: number): string => {
      const keyColumnId = getTableKeyColumnId(table);
      const keyValue = keyColumnId ? row[keyColumnId] : undefined;
      const keyString = String(keyValue ?? '').trim();
      return keyString && keyColumnId ? `${keyColumnId}:${keyString}` : `row:${rowIndex}`;
    },
    [getTableKeyColumnId]
  );

  const toComparableString = (value: unknown): string => String(value ?? '').trim();

  // テーブル切り替え時に選択をリセット
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

  // pendingSelection 処理
  useEffect(() => {
    if (!pendingSelection) return;
    if (!selectedTable?.id) return;
    if (pendingSelection.tableId !== selectedTable.id) return;
    const raf = requestAnimationFrame(() => {
      const rows = sampleDataByTableId[selectedTable.id] ?? [];
      const row = rows[pendingSelection.rowIndex];
      if (!row) {
        setPendingSelection(null);
        return;
      }

      setSelectedRow(row);
      setSelectedRowIndex(pendingSelection.rowIndex);
      setSelectedRowKey(makeRowKeyForTable(selectedTable, row, pendingSelection.rowIndex));
      if (pendingSelection.startEditing) {
        setIsEditing(true);
        setDraftRow({ ...row });
      } else {
        setIsEditing(false);
        setDraftRow(null);
      }
      setPendingSelection(null);
    });

    return () => cancelAnimationFrame(raf);
  }, [makeRowKeyForTable, pendingSelection, selectedTable, sampleDataByTableId]);

  // サンプルデータの初期化
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      ensureSampleData();
    });
    return () => cancelAnimationFrame(raf);
  }, [ensureSampleData, tables]);

  // 生データ (AppFormula未計算)
  const tableRows = useMemo(() => {
    if (!selectedTableId) return [];
    return sampleDataByTableId[selectedTableId] ?? [];
  }, [sampleDataByTableId, selectedTableId]);

  // 計算済みデータ (AppFormula適用後)
  const computedTableRows = useMemo(() => {
    if (!selectedTable?.id) return [];
    const now = new Date();
    return tableRows.map((row) =>
      computeRowWithAppFormulas({
        tables,
        sampleDataByTableId,
        table: selectedTable,
        row,
        now,
      })
    );
  }, [tableRows, sampleDataByTableId, selectedTable, tables]);

  const computedSelectedRow = useMemo(() => {
    if (!selectedTable || !selectedRow) return null;
    return computeRowWithAppFormulas({
      tables,
      sampleDataByTableId,
      table: selectedTable,
      row: selectedRow,
      now: new Date(),
    });
  }, [sampleDataByTableId, selectedRow, selectedTable, tables]);

  const computedDraftRow = useMemo(() => {
    if (!selectedTable || !selectedRow) return null;
    if (!draftRow) return null;
    return computeRowWithAppFormulas({
      tables,
      sampleDataByTableId,
      table: selectedTable,
      row: draftRow,
      now: new Date(),
    });
  }, [draftRow, sampleDataByTableId, selectedRow, selectedTable, tables]);

  const selectedTableKeyColumnId = useMemo(() => {
    return selectedTable?.columns.find((c) => c.isKey)?.id ?? selectedTable?.columns[0]?.id;
  }, [selectedTable]);

  const makeSelectedRowKey = (row: Record<string, unknown>, rowIndex: number): string => {
    const keyValue = selectedTableKeyColumnId ? row[selectedTableKeyColumnId] : undefined;
    const keyString = String(keyValue ?? '').trim();
    return keyString ? `${selectedTableKeyColumnId}:${keyString}` : `row:${rowIndex}`;
  };

  // 関連セクションの計算
  const relatedSections: RelatedSection[] = useMemo(() => {
    if (!selectedTable?.id) return [];

    const sections: RelatedSection[] = [];

    const parent = selectedTable;
    const parentRow = selectedRow;
    if (!parentRow) return sections;

    for (const childTable of tables) {
      if (childTable.id === parent.id) continue;

      const refColumns = childTable.columns.filter(
        (c) => c.type === 'Ref' && c.constraints.refTableId === parent.id
      );

      for (const refColumn of refColumns) {
        const parentRefColumnId =
          refColumn.constraints.refColumnId ?? getTableKeyColumnId(parent) ?? parent.columns[0]?.id;
        const parentValue = parentRefColumnId ? parentRow[parentRefColumnId] : undefined;
        const parentKey = toComparableString(parentValue);

        const childRows = sampleDataByTableId[childTable.id] ?? [];
        const rows = childRows
          .map((row, rowIndex) => ({ row, rowIndex }))
          .filter(({ row }) => {
            const childValue = row[refColumn.id];
            const childKey = toComparableString(childValue);
            if (!parentKey || !childKey) return false;
            return childKey === parentKey;
          });

        sections.push({ childTable, refColumn, rows });
      }
    }

    return sections;
  }, [getTableKeyColumnId, sampleDataByTableId, selectedRow, selectedTable, tables]);

  // 関連行追加ハンドラー
  const handleAddRelatedRow = useCallback(
    (section: RelatedSection) => {
      if (!selectedRow) return;
      const parent = selectedTable;
      if (!parent?.id) return;

      const childTableId = section.childTable.id;
      const existingRows = sampleDataByTableId[childTableId] ?? [];
      const newRowIndex = existingRows.length;

      const parentRefColumnId =
        section.refColumn.constraints.refColumnId ?? getTableKeyColumnId(parent) ?? parent.columns[0]?.id;
      const parentValue = parentRefColumnId ? selectedRow[parentRefColumnId] : undefined;
      const parentKey = toComparableString(parentValue);

      appendSampleRow(childTableId);
      if (parentKey) {
        updateSampleRow(childTableId, newRowIndex, {
          ...(existingRows[newRowIndex] ?? {}),
          [section.refColumn.id]: parentKey,
        });
      }

      if (childTableId === selectedTable.id) {
        const rowsAfter = sampleDataByTableId[childTableId] ?? [];
        const row = rowsAfter[newRowIndex] ?? {};
        const patchedRow = parentKey ? { ...row, [section.refColumn.id]: parentKey } : row;
        setSelectedRow(patchedRow);
        setSelectedRowIndex(newRowIndex);
        setSelectedRowKey(makeRowKeyForTable(section.childTable, patchedRow, newRowIndex));
        setIsEditing(true);
        setDraftRow({ ...patchedRow });
        return;
      }

      setPendingSelection({ tableId: childTableId, rowIndex: newRowIndex, startEditing: true });
      selectTable(childTableId);
    },
    [
      appendSampleRow,
      getTableKeyColumnId,
      makeRowKeyForTable,
      sampleDataByTableId,
      selectTable,
      selectedRow,
      selectedTable,
      updateSampleRow,
    ]
  );

  // 関連行選択ハンドラー
  const handleSelectRelatedRow = useCallback(
    (tableId: string, row: Record<string, unknown>, rowIndex: number) => {
      if (tableId === selectedTable?.id) {
        setSelectedRow(row);
        setSelectedRowIndex(rowIndex);
        setSelectedRowKey(makeRowKeyForTable(selectedTable, row, rowIndex));
        setIsEditing(false);
        setDraftRow(null);
        return;
      }
      setPendingSelection({ tableId, rowIndex });
      selectTable(tableId);
    },
    [makeRowKeyForTable, selectTable, selectedTable]
  );

  // 詳細パネルのアクションハンドラー
  const handleEdit = useCallback(() => {
    setIsEditing(true);
    setDraftRow({ ...selectedRow });
  }, [selectedRow]);

  const handleSave = useCallback(() => {
    if (!selectedTable?.id) return;
    if (selectedRowIndex === null) return;
    if (!draftRow) return;

    const appFormulaColumnIds = new Set(
      selectedTable.columns.filter((c) => getAppFormulaString(c).length > 0).map((c) => c.id)
    );
    const sanitizedDraft: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(draftRow)) {
      if (appFormulaColumnIds.has(k)) continue;
      sanitizedDraft[k] = v;
    }

    updateSampleRow(selectedTable.id, selectedRowIndex, sanitizedDraft);
    setSelectedRow(sanitizedDraft);
    setSelectedRowKey(makeSelectedRowKey(sanitizedDraft, selectedRowIndex));
    setIsEditing(false);
    setDraftRow(null);
  }, [draftRow, selectedRowIndex, selectedTable, updateSampleRow, makeSelectedRowKey]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraftRow(null);
  }, []);

  const handleDelete = useCallback(() => {
    if (!selectedTable?.id) return;
    if (selectedRowIndex === null) return;
    deleteSampleRow(selectedTable.id, selectedRowIndex);
    setSelectedRow(null);
    setSelectedRowKey(null);
    setSelectedRowIndex(null);
    setIsEditing(false);
    setDraftRow(null);
  }, [deleteSampleRow, selectedRowIndex, selectedTable?.id]);

  const handleClose = useCallback(() => {
    setSelectedRow(null);
    setSelectedRowKey(null);
    setSelectedRowIndex(null);
    setIsEditing(false);
    setDraftRow(null);
  }, []);

  const handleDraftChange = useCallback(
    (updater: (prev: Record<string, unknown> | null) => Record<string, unknown>) => {
      setDraftRow(updater);
    },
    []
  );

  if (!selectedTable) {
    return (
      <div
        className="flex-1 flex items-center justify-center text-xs"
        style={{ color: 'var(--text-muted)' }}
      >
        <p>{t('editor.noTables')}</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-full overflow-hidden" style={{ backgroundColor: 'var(--background)' }}>
      {/* 左ナビゲーションパネル */}
      <SimulatorNavPanel
        tables={tables}
        selectedTableId={selectedTable.id}
        onSelectTable={selectTable}
        onReorderTables={reorderTables}
      />

      {/* メインコンテンツ */}
      <section className="flex-1 flex flex-col overflow-hidden">
        {/* ツールバー */}
        <div
          className="border-b px-3 py-2 flex items-center gap-2"
          style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}
        >
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

        {/* サブヘッダー */}
        <div
          className="border-b px-3 py-2 flex items-center justify-between"
          style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}
        >
          <div className="min-w-0">
            <h2 className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
              {selectedTable.name}
            </h2>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {t('simulator.views.table')}
            </p>
          </div>

          {lastDeletedSampleRow && (
            <div className="shrink-0 flex items-center gap-2">
              <span className="hidden sm:inline text-[10px]" style={{ color: 'var(--text-muted)' }}>
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

        {/* テーブル表示と詳細パネル */}
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-hidden">
            <TableView
              table={selectedTable}
              tables={tables}
              sampleDataByTableId={sampleDataByTableId}
              data={computedTableRows}
              selectedRowKey={selectedRowKey}
              onReorderRows={(fromIndex, toIndex) => {
                if (!selectedTable?.id) return;
                reorderSampleRows(selectedTable.id, fromIndex, toIndex);

                // 選択中行はインデックス基準なので一旦リセット
                setSelectedRow(null);
                setSelectedRowKey(null);
                setSelectedRowIndex(null);
                setIsEditing(false);
                setDraftRow(null);
              }}
              onRowClick={(row, rowKey, rowIndex) => {
                const rawRow = tableRows[rowIndex] ?? row;
                setSelectedRow(rawRow);
                setSelectedRowKey(rowKey);
                setSelectedRowIndex(rowIndex);
                setIsEditing(false);
                setDraftRow(null);
              }}
            />
          </div>

          {selectedRow && selectedRowIndex !== null && (
            <SimulatorDetailPanel
              table={selectedTable}
              tables={tables}
              sampleDataByTableId={sampleDataByTableId}
              selectedRow={selectedRow}
              computedSelectedRow={computedSelectedRow}
              computedDraftRow={computedDraftRow}
              isEditing={isEditing}
              draftRow={draftRow}
              relatedSections={relatedSections}
              onEdit={handleEdit}
              onSave={handleSave}
              onCancel={handleCancel}
              onDelete={handleDelete}
              onClose={handleClose}
              onDraftChange={handleDraftChange}
              onAddRelatedRow={handleAddRelatedRow}
              onSelectRelatedRow={handleSelectRelatedRow}
            />
          )}
        </div>
      </section>
    </div>
  );
}
