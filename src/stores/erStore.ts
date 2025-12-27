import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Table, Column, Relation, Memo, ERDiagram, ColumnType, HistoryEntry, CommonColumnDefinition } from '../types';
import { saveDiagram, loadDiagram, loadSampleData, saveSampleData } from '../lib/database';
import { useUIStore } from './uiStore';

const DEFAULT_SAMPLE_ROWS = 5;
const MAX_SAMPLE_ROWS = 100;

function getDesiredAutoSampleRowCountFromDummyValues(table: Table): number | null {
  let maxLen = 0;
  for (const c of table.columns) {
    const len = (c.dummyValues ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0).length;
    if (len > maxLen) maxLen = len;
  }
  return maxLen > 0 ? Math.min(maxLen, MAX_SAMPLE_ROWS) : null;
}

function makeDefaultKeyValue(rowIndex: number): string {
  return `ROW-${String(rowIndex + 1).padStart(4, '0')}`;
}

function syncSampleRowsToTableSchema(params: {
  table: Table;
  currentRows: Record<string, unknown>[] | undefined;
  desiredRowCount?: number;
}): Record<string, unknown>[] {
  const { table } = params;
  const currentRows = params.currentRows ?? [];

  const nextCountRaw =
    params.desiredRowCount ?? (currentRows.length > 0 ? currentRows.length : DEFAULT_SAMPLE_ROWS);
  const nextCount = Math.min(Math.max(nextCountRaw, 0), MAX_SAMPLE_ROWS);

  const baseRows = currentRows.slice(0, nextCount);
  const rows: Record<string, unknown>[] = [];

  for (let i = 0; i < nextCount; i++) {
    const current = baseRows[i] ?? {};
    const out: Record<string, unknown> = {};

    for (const column of table.columns) {
      if (column.id in current) {
        out[column.id] = current[column.id];
        continue;
      }
      // 新規カラムは原則空欄。Keyだけは参照成立のため決定的に埋める。
      out[column.id] = column.isKey ? makeDefaultKeyValue(i) : '';
    }

    // Keyが空なら補完
    const keyCol = table.columns.find((c) => c.isKey);
    if (keyCol) {
      const raw = String(out[keyCol.id] ?? '').trim();
      if (!raw) out[keyCol.id] = makeDefaultKeyValue(i);
    }

    rows.push(out);
  }

  return rows;
}

function isBlankSampleCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value);
  return s.trim().length === 0 || s.trim() === '-';
}

function coerceDummyValueForType(raw: string, type: ColumnType): unknown {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.length === 0) return '';

  if (type === 'Number' || type === 'ChangeCounter') {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === 'Decimal' || type === 'Progress') {
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === 'Yes/No') {
    const lower = trimmed.toLowerCase();
    if (lower === 'yes' || lower === 'true' || lower === '1') return 'Yes';
    if (lower === 'no' || lower === 'false' || lower === '0') return 'No';
    return trimmed;
  }

  return trimmed;
}

function applyDummyValuesToSampleRows(params: {
  rows: Record<string, unknown>[];
  column: Column;
  previousDummyValues?: string[];
}): Record<string, unknown>[] {
  const { rows, column, previousDummyValues } = params;
  if (column.isKey) return rows;
  const values = (column.dummyValues ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0);
  if (values.length === 0) return rows;

  const previousSet = new Set((previousDummyValues ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0));

  let anyChanged = false;
  const nextRows = rows.map((row, rowIndex) => {
    const current = row?.[column.id];
    const currentTrimmed = String(current ?? '').trim();
    const shouldReplace = isBlankSampleCell(current) || (previousSet.size > 0 && previousSet.has(currentTrimmed));
    if (!shouldReplace) return row;
    // NOTE: Do not wrap/cycle. If dummyValues has fewer entries than rows,
    // leave remaining rows blank (and clear old dummy values if needed).
    const picked = values[rowIndex] ?? '';
    const coerced = coerceDummyValueForType(picked, column.type);
    anyChanged = true;
    return { ...row, [column.id]: coerced };
  });

  return anyChanged ? nextRows : rows;
}

interface ERState {
  // ER図データ
  tables: Table[];
  relations: Relation[];
  memos: Memo[];

  // シミュレーター用サンプルデータ（tableId -> rows）
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;

  // シミュレーター用: 削除Undoスタック（永続化しない）
  deletedSampleRowStack: {
    tableId: string;
    rowIndex: number;
    row: Record<string, unknown>;
  }[];

  // 保存状態
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  
  // 選択状態
  selectedTableId: string | null;
  selectedColumnId: string | null;
  
  // 履歴（Undo/Redo）
  history: HistoryEntry[];
  historyIndex: number;
  
  // 現在のプロジェクトID（永続化用）
  currentProjectId: string | null;

  // 暗号化プロジェクト用パスフレーズ（メモリのみ、永続化しない）
  currentProjectPassphrase: string | null;
  
  // アクション
  // テーブル操作
  addTable: (name: string, position?: { x: number; y: number }, options?: { keyColumnName?: string }) => string;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  moveTable: (id: string, position: { x: number; y: number }) => void;
  reorderTables: (activeTableId: string, overTableId: string) => void;
  duplicateTable: (id: string) => string | null;
  
  // カラム操作
  addColumn: (tableId: string, column?: Partial<Column>) => string | null;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  reorderColumn: (tableId: string, columnId: string, newOrder: number) => void;

  // 共通カラム（ユーザー設定）
  applyCommonColumnsToAllTables: (commonColumns: CommonColumnDefinition[]) => void;

  // サンプルデータ操作
  ensureSampleData: () => void;
  regenerateSampleData: () => void;
  regenerateSampleDataForTable: (tableId: string) => void;
  setSampleRowsForTable: (tableId: string, rows: Record<string, unknown>[]) => void;
  updateSampleRow: (tableId: string, rowIndex: number, updates: Record<string, unknown>) => void;
  appendSampleRow: (tableId: string) => void;
  deleteSampleRow: (tableId: string, rowIndex: number) => void;
  undoDeleteSampleRow: () => void;
  reorderSampleRows: (tableId: string, fromIndex: number, toIndex: number) => void;
  
  // リレーション操作
  addRelation: (relation: Omit<Relation, 'id'>) => string;
  updateRelation: (id: string, updates: Partial<Relation>) => void;
  deleteRelation: (id: string) => void;

  // メモ操作
  addMemo: (position?: { x: number; y: number }, initialText?: string) => string;
  updateMemo: (id: string, updates: Partial<Memo>) => void;
  moveMemo: (id: string, position: { x: number; y: number }) => void;
  deleteMemo: (id: string) => void;
  
  // 選択操作
  selectTable: (id: string | null) => void;
  selectColumn: (tableId: string | null, columnId: string | null) => void;
  
  // 履歴操作
  undo: () => void;
  redo: () => void;
  saveHistory: (description: string) => void;
  
  // インポート/エクスポート
  importDiagram: (diagram: ERDiagram) => void;
  exportDiagram: () => ERDiagram;
  clearDiagram: () => void;
  
  // 永続化
  setCurrentProjectId: (projectId: string | null) => void;
  setCurrentProjectPassphrase: (passphrase: string | null) => void;
  loadFromDB: (projectId: string, options?: { passphrase?: string | null }) => Promise<void>;
  queueSaveToDB: () => void;
  saveToDB: () => Promise<void>;
}

const createDefaultColumn = (order: number, customName?: string): Column => ({
  id: uuidv4(),
  name: customName || `Column${order + 1}`,
  type: 'Text' as ColumnType,
  isKey: order === 0,
  isLabel: order === 0,
  constraints: {},
  order,
});

const createDefaultTable = (name: string, position: { x: number; y: number }, keyColumnName?: string): Table => {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    columns: [createDefaultColumn(0, keyColumnName)],
    position,
    createdAt: now,
    updatedAt: now,
  };
};

function normalizeCommonColumns(defs: CommonColumnDefinition[] | undefined | null): CommonColumnDefinition[] {
  if (!Array.isArray(defs)) return [];
  const out: CommonColumnDefinition[] = [];
  for (const d of defs) {
    const name = String(d?.name ?? '').trim();
    if (!name) continue;
    out.push({
      id: String(d.id ?? ''),
      name,
      type: d.type,
      constraints: d.constraints ?? {},
      appSheet: d.appSheet,
    });
  }
  return out;
}

function applyCommonColumnsToTableInPlace(table: Table, defs: CommonColumnDefinition[]): boolean {
  const commonDefs = normalizeCommonColumns(defs);
  if (commonDefs.length === 0) return false;

  const byName = new Map<string, Column>();
  for (const c of table.columns) {
    const key = String(c.name ?? '').trim();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, c);
  }

  const usedNonKeyIds = new Set<string>();
  const appended: Column[] = [];

  for (const def of commonDefs) {
    const existing = byName.get(def.name);
    if (existing) {
      // 既存のカラム定義は壊さない（型/制約は上書きしない）。末尾へ移動だけ行う。
      if (!existing.isKey) {
        usedNonKeyIds.add(existing.id);
        appended.push(existing);
      }
      continue;
    }

    appended.push({
      id: uuidv4(),
      name: def.name,
      type: def.type,
      isKey: false,
      isLabel: false,
      constraints: def.constraints ?? {},
      appSheet: def.appSheet,
      order: -1,
    });
  }

  const nonCommon = table.columns.filter((c) => c.isKey || !usedNonKeyIds.has(c.id));
  const next = [...nonCommon, ...appended];

  let changed = false;
  if (next.length !== table.columns.length) {
    changed = true;
  } else {
    for (let i = 0; i < next.length; i++) {
      if (next[i].id !== table.columns[i].id) {
        changed = true;
        break;
      }
    }
  }

  for (let i = 0; i < next.length; i++) {
    if (next[i].order !== i) {
      next[i].order = i;
      changed = true;
    }
  }

  if (!changed) return false;
  table.columns = next;
  table.updatedAt = new Date().toISOString();
  return true;
}

const createDefaultMemo = (position: { x: number; y: number }, initialText?: string): Memo => {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    text: initialText ?? '',
    position,
    width: 260,
    height: 140,
    createdAt: now,
    updatedAt: now,
  };
};

const arrayMove = <T,>(array: T[], fromIndex: number, toIndex: number): T[] => {
  const next = array.slice();
  const startIndex = fromIndex < 0 ? next.length + fromIndex : fromIndex;
  if (startIndex < 0 || startIndex >= next.length) return next;
  const endIndex = toIndex < 0 ? next.length + toIndex : toIndex;
  const [item] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, item);
  return next;
};

const AUTO_REF_PLACEHOLDER_RE = /^REF-\d+$/;

function normalizeRefValues(params: {
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
}): Record<string, Record<string, unknown>[]> {
  const { tables } = params;
  const base = params.sampleDataByTableId;

  const tableById = new Map<string, Table>();
  for (const t of tables) tableById.set(t.id, t);

  const next: Record<string, Record<string, unknown>[]> = { ...base };

  for (const table of tables) {
    const rows = next[table.id] ?? [];
    if (rows.length === 0) continue;

    const refColumns = table.columns.filter((c) => c.type === 'Ref' && c.constraints.refTableId);
    if (refColumns.length === 0) continue;

    let anyRowChanged = false;
    const nextRows = rows.map((row, rowIndex) => {
      let outRow: Record<string, unknown> = row;

      for (let refIndex = 0; refIndex < refColumns.length; refIndex++) {
        const column = refColumns[refIndex];
        const raw = String(row[column.id] ?? '').trim();

        const refTableId = column.constraints.refTableId;
        const refTable = refTableId ? tableById.get(refTableId) : undefined;
        if (!refTable || !refTableId) continue;

        const refRows = next[refTableId] ?? [];
        if (refRows.length === 0) continue;

        const refKeyColId =
          column.constraints.refColumnId ??
          refTable.columns.find((c) => c.isKey)?.id ??
          refTable.columns[0]?.id;

        if (!refKeyColId) continue;

        const exists = raw
          ? refRows.some((r) => String(r[refKeyColId] ?? '').trim() === raw)
          : false;

        // 既に有効な参照なら触らない
        if (exists) continue;

        // ユーザーが手入力したような値は保持（REF-xxx や空だけ補正対象）
        if (raw && !AUTO_REF_PLACEHOLDER_RE.test(raw)) continue;

        const pickedRow = refRows[(rowIndex + refIndex) % refRows.length];
        const pickedKey = String(pickedRow?.[refKeyColId] ?? '').trim();
        if (!pickedKey) continue;

        if (outRow === row) outRow = { ...row };
        outRow[column.id] = pickedKey;
        anyRowChanged = true;
      }

      return outRow;
    });

    if (anyRowChanged) {
      next[table.id] = nextRows;
    }
  }

  return next;
}

function reconcileSampleDataBySchema(params: {
  tables: Table[];
  previousSampleDataByTableId: Record<string, Record<string, unknown>[]>;
}): Record<string, Record<string, unknown>[]> {
  const { tables, previousSampleDataByTableId } = params;
  const next: Record<string, Record<string, unknown>[]> = {};

  for (const table of tables) {
    next[table.id] = syncSampleRowsToTableSchema({
      table,
      currentRows: previousSampleDataByTableId[table.id],
    });
  }

  return normalizeRefValues({ tables, sampleDataByTableId: next });
}

function migrateStoredSampleDataToIds(params: {
  tables: Table[];
  storedSampleData: Record<string, Record<string, unknown>[]> | null;
}): Record<string, Record<string, unknown>[]> | null {
  const { tables, storedSampleData } = params;
  if (!storedSampleData) return null;

  const out: Record<string, Record<string, unknown>[]> = {};

  for (const table of tables) {
    const rawRows =
      (storedSampleData as Record<string, unknown>)[table.id] ??
      (storedSampleData as Record<string, unknown>)[table.name];
    if (!Array.isArray(rawRows)) continue;

    out[table.id] = rawRows.map((raw) => {
      const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const nextRow: Record<string, unknown> = {};

      for (const column of table.columns) {
        if (Object.prototype.hasOwnProperty.call(row, column.id)) {
          nextRow[column.id] = row[column.id];
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(row, column.name)) {
          nextRow[column.id] = row[column.name];
        }
      }

      return nextRow;
    });
  }

  return out;
}

export const useERStore = create<ERState>()(
  immer((set, get) => {
    let saveTimeout: ReturnType<typeof setTimeout> | null = null;

    const markDirty = () => {
      set((state) => {
        state.isDirty = true;
        state.saveError = null;
      });
    };

    const clearQueuedSave = () => {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
        saveTimeout = null;
      }
    };

    const queueSave = () => {
      markDirty();
      clearQueuedSave();
      saveTimeout = setTimeout(() => {
        void get().saveToDB();
      }, 400);
    };

    return {
    tables: [],
    relations: [],
    memos: [],

    sampleDataByTableId: {},

    deletedSampleRowStack: [],

    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    saveError: null,
    selectedTableId: null,
    selectedColumnId: null,
    history: [],
    historyIndex: -1,
    currentProjectId: null,
    currentProjectPassphrase: null,
    
    // テーブル操作
    addTable: (name, position = { x: 100, y: 100 }, options) => {
      const table = createDefaultTable(name, position, options?.keyColumnName);

      // ユーザー設定「共通カラム」を末尾に自動挿入
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
        state.tables = state.tables.filter((t) => t.id !== id);
        delete state.sampleDataByTableId[id];
        state.relations = state.relations.filter(
          (r) => r.sourceTableId !== id && r.targetTableId !== id
        );
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

      applyCommonColumnsToTableInPlace(newTable, useUIStore.getState().settings.commonColumns);
      
      set((state) => {
        state.tables.push(newTable);
        state.sampleDataByTableId[newTable.id] = syncSampleRowsToTableSchema({ table: newTable, currentRows: undefined });
      });
      get().saveHistory(`テーブル「${source.name}」を複製`);
      get().queueSaveToDB();
      return newTable.id;
    },
    
    // カラム操作
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
            //（線が残り続ける問題の根本対応）
            const isRefNow = column.type === 'Ref';
            const refTableIdNow = column.constraints.refTableId;
            const refColumnIdNow = column.constraints.refColumnId;
            const shouldRemoveRelationsForThisColumn =
              (prevType === 'Ref' && !isRefNow) || (isRefNow && !refTableIdNow && !!prevRefTableId);

            // Ref の参照先（親テーブル/親カラム）が変更された場合は、既存の線を付け替える。
            // ColumnEditor 経由の変更でも図の線が追従するようにする。
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

    // サンプルデータ操作
    ensureSampleData: () => {
      const { tables } = get();
      set((state) => {
        const next: Record<string, Record<string, unknown>[]> = {};
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
        const next: Record<string, Record<string, unknown>[]> = {};
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

      const sanitizedUpdates: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(updates ?? {})) {
        if (appFormulaColumnIds.has(k)) continue;
        sanitizedUpdates[k] = v;
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
    
    // リレーション操作
    addRelation: (relation) => {
      const id = uuidv4();
      set((state) => {
        state.relations.push({ ...relation, id });
      });
      get().saveHistory('リレーションを追加');
      get().queueSaveToDB();
      return id;
    },
    
    updateRelation: (id, updates) => {
      set((state) => {
        const relation = state.relations.find((r) => r.id === id);
        if (relation) {
          Object.assign(relation, updates);
        }
      });
      get().saveHistory('リレーションを更新');
      get().queueSaveToDB();
    },
    
    deleteRelation: (id) => {
      set((state) => {
        state.relations = state.relations.filter((r) => r.id !== id);
      });
      get().saveHistory('リレーションを削除');
      get().queueSaveToDB();
    },

    // メモ操作
    addMemo: (position = { x: 200, y: 200 }, initialText) => {
      const memo = createDefaultMemo(position, initialText);
      set((state) => {
        state.memos.push(memo);
      });
      get().saveHistory('メモを追加');
      get().queueSaveToDB();
      return memo.id;
    },

    updateMemo: (id, updates) => {
      set((state) => {
        const memo = state.memos.find((m) => m.id === id);
        if (memo) {
          Object.assign(memo, updates, { updatedAt: new Date().toISOString() });
        }
      });
      get().saveHistory('メモを更新');
      get().queueSaveToDB();
    },

    moveMemo: (id, position) => {
      set((state) => {
        const memo = state.memos.find((m) => m.id === id);
        if (memo) {
          memo.position = position;
          memo.updatedAt = new Date().toISOString();
        }
      });
      get().saveHistory('メモを移動');
      get().queueSaveToDB();
    },

    deleteMemo: (id) => {
      set((state) => {
        state.memos = state.memos.filter((m) => m.id !== id);
      });
      get().saveHistory('メモを削除');
      get().queueSaveToDB();
    },
    
    // 選択操作
    selectTable: (id) => {
      set((state) => {
        state.selectedTableId = id;
        if (!id) {
          state.selectedColumnId = null;
        }
      });
    },
    
    selectColumn: (tableId, columnId) => {
      set((state) => {
        state.selectedTableId = tableId;
        state.selectedColumnId = columnId;
      });
    },
    
    // 履歴操作
    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex > 0) {
        const entry = history[historyIndex - 1];
        set((state) => {
          state.historyIndex--;
          state.tables = entry.state.tables;
          state.relations = entry.state.relations;
          state.memos = entry.state.memos ?? [];
          state.sampleDataByTableId = reconcileSampleDataBySchema({
            tables: entry.state.tables,
            previousSampleDataByTableId: state.sampleDataByTableId,
          });
        });
        get().queueSaveToDB();
      }
    },
    
    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) {
        const entry = history[historyIndex + 1];
        set((state) => {
          state.historyIndex++;
          state.tables = entry.state.tables;
          state.relations = entry.state.relations;
          state.memos = entry.state.memos ?? [];
          state.sampleDataByTableId = reconcileSampleDataBySchema({
            tables: entry.state.tables,
            previousSampleDataByTableId: state.sampleDataByTableId,
          });
        });
        get().queueSaveToDB();
      }
    },
    
    saveHistory: (description) => {
      const { tables, relations, memos, historyIndex } = get();
      const entry: HistoryEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        description,
        state: {
          tables: JSON.parse(JSON.stringify(tables)),
          relations: JSON.parse(JSON.stringify(relations)),
          memos: JSON.parse(JSON.stringify(memos)),
        },
      };
      
      set((state) => {
        // 現在位置より後の履歴を削除
        state.history = state.history.slice(0, historyIndex + 1);
        state.history.push(entry);
        state.historyIndex = state.history.length - 1;
        
        // 履歴は最大100件
        if (state.history.length > 100) {
          state.history.shift();
          state.historyIndex--;
        }
      });
    },
    
    // インポート/エクスポート
    importDiagram: (diagram) => {
      set((state) => {
        state.tables = diagram.tables;
        state.relations = diagram.relations;
        state.memos = diagram.memos ?? [];
        state.sampleDataByTableId = Object.fromEntries(
          (diagram.tables ?? []).map((t) => [t.id, syncSampleRowsToTableSchema({ table: t, currentRows: undefined })])
        );
        state.deletedSampleRowStack = [];
        state.selectedTableId = null;
        state.selectedColumnId = null;
        state.history = [];
        state.historyIndex = -1;
      });
      get().saveHistory('ダイアグラムをインポート');
      get().queueSaveToDB();
    },
    
    exportDiagram: () => {
      const { tables, relations, memos } = get();
      return { tables, relations, memos };
    },
    
    clearDiagram: () => {
      set((state) => {
        state.tables = [];
        state.relations = [];
        state.memos = [];
        state.sampleDataByTableId = {};
        state.deletedSampleRowStack = [];
        state.selectedTableId = null;
        state.selectedColumnId = null;
      });
      get().saveHistory('ダイアグラムをクリア');
      get().queueSaveToDB();
    },
    
    // 永続化
    setCurrentProjectId: (projectId) => {
      set((state) => {
        state.currentProjectId = projectId;
      });
    },

    setCurrentProjectPassphrase: (passphrase) => {
      set((state) => {
        state.currentProjectPassphrase = passphrase;
      });
    },
    
    loadFromDB: async (projectId, options) => {
      clearQueuedSave();
      const passphrase = options?.passphrase ?? get().currentProjectPassphrase;
      const resolvedPassphrase = passphrase ?? undefined;
      const diagram = await loadDiagram(projectId, { passphrase: resolvedPassphrase });
      const storedSampleData = await loadSampleData(projectId, { passphrase: resolvedPassphrase });
      const migratedSampleData = diagram
        ? migrateStoredSampleDataToIds({ tables: diagram.tables ?? [], storedSampleData })
        : null;
      if (diagram) {
        set((state) => {
          state.tables = diagram.tables;
          state.relations = diagram.relations;
          state.memos = diagram.memos ?? [];
          const fallback = Object.fromEntries(
            (diagram.tables ?? []).map((t) => [t.id, syncSampleRowsToTableSchema({ table: t, currentRows: undefined })])
          ) as Record<string, Record<string, unknown>[]>;
          const base = migratedSampleData ?? fallback;
          const next: Record<string, Record<string, unknown>[]> = {};
          for (const t of diagram.tables ?? []) {
            next[t.id] = syncSampleRowsToTableSchema({ table: t, currentRows: base[t.id] });
          }
          state.sampleDataByTableId = normalizeRefValues({
            tables: diagram.tables ?? [],
            sampleDataByTableId: next,
          });
          state.selectedTableId = null;
          state.selectedColumnId = null;
          state.history = [];
          state.historyIndex = -1;
          state.currentProjectId = projectId;
          state.currentProjectPassphrase = passphrase ?? null;
          state.isDirty = false;
          state.isSaving = false;
          state.saveError = null;
        });

        get().applyCommonColumnsToAllTables(useUIStore.getState().settings.commonColumns);
        get().saveHistory('プロジェクトを読み込み');
      } else {
        set((state) => {
          state.currentProjectId = projectId;
          state.currentProjectPassphrase = passphrase ?? null;
          state.isDirty = false;
          state.isSaving = false;
          state.saveError = null;
          state.sampleDataByTableId = {};
        });
      }
    },

    queueSaveToDB: () => {
      queueSave();
    },

    saveToDB: async () => {
      clearQueuedSave();
      const {
        tables,
        relations,
        memos,
        currentProjectId,
        currentProjectPassphrase,
        sampleDataByTableId,
      } = get();
      if (!currentProjectId) return;

      set((state) => {
        state.isSaving = true;
        state.saveError = null;
      });

      try {
        await saveDiagram(
          currentProjectId,
          { tables, relations, memos },
          { passphrase: currentProjectPassphrase || undefined }
        );

        await saveSampleData(currentProjectId, sampleDataByTableId ?? {}, {
          passphrase: currentProjectPassphrase || undefined,
        });
        set((state) => {
          state.isSaving = false;
          state.isDirty = false;
          state.lastSavedAt = new Date().toISOString();
          state.saveError = null;
        });
      } catch (error) {
        console.error('Failed to save diagram to DB:', error);
        set((state) => {
          state.isSaving = false;
          state.isDirty = true;
          state.saveError = error instanceof Error ? error.message : String(error);
        });
      }
    },
  };
  })
);
