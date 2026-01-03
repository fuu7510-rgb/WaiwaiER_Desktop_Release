import { useEffect } from 'react';

import type { Column, ColumnConstraints, ColumnType } from '../../../../types';

type AppSheetRecord = Record<string, unknown>;

type SanitizeForType = (
  type: ColumnType,
  constraints: ColumnConstraints,
  appSheet: AppSheetRecord | undefined
) => { constraints: ColumnConstraints; appSheet: AppSheetRecord | undefined };

type PruneAppSheet = (appSheet: AppSheetRecord | undefined, removeKeys: string[]) => AppSheetRecord | undefined;

type HandleUpdate = (updates: Partial<Column>) => void;

type Args = {
  selectedColumn: Column | undefined;
  sanitizeForType: SanitizeForType;
  pruneAppSheet: PruneAppSheet;
  handleUpdate: HandleUpdate;
};

export function useAppSheetConflictResolution({
  selectedColumn,
  sanitizeForType,
  pruneAppSheet,
  handleUpdate,
}: Args) {
  // Best-effort conflict resolution to match AppSheet behavior.
  useEffect(() => {
    if (!selectedColumn) return;

    let nextConstraints: ColumnConstraints = selectedColumn.constraints;
    let nextAppSheet = selectedColumn.appSheet as AppSheetRecord | undefined;

    // Type-specific cleanup + remove generated duplicates.
    ({ constraints: nextConstraints, appSheet: nextAppSheet } = sanitizeForType(
      selectedColumn.type,
      nextConstraints,
      nextAppSheet
    ));

    // Required: if Required_If is set, turn off unconditional Required.
    const requiredIf = typeof nextAppSheet?.Required_If === 'string' ? nextAppSheet.Required_If.trim() : '';
    if (requiredIf.length > 0 && nextConstraints.required) {
      nextConstraints = { ...nextConstraints, required: false };
    }
    if (requiredIf.length > 0) {
      const isRequiredVal = nextAppSheet?.IsRequired;
      if (isRequiredVal === true || isRequiredVal === false) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['IsRequired']);
      }
    }

    // Hide: Show_If (formula) and IsHidden (toggle) should not both be set.
    const showIf = typeof nextAppSheet?.Show_If === 'string' ? nextAppSheet.Show_If.trim() : '';
    const isHiddenVal = nextAppSheet?.IsHidden;
    if (showIf.length > 0 && (isHiddenVal === true || isHiddenVal === false)) {
      nextAppSheet = pruneAppSheet(nextAppSheet, ['IsHidden']);
    }

    // Editable: Editable_If and Editable (toggle) should not both be set.
    const editableIf = typeof nextAppSheet?.Editable_If === 'string' ? nextAppSheet.Editable_If.trim() : '';
    const editableVal = nextAppSheet?.Editable;
    if (editableIf.length > 0 && (editableVal === true || editableVal === false)) {
      nextAppSheet = pruneAppSheet(nextAppSheet, ['Editable']);
    }

    // AppFormula and Default are mutually confusing: prefer AppFormula.
    const appFormula = typeof nextAppSheet?.AppFormula === 'string' ? nextAppSheet.AppFormula.trim() : '';
    if (appFormula.length > 0 && (nextConstraints.defaultValue ?? '').trim().length > 0) {
      nextConstraints = { ...nextConstraints, defaultValue: undefined };
    }

    const shouldUpdateConstraints = nextConstraints !== selectedColumn.constraints;
    const shouldUpdateAppSheet = nextAppSheet !== selectedColumn.appSheet;
    if (shouldUpdateConstraints || shouldUpdateAppSheet) {
      handleUpdate({
        ...(shouldUpdateConstraints ? { constraints: nextConstraints } : {}),
        ...(shouldUpdateAppSheet ? { appSheet: nextAppSheet } : {}),
      });
    }
  }, [handleUpdate, pruneAppSheet, sanitizeForType, selectedColumn]);
}
