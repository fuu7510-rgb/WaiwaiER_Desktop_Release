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
  selectedRelationId: null,
  selectedRelationIds: new Set<string>(),
  pendingSelectedTableIds: new Set<string>(),

  selectTable: (id) => {
    set((state) => {
      state.selectedTableId = id;
      // テーブル選択時はカラム選択を常にクリアする
      state.selectedColumnId = null;
      state.selectedRelationId = null;
      state.selectedRelationIds = new Set();
    });
  },

  selectColumn: (tableId, columnId) => {
    set((state) => {
      state.selectedTableId = tableId;
      state.selectedColumnId = columnId;
      state.selectedRelationId = null;
      state.selectedRelationIds = new Set();
    });
  },

  selectRelation: (relationId) => {
    set((state) => {
      state.selectedTableId = null;
      state.selectedColumnId = null;
      state.selectedRelationId = relationId;
      state.selectedRelationIds = relationId ? new Set([relationId]) : new Set();
    });
  },

  selectRelations: (relationIds) => {
    set((state) => {
      state.selectedTableId = null;
      state.selectedColumnId = null;
      // 単一選択も維持（最初のIDを使用）
      const firstId = relationIds.size > 0 ? [...relationIds][0] : null;
      state.selectedRelationId = firstId;
      state.selectedRelationIds = relationIds;
    });
  },

  toggleRelationsVisibility: () => {
    const { selectedRelationIds, relations } = get();
    if (selectedRelationIds.size === 0) return;

    // 選択されたリレーションを取得
    const selectedRelations = relations.filter((r) => selectedRelationIds.has(r.id));
    if (selectedRelations.length === 0) return;

    // すべてが rootOnly かどうかを確認
    const allAreRootOnly = selectedRelations.every((r) => r.edgeVisibility === 'rootOnly');
    // トグル: 全部 rootOnly なら undefined に、そうでなければ rootOnly に
    const newVisibility = allAreRootOnly ? undefined : 'rootOnly';

    set((state) => {
      for (const relation of state.relations) {
        if (selectedRelationIds.has(relation.id)) {
          relation.edgeVisibility = newVisibility;
        }
      }
    });
    get().saveHistory('リレーションの表示を切り替え');
    get().queueSaveToDB();
  },

  undo: () => {
    const { historyIndex, history } = get();
    console.log('[undo] 履歴インデックス:', historyIndex, '履歴の長さ:', history.length);
    if (historyIndex > 0) {
      const entry = history[historyIndex - 1];
      console.log('[undo] 復元するメモ数:', entry.state.memos?.length ?? 0);
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
      console.log('[undo] Undo後のメモ数:', get().memos.length);
      get().queueSaveToDB();
    }
  },

  redo: () => {
    const { historyIndex, history } = get();
    console.log('[redo] 履歴インデックス:', historyIndex, '履歴の長さ:', history.length);
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      console.log('[redo] 復元するメモ数:', entry.state.memos?.length ?? 0);
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
      console.log('[redo] Redo後のメモ数:', get().memos.length);
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
