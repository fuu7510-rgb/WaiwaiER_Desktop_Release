/**
 * メモ操作スライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { Memo } from '../../types';
import type { MemoState, MemoActions, SliceCreator } from './types';

function createDefaultMemo(position: { x: number; y: number }, initialText?: string): Memo {
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
}

export type MemoSlice = MemoState & MemoActions;

export const createMemoSlice: SliceCreator<MemoSlice> = (set, get) => ({
  memos: [],

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
});
