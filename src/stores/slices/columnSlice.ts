/**
 * カラム操作スライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { Column, Table } from '../../types';
import type { ColumnActions, SliceCreator, ERState } from './types';
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

/**
 * 同期グループ内の他のテーブルにカラム変更を反映するヘルパー
 */
function syncColumnToGroup(
  state: ERState,
  sourceTable: Table,
  action: 'add' | 'update' | 'delete' | 'reorder',
  columnId: string,
  updates?: Partial<Column>,
  newColumn?: Column
) {
  if (!sourceTable.syncGroupId) return;

  const syncedTables = state.tables.filter(
    (t) => t.syncGroupId === sourceTable.syncGroupId && t.id !== sourceTable.id
  );
  if (syncedTables.length === 0) return;

  for (const syncedTable of syncedTables) {
    switch (action) {
      case 'add': {
        if (newColumn && !syncedTable.columns.some((c) => c.id === newColumn.id)) {
          syncedTable.columns.push({ ...newColumn });
          syncedTable.updatedAt = new Date().toISOString();
          const synced = syncSampleRowsToTableSchema({
            table: syncedTable,
            currentRows: state.sampleDataByTableId[syncedTable.id],
          });
          state.sampleDataByTableId = normalizeRefValues({
            tables: state.tables,
            sampleDataByTableId: { ...state.sampleDataByTableId, [syncedTable.id]: synced },
          });
        }
        break;
      }
      case 'update': {
        const col = syncedTable.columns.find((c) => c.id === columnId);
        if (col && updates) {
          Object.assign(col, updates);
          syncedTable.updatedAt = new Date().toISOString();
          const synced = syncSampleRowsToTableSchema({
            table: syncedTable,
            currentRows: state.sampleDataByTableId[syncedTable.id],
          });
          state.sampleDataByTableId = normalizeRefValues({
            tables: state.tables,
            sampleDataByTableId: { ...state.sampleDataByTableId, [syncedTable.id]: synced },
          });
        }
        break;
      }
      case 'delete': {
        syncedTable.columns = syncedTable.columns.filter((c) => c.id !== columnId);
        syncedTable.updatedAt = new Date().toISOString();
        const synced = syncSampleRowsToTableSchema({
          table: syncedTable,
          currentRows: state.sampleDataByTableId[syncedTable.id],
        });
        state.sampleDataByTableId = normalizeRefValues({
          tables: state.tables,
          sampleDataByTableId: { ...state.sampleDataByTableId, [syncedTable.id]: synced },
        });
        // 同期グループ内のテーブルに関連するリレーションも削除
        state.relations = state.relations.filter(
          (r) =>
            !(
              (r.sourceTableId === syncedTable.id || r.targetTableId === syncedTable.id) &&
              (r.sourceColumnId === columnId || r.targetColumnId === columnId)
            )
        );
        break;
      }
      case 'reorder': {
        // ソーステーブルのカラム順序をコピー
        const orderMap = new Map(sourceTable.columns.map((c) => [c.id, c.order]));
        for (const col of syncedTable.columns) {
          const order = orderMap.get(col.id);
          if (order !== undefined) {
            col.order = order;
          }
        }
        syncedTable.columns.sort((a, b) => a.order - b.order);
        syncedTable.updatedAt = new Date().toISOString();
        break;
      }
    }
  }
}

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

        // 同期グループ内の他のテーブルにもカラムを追加
        syncColumnToGroup(state, t, 'add', newColumn.id, undefined, newColumn);
      }
    });
    get().saveHistory(`カラム「${newColumn.name}」を追加`);
    get().queueSaveToDB();
    return newColumn.id;
  },

  duplicateColumn: (tableId, columnId) => {
    const tableSnapshot = get().tables.find((t) => t.id === tableId);
    const sourceSnapshot = tableSnapshot?.columns.find((c) => c.id === columnId);
    if (!tableSnapshot || !sourceSnapshot) return null;

    const existingNames = new Set(
      tableSnapshot.columns.map((c) => String(c.name ?? '').trim()).filter((v) => v.length > 0)
    );
    const baseName = `${sourceSnapshot.name}_copy`;
    let nextName = baseName;
    let suffix = 2;
    while (existingNames.has(nextName)) {
      nextName = `${baseName}${suffix}`;
      suffix++;
    }

    const newId = uuidv4();

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) return;
      const source = table.columns.find((c) => c.id === columnId);
      if (!source) return;

      // orderがズレている/重複している場合があるので、まず表示順に揃える。
      table.columns.sort((a, b) => a.order - b.order);
      for (let i = 0; i < table.columns.length; i++) {
        table.columns[i].order = i;
      }

      const insertIndex = Math.min(Math.max(source.order + 1, 0), table.columns.length);
      for (const c of table.columns) {
        if (c.order >= insertIndex) c.order++;
      }

      const duplicated: Column = {
        ...source,
        id: newId,
        name: nextName,
        constraints: { ...source.constraints },
        appSheet: source.appSheet ? { ...(source.appSheet as Record<string, unknown>) } : undefined,
        dummyValues: source.dummyValues ? [...source.dummyValues] : undefined,
        order: insertIndex,
      };

      table.columns.push(duplicated);
      table.columns.sort((a, b) => a.order - b.order);
      for (let i = 0; i < table.columns.length; i++) {
        table.columns[i].order = i;
      }

      table.updatedAt = new Date().toISOString();
      const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[tableId] });
      state.sampleDataByTableId = normalizeRefValues({
        tables: state.tables,
        sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced },
      });
    });

    get().saveHistory(`カラム「${sourceSnapshot.name}」をコピー`);
    get().queueSaveToDB();
    return newId;
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

          // 同期グループ内の他のテーブルにも変更を反映（Ref制約は除く、各テーブルで独立）
          const syncUpdates = { ...updates };
          // Ref型の参照先は同期テーブルごとに異なる可能性があるため、constraintsから除外
          if (syncUpdates.constraints) {
            syncUpdates.constraints = {
              ...syncUpdates.constraints,
              refTableId: undefined,
              refColumnId: undefined,
            };
          }
          syncColumnToGroup(state, table, 'update', columnId, syncUpdates);
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
        const selectedRelationId = state.selectedRelationId;

        // 同期グループ内の他のテーブルからもカラムを削除
        syncColumnToGroup(state, table, 'delete', columnId);

        table.columns = table.columns.filter((c) => c.id !== columnId);
        table.updatedAt = new Date().toISOString();
        const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[tableId] });
        state.sampleDataByTableId = normalizeRefValues({ tables: state.tables, sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced } });

        // リレーションも削除
        const nextRelations = state.relations.filter((r) => r.sourceColumnId !== columnId && r.targetColumnId !== columnId);
        if (selectedRelationId && nextRelations.length !== state.relations.length) {
          const stillExists = nextRelations.some((r) => r.id === selectedRelationId);
          if (!stillExists) state.selectedRelationId = null;
        }
        state.relations = nextRelations;

        if (state.selectedColumnId === columnId) {
          state.selectedColumnId = null;
        }
      }
    });
    get().saveHistory('カラムを削除');
    // 削除は即座に保存（遅延なし）
    void get().saveToDB();
  },

  reorderColumn: (tableId, columnId, newOrder) => {
    const tableSnapshot = get().tables.find((t) => t.id === tableId);
    const columnSnapshot = tableSnapshot?.columns.find((c) => c.id === columnId);
    if (!tableSnapshot || !columnSnapshot) return;
    const maxOrder = Math.max(0, tableSnapshot.columns.length - 1);
    const normalizedNewOrder = Math.max(0, Math.min(Number(newOrder), maxOrder));
    if (!Number.isFinite(normalizedNewOrder)) return;

    // 同一位置への移動は何もしない（履歴/DB保存も発生させない）
    if (columnSnapshot.order === normalizedNewOrder) return;

    set((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (table) {
        const column = table.columns.find((c) => c.id === columnId);
        if (column) {
          // orderがズレている/重複している場合があるので、まず表示順に揃えてから処理する。
          table.columns.sort((a, b) => a.order - b.order);
          for (let i = 0; i < table.columns.length; i++) {
            table.columns[i].order = i;
          }

          const max = Math.max(0, table.columns.length - 1);
          const nextOrder = Math.max(0, Math.min(Number(newOrder), max));
          if (!Number.isFinite(nextOrder)) return;

          const oldOrder = column.order;
          if (oldOrder === nextOrder) return;

          table.columns.forEach((c) => {
            if (c.id === columnId) {
              c.order = nextOrder;
            } else if (oldOrder < nextOrder) {
              if (c.order > oldOrder && c.order <= nextOrder) {
                c.order--;
              }
            } else {
              if (c.order >= nextOrder && c.order < oldOrder) {
                c.order++;
              }
            }
          });
          table.columns.sort((a, b) => a.order - b.order);

          // 最終的に必ず0..n-1へ正規化する（UI/D&Dがindex基準で安定する）
          for (let i = 0; i < table.columns.length; i++) {
            table.columns[i].order = i;
          }

          table.updatedAt = new Date().toISOString();
          const synced = syncSampleRowsToTableSchema({ table, currentRows: state.sampleDataByTableId[tableId] });
          state.sampleDataByTableId = normalizeRefValues({ tables: state.tables, sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced } });

          // 同期グループ内の他のテーブルにもカラム順序を反映
          syncColumnToGroup(state, table, 'reorder', columnId);
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
