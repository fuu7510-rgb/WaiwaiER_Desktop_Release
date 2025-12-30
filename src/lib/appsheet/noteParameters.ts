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

export type NoteParamStatus = 'verified' | 'unstable' | 'untested' | 'unsupported';

export type NoteParamCategory =
  | 'basic'
  | 'identification'
  | 'validation'
  | 'numeric'
  | 'enum'
  | 'ref'
  | 'text'
  | 'meta';

export interface NoteParamInfo {
  key: string;
  status: NoteParamStatus;
  category: NoteParamCategory;
  /** 日本語での説明（UI表示用） */
  labelJa: string;
  /** 英語での説明（UI表示用） */
  labelEn: string;
  /** このパラメーターに関連するカラム設定フィールド（UI連携用） */
  relatedField?: string;
  /** デフォルトで出力するか（verified/unstable は true, それ以外は false） */
  defaultEnabled?: boolean;
}

/**
 * カテゴリ情報
 */
export const NOTE_PARAM_CATEGORIES: Record<NoteParamCategory, { labelJa: string; labelEn: string }> = {
  basic: { labelJa: '基本設定', labelEn: 'Basic Settings' },
  identification: { labelJa: '識別・検索設定', labelEn: 'Identification & Search' },
  validation: { labelJa: 'バリデーション設定', labelEn: 'Validation' },
  numeric: { labelJa: '数値型設定', labelEn: 'Numeric Settings' },
  enum: { labelJa: 'Enum型設定', labelEn: 'Enum Settings' },
  ref: { labelJa: 'Ref型設定', labelEn: 'Ref Settings' },
  text: { labelJa: 'テキスト型設定', labelEn: 'Text Settings' },
  meta: { labelJa: 'メタキー', labelEn: 'Meta Keys' },
};

/**
 * ユーザー設定で保存する Note Parameters 出力設定の型
 */
export interface NoteParamOutputSettings {
  [key: string]: boolean;
}

/**
 * Note Parameters サポート状況一覧
 *
 * Rust側 (excel.rs) の get_note_param_status() と同期を保つこと
 */
export const NOTE_PARAM_STATUS: NoteParamInfo[] = [
  // 基本設定
  { key: 'Type', status: 'verified', category: 'basic', labelJa: 'カラム型', labelEn: 'Column Type', relatedField: 'type', defaultEnabled: true },
  { key: 'IsRequired', status: 'untested', category: 'basic', labelJa: '必須フラグ', labelEn: 'Is Required', relatedField: 'required', defaultEnabled: false },
  { key: 'Required_If', status: 'untested', category: 'basic', labelJa: '必須条件', labelEn: 'Required If', defaultEnabled: false },
  { key: 'IsHidden', status: 'untested', category: 'basic', labelJa: '非表示フラグ', labelEn: 'Is Hidden', defaultEnabled: false },
  { key: 'Show_If', status: 'untested', category: 'basic', labelJa: '表示条件', labelEn: 'Show If', defaultEnabled: false },
  { key: 'DisplayName', status: 'untested', category: 'basic', labelJa: '表示名', labelEn: 'Display Name', defaultEnabled: false },
  { key: 'Description', status: 'untested', category: 'basic', labelJa: '説明', labelEn: 'Description', relatedField: 'description', defaultEnabled: false },
  { key: 'DEFAULT', status: 'untested', category: 'basic', labelJa: '初期値', labelEn: 'Default Value', relatedField: 'defaultValue', defaultEnabled: false },
  { key: 'AppFormula', status: 'untested', category: 'basic', labelJa: 'アプリ数式', labelEn: 'App Formula', defaultEnabled: false },

  // 識別・検索設定
  { key: 'IsKey', status: 'untested', category: 'identification', labelJa: 'キー', labelEn: 'Is Key', relatedField: 'isKey', defaultEnabled: false },
  { key: 'IsLabel', status: 'unstable', category: 'identification', labelJa: 'ラベル', labelEn: 'Is Label', relatedField: 'isLabel', defaultEnabled: true },
  { key: 'IsScannable', status: 'unsupported', category: 'identification', labelJa: 'スキャン可能', labelEn: 'Is Scannable', defaultEnabled: false },
  { key: 'IsNfcScannable', status: 'unsupported', category: 'identification', labelJa: 'NFCスキャン可能', labelEn: 'Is NFC Scannable', defaultEnabled: false },
  { key: 'Searchable', status: 'unsupported', category: 'identification', labelJa: '検索可能', labelEn: 'Searchable', defaultEnabled: false },
  { key: 'IsSensitive', status: 'unsupported', category: 'identification', labelJa: '機密データ', labelEn: 'Is Sensitive', defaultEnabled: false },

  // バリデーション設定
  { key: 'Valid_If', status: 'untested', category: 'validation', labelJa: '有効条件', labelEn: 'Valid If', relatedField: 'pattern', defaultEnabled: false },
  { key: 'Error_Message_If_Invalid', status: 'untested', category: 'validation', labelJa: '無効時エラーメッセージ', labelEn: 'Error Message If Invalid', defaultEnabled: false },
  { key: 'Suggested_Values', status: 'untested', category: 'validation', labelJa: '推奨値', labelEn: 'Suggested Values', defaultEnabled: false },
  { key: 'Editable_If', status: 'untested', category: 'validation', labelJa: '編集可能条件', labelEn: 'Editable If', defaultEnabled: false },
  { key: 'Reset_If', status: 'untested', category: 'validation', labelJa: 'リセット条件', labelEn: 'Reset If', defaultEnabled: false },

  // 数値型設定
  { key: 'MinValue', status: 'untested', category: 'numeric', labelJa: '最小値', labelEn: 'Min Value', relatedField: 'minValue', defaultEnabled: false },
  { key: 'MaxValue', status: 'untested', category: 'numeric', labelJa: '最大値', labelEn: 'Max Value', relatedField: 'maxValue', defaultEnabled: false },
  { key: 'DecimalDigits', status: 'untested', category: 'numeric', labelJa: '小数点以下桁数', labelEn: 'Decimal Digits', defaultEnabled: false },
  { key: 'NumericDigits', status: 'untested', category: 'numeric', labelJa: '数値桁数', labelEn: 'Numeric Digits', defaultEnabled: false },
  { key: 'ShowThousandsSeparator', status: 'untested', category: 'numeric', labelJa: '千の位区切り', labelEn: 'Show Thousands Separator', defaultEnabled: false },
  { key: 'NumberDisplayMode', status: 'untested', category: 'numeric', labelJa: '表示モード', labelEn: 'Number Display Mode', defaultEnabled: false },
  { key: 'StepValue', status: 'untested', category: 'numeric', labelJa: '増減ステップ値', labelEn: 'Step Value', defaultEnabled: false },

  // Enum型設定
  { key: 'EnumValues', status: 'untested', category: 'enum', labelJa: '選択肢', labelEn: 'Enum Values', relatedField: 'enumValues', defaultEnabled: false },
  { key: 'BaseType', status: 'untested', category: 'enum', labelJa: 'ベース型', labelEn: 'Base Type', defaultEnabled: false },
  { key: 'EnumInputMode', status: 'untested', category: 'enum', labelJa: '入力モード', labelEn: 'Enum Input Mode', defaultEnabled: false },
  { key: 'AllowOtherValues', status: 'untested', category: 'enum', labelJa: 'その他の値を許可', labelEn: 'Allow Other Values', defaultEnabled: false },
  { key: 'AutoCompleteOtherValues', status: 'untested', category: 'enum', labelJa: 'その他の値を自動補完', labelEn: 'Auto Complete Other Values', defaultEnabled: false },
  { key: 'ReferencedRootTableName', status: 'untested', category: 'enum', labelJa: '参照テーブル名', labelEn: 'Referenced Root Table Name', defaultEnabled: false },

  // Ref型設定
  { key: 'ReferencedTableName', status: 'untested', category: 'ref', labelJa: '参照先テーブル', labelEn: 'Referenced Table', relatedField: 'refTableId', defaultEnabled: false },
  { key: 'ReferencedKeyColumn', status: 'untested', category: 'ref', labelJa: '参照先キー列', labelEn: 'Referenced Key Column', relatedField: 'refColumnId', defaultEnabled: false },
  { key: 'ReferencedType', status: 'untested', category: 'ref', labelJa: '参照先の型', labelEn: 'Referenced Type', defaultEnabled: false },
  { key: 'IsAPartOf', status: 'untested', category: 'ref', labelJa: 'パートオブ関係', labelEn: 'Is A Part Of', defaultEnabled: false },
  { key: 'InputMode', status: 'untested', category: 'ref', labelJa: '入力モード', labelEn: 'Input Mode', defaultEnabled: false },

  // テキスト型設定
  { key: 'LongTextFormatting', status: 'untested', category: 'text', labelJa: 'フォーマット', labelEn: 'Long Text Formatting', defaultEnabled: false },
  { key: 'ItemSeparator', status: 'untested', category: 'text', labelJa: '項目区切り文字', labelEn: 'Item Separator', defaultEnabled: false },

  // メタキー
  { key: 'TypeAuxData', status: 'untested', category: 'meta', labelJa: 'データ型固有オプション', labelEn: 'Type Aux Data', defaultEnabled: false },
  { key: 'BaseTypeQualifier', status: 'untested', category: 'meta', labelJa: 'ベース型修飾子', labelEn: 'Base Type Qualifier', defaultEnabled: false },
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
 * 指定されたカテゴリのパラメーター一覧を取得
 */
export function getNoteParamsByCategory(category: NoteParamCategory): NoteParamInfo[] {
  return NOTE_PARAM_STATUS.filter((p) => p.category === category);
}

/**
 * カテゴリ別にグループ化されたパラメーター一覧を取得
 */
export function getNoteParamsGroupedByCategory(): Map<NoteParamCategory, NoteParamInfo[]> {
  const grouped = new Map<NoteParamCategory, NoteParamInfo[]>();
  for (const param of NOTE_PARAM_STATUS) {
    const list = grouped.get(param.category) ?? [];
    list.push(param);
    grouped.set(param.category, list);
  }
  return grouped;
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
 * デフォルト設定の出力設定を生成
 */
export function getDefaultNoteParamOutputSettings(): NoteParamOutputSettings {
  const settings: NoteParamOutputSettings = {};
  for (const param of NOTE_PARAM_STATUS) {
    settings[param.key] = param.defaultEnabled ?? false;
  }
  return settings;
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
    case 'unsupported':
      return {
        emoji: '❌',
        colorClass: 'text-red-600 bg-red-50',
        labelJa: '未対応',
        labelEn: 'Unsupported',
      };
  }
}
