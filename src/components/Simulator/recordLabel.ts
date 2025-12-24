import type { Column, Table } from '../../types';

export function getRowLabel(
  table: Table,
  row: Record<string, unknown>,
  options?: { fallback?: string }
): string {
  const fallback = options?.fallback ?? '';

  const labelColumns = table.columns.filter((c) => c.isLabel);
  const labelColumnIds = (labelColumns.length ? labelColumns : table.columns.slice(0, 1))
    .map((c) => c.id)
    .filter(Boolean);

  const parts = labelColumnIds
    .map((id) => String(row[id] ?? '').trim())
    .filter(Boolean);

  if (parts.length > 0) return parts.join(' ');
  return fallback;
}

export function getRefDisplayLabel(params: {
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  column: Column;
  value: unknown;
}): string {
  const raw = String(params.value ?? '').trim();
  if (!raw) return '';

  if (params.column.type !== 'Ref') return raw;

  const refTableId = params.column.constraints.refTableId;
  if (!refTableId) return raw;

  const refTable = params.tables.find((t) => t.id === refTableId);
  if (!refTable) return raw;

  const refRows = params.sampleDataByTableId[refTableId] ?? [];

  const refKeyColId =
    params.column.constraints.refColumnId ??
    refTable.columns.find((c) => c.isKey)?.id ??
    refTable.columns[0]?.id;

  if (!refKeyColId) return raw;

  const refRow = refRows.find((r) => String(r[refKeyColId] ?? '').trim() === raw);
  if (!refRow) return raw;

  const label = getRowLabel(refTable, refRow, { fallback: raw });
  return label || raw;
}
