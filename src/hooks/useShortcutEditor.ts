import { useState, useCallback, useMemo } from 'react';
import type { ShortcutActionId } from '../types';
import {
  getShortcutActionsByCategory,
  getMergedShortcutKeys,
  keyEventToShortcutString,
} from '../lib/shortcuts';

interface UseShortcutEditorOptions {
  shortcutKeys: Record<string, string>;
  updateShortcutKey: (actionId: ShortcutActionId, key: string) => void;
}

interface UseShortcutEditorReturn {
  /** カテゴリ別ショートカットアクション */
  shortcutActionsByCategory: ReturnType<typeof getShortcutActionsByCategory>;
  /** マージされたショートカットキー設定 */
  mergedShortcutKeys: Record<string, string>;
  /** 編集中のアクションID */
  editingShortcutId: ShortcutActionId | null;
  /** 記録中のキー（表示用） */
  recordingKey: string;
  /** 編集開始 */
  startEditing: (actionId: ShortcutActionId) => void;
  /** 編集キャンセル */
  cancelEditing: () => void;
  /** ショートカットクリア */
  clearShortcut: (actionId: ShortcutActionId) => void;
  /** キー入力ハンドラ */
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, actionId: ShortcutActionId) => void;
  /** 編集状態をリセット */
  resetEditingState: () => void;
}

/**
 * ショートカットキー編集用のカスタムフック
 */
export function useShortcutEditor({
  shortcutKeys,
  updateShortcutKey,
}: UseShortcutEditorOptions): UseShortcutEditorReturn {
  const [editingShortcutId, setEditingShortcutId] = useState<ShortcutActionId | null>(null);
  const [recordingKey, setRecordingKey] = useState<string>('');

  const shortcutActionsByCategory = useMemo(() => getShortcutActionsByCategory(), []);
  const mergedShortcutKeys = useMemo(() => getMergedShortcutKeys(shortcutKeys), [shortcutKeys]);

  const startEditing = useCallback((actionId: ShortcutActionId) => {
    setEditingShortcutId(actionId);
    setRecordingKey('');
  }, []);

  const cancelEditing = useCallback(() => {
    setEditingShortcutId(null);
    setRecordingKey('');
  }, []);

  const clearShortcut = useCallback((actionId: ShortcutActionId) => {
    updateShortcutKey(actionId, '');
  }, [updateShortcutKey]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, actionId: ShortcutActionId) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Escapeでキャンセル
    if (e.key === 'Escape') {
      setEditingShortcutId(null);
      setRecordingKey('');
      return;
    }
    
    // 修飾キーだけの場合は無視
    if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
      return;
    }
    
    const shortcutString = keyEventToShortcutString(e.nativeEvent);
    if (shortcutString) {
      updateShortcutKey(actionId, shortcutString);
      setEditingShortcutId(null);
      setRecordingKey('');
    }
  }, [updateShortcutKey]);

  const resetEditingState = useCallback(() => {
    setEditingShortcutId(null);
    setRecordingKey('');
  }, []);

  return {
    shortcutActionsByCategory,
    mergedShortcutKeys,
    editingShortcutId,
    recordingKey,
    startEditing,
    cancelEditing,
    clearShortcut,
    handleKeyDown,
    resetEditingState,
  };
}
