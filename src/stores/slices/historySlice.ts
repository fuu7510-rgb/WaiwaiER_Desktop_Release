/**
 * 履歴操作（Undo/Redo）スライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { HistoryEntry } from '../../types';
import type { HistoryState, HistoryActions, SelectionState, SelectionActions, SliceCreator } from './types';
import { reconcileSampleDataBySchema } from './helpers';

export type HistorySlice = HistoryState & SelectionState & HistoryActions & SelectionActions;

export const createHistorySlice: SliceCreator<HistorySlice> = (set, get) => ({
  history: [],
  historyIndex: -1,
  selectedTableId: null,
  selectedColumnId: null,

  selectTable: (id) => {
    set((state) => {
      state.selectedTableId = id;
      // テーブル選択時はカラム選択を常にクリアする
      state.selectedColumnId = null;
    });
  },

  selectColumn: (tableId, columnId) => {
    set((state) => {
      state.selectedTableId = tableId;
      state.selectedColumnId = columnId;
    });
  },

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
});
