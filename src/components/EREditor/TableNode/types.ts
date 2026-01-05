import type { Table, Column, ColumnType } from '../../../types';

export interface TableNodeData {
  table: Table;
  highlight?: {
    isGraphSelected: boolean;
    isUpstream: boolean;
    isDownstream: boolean;
    isRelated: boolean;
    isDimmed: boolean;
  };
}

export interface ColumnRowProps {
  column: Column;
  tableId: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
}

export type MiniMetaTab = 'formula' | 'initialValue' | 'displayName' | 'description';

export type EditableState = 'unset' | 'true' | 'false';

export interface ColumnRowState {
  isEditingName: boolean;
  editName: string;
  deleteArmed: boolean;
  deleteHintPos: { x: number; y: number } | null;
  miniMetaTab: MiniMetaTab;
  isEditingMiniMeta: boolean;
  miniMetaDraft: string;
}

export interface ColumnDerivedState {
  isShown: boolean;
  showIfNonEmpty: boolean;
  editableState: EditableState;
  editableHasFormula: boolean;
  isRequired: boolean;
  requiredIfNonEmpty: boolean;
  currentAppFormula: string;
  currentDisplayName: string;
  currentDescription: string;
  currentInitialValue: string;
}

export { type Table, type Column, type ColumnType };
