// ER図関連の型定義

export type ColumnType =
  | 'Text'
  | 'Number'
  | 'Decimal'
  | 'Date'
  | 'DateTime'
  | 'Time'
  | 'Duration'
  | 'Email'
  | 'Phone'
  | 'Url'
  | 'Image'
  | 'File'
  | 'Enum'
  | 'EnumList'
  | 'Yes/No'
  | 'Color'
  | 'LatLong'
  | 'Address'
  | 'Ref'
  | 'ChangeCounter'
  | 'ChangeLocation'
  | 'ChangeTimestamp'
  | 'Progress'
  | 'UniqueID';

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
  description?: string;
  constraints: ColumnConstraints;
  order: number;
}

export interface TablePosition {
  x: number;
  y: number;
}

export interface Table {
  id: string;
  name: string;
  columns: Column[];
  position: TablePosition;
  color?: string;
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
}

export interface ERDiagram {
  tables: Table[];
  relations: Relation[];
}

// プロジェクト関連の型定義

export type SubscriptionPlan = 'free' | 'pro';

export interface Project {
  id: string;
  name: string;
  description?: string;
  isEncrypted: boolean;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt?: string;
}

export interface ProjectData {
  project: Project;
  diagram: ERDiagram;
  sampleData: Record<string, Record<string, unknown>[]>;
}

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
  zoom: number;
  panPosition: { x: number; y: number };
}

// 設定関連の型定義

export type Language = 'ja' | 'en';
export type Theme = 'light' | 'dark' | 'system';

export interface AppSettings {
  language: Language;
  theme: Theme;
  autoBackupEnabled: boolean;
  autoBackupIntervalMinutes: number;
  backupRetentionDays: number;
  backupLocation: string;
  tableNamePrefix: string;
  tableNameSuffix: string;
  keyColumnPrefix: string;
  keyColumnSuffix: string;
  defaultKeyColumnName: string;
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
