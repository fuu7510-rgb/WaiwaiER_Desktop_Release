// ER図関連の型定義

export type ColumnType =
  | 'Address'
  | 'App'
  | 'ChangeCounter'
  | 'ChangeLocation'
  | 'ChangeTimestamp'
  | 'Color'
  | 'Date'
  | 'DateTime'
  | 'Decimal'
  | 'Drawing'
  | 'Duration'
  | 'Email'
  | 'Enum'
  | 'EnumList'
  | 'File'
  | 'Image'
  | 'LatLong'
  | 'LongText'
  | 'Name'
  | 'Number'
  | 'Percent'
  | 'Phone'
  | 'Price'
  | 'Progress'
  | 'Ref'
  | 'Show'
  | 'Signature'
  | 'Text'
  | 'Thumbnail'
  | 'Time'
  | 'Url'
  | 'Video'
  | 'XY'
  | 'Yes/No'
  // NOTE: legacy type (not in AppSheet type dropdown). Keep for backward compatibility.
  | 'UniqueID';

export const APPSHEET_COLUMN_TYPES: readonly ColumnType[] = [
  'Address',
  'App',
  'ChangeCounter',
  'ChangeLocation',
  'ChangeTimestamp',
  'Color',
  'Date',
  'DateTime',
  'Decimal',
  'Drawing',
  'Duration',
  'Email',
  'Enum',
  'EnumList',
  'File',
  'Image',
  'LatLong',
  'LongText',
  'Name',
  'Number',
  'Percent',
  'Phone',
  'Price',
  'Progress',
  'Ref',
  'Show',
  'Signature',
  'Text',
  'Thumbnail',
  'Time',
  'Url',
  'Video',
  'XY',
  'Yes/No',
] as const;

export interface ColumnConstraints {
  required?: boolean;
  unique?: boolean;
  defaultValue?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enumValues?: string[];
  refTableId?: string;
  refColumnId?: string;
}

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  isKey: boolean;
  isLabel: boolean;
  /**
   * AppSheetのVirtual Column相当。
   * 物理データソース(Excel/Sheets)には存在せず、主にAppFormulaで表示する列。
   */
  isVirtual?: boolean;
  description?: string;
  /**
   * AppSheet Note Parameters（ヘッダーセルのNoteに入れるJSON）の追加設定。
   * docs/AppSheet/MEMO_SETUP.md のキーをそのままキー名として保持する。
   *
   * - 値は AppSheet が解釈できる JSON に限る（string/number/boolean/array/object）。
   * - 空/未設定はキーを持たない（undefined）運用を推奨。
   */
  appSheet?: Record<string, unknown>;
  /**
    * サンプルデータ生成で優先的に使う値。1行=候補値（複数指定可）。
   * 未指定の場合はデータ型やカラム名から自動生成する。
   */
  dummyValues?: string[];
  constraints: ColumnConstraints;
  order: number;
}

/**
 * ユーザー設定「共通カラム」用のカラム定義。
 * 各テーブルへ追加する際は、新しい Column(id/order付き) に変換して挿入する。
 */
export interface CommonColumnDefinition {
  /** 設定一覧内での安定ID（テーブルのColumn.idとは別物） */
  id: string;
  name: string;
  type: ColumnType;
  constraints: ColumnConstraints;
  /** Column.appSheet 相当（必要な場合のみ） */
  appSheet?: Record<string, unknown>;
}

export interface TablePosition {
  x: number;
  y: number;
}

export type ExportTarget = 'excel' | 'json' | 'package';

export interface Table {
  id: string;
  name: string;
  /** テーブルの説明（任意） */
  description?: string;
  columns: Column[];
  position: TablePosition;
  color?: string;
  /** テーブルごとのエクスポート先（未指定は全てにエクスポート） */
  exportTargets?: ExportTarget[];
  syncGroupId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Relation {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: 'one-to-one' | 'one-to-many' | 'many-to-many';
  /**
   * ER図の線上に表示する任意ラベル（例: "1:N"）。未指定なら type から自動生成する。
   */
  label?: string;

  /**
   * 線(リレーション)ごとのアニメーションON/OFF。
   * - undefined: ユーザー設定(settings.edgeAnimationEnabled)に従う
   * - true/false: この線だけ上書き
   */
  edgeAnimationEnabled?: boolean;

  /**
   * 線(リレーション)ごとの追従アイコン表示ON/OFF。
   * - undefined: ユーザー設定(settings.edgeFollowerIconEnabled)に従う
   * - true/false: この線だけ上書き
   */
  edgeFollowerIconEnabled?: boolean;

  /**
   * 線(リレーション)ごとの追従アイコン種別（lucide-react のアイコン名）。
   * - undefined: 既定値('arrow-right')として扱う
   */
  edgeFollowerIconName?: string;

  /**
   * 線(リレーション)ごとの追従アイコンサイズ（px）。
   * - undefined: 既定値(14)として扱う
   */
  edgeFollowerIconSize?: number;

  /**
   * 線(リレーション)ごとの追従アイコン速度（px/sec）。
   * - undefined: 既定値(90)として扱う
   */
  edgeFollowerIconSpeed?: number;

  /**
   * 線(リレーション)ごとの表示スタイル。
   * - undefined: 実線として扱う（後方互換のため）
   */
  edgeLineStyle?: 'solid' | 'dashed' | 'dotted';
}

export interface Memo {
  id: string;
  text: string;
  position: TablePosition;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ERDiagram {
  tables: Table[];
  relations: Relation[];
  memos?: Memo[];
}

// プロジェクト関連の型定義

export type SubscriptionPlan = 'free' | 'pro';

export interface Project {
  id: string;
  name: string;
  description?: string;
  /**
   * プロジェクト一覧表示の並び順（小さいほど上）。
   * 旧データ互換のため optional。
   */
  sortOrder?: number;
  isEncrypted: boolean;
  /**
   * パスフレーズ自体は保存しない。
   * 検証用にソルトとハッシュのみ保持する。
   */
  passphraseSalt?: string;
  passphraseHash?: string;
  /**
   * 保存されているダイアグラムデータのスキーマバージョン。
   * 旧データ互換のため optional（未設定時は不明扱い）。
   */
  dataSchemaVersion?: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface ProjectData {
  project: Project;
  diagram: ERDiagram;
  sampleData: SampleDataByTableId;
}

/**
 * サンプルデータの1行を表す型。
 * キーはカラムID、値はカラム型に応じた値。
 */
export type SampleRowValue = string | number | boolean | null | undefined;
export type SampleRow = Record<string, SampleRowValue>;

/**
 * テーブルIDをキーとするサンプルデータのマップ。
 */
export type SampleDataByTableId = Record<string, SampleRow[]>;

// ライセンス関連の型定義

export interface License {
  userId: string;
  plan: SubscriptionPlan;
  expiresAt: string;
  machineId?: string;
  isValid: boolean;
}

export interface LicenseState {
  license: License | null;
  isValidating: boolean;
  lastValidatedAt?: string;
  offlineDays: number;
}

// UI関連の型定義

export type ViewMode = 'editor' | 'simulator';

export interface UIState {
  viewMode: ViewMode;
  selectedTableId: string | null;
  selectedColumnId: string | null;
  selectedRelationId?: string | null;
  zoom: number;
  panPosition: { x: number; y: number };
}

// 設定関連の型定義

export type Language = 'ja' | 'en';
export type Theme = 'light' | 'dark' | 'system';
export type FontSize = 'small' | 'medium' | 'large';

// ショートカットキー関連の型定義

/**
 * ショートカットキーで実行可能な操作のID
 */
export type ShortcutActionId =
  | 'openProjectDialog'
  | 'openSettings'
  | 'openImportDialog'
  | 'openExportDialog'
  | 'toggleSidebar'
  | 'toggleViewMode'
  | 'undo'
  | 'redo'
  | 'addTable'
  | 'toggleGrid'
  | 'toggleMemos'
  | 'toggleRelationHighlight'
  | 'zoomIn'
  | 'zoomOut'
  | 'fitView'
  | 'save';

/**
 * ショートカットキーの設定（アクションIDをキー、キーバインディングを値）
 */
export type ShortcutKeySettings = Record<ShortcutActionId, string>;

/**
 * ショートカットアクションの定義
 */
export interface ShortcutActionDefinition {
  id: ShortcutActionId;
  /** 翻訳キー（settings.shortcuts.actions.xxx） */
  labelKey: string;
  /** デフォルトのキーバインディング（例: "Ctrl+S"） */
  defaultKey: string;
  /** カテゴリ（グループ化用） */
  category: 'file' | 'edit' | 'view' | 'navigation';
}

export type RelationLabelInitialMode = 'auto' | 'hidden' | 'custom';

/**
 * Note Parameters 出力設定（キー名: 出力するか）
 */
export interface NoteParamOutputSettings {
  [key: string]: boolean;
}

export interface AppSettings {
  language: Language;
  theme: Theme;
  fontSize: FontSize;

  /** ER図のリレーション線(エッジ)のアニメーション表示 */
  edgeAnimationEnabled?: boolean;

  /** ER図のリレーション線(エッジ)上を移動するアイコン表示 */
  edgeFollowerIconEnabled?: boolean;

  /** 追従アイコン種別（lucide-react のアイコン名。例: arrow-right） */
  edgeFollowerIconName?: string;

  /** 追従アイコンサイズ（px） */
  edgeFollowerIconSize?: number;

  /** 追従アイコン速度（px/sec） */
  edgeFollowerIconSpeed?: number;

  /** ER図のリレーション線(エッジ)のデフォルト線種類 */
  edgeLineStyle?: 'solid' | 'dashed' | 'dotted';

  /** Excelエクスポート画面で Note Parameters の対応状況パネルを表示する */
  showNoteParamsSupportPanel: boolean;

  /** Note Parameters 出力設定（キー名: 出力するか） */
  noteParamOutputSettings?: NoteParamOutputSettings;

  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  backupRetentionDays: number;
  backupLocation: string;
  tableNamePrefix: string;
  tableNameSuffix: string;
  keyColumnPrefix: string;
  keyColumnSuffix: string;
  defaultKeyColumnName: string;

  /**
   * すべてのテーブルに末尾追加（+末尾へ移動）される共通カラム。
   */
  commonColumns: CommonColumnDefinition[];

  /**
   * 新規作成されるリレーション(線)ラベルの初期値ルール
   */
  relationLabelInitialMode: RelationLabelInitialMode;
  /**
   * relationLabelInitialMode === 'custom' のときに使う初期テキスト
   */
  relationLabelInitialCustomText: string;

  /**
   * ショートカットキー設定（アクションIDをキー、キーバインディングを値）
   * 未設定の場合はデフォルト値が使用される
   */
  shortcutKeys?: Partial<ShortcutKeySettings>;
}

// 履歴関連の型定義（Undo/Redo）

export interface HistoryEntry {
  id: string;
  timestamp: string;
  description: string;
  state: ERDiagram;
}

export interface HistoryState {
  past: HistoryEntry[];
  present: HistoryEntry | null;
  future: HistoryEntry[];
}
