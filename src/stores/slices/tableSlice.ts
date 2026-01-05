/**
 * テーブル操作スライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { TableState, TableActions, SliceCreator } from './types';
import { useUIStore } from '../uiStore';
import {
  createDefaultTable,
  syncSampleRowsToTableSchema,
  normalizeCommonColumns,
  arrayMove,
} from './helpers';

export type TableSlice = TableState & TableActions;

export const createTableSlice: SliceCreator<TableSlice> = (set, get) => ({
  tables: [],

  addTable: (name, position = { x: 100, y: 100 }, options) => {
    const table = createDefaultTable(name, position, options?.keyColumnName);

    // ユーザー設定「共通カラム」を末尾に自動挿入
    const includeCommonColumns = options?.includeCommonColumns ?? true;
    if (includeCommonColumns) {
      const commonDefs = normalizeCommonColumns(useUIStore.getState().settings.commonColumns);
      if (commonDefs.length > 0) {
        for (const def of commonDefs) {
          const exists = table.columns.some((c) => String(c.name ?? '').trim() === def.name);
          if (exists) continue;
          table.columns.push({
            id: uuidv4(),
            name: def.name,
            type: def.type,
            isKey: false,
            isLabel: false,
            constraints: def.constraints ?? {},
            appSheet: def.appSheet,
            order: table.columns.length,
          });
        }
      }
    }
    set((state) => {
      state.tables.push(table);
      state.sampleDataByTableId[table.id] = syncSampleRowsToTableSchema({ table, currentRows: undefined });
    });
    get().saveHistory(`テーブル「${name}」を追加`);
    get().queueSaveToDB();
    return table.id;
  },

  updateTable: (id, updates) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === id);
      if (table) {
        Object.assign(table, updates, { updatedAt: new Date().toISOString() });
      }
    });
    get().saveHistory('テーブルを更新');
    get().queueSaveToDB();
  },

  deleteTable: (id) => {
    const table = get().tables.find((t) => t.id === id);
    set((state) => {
      const selectedRelation = state.selectedRelationId
        ? state.relations.find((r) => r.id === state.selectedRelationId)
        : null;

      state.tables = state.tables.filter((t) => t.id !== id);
      delete state.sampleDataByTableId[id];
      state.relations = state.relations.filter(
        (r) => r.sourceTableId !== id && r.targetTableId !== id
      );
      if (selectedRelation && (selectedRelation.sourceTableId === id || selectedRelation.targetTableId === id)) {
        state.selectedRelationId = null;
      }
      if (state.selectedTableId === id) {
        state.selectedTableId = null;
        state.selectedColumnId = null;
      }
    });
    if (table) {
      get().saveHistory(`テーブル「${table.name}」を削除`);
    }
    get().queueSaveToDB();
  },

  moveTable: (id, position) => {
    set((state) => {
      const table = state.tables.find((t) => t.id === id);
      if (table) {
        table.position = position;
      }
    });
    get().saveHistory('テーブルを移動');
    get().queueSaveToDB();
  },

  reorderTables: (activeTableId, overTableId) => {
    if (activeTableId === overTableId) return;
    set((state) => {
      const oldIndex = state.tables.findIndex((t) => t.id === activeTableId);
      const newIndex = state.tables.findIndex((t) => t.id === overTableId);
      if (oldIndex === -1 || newIndex === -1) return;
      state.tables = arrayMove(state.tables, oldIndex, newIndex);
    });
    get().saveHistory('テーブルの順序を変更');
    get().queueSaveToDB();
  },

  duplicateTable: (id) => {
    const source = get().tables.find((t) => t.id === id);
    if (!source) return null;

    const newTable = createDefaultTable(
      `${source.name}_copy`,
      { x: source.position.x + 50, y: source.position.y + 50 }
    );
    newTable.columns = source.columns.map((col) => ({
      ...col,
      id: uuidv4(),
    }));
    newTable.color = source.color;
    newTable.description = source.description;
    newTable.exportTargets = source.exportTargets ? [...source.exportTargets] : undefined;

    set((state) => {
      state.tables.push(newTable);
      state.sampleDataByTableId[newTable.id] = syncSampleRowsToTableSchema({ table: newTable, currentRows: undefined });
    });
    get().saveHistory(`テーブル「${source.name}」を複製`);
    get().queueSaveToDB();
    return newTable.id;
  },
});
