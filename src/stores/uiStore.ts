import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, Language, Theme, FontSize, AppSettings } from '../types';
import { getDefaultNoteParamOutputSettings } from '../lib/appsheet/noteParameters';

interface UIState {
  // ビュー状態
  viewMode: ViewMode;
  
  // キャンバス状態
  zoom: number;
  panPosition: { x: number; y: number };
  
  // ダイアログ状態
  isSettingsOpen: boolean;
  isProjectDialogOpen: boolean;
  isImportDialogOpen: boolean;
  isExportDialogOpen: boolean;
  isAboutDialogOpen: boolean;
  
  // サイドバー
  isSidebarOpen: boolean;
  sidebarWidth: number;

  // ユーザー設定UI（開閉状態など）
  isTableCreationRulesOpen: boolean;
  isCommonColumnsOpen: boolean;
  isBackupSettingsOpen: boolean;
  isNoteParamsSettingsOpen: boolean;

  // ERエディタ表示
  isRelationHighlightEnabled: boolean;
  isGridVisible: boolean;
  isMemosVisible: boolean;
  
  // 設定
  settings: AppSettings;
  
  // アクション
  setViewMode: (mode: ViewMode) => void;
  setZoom: (zoom: number) => void;
  setPanPosition: (position: { x: number; y: number }) => void;
  
  // ダイアログ操作
  openSettings: () => void;
  closeSettings: () => void;
  openProjectDialog: () => void;
  closeProjectDialog: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;
  openAboutDialog: () => void;
  closeAboutDialog: () => void;
  
  // サイドバー操作
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  // ユーザー設定UI操作
  toggleTableCreationRulesOpen: () => void;
  toggleCommonColumnsOpen: () => void;
  toggleBackupSettingsOpen: () => void;
  toggleNoteParamsSettingsOpen: () => void;

  // Note Parameters 出力設定操作
  updateNoteParamOutputSetting: (key: string, enabled: boolean) => void;
  resetNoteParamOutputSettings: () => void;

  // ERエディタ表示操作
  toggleRelationHighlight: () => void;
  toggleGridVisible: () => void;
  toggleMemosVisible: () => void;
  
  // 設定操作
  updateSettings: (settings: Partial<AppSettings>) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
  setFontSize: (fontSize: FontSize) => void;
}

const defaultSettings: AppSettings = {
  language: 'ja',
  theme: 'system',
  fontSize: 'medium',
  showNoteParamsSupportPanel: true,
  noteParamOutputSettings: getDefaultNoteParamOutputSettings(),
  autoBackupEnabled: true,
  autoBackupIntervalMinutes: 5,
  backupRetentionDays: 7,
  backupLocation: '',
  tableNamePrefix: '',
  tableNameSuffix: '',
  keyColumnPrefix: '',
  keyColumnSuffix: '',
  defaultKeyColumnName: '',
  commonColumns: [],
  relationLabelInitialMode: 'auto',
  relationLabelInitialCustomText: '',
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      // 初期状態
      viewMode: 'editor',
      zoom: 1,
      panPosition: { x: 0, y: 0 },
      isSettingsOpen: false,
      isProjectDialogOpen: false,
      isImportDialogOpen: false,
      isExportDialogOpen: false,
      isAboutDialogOpen: false,
      isSidebarOpen: true,
      sidebarWidth: 280,
      isTableCreationRulesOpen: true,
      isCommonColumnsOpen: true,
      isBackupSettingsOpen: true,
      isNoteParamsSettingsOpen: false,
      isRelationHighlightEnabled: true,
      isGridVisible: true,
      isMemosVisible: true,
      settings: defaultSettings,
      
      // ビュー操作
      setViewMode: (mode) => set({ viewMode: mode }),
      setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(3, zoom)) }),
      setPanPosition: (position) => set({ panPosition: position }),
      
      // ダイアログ操作
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
      openProjectDialog: () => set({ isProjectDialogOpen: true }),
      closeProjectDialog: () => set({ isProjectDialogOpen: false }),
      openImportDialog: () => set({ isImportDialogOpen: true }),
      closeImportDialog: () => set({ isImportDialogOpen: false }),
      openExportDialog: () => set({ isExportDialogOpen: true }),
      closeExportDialog: () => set({ isExportDialogOpen: false }),
      openAboutDialog: () => set({ isAboutDialogOpen: true }),
      closeAboutDialog: () => set({ isAboutDialogOpen: false }),
      
      // サイドバー操作
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),

      // ユーザー設定UI操作
      toggleTableCreationRulesOpen: () =>
        set((state) => ({ isTableCreationRulesOpen: !state.isTableCreationRulesOpen })),
      toggleCommonColumnsOpen: () =>
        set((state) => ({ isCommonColumnsOpen: !state.isCommonColumnsOpen })),
      toggleBackupSettingsOpen: () =>
        set((state) => ({ isBackupSettingsOpen: !state.isBackupSettingsOpen })),
      toggleNoteParamsSettingsOpen: () =>
        set((state) => ({ isNoteParamsSettingsOpen: !state.isNoteParamsSettingsOpen })),

      // Note Parameters 出力設定操作
      updateNoteParamOutputSetting: (key: string, enabled: boolean) =>
        set((state) => ({
          settings: {
            ...state.settings,
            noteParamOutputSettings: {
              ...(state.settings.noteParamOutputSettings ?? getDefaultNoteParamOutputSettings()),
              [key]: enabled,
            },
          },
        })),
      resetNoteParamOutputSettings: () =>
        set((state) => ({
          settings: {
            ...state.settings,
            noteParamOutputSettings: getDefaultNoteParamOutputSettings(),
          },
        })),

      // ERエディタ表示操作
      toggleRelationHighlight: () =>
        set((state) => ({ isRelationHighlightEnabled: !state.isRelationHighlightEnabled })),

      toggleGridVisible: () => set((state) => ({ isGridVisible: !state.isGridVisible })),

      toggleMemosVisible: () => set((state) => ({ isMemosVisible: !state.isMemosVisible })),
      
      // 設定操作
      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),
      setLanguage: (language) =>
        set((state) => ({
          settings: { ...state.settings, language },
        })),
      setTheme: (theme) =>
        set((state) => ({
          settings: { ...state.settings, theme },
        })),
      setFontSize: (fontSize) =>
        set((state) => ({
          settings: { ...state.settings, fontSize },
        })),
    }),
    {
      name: 'waiwaier-ui',
      version: 1,
      migrate: (persisted: unknown) => {
        if (typeof persisted !== 'object' || persisted === null) return persisted as UIState;
        const state = persisted as UIState;
        const settings = (state as unknown as { settings?: AppSettings }).settings;
        const output = settings?.noteParamOutputSettings as unknown;

        if (output && typeof output === 'object' && !Array.isArray(output)) {
          const out = output as Record<string, unknown>;
          // Backward compatibility: `DEFAULT` -> `Default`
          if (typeof out.DEFAULT === 'boolean' && typeof out.Default !== 'boolean') {
            out.Default = out.DEFAULT;
          }
          if (Object.prototype.hasOwnProperty.call(out, 'DEFAULT')) {
            delete out.DEFAULT;
          }
        }

        return state;
      },
      partialize: (state) => ({
        settings: state.settings,
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
        isTableCreationRulesOpen: state.isTableCreationRulesOpen,
        isCommonColumnsOpen: state.isCommonColumnsOpen,
        isBackupSettingsOpen: state.isBackupSettingsOpen,
        isNoteParamsSettingsOpen: state.isNoteParamsSettingsOpen,
        isRelationHighlightEnabled: state.isRelationHighlightEnabled,
        isGridVisible: state.isGridVisible,
        isMemosVisible: state.isMemosVisible,
      }),
    }
  )
);
