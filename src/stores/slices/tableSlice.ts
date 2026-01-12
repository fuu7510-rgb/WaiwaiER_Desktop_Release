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
    const syncGroupId = table?.syncGroupId;
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

      // 同期グループに1つしか残らない場合、残りも同期解除
      if (syncGroupId) {
        const remainingSyncedTables = state.tables.filter((t) => t.syncGroupId === syncGroupId);
        if (remainingSyncedTables.length === 1) {
          remainingSyncedTables[0].syncGroupId = undefined;
          remainingSyncedTables[0].isSyncSource = undefined;
          remainingSyncedTables[0].updatedAt = new Date().toISOString();
        }
      }
    });
    if (table) {
      get().saveHistory(`テーブル「${table.name}」を削除`);
    }
    // 削除は即座に保存（遅延なし）
    void get().saveToDB();
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

  moveTables: (moves) => {
    if (moves.length === 0) return;
    set((state) => {
      for (const move of moves) {
        const table = state.tables.find((t) => t.id === move.id);
        if (table) {
          table.position = move.position;
        }
      }
    });
    get().saveHistory(moves.length === 1 ? 'テーブルを移動' : `${moves.length}個のテーブルを移動`);
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

  createSyncTable: (id) => {
    const source = get().tables.find((t) => t.id === id);
    if (!source) return null;

    // syncGroupIdを決定（ソースがすでに同期グループに属していればそれを使用、なければソースのIDを使用）
    const syncGroupId = source.syncGroupId || source.id;

    // 元テーブルが同期グループに属していない場合、ソーステーブルとしてマーク
    if (!source.syncGroupId) {
      set((state) => {
        const sourceTable = state.tables.find((t) => t.id === id);
        if (sourceTable) {
          sourceTable.syncGroupId = syncGroupId;
          sourceTable.isSyncSource = true;
          sourceTable.updatedAt = new Date().toISOString();
        }
      });
    }

    // 新しい同期テーブルを作成（カラムIDはそのまま共有）
    const newTable = createDefaultTable(
      `${source.name}_sync`,
      { x: source.position.x + 80, y: source.position.y + 60 }
    );
    // 同期テーブルはカラムを完全にコピー（IDも含めて）
    newTable.columns = source.columns.map((col) => ({
      ...col,
    }));
    newTable.color = source.color;
    newTable.description = source.description;
    newTable.exportTargets = source.exportTargets ? [...source.exportTargets] : undefined;
    newTable.syncGroupId = syncGroupId;
    newTable.isSyncSource = false;

    set((state) => {
      state.tables.push(newTable);
      state.sampleDataByTableId[newTable.id] = syncSampleRowsToTableSchema({ table: newTable, currentRows: undefined });
    });
    get().saveHistory(`テーブル「${source.name}」の同期テーブルを作成`);
    get().queueSaveToDB();
    return newTable.id;
  },

  unlinkSyncTable: (id) => {
    const table = get().tables.find((t) => t.id === id);
    if (!table || !table.syncGroupId) return;

    const syncGroupId = table.syncGroupId;
    const syncedTables = get().tables.filter((t) => t.syncGroupId === syncGroupId);

    set((state) => {
      const targetTable = state.tables.find((t) => t.id === id);
      if (targetTable) {
        // 同期を解除（カラムは新しいIDで独立させる）
        targetTable.columns = targetTable.columns.map((col) => ({
          ...col,
          id: uuidv4(),
        }));
        targetTable.syncGroupId = undefined;
        targetTable.isSyncSource = undefined;
        targetTable.updatedAt = new Date().toISOString();
      }

      // 同期グループに1つしか残らない場合、残りも解除
      if (syncedTables.length === 2) {
        const remainingTable = state.tables.find(
          (t) => t.syncGroupId === syncGroupId && t.id !== id
        );
        if (remainingTable) {
          remainingTable.syncGroupId = undefined;
          remainingTable.isSyncSource = undefined;
          remainingTable.updatedAt = new Date().toISOString();
        }
      }
    });
    get().saveHistory(`テーブル「${table.name}」の同期を解除`);
    get().queueSaveToDB();
  },

  setAllTablesCollapsed: (collapsed: boolean) => {
    const tables = get().tables;
    if (tables.length === 0) return;

    set((state) => {
      for (const table of state.tables) {
        table.isCollapsed = collapsed;
      }
    });
    get().saveHistory(collapsed ? 'すべてのテーブルを折り畳み' : 'すべてのテーブルを展開');
    get().queueSaveToDB();
  },
});
