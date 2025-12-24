import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Table, Column, Relation, Memo, ERDiagram, ColumnType, HistoryEntry } from '../types';
import { saveDiagram, loadDiagram } from '../lib/database';
import { generateSampleData } from '../lib/sampleData';

interface ERState {
  // ER図データ
  tables: Table[];
  relations: Relation[];
  memos: Memo[];

  // シミュレーター用サンプルデータ（tableId -> rows）
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;

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

  // サンプルデータ操作
  ensureSampleData: () => void;
  regenerateSampleData: () => void;
  regenerateSampleDataForTable: (tableId: string) => void;
  updateSampleRow: (tableId: string, rowIndex: number, updates: Record<string, unknown>) => void;
  
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
      set((state) => {
        state.tables.push(table);
        state.sampleDataByTableId[table.id] = generateSampleData(table, 5);
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
      
      set((state) => {
        state.tables.push(newTable);
        state.sampleDataByTableId[newTable.id] = generateSampleData(newTable, 5);
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
          state.sampleDataByTableId[tableId] = generateSampleData(t, 5);
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
            Object.assign(column, updates);
            table.updatedAt = new Date().toISOString();
            state.sampleDataByTableId[tableId] = generateSampleData(table, 5);
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
          state.sampleDataByTableId[tableId] = generateSampleData(table, 5);
          
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
            state.sampleDataByTableId[tableId] = generateSampleData(table, 5);
          }
        }
      });
      get().saveHistory('カラムの順序を変更');
      get().queueSaveToDB();
    },

    // サンプルデータ操作
    ensureSampleData: () => {
      const { tables } = get();
      set((state) => {
        const next: Record<string, Record<string, unknown>[]> = {};
        for (const table of tables) {
          next[table.id] = state.sampleDataByTableId[table.id] ?? generateSampleData(table, 5);
        }
        state.sampleDataByTableId = normalizeRefValues({ tables, sampleDataByTableId: next });
      });
    },

    regenerateSampleData: () => {
      const { tables } = get();
      set((state) => {
        const next: Record<string, Record<string, unknown>[]> = {};
        for (const table of tables) {
          next[table.id] = generateSampleData(table, 5);
        }
        state.sampleDataByTableId = normalizeRefValues({ tables, sampleDataByTableId: next });
      });
    },

    regenerateSampleDataForTable: (tableId) => {
      const table = get().tables.find((t) => t.id === tableId);
      if (!table) return;
      const tables = get().tables;
      set((state) => {
        const next = {
          ...state.sampleDataByTableId,
          [tableId]: generateSampleData(table, 5),
        };
        state.sampleDataByTableId = normalizeRefValues({ tables, sampleDataByTableId: next });
      });
    },

    updateSampleRow: (tableId, rowIndex, updates) => {
      set((state) => {
        const current = state.sampleDataByTableId[tableId];
        if (!current || !current[rowIndex]) return;
        const next = current.slice();
        next[rowIndex] = { ...next[rowIndex], ...updates };
        state.sampleDataByTableId[tableId] = next;
      });
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
          (diagram.tables ?? []).map((t) => [t.id, generateSampleData(t, 5)])
        );
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
      const diagram = await loadDiagram(projectId, { passphrase: passphrase ?? undefined });
      if (diagram) {
        set((state) => {
          state.tables = diagram.tables;
          state.relations = diagram.relations;
          state.memos = diagram.memos ?? [];
          state.sampleDataByTableId = Object.fromEntries(
            (diagram.tables ?? []).map((t) => [t.id, generateSampleData(t, 5)])
          );
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
      const { tables, relations, memos, currentProjectId, currentProjectPassphrase } = get();
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
