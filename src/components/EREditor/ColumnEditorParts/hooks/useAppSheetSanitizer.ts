import { useCallback } from 'react';

import type { ColumnConstraints, ColumnType } from '../../../../types';

type AppSheetRecord = Record<string, unknown>;

type SanitizeResult = {
  constraints: ColumnConstraints;
  appSheet: AppSheetRecord | undefined;
};

export function useAppSheetSanitizer() {
  const pruneAppSheet = useCallback((appSheet: AppSheetRecord | undefined, removeKeys: string[]) => {
    if (!appSheet) return undefined;
    let changed = false;
    for (const key of removeKeys) {
      if (Object.prototype.hasOwnProperty.call(appSheet, key)) {
        changed = true;
        break;
      }
    }

    if (!changed) return appSheet;

    const next: AppSheetRecord = { ...appSheet };
    for (const key of removeKeys) {
      delete next[key];
    }
    return Object.keys(next).length > 0 ? next : undefined;
  }, []);

  const sanitizeForType = useCallback(
    (type: ColumnType, constraints: ColumnConstraints, appSheet: AppSheetRecord | undefined): SanitizeResult => {
      let nextConstraints: ColumnConstraints = constraints;
      let nextAppSheet = appSheet;

      // These keys are generated from the settings above (single source of truth).
      nextAppSheet = pruneAppSheet(nextAppSheet, ['Type', 'IsKey', 'IsLabel', 'IsRequired', 'DEFAULT', 'EnumValues']);

      // Not an AppSheet column setting (keep data clean / avoid exporting).
      nextAppSheet = pruneAppSheet(nextAppSheet, ['Category', 'Content']);

      // Legacy internal key (AppSheet Note Parameters does not use this).
      nextAppSheet = pruneAppSheet(nextAppSheet, ['ResetOnEdit']);

      const isEnum = type === 'Enum' || type === 'EnumList';
      const isRef = type === 'Ref';
      const isNumeric =
        type === 'Number' ||
        type === 'Decimal' ||
        type === 'Percent' ||
        type === 'Price' ||
        type === 'Progress';
      const isChange = type.startsWith('Change');
      const isLongText = type === 'LongText';
      const isEnumList = type === 'EnumList';

      if (!isEnum) {
        // Constraints
        if ((nextConstraints.enumValues?.length ?? 0) > 0) {
          nextConstraints = { ...nextConstraints, enumValues: undefined };
        }
        // AppSheet keys
        nextAppSheet = pruneAppSheet(nextAppSheet, [
          'BaseType',
          'ReferencedRootTableName',
          'AllowOtherValues',
          'AutoCompleteOtherValues',
          'EnumInputMode',
        ]);
      }

      if (!isRef) {
        nextAppSheet = pruneAppSheet(nextAppSheet, [
          'ReferencedTableName',
          'ReferencedKeyColumn',
          'ReferencedType',
          'IsAPartOf',
          'InputMode',
        ]);
      }

      if (!isNumeric) {
        nextAppSheet = pruneAppSheet(nextAppSheet, [
          'NumericDigits',
          'DecimalDigits',
          'ShowThousandsSeparator',
          'NumberDisplayMode',
          'MaxValue',
          'MinValue',
          'StepValue',
          'UpdateMode',
        ]);
      }

      if (!isChange) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['ChangeColumns', 'ChangeValues']);
      }

      if (!isLongText) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['LongTextFormatting']);
      }

      if (!isLongText && !isEnumList) {
        nextAppSheet = pruneAppSheet(nextAppSheet, ['ItemSeparator']);
      }

      return { constraints: nextConstraints, appSheet: nextAppSheet };
    },
    [pruneAppSheet]
  );

  return { pruneAppSheet, sanitizeForType };
}
