import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ViewMode, Language, Theme, AppSettings } from '../types';

interface UIState {
  // ビュー状態
  viewMode: ViewMode;
  
  // キャンバス状態
  zoom: number;
  panPosition: { x: number; y: number };
  
  // ダイアログ状態
  isSettingsOpen: boolean;
  isProjectDialogOpen: boolean;
  isExportDialogOpen: boolean;
  isAboutDialogOpen: boolean;
  
  // サイドバー
  isSidebarOpen: boolean;
  sidebarWidth: number;

  // ERエディタ表示
  isRelationHighlightEnabled: boolean;
  isGridVisible: boolean;
  
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
  openExportDialog: () => void;
  closeExportDialog: () => void;
  openAboutDialog: () => void;
  closeAboutDialog: () => void;
  
  // サイドバー操作
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;

  // ERエディタ表示操作
  toggleRelationHighlight: () => void;
  toggleGridVisible: () => void;
  
  // 設定操作
  updateSettings: (settings: Partial<AppSettings>) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: Theme) => void;
}

const defaultSettings: AppSettings = {
  language: 'ja',
  theme: 'system',
  autoBackupEnabled: true,
  autoBackupIntervalMinutes: 5,
  backupRetentionDays: 7,
  backupLocation: '',
  tableNamePrefix: '',
  tableNameSuffix: '',
  keyColumnPrefix: '',
  keyColumnSuffix: '',
  defaultKeyColumnName: '',
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
      isExportDialogOpen: false,
      isAboutDialogOpen: false,
      isSidebarOpen: true,
      sidebarWidth: 280,
      isRelationHighlightEnabled: true,
      isGridVisible: true,
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
      openExportDialog: () => set({ isExportDialogOpen: true }),
      closeExportDialog: () => set({ isExportDialogOpen: false }),
      openAboutDialog: () => set({ isAboutDialogOpen: true }),
      closeAboutDialog: () => set({ isAboutDialogOpen: false }),
      
      // サイドバー操作
      toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
      setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(500, width)) }),

      // ERエディタ表示操作
      toggleRelationHighlight: () =>
        set((state) => ({ isRelationHighlightEnabled: !state.isRelationHighlightEnabled })),

      toggleGridVisible: () => set((state) => ({ isGridVisible: !state.isGridVisible })),
      
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
    }),
    {
      name: 'waiwaier-ui',
      partialize: (state) => ({
        settings: state.settings,
        isSidebarOpen: state.isSidebarOpen,
        sidebarWidth: state.sidebarWidth,
        isRelationHighlightEnabled: state.isRelationHighlightEnabled,
        isGridVisible: state.isGridVisible,
      }),
    }
  )
);
