/**
 * サンプルデータ操作スライス
 */
import type { SampleRow, SampleDataByTableId } from '../../types';
import type { SampleDataState, SampleDataActions, SliceCreator } from './types';
import { MAX_SAMPLE_ROWS } from './types';
import {
  syncSampleRowsToTableSchema,
  normalizeRefValues,
  arrayMove,
} from './helpers';

export type SampleDataSlice = SampleDataState & SampleDataActions;

export const createSampleDataSlice: SliceCreator<SampleDataSlice> = (set, get) => ({
  sampleDataByTableId: {},
  deletedSampleRowStack: [],

  ensureSampleData: () => {
    const { tables } = get();
    set((state) => {
      const next: SampleDataByTableId = {};
      for (const table of tables) {
        next[table.id] = syncSampleRowsToTableSchema({
          table,
          currentRows: state.sampleDataByTableId[table.id],
        });
      }
      state.sampleDataByTableId = normalizeRefValues({ tables, sampleDataByTableId: next });
    });
  },

  regenerateSampleData: () => {
    const { tables } = get();
    set((state) => {
      const next: SampleDataByTableId = {};
      for (const table of tables) {
        next[table.id] = syncSampleRowsToTableSchema({ table, currentRows: undefined });
      }
      state.sampleDataByTableId = normalizeRefValues({ tables, sampleDataByTableId: next });

      // データが総入れ替えになるため削除Undoは無効化
      state.deletedSampleRowStack = [];
    });
    get().queueSaveToDB();
  },

  regenerateSampleDataForTable: (tableId) => {
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return;
    const tables = get().tables;
    set((state) => {
      const next = {
        ...state.sampleDataByTableId,
        [tableId]: syncSampleRowsToTableSchema({ table, currentRows: undefined }),
      };
      state.sampleDataByTableId = normalizeRefValues({ tables, sampleDataByTableId: next });

      // 対象テーブルのデータが総入れ替えになるため削除Undoは無効化
      state.deletedSampleRowStack = [];
    });
    get().queueSaveToDB();
  },

  setSampleRowsForTable: (tableId, rows) => {
    const tables = get().tables;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    set((state) => {
      const desiredRowCount = Math.min(Math.max(rows?.length ?? 0, 0), MAX_SAMPLE_ROWS);
      const synced = syncSampleRowsToTableSchema({
        table,
        currentRows: rows,
        desiredRowCount,
      });
      state.sampleDataByTableId = normalizeRefValues({
        tables: state.tables,
        sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced },
      });

      // 行が増減・再構成されるため削除Undoは無効化
      state.deletedSampleRowStack = [];
    });
    get().queueSaveToDB();
  },

  updateSampleRow: (tableId, rowIndex, updates) => {
    const table = get().tables.find((t) => t.id === tableId);
    if (!table) return;

    // AppFormula列はユーザー編集・保存対象にしない（表示時に計算する）
    const appFormulaColumnIds = new Set(
      table.columns
        .filter((c) => typeof c.appSheet?.AppFormula === 'string' && String(c.appSheet?.AppFormula ?? '').trim().length > 0)
        .map((c) => c.id)
    );

    const sanitizedUpdates: SampleRow = {};
    for (const [k, v] of Object.entries(updates ?? {})) {
      if (appFormulaColumnIds.has(k)) continue;
      sanitizedUpdates[k] = v as SampleRow[string];
    }

    set((state) => {
      const current = state.sampleDataByTableId[tableId];
      if (!current || !current[rowIndex]) return;
      const next = current.slice();
      next[rowIndex] = { ...next[rowIndex], ...sanitizedUpdates };
      state.sampleDataByTableId[tableId] = next;

      // 行内容の変更で整合が取れなくなる可能性があるため削除Undoは無効化
      state.deletedSampleRowStack = [];
    });
    get().queueSaveToDB();
  },

  appendSampleRow: (tableId) => {
    const tables = get().tables;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    set((state) => {
      const current = state.sampleDataByTableId[tableId] ?? [];
      if (current.length >= MAX_SAMPLE_ROWS) return;
      const rowIndex = current.length;
      const appended = syncSampleRowsToTableSchema({
        table,
        currentRows: [...current, {}],
        desiredRowCount: rowIndex + 1,
      });
      state.sampleDataByTableId = normalizeRefValues({
        tables: state.tables,
        sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: appended },
      });

      // 行番号が変わるため削除Undoは無効化
      state.deletedSampleRowStack = [];
    });
    get().queueSaveToDB();
  },

  deleteSampleRow: (tableId, rowIndex) => {
    const tables = get().tables;
    const table = tables.find((t) => t.id === tableId);
    if (!table) return;
    set((state) => {
      const current = state.sampleDataByTableId[tableId] ?? [];
      if (rowIndex < 0 || rowIndex >= current.length) return;

      const deletedRow = current[rowIndex];

      const next = current.slice();
      next.splice(rowIndex, 1);

      // 削除後もスキーマ整合（新規列の空欄補完、Key補完など）
      const synced = syncSampleRowsToTableSchema({ table, currentRows: next, desiredRowCount: next.length });
      state.sampleDataByTableId = normalizeRefValues({
        tables: state.tables,
        sampleDataByTableId: { ...state.sampleDataByTableId, [tableId]: synced },
      });

      state.deletedSampleRowStack.push({
        tableId,
        rowIndex,
        row: { ...(deletedRow ?? {}) },
      });
    });
    get().queueSaveToDB();
  },

  undoDeleteSampleRow: () => {
    const tables = get().tables;
    const stack = get().deletedSampleRowStack;
    const last = stack[stack.length - 1];
    if (!last) return;

    const table = tables.find((t) => t.id === last.tableId);
    if (!table) {
      set((state) => {
        state.deletedSampleRowStack.pop();
      });
      return;
    }

    set((state) => {
      const restored = state.deletedSampleRowStack.pop();
      if (!restored) return;

      const current = state.sampleDataByTableId[restored.tableId] ?? [];

      // 復元は元の位置を優先。範囲外なら末尾。
      const insertIndex = Math.min(Math.max(restored.rowIndex, 0), current.length);
      const next = current.slice();
      next.splice(insertIndex, 0, restored.row);

      const desiredCount = Math.min(next.length, MAX_SAMPLE_ROWS);
      const truncated = next.slice(0, desiredCount);
      const synced = syncSampleRowsToTableSchema({
        table,
        currentRows: truncated,
        desiredRowCount: truncated.length,
      });

      state.sampleDataByTableId = normalizeRefValues({
        tables: state.tables,
        sampleDataByTableId: { ...state.sampleDataByTableId, [restored.tableId]: synced },
      });
    });
    get().queueSaveToDB();
  },

  reorderSampleRows: (tableId, fromIndex, toIndex) => {
    set((state) => {
      const current = state.sampleDataByTableId[tableId] ?? [];
      if (current.length === 0) return;
      if (fromIndex === toIndex) return;
      if (fromIndex < 0 || fromIndex >= current.length) return;
      if (toIndex < 0 || toIndex >= current.length) return;
      state.sampleDataByTableId[tableId] = arrayMove(current, fromIndex, toIndex);

      // 行番号が変わるため削除Undoは無効化
      state.deletedSampleRowStack = [];
    });
    get().queueSaveToDB();
  },
});
