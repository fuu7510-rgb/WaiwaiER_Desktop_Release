import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { v4 as uuidv4 } from 'uuid';
import type { Table, Column, Relation, ERDiagram, ColumnType, HistoryEntry } from '../types';

interface ERState {
  // ER図データ
  tables: Table[];
  relations: Relation[];
  
  // 選択状態
  selectedTableId: string | null;
  selectedColumnId: string | null;
  
  // 履歴（Undo/Redo）
  history: HistoryEntry[];
  historyIndex: number;
  
  // アクション
  // テーブル操作
  addTable: (name: string, position?: { x: number; y: number }) => string;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  moveTable: (id: string, position: { x: number; y: number }) => void;
  duplicateTable: (id: string) => string | null;
  
  // カラム操作
  addColumn: (tableId: string, column?: Partial<Column>) => string | null;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  reorderColumn: (tableId: string, columnId: string, newOrder: number) => void;
  
  // リレーション操作
  addRelation: (relation: Omit<Relation, 'id'>) => string;
  updateRelation: (id: string, updates: Partial<Relation>) => void;
  deleteRelation: (id: string) => void;
  
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
}

const createDefaultColumn = (order: number): Column => ({
  id: uuidv4(),
  name: `Column${order + 1}`,
  type: 'Text' as ColumnType,
  isKey: order === 0,
  isLabel: order === 0,
  constraints: {},
  order,
});

const createDefaultTable = (name: string, position: { x: number; y: number }): Table => {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    columns: [createDefaultColumn(0)],
    position,
    createdAt: now,
    updatedAt: now,
  };
};

export const useERStore = create<ERState>()(
  immer((set, get) => ({
    tables: [],
    relations: [],
    selectedTableId: null,
    selectedColumnId: null,
    history: [],
    historyIndex: -1,
    
    // テーブル操作
    addTable: (name, position = { x: 100, y: 100 }) => {
      const table = createDefaultTable(name, position);
      set((state) => {
        state.tables.push(table);
      });
      get().saveHistory(`テーブル「${name}」を追加`);
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
    },
    
    deleteTable: (id) => {
      const table = get().tables.find((t) => t.id === id);
      set((state) => {
        state.tables = state.tables.filter((t) => t.id !== id);
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
    },
    
    moveTable: (id, position) => {
      set((state) => {
        const table = state.tables.find((t) => t.id === id);
        if (table) {
          table.position = position;
        }
      });
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
      });
      get().saveHistory(`テーブル「${source.name}」を複製`);
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
        }
      });
      get().saveHistory(`カラム「${newColumn.name}」を追加`);
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
          }
        }
      });
      get().saveHistory('カラムを更新');
    },
    
    deleteColumn: (tableId, columnId) => {
      set((state) => {
        const table = state.tables.find((t) => t.id === tableId);
        if (table) {
          table.columns = table.columns.filter((c) => c.id !== columnId);
          table.updatedAt = new Date().toISOString();
          
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
          }
        }
      });
    },
    
    // リレーション操作
    addRelation: (relation) => {
      const id = uuidv4();
      set((state) => {
        state.relations.push({ ...relation, id });
      });
      get().saveHistory('リレーションを追加');
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
    },
    
    deleteRelation: (id) => {
      set((state) => {
        state.relations = state.relations.filter((r) => r.id !== id);
      });
      get().saveHistory('リレーションを削除');
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
        });
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
        });
      }
    },
    
    saveHistory: (description) => {
      const { tables, relations, historyIndex } = get();
      const entry: HistoryEntry = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        description,
        state: { tables: JSON.parse(JSON.stringify(tables)), relations: JSON.parse(JSON.stringify(relations)) },
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
        state.selectedTableId = null;
        state.selectedColumnId = null;
        state.history = [];
        state.historyIndex = -1;
      });
      get().saveHistory('ダイアグラムをインポート');
    },
    
    exportDiagram: () => {
      const { tables, relations } = get();
      return { tables, relations };
    },
    
    clearDiagram: () => {
      set((state) => {
        state.tables = [];
        state.relations = [];
        state.selectedTableId = null;
        state.selectedColumnId = null;
      });
      get().saveHistory('ダイアグラムをクリア');
    },
  }))
);
