import type { Column, Table } from '../../types';
import { computeRowWithAppFormulas } from '../../lib/appsheet/expression';

function isMeaninglessIdLikeLabel(value: string): boolean {
  const s = String(value ?? '').trim();
  if (!s) return true;

  // 例: C644L9TN / C644L9TN 3TRX7MFL のような8桁英数字の羅列
  if (/^[A-Z0-9]{8}(\s+[A-Z0-9]{8})*$/.test(s)) return true;

  // 例: ROW-0001（サンプル/自動補完のキー）
  if (/^ROW-\d{4,}$/.test(s)) return true;

  return false;
}

export function getRowLabel(
  table: Table,
  row: Record<string, unknown>,
  options?: { fallback?: string }
): string {
  const fallback = options?.fallback ?? '';

  const labelColumns = table.columns.filter((c) => c.isLabel);

  // まずは isLabel を優先（なければ先頭列）
  const primaryColumns = (labelColumns.length ? labelColumns : table.columns.slice(0, 1)).filter((c) => c.id);
  const primaryParts = primaryColumns
    .map((c) => String(row[c.id] ?? '').trim())
    .filter(Boolean);

  const primaryLabel = primaryParts.join(' ');
  if (primaryLabel && !isMeaninglessIdLikeLabel(primaryLabel)) return primaryLabel;

  // isLabel が空/意味なしの場合、非Keyの中から「埋まっている値」を探す
  const nonKeyColumns = table.columns.filter((c) => !c.isKey && c.id);
  for (const c of nonKeyColumns) {
    const v = String(row[c.id] ?? '').trim();
    if (!v) continue;
    if (isMeaninglessIdLikeLabel(v)) continue;
    return v;
  }

  // それでも無ければ、fallback（例: テーブル名）を優先
  if (fallback) return fallback;

  // 最終手段: primaryLabel があればそれ（意味なしでも）
  if (primaryLabel) return primaryLabel;
  return '';
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

  const computedRefRow = computeRowWithAppFormulas({
    tables: params.tables,
    sampleDataByTableId: params.sampleDataByTableId,
    table: refTable,
    row: refRow,
  });

  const label = getRowLabel(refTable, computedRefRow, { fallback: raw });
  return label || raw;
}
