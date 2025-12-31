/**
 * ER図ストア
 * 
 * 各機能はスライスに分割されています:
 * - tableSlice: テーブル操作
 * - columnSlice: カラム操作
 * - sampleDataSlice: サンプルデータ操作
 * - relationSlice: リレーション操作
 * - memoSlice: メモ操作
 * - historySlice: 履歴操作（Undo/Redo）、選択状態
 * - persistenceSlice: 永続化、インポート/エクスポート
 */
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

import type { ERState } from './slices/types';
import { createTableSlice } from './slices/tableSlice';
import { createColumnSlice } from './slices/columnSlice';
import { createSampleDataSlice } from './slices/sampleDataSlice';
import { createRelationSlice } from './slices/relationSlice';
import { createMemoSlice } from './slices/memoSlice';
import { createHistorySlice } from './slices/historySlice';
import { createPersistenceSlice } from './slices/persistenceSlice';

export const useERStore = create<ERState>()(
  immer((set, get) => ({
    // テーブルスライス
    ...createTableSlice(set, get),
    // カラムスライス
    ...createColumnSlice(set, get),
    // サンプルデータスライス
    ...createSampleDataSlice(set, get),
    // リレーションスライス
    ...createRelationSlice(set, get),
    // メモスライス
    ...createMemoSlice(set, get),
    // 履歴・選択スライス
    ...createHistorySlice(set, get),
    // 永続化・インポート/エクスポートスライス
    ...createPersistenceSlice(set, get),
  }))
);
