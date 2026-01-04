/**
 * 設定のインポート/エクスポート時のシリアライズ・バリデーション処理
 */

import type { ColumnType, ColumnConstraints, CommonColumnDefinition, AppSettings } from '../../types';
import { APPSHEET_COLUMN_TYPES } from '../../types';
import { NOTE_PARAM_STATUS } from '../appsheet/noteParameters';

/** 設定ファイルのスキーマバージョン */
export const SETTINGS_SCHEMA_VERSION = 1;

/**
 * 設定ファイル名を日付付きで生成
 */
export function generateSettingsFileName(): string {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `waiwaier-settings-${yyyy}${mm}${dd}.json`;
}

/**
 * 値を数値に変換（無効な場合はnull）
 */
export function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/**
 * ColumnConstraintsをバリデートして安全なオブジェクトに変換
 */
function coerceConstraints(v: unknown): ColumnConstraints {
  if (typeof v !== 'object' || v === null) return {};
  const c = v as Record<string, unknown>;
  const out: ColumnConstraints = {};
  if (typeof c.required === 'boolean') out.required = c.required;
  if (typeof c.unique === 'boolean') out.unique = c.unique;
  if (typeof c.defaultValue === 'string') out.defaultValue = c.defaultValue;
  if (typeof c.minValue === 'number') out.minValue = c.minValue;
  if (typeof c.maxValue === 'number') out.maxValue = c.maxValue;
  if (typeof c.minLength === 'number') out.minLength = c.minLength;
  if (typeof c.maxLength === 'number') out.maxLength = c.maxLength;
  if (typeof c.pattern === 'string') out.pattern = c.pattern;
  if (Array.isArray(c.enumValues)) {
    out.enumValues = c.enumValues.map((x) => String(x).trim()).filter((s) => s.length > 0);
  }
  return out;
}

/**
 * 文字列がColumnTypeかどうか判定
 */
function isColumnType(v: unknown): v is ColumnType {
  if (typeof v !== 'string') return false;
  return [...APPSHEET_COLUMN_TYPES, 'UniqueID'].includes(v as ColumnType);
}

/**
 * インポートされた設定をバリデート・サニタイズ
 * @param value - JSONからパースされた値
 * @returns 有効な設定のPartial（無効な場合はnull）
 */
export function sanitizeImportedSettings(value: unknown): Partial<AppSettings> | null {
  const source =
    typeof value === 'object' && value !== null && 'settings' in value
      ? (value as { settings: unknown }).settings
      : value;

  if (typeof source !== 'object' || source === null) return null;
  const obj = source as Record<string, unknown>;

  const next: Partial<AppSettings> = {};

  // enum
  if (obj.language === 'ja' || obj.language === 'en') next.language = obj.language;
  if (obj.theme === 'light' || obj.theme === 'dark' || obj.theme === 'system') next.theme = obj.theme;
  if (obj.fontSize === 'small' || obj.fontSize === 'medium' || obj.fontSize === 'large') next.fontSize = obj.fontSize;
  if (obj.relationLabelInitialMode === 'auto' || obj.relationLabelInitialMode === 'hidden' || obj.relationLabelInitialMode === 'custom') {
    next.relationLabelInitialMode = obj.relationLabelInitialMode;
  }
  if (obj.edgeLineStyle === 'solid' || obj.edgeLineStyle === 'dashed' || obj.edgeLineStyle === 'dotted') {
    next.edgeLineStyle = obj.edgeLineStyle;
  }

  // boolean
  if (typeof obj.autoBackupEnabled === 'boolean') next.autoBackupEnabled = obj.autoBackupEnabled;
  if (typeof obj.showNoteParamsSupportPanel === 'boolean') next.showNoteParamsSupportPanel = obj.showNoteParamsSupportPanel;
  if (typeof obj.edgeAnimationEnabled === 'boolean') next.edgeAnimationEnabled = obj.edgeAnimationEnabled;
  if (typeof obj.edgeFollowerIconEnabled === 'boolean') next.edgeFollowerIconEnabled = obj.edgeFollowerIconEnabled;

  // number
  const autoBackupIntervalMinutes = coerceNumber(obj.autoBackupIntervalMinutes);
  if (autoBackupIntervalMinutes !== null) next.autoBackupIntervalMinutes = Math.max(1, Math.min(60, Math.trunc(autoBackupIntervalMinutes)));

  const backupRetentionDays = coerceNumber(obj.backupRetentionDays);
  if (backupRetentionDays !== null) next.backupRetentionDays = Math.max(1, Math.min(30, Math.trunc(backupRetentionDays)));

  const edgeFollowerIconSize = coerceNumber(obj.edgeFollowerIconSize);
  if (edgeFollowerIconSize !== null) next.edgeFollowerIconSize = Math.max(8, Math.min(48, Math.trunc(edgeFollowerIconSize)));

  const edgeFollowerIconSpeed = coerceNumber(obj.edgeFollowerIconSpeed);
  if (edgeFollowerIconSpeed !== null) next.edgeFollowerIconSpeed = Math.max(10, Math.min(1000, edgeFollowerIconSpeed));

  // string
  if (typeof obj.backupLocation === 'string') next.backupLocation = obj.backupLocation;
  if (typeof obj.tableNamePrefix === 'string') next.tableNamePrefix = obj.tableNamePrefix;
  if (typeof obj.tableNameSuffix === 'string') next.tableNameSuffix = obj.tableNameSuffix;
  if (typeof obj.keyColumnPrefix === 'string') next.keyColumnPrefix = obj.keyColumnPrefix;
  if (typeof obj.keyColumnSuffix === 'string') next.keyColumnSuffix = obj.keyColumnSuffix;
  if (typeof obj.defaultKeyColumnName === 'string') next.defaultKeyColumnName = obj.defaultKeyColumnName;
  if (typeof obj.relationLabelInitialCustomText === 'string') next.relationLabelInitialCustomText = obj.relationLabelInitialCustomText;

  if (typeof obj.edgeFollowerIconName === 'string') next.edgeFollowerIconName = obj.edgeFollowerIconName;

  // commonColumns
  if (Array.isArray(obj.commonColumns)) {
    const rawList = obj.commonColumns as unknown[];
    const nextCommon: CommonColumnDefinition[] = [];
    for (const item of rawList) {
      if (typeof item !== 'object' || item === null) continue;
      const it = item as Record<string, unknown>;
      const id = typeof it.id === 'string' ? it.id : '';
      const name = typeof it.name === 'string' ? it.name : '';
      const type = isColumnType(it.type) ? it.type : 'Text';
      const constraints = coerceConstraints(it.constraints);
      const appSheet = (typeof it.appSheet === 'object' && it.appSheet !== null) ? (it.appSheet as Record<string, unknown>) : undefined;

      if (!id) continue;
      nextCommon.push({ id, name, type, constraints, appSheet });
    }
    next.commonColumns = nextCommon;
  }

  // noteParamOutputSettings
  if (typeof obj.noteParamOutputSettings === 'object' && obj.noteParamOutputSettings !== null) {
    const raw = obj.noteParamOutputSettings as Record<string, unknown>;
    const validKeys = NOTE_PARAM_STATUS.map((p) => p.key);
    const nextSettings: Record<string, boolean> = {};

    // Backward compatibility: migrate legacy key `DEFAULT` -> `Default`
    if (typeof raw.DEFAULT === 'boolean' && typeof raw.Default !== 'boolean') {
      raw.Default = raw.DEFAULT;
    }

    for (const key of validKeys) {
      if (typeof raw[key] === 'boolean') {
        nextSettings[key] = raw[key];
      }
    }
    if (Object.keys(nextSettings).length > 0) {
      next.noteParamOutputSettings = nextSettings;
    }
  }

  // shortcutKeys
  if (typeof obj.shortcutKeys === 'object' && obj.shortcutKeys !== null) {
    const raw = obj.shortcutKeys as Record<string, unknown>;
    const nextShortcuts: Record<string, string> = {};
    for (const [key, val] of Object.entries(raw)) {
      if (typeof val === 'string') {
        nextShortcuts[key] = val;
      }
    }
    if (Object.keys(nextShortcuts).length > 0) {
      next.shortcutKeys = nextShortcuts;
    }
  }

  return Object.keys(next).length > 0 ? next : null;
}
