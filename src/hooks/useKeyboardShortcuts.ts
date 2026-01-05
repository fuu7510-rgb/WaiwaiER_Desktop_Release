/**
 * キーボードショートカットを処理するカスタムフック
 */
import { useEffect, useCallback } from 'react';
import { useUIStore, useERStore, useProjectStore } from '../stores';
import { matchesShortcut, getMergedShortcutKeys } from '../lib/shortcuts';
import type { ShortcutActionId } from '../types';

interface UseKeyboardShortcutsOptions {
  /** ショートカットを有効にするか（デフォルト: true） */
  enabled?: boolean;
  /** fitView コールバック（ReactFlow コンテキスト内から渡す） */
  onFitView?: () => void;
}

/**
 * グローバルキーボードショートカットを処理するフック
 * App.tsx などのトップレベルで使用する
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true, onFitView } = options;

  const {
    settings,
    viewMode,
    setViewMode,
    openSettings,
    openProjectDialog,
    openImportDialog,
    openExportDialog,
    toggleSidebar,
    toggleGridVisible,
    toggleMemosVisible,
    toggleRelationHighlight,
    zoom,
    setZoom,
    isSettingsOpen,
    isProjectDialogOpen,
    isImportDialogOpen,
    isExportDialogOpen,
    isAboutDialogOpen,
  } = useUIStore();

  const { undo, redo, addTable, historyIndex, history, saveToDB } = useERStore();
  const { currentProjectId } = useProjectStore();

  // ダイアログが開いているときはショートカットを無効化
  const isAnyDialogOpen =
    isSettingsOpen ||
    isProjectDialogOpen ||
    isImportDialogOpen ||
    isExportDialogOpen ||
    isAboutDialogOpen;

  const shortcutKeys = getMergedShortcutKeys(settings.shortcutKeys);

  const executeAction = useCallback(
    (actionId: ShortcutActionId): boolean => {
      switch (actionId) {
        case 'openProjectDialog':
          openProjectDialog();
          return true;
        case 'openSettings':
          openSettings();
          return true;
        case 'openImportDialog':
          openImportDialog();
          return true;
        case 'openExportDialog':
          openExportDialog();
          return true;
        case 'toggleSidebar':
          if (viewMode === 'editor') {
            toggleSidebar();
            return true;
          }
          return false;
        case 'toggleViewMode':
          setViewMode(viewMode === 'editor' ? 'simulator' : 'editor');
          return true;
        case 'undo':
          if (historyIndex > 0) {
            undo();
            return true;
          }
          return false;
        case 'redo':
          if (historyIndex < history.length - 1) {
            redo();
            return true;
          }
          return false;
        case 'addTable':
          if (viewMode === 'editor') {
            addTable(`Table${Date.now() % 10000}`, { x: 100, y: 100 });
            return true;
          }
          return false;
        case 'toggleGrid':
          if (viewMode === 'editor') {
            toggleGridVisible();
            return true;
          }
          return false;
        case 'toggleMemos':
          if (viewMode === 'editor') {
            toggleMemosVisible();
            return true;
          }
          return false;
        case 'toggleRelationHighlight':
          if (viewMode === 'editor') {
            toggleRelationHighlight();
            return true;
          }
          return false;
        case 'zoomIn':
          if (viewMode === 'editor') {
            setZoom(Math.min(zoom + 0.1, 3));
            return true;
          }
          return false;
        case 'zoomOut':
          if (viewMode === 'editor') {
            setZoom(Math.max(zoom - 0.1, 0.1));
            return true;
          }
          return false;
        case 'fitView':
          if (viewMode === 'editor' && onFitView) {
            onFitView();
            return true;
          }
          return false;
        case 'save':
          if (currentProjectId) {
            void saveToDB();
            return true;
          }
          return false;
        default:
          return false;
      }
    },
    [
      viewMode,
      historyIndex,
      history.length,
      zoom,
      currentProjectId,
      openProjectDialog,
      openSettings,
      openImportDialog,
      openExportDialog,
      toggleSidebar,
      setViewMode,
      undo,
      redo,
      addTable,
      toggleGridVisible,
      toggleMemosVisible,
      toggleRelationHighlight,
      setZoom,
      onFitView,
      saveToDB,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // ダイアログが開いているときは処理しない
      if (isAnyDialogOpen) return;

      // 入力フィールドにフォーカスがある場合は処理しない
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // 各ショートカットをチェック
      for (const [actionId, key] of Object.entries(shortcutKeys)) {
        if (matchesShortcut(key, e)) {
          const handled = executeAction(actionId as ShortcutActionId);
          if (handled) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          // 同じキーが複数アクションに割り当てられている場合に備えて、
          // handled=false なら次の候補もチェックする。
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, isAnyDialogOpen, shortcutKeys, executeAction]);

  return {
    executeAction,
    shortcutKeys,
  };
}
