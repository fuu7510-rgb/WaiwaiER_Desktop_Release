import type { Table, NoteParamOutputSettings } from '../../types';
import { getDefaultNoteParamOutputSettings } from './noteParameters';

// Rust側の src-tauri/src/excel.rs と同等の最小ロジックで
// Excelヘッダーセルに書き込む Note（AppSheet Note Parameters）文字列を生成する。
//
// NOTE:
// - ユーザー設定に従って出力するキーを決定する。
// - ここは「プレビュー」用。実際のエクスポートはRust側が正とする。

type AppSheetRecord = Record<string, unknown>;

const RAW_NOTE_OVERRIDE_KEY = '__AppSheetNoteOverride';

function shouldOutputNoteParam(key: string, userSettings: NoteParamOutputSettings | undefined): boolean {
  // 保存された設定を最優先する。
  // userSettings が存在する場合、未定義キーは false として扱い、最新デフォルトにフォールバックしない。
  if (userSettings) {
    return userSettings[key] ?? false;
  }

  // 未保存（設定なし）の場合のみデフォルト設定を使用
  const defaultSettings = getDefaultNoteParamOutputSettings();
  return defaultSettings[key] ?? false;
}

function userHas(appSheet: AppSheetRecord | undefined, key: string): boolean {
  return Boolean(appSheet && Object.prototype.hasOwnProperty.call(appSheet, key));
}

function pickEffectiveLabelColumnId(table: Table): string | null {
  const labelColumns = table.columns.filter((c) => c.isLabel);
  if (labelColumns.length === 0) return null;
  labelColumns.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  return labelColumns[0]?.id ?? null;
}

function generateColumnNote(column: Table['columns'][number], userSettings: NoteParamOutputSettings | undefined): string {
  // docs/AppSheet/MEMO_SETUP.md の形式: AppSheet:{...}
  const appSheet = (column.appSheet ?? undefined) as AppSheetRecord | undefined;

  const rawOverride = appSheet?.[RAW_NOTE_OVERRIDE_KEY];
  if (typeof rawOverride === 'string' && rawOverride.trim().length > 0) {
    // 完全上書き（文字列はそのまま保持）
    return rawOverride;
  }

  const requiredIf = appSheet?.['Required_If'];
  const userRequiredIfNonEmpty =
    typeof requiredIf === 'string' ? requiredIf.trim().length > 0 : false;

  const data: Record<string, unknown> = {};

  // Type (✅ Verified)
  if (shouldOutputNoteParam('Type', userSettings) && !userHas(appSheet, 'Type')) {
    data['Type'] = column.type;
  }

  // IsKey (✅ Verified)
  if (shouldOutputNoteParam('IsKey', userSettings) && !userHas(appSheet, 'IsKey') && column.isKey) {
    data['IsKey'] = true;
  }

  // IsLabel (⚠️ Unstable)
  if (shouldOutputNoteParam('IsLabel', userSettings) && !userHas(appSheet, 'IsLabel') && column.isLabel) {
    data['IsLabel'] = true;
  }

  // IsRequired (🔍 Untested)
  if (shouldOutputNoteParam('IsRequired', userSettings) && !userHas(appSheet, 'IsRequired') && !userHas(appSheet, 'Required_If') && column.constraints?.required) {
    data['IsRequired'] = true;
  }

  // DEFAULT (🔍 Untested)
  if (shouldOutputNoteParam('DEFAULT', userSettings) && !userHas(appSheet, 'DEFAULT')) {
    const defaultValue = column.constraints?.defaultValue;
    if (defaultValue && defaultValue.length > 0) {
      data['DEFAULT'] = defaultValue;
    }
  }

  // Description (🔍 Untested)
  if (shouldOutputNoteParam('Description', userSettings) && !userHas(appSheet, 'Description')) {
    if (column.description && column.description.length > 0) {
      data['Description'] = column.description;
    }
  }

  // MinValue / MaxValue (🔍 Untested)
  if (shouldOutputNoteParam('MinValue', userSettings) && !userHas(appSheet, 'MinValue')) {
    if (column.constraints?.minValue !== undefined) {
      data['MinValue'] = column.constraints.minValue;
    }
  }
  if (shouldOutputNoteParam('MaxValue', userSettings) && !userHas(appSheet, 'MaxValue')) {
    if (column.constraints?.maxValue !== undefined) {
      data['MaxValue'] = column.constraints.maxValue;
    }
  }

  // EnumValues / BaseType (🔍 Untested)
  if ((column.type === 'Enum' || column.type === 'EnumList') && shouldOutputNoteParam('EnumValues', userSettings) && !userHas(appSheet, 'EnumValues')) {
    const enumValues = column.constraints?.enumValues;
    if (enumValues && enumValues.length > 0) {
      data['EnumValues'] = enumValues;
      if (shouldOutputNoteParam('BaseType', userSettings) && !userHas(appSheet, 'BaseType')) {
        const maxLen = Math.max(...enumValues.map((v) => v.length));
        data['BaseType'] = maxLen > 20 ? 'LongText' : 'Text';
      }
    }
  }

  // user指定を最後にマージ（ユーザー設定で有効なキーのみ）
  if (appSheet) {
    for (const [key, value] of Object.entries(appSheet)) {
      if (key === 'IsRequired' && userRequiredIfNonEmpty) continue;
      if (value === null) {
        delete data[key];
        continue;
      }
      if (shouldOutputNoteParam(key, userSettings)) {
        data[key] = value;
      }
    }
  }

  const body = JSON.stringify(data);
  if (body === '{}') return 'AppSheet:{}';
  return `AppSheet:${body}`;
}

/**
 * SimulatorのTableView用: tableId -> (columnId -> noteText)
 */
export function previewExcelColumnNotesLocal(
  tables: Table[],
  userSettings?: NoteParamOutputSettings
): Record<string, Record<string, string>> {
  const byTable: Record<string, Record<string, string>> = {};

  for (const table of tables) {
    const effectiveLabelColumnId = pickEffectiveLabelColumnId(table);
    const byColumn: Record<string, string> = {};

    for (const column of table.columns) {
      const columnForNote = {
        ...column,
        // Rust側と同様にLabel列を正規化
        isLabel: Boolean(effectiveLabelColumnId && column.id === effectiveLabelColumnId),
      };

      const noteText = generateColumnNote(columnForNote, userSettings);
      const hasRawOverride =
        typeof (columnForNote.appSheet as AppSheetRecord | undefined)?.[RAW_NOTE_OVERRIDE_KEY] === 'string' &&
        String((columnForNote.appSheet as AppSheetRecord | undefined)?.[RAW_NOTE_OVERRIDE_KEY] ?? '').trim().length > 0;

      byColumn[column.id] = !hasRawOverride && noteText === 'AppSheet:{}' ? '' : noteText;
    }

    byTable[table.id] = byColumn;
  }

  return byTable;
}
