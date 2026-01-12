/**
 * 永続化およびインポート/エクスポートスライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { ERDiagram, SampleDataByTableId, Table, Column, Relation, Memo } from '../../types';
import type { PersistenceState, PersistenceActions, ImportExportActions, SliceCreator } from './types';
import { saveDiagram, loadDiagram, loadSampleData, saveSampleData } from '../../lib/database';
import { toast } from '../toastStore';
import { useProjectStore } from '../projectStore';
import { DIAGRAM_SCHEMA_VERSION } from '../../lib/diagramSchema';
import {
  syncSampleRowsToTableSchema,
  normalizeRefValues,
  migrateStoredSampleDataToIds,
} from './helpers';

export type PersistenceSlice = PersistenceState & PersistenceActions & ImportExportActions;

// 内部で使用するsaveタイムアウト管理（モジュールスコープ）
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

const clearQueuedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
};

export const createPersistenceSlice: SliceCreator<PersistenceSlice> = (set, get) => {
  const markDirty = () => {
    set((state) => {
      state.isDirty = true;
      state.saveError = null;
    });
  };

  const queueSave = () => {
    markDirty();
    clearQueuedSave();
    saveTimeout = setTimeout(() => {
      void get().saveToDB();
    }, 400);
  };

  return {
    isDirty: false,
    isSaving: false,
    lastSavedAt: null,
    saveError: null,
    currentProjectId: null,
    currentProjectPassphrase: null,

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
      console.log('[loadFromDB] プロジェクト読み込み開始:', projectId);
      console.log('[loadFromDB] 現在のプロジェクトID:', get().currentProjectId, 'isDirty:', get().isDirty);

      // プロジェクトを切り替える前に、保留中の保存を即座に実行
      clearQueuedSave();
      if (get().isDirty && get().currentProjectId) {
        console.log('[loadFromDB] 保留中の変更を保存します...');
        await get().saveToDB();
      }

      const passphrase = options?.passphrase ?? get().currentProjectPassphrase;
      const resolvedPassphrase = passphrase ?? undefined;
      const diagram = await loadDiagram(projectId, { passphrase: resolvedPassphrase });
      console.log('[loadFromDB] DBから読み込んだメモ数:', diagram?.memos?.length ?? 0);
      const storedSampleData = await loadSampleData(projectId, { passphrase: resolvedPassphrase });
      const migratedSampleData = diagram
        ? migrateStoredSampleDataToIds({ tables: diagram.tables ?? [], storedSampleData: storedSampleData as SampleDataByTableId | null })
        : null;
      if (diagram) {
        set((state) => {
          state.tables = diagram.tables;
          state.relations = diagram.relations;
          state.memos = diagram.memos ?? [];
          const fallback: SampleDataByTableId = Object.fromEntries(
            (diagram.tables ?? []).map((t) => [t.id, syncSampleRowsToTableSchema({ table: t, currentRows: undefined })])
          );
          const base = migratedSampleData ?? fallback;
          const next: SampleDataByTableId = {};
          for (const t of diagram.tables ?? []) {
            next[t.id] = syncSampleRowsToTableSchema({ table: t, currentRows: base[t.id] });
          }
          state.sampleDataByTableId = normalizeRefValues({
            tables: diagram.tables ?? [],
            sampleDataByTableId: next,
          });
          state.selectedTableId = null;
          state.selectedColumnId = null;
          state.selectedRelationId = null;
          state.history = [];
          state.historyIndex = -1;
          state.currentProjectId = projectId;
          state.currentProjectPassphrase = passphrase ?? null;
          state.isDirty = false;
          state.isSaving = false;
          state.saveError = null;
        });
        console.log('[loadFromDB] stateに設定したメモ数:', get().memos.length);
        get().saveHistory('プロジェクトを読み込み');
      } else {
        console.log('[loadFromDB] ダイアグラムが見つかりませんでした');
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
      console.log('[saveToDB] 保存開始 - プロジェクトID:', currentProjectId, 'メモ数:', memos.length, 'テーブル数:', tables.length);
      if (!currentProjectId) {
        console.warn('[saveToDB] プロジェクトIDがないため保存をスキップ');
        return;
      }

      set((state) => {
        state.isSaving = true;
        state.saveError = null;
      });

      try {
        console.log('[saveToDB] ダイアグラム保存中...', { memos: memos.length, tables: tables.length, relations: relations.length });
        await saveDiagram(
          currentProjectId,
          { tables, relations, memos },
          { passphrase: currentProjectPassphrase || undefined }
        );
        console.log('[saveToDB] ダイアグラム保存完了');

        await saveSampleData(currentProjectId, sampleDataByTableId ?? {}, {
          passphrase: currentProjectPassphrase || undefined,
        });
        console.log('[saveToDB] サンプルデータ保存完了');

        // プロジェクトのデータスキーマバージョンを更新
        useProjectStore.getState().updateProject(currentProjectId, {
          dataSchemaVersion: DIAGRAM_SCHEMA_VERSION,
        });

        set((state) => {
          state.isSaving = false;
          state.isDirty = false;
          state.lastSavedAt = new Date().toISOString();
          state.saveError = null;
        });
        console.log('[saveToDB] 保存完全完了 ✓');
      } catch (error) {
        console.error('[saveToDB] 保存失敗 ✗', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        set((state) => {
          state.isSaving = false;
          state.isDirty = true;
          state.saveError = errorMessage;
        });
        // ユーザーにエラー通知
        toast.error('保存に失敗しました', errorMessage);
      }
    },

    importDiagram: (diagram: ERDiagram) => {
      set((state) => {
        state.tables = diagram.tables;
        state.relations = diagram.relations;
        state.memos = diagram.memos ?? [];
        state.sampleDataByTableId = Object.fromEntries(
          (diagram.tables ?? []).map((t) => [t.id, syncSampleRowsToTableSchema({ table: t, currentRows: undefined })])
        ) as SampleDataByTableId;
        state.deletedSampleRowStack = [];
        state.selectedTableId = null;
        state.selectedColumnId = null;
        state.selectedRelationId = null;
        state.history = [];
        state.historyIndex = -1;
      });
      get().saveHistory('ダイアグラムをインポート');
      get().queueSaveToDB();
    },

    mergeDiagram: (diagram: ERDiagram) => {
      // IDの重複を避けるためにすべてのIDを振り直す
      const oldToNewTableId = new Map<string, string>();
      const oldToNewColumnId = new Map<string, string>();
      const oldToNewRelationId = new Map<string, string>();
      const oldToNewMemoId = new Map<string, string>();

      // テーブルとカラムのIDマッピングを作成
      for (const table of diagram.tables ?? []) {
        const newTableId = uuidv4();
        oldToNewTableId.set(table.id, newTableId);
        for (const column of table.columns ?? []) {
          oldToNewColumnId.set(column.id, uuidv4());
        }
      }

      // リレーションのIDマッピングを作成
      for (const relation of diagram.relations ?? []) {
        oldToNewRelationId.set(relation.id, uuidv4());
      }

      // メモのIDマッピングを作成
      for (const memo of diagram.memos ?? []) {
        oldToNewMemoId.set(memo.id, uuidv4());
      }

      // テーブルを変換（新しいIDを付与し、位置をずらす）
      const newTables: Table[] = (diagram.tables ?? []).map((table) => ({
        ...table,
        id: oldToNewTableId.get(table.id) ?? uuidv4(),
        position: {
          x: (table.position?.x ?? 0) + 50,
          y: (table.position?.y ?? 0) + 50,
        },
        columns: (table.columns ?? []).map((column) => ({
          ...column,
          id: oldToNewColumnId.get(column.id) ?? uuidv4(),
          constraints: {
            ...column.constraints,
            // Ref型の参照先テーブルIDを更新
            refTableId: column.constraints?.refTableId
              ? oldToNewTableId.get(column.constraints.refTableId) ?? column.constraints.refTableId
              : column.constraints?.refTableId,
          },
        })) as Column[],
      }));

      // リレーションを変換
      const newRelations: Relation[] = (diagram.relations ?? []).map((relation) => ({
        ...relation,
        id: oldToNewRelationId.get(relation.id) ?? uuidv4(),
        sourceTableId: oldToNewTableId.get(relation.sourceTableId) ?? relation.sourceTableId,
        targetTableId: oldToNewTableId.get(relation.targetTableId) ?? relation.targetTableId,
        sourceColumnId: relation.sourceColumnId
          ? oldToNewColumnId.get(relation.sourceColumnId) ?? relation.sourceColumnId
          : relation.sourceColumnId,
        targetColumnId: relation.targetColumnId
          ? oldToNewColumnId.get(relation.targetColumnId) ?? relation.targetColumnId
          : relation.targetColumnId,
      }));

      // メモを変換（位置をずらす）
      const newMemos: Memo[] = (diagram.memos ?? []).map((memo) => ({
        ...memo,
        id: oldToNewMemoId.get(memo.id) ?? uuidv4(),
        position: {
          x: (memo.position?.x ?? 0) + 50,
          y: (memo.position?.y ?? 0) + 50,
        },
      }));

      set((state) => {
        // 既存のテーブル、リレーション、メモに追加
        state.tables = [...state.tables, ...newTables];
        state.relations = [...state.relations, ...newRelations];
        state.memos = [...state.memos, ...newMemos];

        // 新しいテーブルのサンプルデータを追加
        for (const table of newTables) {
          state.sampleDataByTableId[table.id] = syncSampleRowsToTableSchema({ table, currentRows: undefined });
        }

        // 追加されたテーブルを選択状態にするためにIDを保持
        state.pendingSelectedTableIds = new Set(newTables.map((t) => t.id));
      });
      get().saveHistory('ダイアグラムを追加');
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
        state.selectedRelationId = null;
      });
      get().saveHistory('ダイアグラムをクリア');
      get().queueSaveToDB();
    },

    clearPendingSelectedTableIds: () => {
      set((state) => {
        state.pendingSelectedTableIds = new Set();
      });
    },
  };
};
