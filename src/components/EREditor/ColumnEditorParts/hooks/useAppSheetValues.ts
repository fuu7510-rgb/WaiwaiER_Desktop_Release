import { useCallback } from 'react';

import type { Column } from '../../../../types';

type AppSheetRecord = Record<string, unknown>;

function shouldDeleteAppSheetValue(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (Array.isArray(value) && value.length === 0)
  );
}

export function useAppSheetValues(
  selectedColumn: Column | undefined,
  handleUpdate: (updates: Partial<Column>) => void
) {
  const getAppSheetRecord = useCallback((): AppSheetRecord | undefined => {
    const appSheet = selectedColumn?.appSheet as AppSheetRecord | undefined;
    return appSheet;
  }, [selectedColumn]);

  const setAppSheetValue = useCallback(
    (key: string, value: unknown) => {
      if (!selectedColumn) return;

      const current = (selectedColumn.appSheet ?? {}) as AppSheetRecord;
      const next: AppSheetRecord = { ...current };

      if (shouldDeleteAppSheetValue(value)) {
        delete next[key];
      } else {
        next[key] = value;
      }

      handleUpdate({ appSheet: Object.keys(next).length > 0 ? next : undefined });
    },
    [handleUpdate, selectedColumn]
  );

  const setAppSheetValues = useCallback(
    (values: AppSheetRecord) => {
      if (!selectedColumn) return;

      const current = (selectedColumn.appSheet ?? {}) as AppSheetRecord;
      const next: AppSheetRecord = { ...current };

      for (const [key, value] of Object.entries(values)) {
        if (shouldDeleteAppSheetValue(value)) {
          delete next[key];
        } else {
          next[key] = value;
        }
      }

      handleUpdate({ appSheet: Object.keys(next).length > 0 ? next : undefined });
    },
    [handleUpdate, selectedColumn]
  );

  const getAppSheetString = useCallback(
    (key: string): string => {
      const v = getAppSheetRecord()?.[key];
      return typeof v === 'string' ? v : '';
    },
    [getAppSheetRecord]
  );

  const getAppSheetNumberString = useCallback(
    (key: string): string => {
      const v = getAppSheetRecord()?.[key];
      if (typeof v === 'number' && Number.isFinite(v)) return String(v);
      return '';
    },
    [getAppSheetRecord]
  );

  const getAppSheetArrayLines = useCallback(
    (key: string): string => {
      const v = getAppSheetRecord()?.[key];
      if (Array.isArray(v)) return v.map((x) => String(x ?? '')).join('\n');
      return '';
    },
    [getAppSheetRecord]
  );

  const getTriState = useCallback(
    (key: string): '' | 'true' | 'false' => {
      const v = getAppSheetRecord()?.[key];
      if (v === true) return 'true';
      if (v === false) return 'false';
      return '';
    },
    [getAppSheetRecord]
  );

  const setTriState = useCallback(
    (key: string, raw: string) => {
      if (raw === 'true') return setAppSheetValue(key, true);
      if (raw === 'false') return setAppSheetValue(key, false);
      return setAppSheetValue(key, undefined);
    },
    [setAppSheetValue]
  );

  return {
    setAppSheetValue,
    setAppSheetValues,
    getAppSheetString,
    getAppSheetNumberString,
    getAppSheetArrayLines,
    getTriState,
    setTriState,
  };
}
