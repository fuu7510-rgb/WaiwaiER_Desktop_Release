/**
 * erStoreのスライス間で共有される型定義
 */
import type { Table, Column, Relation, Memo, ERDiagram, HistoryEntry, CommonColumnDefinition, SampleRow, SampleDataByTableId } from '../../types';

export const DEFAULT_SAMPLE_ROWS = 5;
export const MAX_SAMPLE_ROWS = 100;

// ========== State Types ==========

export interface TableState {
  tables: Table[];
}

export interface RelationState {
  relations: Relation[];
}

export interface MemoState {
  memos: Memo[];
}

export interface SampleDataState {
  sampleDataByTableId: SampleDataByTableId;
  deletedSampleRowStack: {
    tableId: string;
    rowIndex: number;
    row: SampleRow;
  }[];
}

export interface SelectionState {
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedRelationId: string | null;
}

export interface HistoryState {
  history: HistoryEntry[];
  historyIndex: number;
}

export interface PersistenceState {
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: string | null;
  saveError: string | null;
  currentProjectId: string | null;
  currentProjectPassphrase: string | null;
}

// ========== Action Types ==========

export interface TableActions {
  addTable: (
    name: string,
    position?: { x: number; y: number },
    options?: { keyColumnName?: string; includeCommonColumns?: boolean }
  ) => string;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;
  moveTable: (id: string, position: { x: number; y: number }) => void;
  reorderTables: (activeTableId: string, overTableId: string) => void;
  duplicateTable: (id: string) => string | null;
}

export interface ColumnActions {
  addColumn: (tableId: string, column?: Partial<Column>) => string | null;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
  duplicateColumn: (tableId: string, columnId: string) => string | null;
  reorderColumn: (tableId: string, columnId: string, newOrder: number) => void;
  applyCommonColumnsToTable: (tableId: string, commonColumns?: CommonColumnDefinition[]) => void;
  applyCommonColumnsToAllTables: (commonColumns: CommonColumnDefinition[]) => void;
}

export interface SampleDataActions {
  ensureSampleData: () => void;
  regenerateSampleData: () => void;
  regenerateSampleDataForTable: (tableId: string) => void;
  setSampleRowsForTable: (tableId: string, rows: SampleRow[]) => void;
  updateSampleRow: (tableId: string, rowIndex: number, updates: Partial<SampleRow>) => void;
  appendSampleRow: (tableId: string) => void;
  deleteSampleRow: (tableId: string, rowIndex: number) => void;
  undoDeleteSampleRow: () => void;
  reorderSampleRows: (tableId: string, fromIndex: number, toIndex: number) => void;
}

export interface RelationActions {
  addRelation: (relation: Omit<Relation, 'id'>) => string;
  updateRelation: (id: string, updates: Partial<Relation>) => void;
  deleteRelation: (id: string) => void;
}

export interface MemoActions {
  addMemo: (position?: { x: number; y: number }, initialText?: string) => string;
  updateMemo: (id: string, updates: Partial<Memo>) => void;
  moveMemo: (id: string, position: { x: number; y: number }) => void;
  deleteMemo: (id: string) => void;
}

export interface SelectionActions {
  selectTable: (id: string | null) => void;
  selectColumn: (tableId: string | null, columnId: string | null) => void;
  selectRelation: (relationId: string | null) => void;
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  saveHistory: (description: string) => void;
}

export interface ImportExportActions {
  importDiagram: (diagram: ERDiagram) => void;
  exportDiagram: () => ERDiagram;
  clearDiagram: () => void;
}

export interface PersistenceActions {
  setCurrentProjectId: (projectId: string | null) => void;
  setCurrentProjectPassphrase: (passphrase: string | null) => void;
  loadFromDB: (projectId: string, options?: { passphrase?: string | null }) => Promise<void>;
  queueSaveToDB: () => void;
  saveToDB: () => Promise<void>;
}

// ========== Combined Types ==========

export type ERState = TableState &
  RelationState &
  MemoState &
  SampleDataState &
  SelectionState &
  HistoryState &
  PersistenceState &
  TableActions &
  ColumnActions &
  SampleDataActions &
  RelationActions &
  MemoActions &
  SelectionActions &
  HistoryActions &
  ImportExportActions &
  PersistenceActions;

// ========== Slice Creator Type ==========

export type SliceCreator<T> = (
  set: (fn: (state: ERState) => void) => void,
  get: () => ERState
) => T;
