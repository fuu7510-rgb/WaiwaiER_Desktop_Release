/**
 * カラム操作スライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { Column } from '../../types';
import type { ColumnActions, SliceCreator } from './types';
import { useUIStore } from '../uiStore';
import {
  createDefaultColumn,
  syncSampleRowsToTableSchema,
  applyDummyValuesToSampleRows,
  normalizeRefValues,
  normalizeCommonColumns,
  applyCommonColumnsToTableInPlace,
  getDesiredAutoSampleRowCountFromDummyValues,
} from './helpers';
import { DEFAULT_SAMPLE_ROWS } from './types';

export type ColumnSlice = ColumnActions;

export const createColumnSlice: SliceCreator<ColumnSlice> = (set, get) => ({
  addColumn: (tableId, column) => {
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return null;

    const newColumn: Column = {
      ...createDefaultColumn(table.columns.length),
      ...column,
      id: uuidv4(),
    };

    set((state) => {
      const t = state.tables.find((t) => t.id === tableId);
      if (t) {
        t.columns.push(newColumn);
        t.updatedAt = new Date().toISOString();
        const synced = syncSampleRowsToTableSchema({ table: t, currentRows: state.sampleDataByTableId[tableId] });
        state.sampleDataByTableId = normalizeRefValues({ tables: state.tables, sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced } });
      }
    });
    get().saveHistory(`カラム「${newColumn.name}」を追加`);
    get().queueSaveToDB();
    return newColumn.id;
  },

  updateColumn: (tableId, columnId, updates) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        const column = table.columns.find((c) => c.id === columnId);
        if (column) {
          const prevType = column.type;
          const prevRefTableId = column.constraints.refTableId;
          const prevRefColumnId = column.constraints.refColumnId;
          const shouldApplyDummyValues = Object.prototype.hasOwnProperty.call(updates, 'dummyValues');
          const previousDummyValues = shouldApplyDummyValues
            ? (column.dummyValues ?? []).map((v) => String(v))
            : undefined;
          Object.assign(column, updates);

          // Ref から別型に変更された場合は、参照制約とリレーション線を自動で掃除する。
          const isRefNow = column.type === 'Ref';
          const refTableIdNow = column.constraints.refTableId;
          const refColumnIdNow = column.constraints.refColumnId;
          const shouldRemoveRelationsForThisColumn =
            (prevType === 'Ref' && !isRefNow) || (isRefNow && !refTableIdNow && !!prevRefTableId);

          // Ref の参照先（親テーブル/親カラム）が変更された場合は、既存の線を付け替える。
          const shouldRetargetRelationsForThisColumn =
            isRefNow &&
            !!refTableIdNow &&
            prevType === 'Ref' &&
            (!!prevRefTableId || !!prevRefColumnId) &&
            (prevRefTableId !== refTableIdNow || prevRefColumnId !== refColumnIdNow);

          if (shouldRetargetRelationsForThisColumn) {
            const sourceTable = state.tables.find((t) => t.id === refTableIdNow);
            const resolvedSourceColumnId =
              (refColumnIdNow && sourceTable?.columns.some((c) => c.id === refColumnIdNow)
                ? refColumnIdNow
                : sourceTable?.columns.find((c) => c.isKey)?.id ?? sourceTable?.columns[0]?.id) ??
              '';

            if (resolvedSourceColumnId) {
              for (let i = 0; i < state.relations.length; i++) {
                const r = state.relations[i];
                if (r.targetColumnId !== columnId) continue;
                r.sourceTableId = refTableIdNow;
                r.sourceColumnId = resolvedSourceColumnId;
                r.targetTableId = tableId;
                r.targetColumnId = columnId;
              }
            }
          }

          if (!isRefNow) {
            if (column.constraints.refTableId || column.constraints.refColumnId) {
              column.constraints = {
                ...column.constraints,
                refTableId: undefined,
                refColumnId: undefined,
              };
            }
          }

          if (shouldRemoveRelationsForThisColumn) {
            state.relations = state.relations.filter((r) => r.targetColumnId !== columnId);
          }

          table.updatedAt = new Date().toISOString();

          const currentRows = state.sampleDataByTableId[tableId];
          const desiredAutoCount = shouldApplyDummyValues
            ? getDesiredAutoSampleRowCountFromDummyValues(table)
            : null;
          const shouldAutoResizeRowCount =
            shouldApplyDummyValues &&
            desiredAutoCount !== null &&
            (currentRows?.length ?? 0) === DEFAULT_SAMPLE_ROWS &&
            desiredAutoCount !== DEFAULT_SAMPLE_ROWS;

          const synced = syncSampleRowsToTableSchema({
            table,
            currentRows,
            desiredRowCount: shouldAutoResizeRowCount ? desiredAutoCount : undefined,
          });
          const nextRows = shouldApplyDummyValues
            ? applyDummyValuesToSampleRows({ rows: synced, column, previousDummyValues })
            : synced;
          state.sampleDataByTableId = normalizeRefValues({
            tables: state.tables,
            sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: nextRows },
          });
        }
      }
    });
    get().saveHistory('カラムを更新');
    get().queueSaveToDB();
  },

  deleteColumn: (tableId, columnId) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        table.columns = table.columns.filter((c) => c.id !== columnId);
        table.updatedAt = new Date().toISOString();
        const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[tableId] });
        state.sampleDataByTableId = normalizeRefValues({ tables: state.tables, sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced } });

        // リレーションも削除
        state.relations = state.relations.filter(
          (r) => r.sourceColumnId !== columnId && r.targetColumnId !== columnId
        );

        if (state.selectedColumnId === columnId) {
          state.selectedColumnId = null;
        }
      }
    });
    get().saveHistory('カラムを削除');
    get().queueSaveToDB();
  },

  reorderColumn: (tableId, columnId, newOrder) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        const column = table.columns.find((c) => c.id === columnId);
        if (column) {
          const oldOrder = column.order;
          table.columns.forEach((c) => {
            if (c.id === columnId) {
              c.order = newOrder;
            } else if (oldOrder < newOrder) {
              if (c.order > oldOrder && c.order <= newOrder) {
                c.order--;
              }
            } else {
              if (c.order >= newOrder && c.order < oldOrder) {
                c.order++;
              }
            }
          });
          table.columns.sort((a, b) => a.order - b.order);
          table.updatedAt = new Date().toISOString();
          const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[tableId] });
          state.sampleDataByTableId = normalizeRefValues({ tables: state.tables, sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced } });
        }
      }
    });
    get().saveHistory('カラムの順序を変更');
    get().queueSaveToDB();
  },

  applyCommonColumnsToTable: (tableId, commonColumns) => {
    const defs = normalizeCommonColumns(commonColumns ?? useUIStore.getState().settings.commonColumns);
    if (defs.length === 0) return;

    let changed = false;
    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return;
      changed = applyCommonColumnsToTableInPlace(table, defs);
      if (!changed) return;
      const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[tableId] });
      state.sampleDataByTableId = normalizeRefValues({
        tables: state.tables,
        sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced },
      });
    });

    if (changed) {
      get().saveHistory('共通カラムを適用');
      get().queueSaveToDB();
    }
  },

  applyCommonColumnsToAllTables: (commonColumns) => {
    const commonDefs = normalizeCommonColumns(commonColumns);
    if (commonDefs.length === 0) return;

    let anyChanged = false;
    set((state) => {
      for (const table of state.tables) {
        const changed = applyCommonColumnsToTableInPlace(table, commonDefs);
        if (!changed) continue;
        anyChanged = true;
        const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[table.id] });
        state.sampleDataByTableId = normalizeRefValues({
          tables: state.tables,
          sampleDataByTableId: { ...state.sampleDataByTableId, [table.id]: synced },
        });
      }
    });

    if (anyChanged) {
      get().queueSaveToDB();
    }
  },
});
