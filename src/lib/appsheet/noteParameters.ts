/**
 * Note Parameters サポート状況管理
 *
 * AppSheet Note Parameters の各キーについて、WaiwaiER Desktop での
 * Excelエクスポート時の動作検証状況を管理します。
 *
 * NOTE: このファイルの内容は src-tauri/src/excel.rs の get_note_param_status() と
 *       同期する必要があります。変更時は両方を更新してください。
 *
 * @see docs/AppSheet/NOTE_PARAMETERS_SUPPORT_STATUS.md
 */

export type NoteParamStatus = 'verified' | 'unstable' | 'untested';

export interface NoteParamInfo {
  key: string;
  status: NoteParamStatus;
  /** 日本語での説明（UI表示用） */
  labelJa: string;
  /** 英語での説明（UI表示用） */
  labelEn: string;
  /** このパラメーターに関連するカラム設定フィールド（UI連携用） */
  relatedField?: string;
}

/**
 * Note Parameters サポート状況一覧
 *
 * Rust側 (excel.rs) の get_note_param_status() と同期を保つこと
 */
export const NOTE_PARAM_STATUS: NoteParamInfo[] = [
  // 基本設定
  { key: 'Type', status: 'verified', labelJa: 'カラム型', labelEn: 'Column Type', relatedField: 'type' },
  { key: 'IsRequired', status: 'untested', labelJa: '必須', labelEn: 'Required', relatedField: 'required' },
  { key: 'IsKey', status: 'untested', labelJa: 'キー', labelEn: 'Key', relatedField: 'isKey' },
  { key: 'IsLabel', status: 'unstable', labelJa: 'ラベル', labelEn: 'Label', relatedField: 'isLabel' },
  { key: 'DEFAULT', status: 'untested', labelJa: '初期値', labelEn: 'Default Value', relatedField: 'defaultValue' },
  { key: 'Description', status: 'untested', labelJa: '説明', labelEn: 'Description', relatedField: 'description' },
  { key: 'DisplayName', status: 'untested', labelJa: '表示名', labelEn: 'Display Name' },
  { key: 'AppFormula', status: 'untested', labelJa: 'アプリ数式', labelEn: 'App Formula' },

  // バリデーション
  { key: 'Valid_If', status: 'untested', labelJa: '有効条件', labelEn: 'Valid If', relatedField: 'pattern' },
  { key: 'MinValue', status: 'untested', labelJa: '最小値', labelEn: 'Min Value', relatedField: 'minValue' },
  { key: 'MaxValue', status: 'untested', labelJa: '最大値', labelEn: 'Max Value', relatedField: 'maxValue' },

  // Enum型
  { key: 'EnumValues', status: 'untested', labelJa: '選択肢', labelEn: 'Enum Values', relatedField: 'enumValues' },
  { key: 'BaseType', status: 'untested', labelJa: 'ベース型', labelEn: 'Base Type' },

  // Ref型
  { key: 'ReferencedTableName', status: 'untested', labelJa: '参照先テーブル', labelEn: 'Referenced Table', relatedField: 'refTableId' },
  { key: 'ReferencedKeyColumn', status: 'untested', labelJa: '参照先キー列', labelEn: 'Referenced Key Column', relatedField: 'refColumnId' },
  { key: 'ReferencedType', status: 'untested', labelJa: '参照先の型', labelEn: 'Referenced Type' },
];

/**
 * 指定されたキーのサポート状況を取得
 */
export function getNoteParamStatus(key: string): NoteParamStatus {
  const info = NOTE_PARAM_STATUS.find((p) => p.key === key);
  return info?.status ?? 'untested';
}

/**
 * 指定されたステータスのパラメーター一覧を取得
 */
export function getNoteParamsByStatus(status: NoteParamStatus): NoteParamInfo[] {
  return NOTE_PARAM_STATUS.filter((p) => p.status === status);
}

/**
 * 指定されたフィールドに関連するパラメーターのステータスを取得
 */
export function getStatusForField(field: string): NoteParamStatus | null {
  const info = NOTE_PARAM_STATUS.find((p) => p.relatedField === field);
  return info?.status ?? null;
}

/**
 * Excelエクスポート時に出力されるパラメーター（Verified のみ）
 */
export function getVerifiedParams(): NoteParamInfo[] {
  return getNoteParamsByStatus('verified');
}

/**
 * ステータスに応じたバッジ情報を取得
 */
export function getStatusBadgeInfo(status: NoteParamStatus): {
  emoji: string;
  colorClass: string;
  labelJa: string;
  labelEn: string;
} {
  switch (status) {
    case 'verified':
      return {
        emoji: '✅',
        colorClass: 'text-green-600 bg-green-50',
        labelJa: '出力',
        labelEn: 'Output',
      };
    case 'unstable':
      return {
        emoji: '⚠️',
        colorClass: 'text-amber-600 bg-amber-50',
        labelJa: '不安定',
        labelEn: 'Unstable',
      };
    case 'untested':
      return {
        emoji: '🔍',
        colorClass: 'text-zinc-500 bg-zinc-50',
        labelJa: '未検証',
        labelEn: 'Untested',
      };
  }
}
