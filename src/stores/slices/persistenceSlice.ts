/**
 * 永続化およびインポート/エクスポートスライス
 */
import type { ERDiagram } from '../../types';
import type { PersistenceState, PersistenceActions, ImportExportActions, SliceCreator } from './types';
import { saveDiagram, loadDiagram, loadSampleData, saveSampleData } from '../../lib/database';
import { toast } from '../toastStore';
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
  };
};
