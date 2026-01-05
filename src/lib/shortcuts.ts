/**
 * ショートカットキー関連の定義とヘルパー
 */
import type { ShortcutActionDefinition, ShortcutKeySettings } from '../types';

/**
 * ショートカットアクションの定義一覧
 */
export const SHORTCUT_ACTIONS: ShortcutActionDefinition[] = [
  // ファイル操作
  {
    id: 'openProjectDialog',
    labelKey: 'settings.shortcuts.actions.openProjectDialog',
    defaultKey: 'Ctrl+O',
    category: 'file',
  },
  {
    id: 'save',
    labelKey: 'settings.shortcuts.actions.save',
    defaultKey: 'Ctrl+S',
    category: 'file',
  },
  {
    id: 'openImportDialog',
    labelKey: 'settings.shortcuts.actions.openImportDialog',
    defaultKey: 'Ctrl+I',
    category: 'file',
  },
  {
    id: 'openExportDialog',
    labelKey: 'settings.shortcuts.actions.openExportDialog',
    defaultKey: 'Ctrl+E',
    category: 'file',
  },
  {
    id: 'openSettings',
    labelKey: 'settings.shortcuts.actions.openSettings',
    defaultKey: 'Ctrl+,',
    category: 'file',
  },
  // 編集操作
  {
    id: 'undo',
    labelKey: 'settings.shortcuts.actions.undo',
    defaultKey: 'Ctrl+Z',
    category: 'edit',
  },
  {
    id: 'redo',
    labelKey: 'settings.shortcuts.actions.redo',
    defaultKey: 'Ctrl+Y',
    category: 'edit',
  },
  {
    id: 'addTable',
    labelKey: 'settings.shortcuts.actions.addTable',
    defaultKey: 'Ctrl+T',
    category: 'edit',
  },
  // 表示操作
  {
    id: 'toggleSidebar',
    labelKey: 'settings.shortcuts.actions.toggleSidebar',
    defaultKey: 'Ctrl+B',
    category: 'view',
  },
  {
    id: 'toggleGrid',
    labelKey: 'settings.shortcuts.actions.toggleGrid',
    defaultKey: 'Ctrl+G',
    category: 'view',
  },
  {
    id: 'toggleMemos',
    labelKey: 'settings.shortcuts.actions.toggleMemos',
    defaultKey: 'Ctrl+M',
    category: 'view',
  },
  {
    id: 'toggleRelationHighlight',
    labelKey: 'settings.shortcuts.actions.toggleRelationHighlight',
    defaultKey: 'Ctrl+H',
    category: 'view',
  },
  {
    id: 'zoomIn',
    labelKey: 'settings.shortcuts.actions.zoomIn',
    defaultKey: 'Ctrl+=',
    category: 'view',
  },
  {
    id: 'zoomOut',
    labelKey: 'settings.shortcuts.actions.zoomOut',
    defaultKey: 'Ctrl+-',
    category: 'view',
  },
  {
    id: 'fitView',
    labelKey: 'settings.shortcuts.actions.fitView',
    defaultKey: 'Ctrl+0',
    category: 'view',
  },
  // ナビゲーション
  {
    id: 'toggleViewMode',
    labelKey: 'settings.shortcuts.actions.toggleViewMode',
    defaultKey: 'Tab',
    category: 'navigation',
  },
];

/**
 * デフォルトのショートカットキー設定を取得
 */
export function getDefaultShortcutKeys(): ShortcutKeySettings {
  const defaults: Record<string, string> = {};
  for (const action of SHORTCUT_ACTIONS) {
    defaults[action.id] = action.defaultKey;
  }
  return defaults as ShortcutKeySettings;
}

/**
 * ユーザー設定とデフォルト設定をマージして完全なショートカットキー設定を取得
 */
export function getMergedShortcutKeys(
  userSettings: Partial<ShortcutKeySettings> | undefined
): ShortcutKeySettings {
  const defaults = getDefaultShortcutKeys();
  if (!userSettings) return defaults;

  // 後方互換: 旧設定（switchToEditor/switchToSimulator）が存在し、
  // 新設定（toggleViewMode）が未設定なら引き継ぐ。
  const merged = { ...defaults, ...userSettings } as Record<string, string>;
  if (!merged.toggleViewMode) {
    const legacy = merged.switchToEditor || merged.switchToSimulator;
    if (legacy) merged.toggleViewMode = legacy;
  }

  return merged as ShortcutKeySettings;
}

/**
 * キーイベントからショートカットキー文字列を生成
 * 例: "Ctrl+Shift+S"
 */
export function keyEventToShortcutString(e: KeyboardEvent): string {
  const parts: string[] = [];
  
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  
  // 特殊キーの処理
  const key = e.key;
  if (key === ' ') {
    parts.push('Space');
  } else if (key === 'Escape') {
    parts.push('Esc');
  } else if (key === 'ArrowUp') {
    parts.push('Up');
  } else if (key === 'ArrowDown') {
    parts.push('Down');
  } else if (key === 'ArrowLeft') {
    parts.push('Left');
  } else if (key === 'ArrowRight') {
    parts.push('Right');
  } else if (!['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    // 修飾キー以外は追加
    parts.push(key.length === 1 ? key.toUpperCase() : key);
  }
  
  return parts.join('+');
}

/**
 * ショートカットキー文字列がキーイベントと一致するか判定
 */
export function matchesShortcut(shortcut: string, e: KeyboardEvent): boolean {
  if (!shortcut) return false;
  
  const parts = shortcut.split('+').map((p) => p.trim().toLowerCase());
  
  const hasCtrl = parts.includes('ctrl') || parts.includes('cmd');
  const hasAlt = parts.includes('alt');
  const hasShift = parts.includes('shift');
  
  // 修飾キーの一致確認
  if ((e.ctrlKey || e.metaKey) !== hasCtrl) return false;
  if (e.altKey !== hasAlt) return false;
  if (e.shiftKey !== hasShift) return false;
  
  // キー部分の取得（修飾キーを除く）
  const keyParts = parts.filter(
    (p) => !['ctrl', 'cmd', 'alt', 'shift'].includes(p)
  );
  if (keyParts.length !== 1) return false;
  
  const expectedKey = keyParts[0];
  const actualKey = e.key.toLowerCase();
  
  // 特殊キーのマッピング
  const keyMappings: Record<string, string[]> = {
    space: [' '],
    esc: ['escape'],
    up: ['arrowup'],
    down: ['arrowdown'],
    left: ['arrowleft'],
    right: ['arrowright'],
    '=': ['=', '+'],
    '-': ['-', '_'],
  };
  
  if (expectedKey === actualKey) return true;
  if (keyMappings[expectedKey]?.includes(actualKey)) return true;
  
  return false;
}

/**
 * ショートカットキー文字列を表示用にフォーマット
 * OSに応じてCtrl/Cmdを変換
 */
export function formatShortcutForDisplay(shortcut: string): string {
  if (!shortcut) return '';
  
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  
  if (isMac) {
    return shortcut
      .replace(/Ctrl\+/gi, '⌘')
      .replace(/Alt\+/gi, '⌥')
      .replace(/Shift\+/gi, '⇧');
  }
  
  return shortcut;
}

/**
 * カテゴリでグループ化されたアクション一覧を取得
 */
export function getShortcutActionsByCategory(): Record<
  ShortcutActionDefinition['category'],
  ShortcutActionDefinition[]
> {
  const result: Record<ShortcutActionDefinition['category'], ShortcutActionDefinition[]> = {
    file: [],
    edit: [],
    view: [],
    navigation: [],
  };
  
  for (const action of SHORTCUT_ACTIONS) {
    result[action.category].push(action);
  }
  
  return result;
}
