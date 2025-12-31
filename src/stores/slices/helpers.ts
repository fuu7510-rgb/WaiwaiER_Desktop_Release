/**
 * erStore用ヘルパー関数
 * サンプルデータの同期、型変換、共通カラム処理などのユーティリティ
 */
import { v4 as uuidv4 } from 'uuid';
import type { Table, Column, ColumnType, CommonColumnDefinition, SampleRow, SampleDataByTableId, SampleRowValue } from '../../types';
import { DEFAULT_SAMPLE_ROWS, MAX_SAMPLE_ROWS } from './types';

// ========== 配列操作 ==========

export function arrayMove<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  const next = array.slice();
  const startIndex = fromIndex < 0 ? next.length + fromIndex : fromIndex;
  if (startIndex < 0 || startIndex >= next.length) return next;
  const endIndex = toIndex < 0 ? next.length + toIndex : toIndex;
  const [item] = next.splice(startIndex, 1);
  next.splice(endIndex, 0, item);
  return next;
}

// ========== デフォルト値生成 ==========

export function makeDefaultKeyValue(rowIndex: number): string {
  return `ROW-${String(rowIndex + 1).padStart(4, '0')}`;
}

export function createDefaultColumn(order: number, customName?: string): Column {
  return {
    id: uuidv4(),
    name: customName || `Column${order + 1}`,
    type: 'Text' as ColumnType,
    isKey: order === 0,
    isLabel: order === 0,
    constraints: {},
    order,
  };
}

export function createDefaultTable(name: string, position: { x: number; y: number }, keyColumnName?: string): Table {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name,
    columns: [createDefaultColumn(0, keyColumnName)],
    position,
    createdAt: now,
    updatedAt: now,
  };
}

// ========== サンプルデータ計算 ==========

export function getDesiredAutoSampleRowCountFromDummyValues(table: Table): number | null {
  let maxLen = 0;
  for (const c of table.columns) {
    const len = (c.dummyValues ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0).length;
    if (len > maxLen) maxLen = len;
  }
  return maxLen > 0 ? Math.min(maxLen, MAX_SAMPLE_ROWS) : null;
}

export function isBlankSampleCell(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value);
  return s.trim().length === 0 || s.trim() === '-';
}

export function coerceDummyValueForType(raw: string, type: ColumnType): SampleRowValue {
  const trimmed = String(raw ?? '').trim();
  if (trimmed.length === 0) return '';

  if (type === 'Number' || type === 'ChangeCounter') {
    const n = Number.parseInt(trimmed, 10);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === 'Decimal' || type === 'Percent' || type === 'Price' || type === 'Progress') {
    const n = Number.parseFloat(trimmed);
    return Number.isFinite(n) ? n : trimmed;
  }
  if (type === 'Yes/No') {
    const lower = trimmed.toLowerCase();
    if (lower === 'yes' || lower === 'true' || lower === '1') return 'Yes';
    if (lower === 'no' || lower === 'false' || lower === '0') return 'No';
    return trimmed;
  }

  return trimmed;
}

// ========== サンプルデータ同期 ==========

export function syncSampleRowsToTableSchema(params: {
  table: Table;
  currentRows: SampleRow[] | undefined;
  desiredRowCount?: number;
}): SampleRow[] {
  const { table } = params;
  const currentRows = params.currentRows ?? [];

  const nextCountRaw =
    params.desiredRowCount ?? (currentRows.length > 0 ? currentRows.length : DEFAULT_SAMPLE_ROWS);
  const nextCount = Math.min(Math.max(nextCountRaw, 0), MAX_SAMPLE_ROWS);

  const baseRows = currentRows.slice(0, nextCount);
  const rows: SampleRow[] = [];

  for (let i = 0; i < nextCount; i++) {
    const current = baseRows[i] ?? {};
    const out: SampleRow = {};

    for (const column of table.columns) {
      if (column.id in current) {
        out[column.id] = current[column.id] as SampleRow[string];
        continue;
      }
      // 新規カラムは原則空欄。Keyだけは参照成立のため決定的に埋める。
      out[column.id] = column.isKey ? makeDefaultKeyValue(i) : '';
    }

    // Keyが空なら補完
    const keyCol = table.columns.find((c) => c.isKey);
    if (keyCol) {
      const raw = String(out[keyCol.id] ?? '').trim();
      if (!raw) out[keyCol.id] = makeDefaultKeyValue(i);
    }

    rows.push(out);
  }

  return rows;
}

export function applyDummyValuesToSampleRows(params: {
  rows: SampleRow[];
  column: Column;
  previousDummyValues?: string[];
}): SampleRow[] {
  const { rows, column, previousDummyValues } = params;
  if (column.isKey) return rows;
  const values = (column.dummyValues ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0);
  if (values.length === 0) return rows;

  const previousSet = new Set((previousDummyValues ?? []).map((v) => String(v).trim()).filter((v) => v.length > 0));

  let anyChanged = false;
  const nextRows = rows.map((row, rowIndex) => {
    const current = row?.[column.id];
    const currentTrimmed = String(current ?? '').trim();
    const shouldReplace = isBlankSampleCell(current) || (previousSet.size > 0 && previousSet.has(currentTrimmed));
    if (!shouldReplace) return row;
    // NOTE: Do not wrap/cycle. If dummyValues has fewer entries than rows,
    // leave remaining rows blank (and clear old dummy values if needed).
    const picked = values[rowIndex] ?? '';
    const coerced = coerceDummyValueForType(picked, column.type);
    anyChanged = true;
    return { ...row, [column.id]: coerced };
  });

  return anyChanged ? nextRows : rows;
}

// ========== Ref参照正規化 ==========

const AUTO_REF_PLACEHOLDER_RE = /^REF-\d+$/;

export function normalizeRefValues(params: {
  tables: Table[];
  sampleDataByTableId: SampleDataByTableId;
}): SampleDataByTableId {
  const { tables } = params;
  const base = params.sampleDataByTableId;

  const tableById = new Map<string, Table>();
  for (const t of tables) tableById.set(t.id, t);

  const next: SampleDataByTableId = { ...base };

  for (const table of tables) {
    const rows = next[table.id] ?? [];
    if (rows.length === 0) continue;

    const refColumns = table.columns.filter((c) => c.type === 'Ref' && c.constraints.refTableId);
    if (refColumns.length === 0) continue;

    let anyRowChanged = false;
    const nextRows = rows.map((row, rowIndex) => {
      let outRow: SampleRow = row;

      for (let refIndex = 0; refIndex < refColumns.length; refIndex++) {
        const column = refColumns[refIndex];
        const raw = String(row[column.id] ?? '').trim();

        const refTableId = column.constraints.refTableId;
        const refTable = refTableId ? tableById.get(refTableId) : undefined;
        if (!refTable || !refTableId) continue;

        const refRows = next[refTableId] ?? [];
        if (refRows.length === 0) continue;

        const refKeyColId =
          column.constraints.refColumnId ??
          refTable.columns.find((c) => c.isKey)?.id ??
          refTable.columns[0]?.id;

        if (!refKeyColId) continue;

        const exists = raw
          ? refRows.some((r) => String(r[refKeyColId] ?? '').trim() === raw)
          : false;

        // 既に有効な参照なら触らない
        if (exists) continue;

        // ユーザーが手入力したような値は保持（REF-xxx や空だけ補正対象）
        if (raw && !AUTO_REF_PLACEHOLDER_RE.test(raw)) continue;

        const pickedRow = refRows[(rowIndex + refIndex) % refRows.length];
        const pickedKey = String(pickedRow?.[refKeyColId] ?? '').trim();
        if (!pickedKey) continue;

        if (outRow === row) outRow = { ...row };
        outRow[column.id] = pickedKey;
        anyRowChanged = true;
      }

      return outRow;
    });

    if (anyRowChanged) {
      next[table.id] = nextRows;
    }
  }

  return next;
}

export function reconcileSampleDataBySchema(params: {
  tables: Table[];
  previousSampleDataByTableId: SampleDataByTableId;
}): SampleDataByTableId {
  const { tables, previousSampleDataByTableId } = params;
  const next: SampleDataByTableId = {};

  for (const table of tables) {
    next[table.id] = syncSampleRowsToTableSchema({
      table,
      currentRows: previousSampleDataByTableId[table.id],
    });
  }

  return normalizeRefValues({ tables, sampleDataByTableId: next });
}

// ========== 共通カラム処理 ==========

export function normalizeCommonColumns(defs: CommonColumnDefinition[] | undefined | null): CommonColumnDefinition[] {
  if (!Array.isArray(defs)) return [];
  const out: CommonColumnDefinition[] = [];
  for (const d of defs) {
    const name = String(d?.name ?? '').trim();
    if (!name) continue;
    out.push({
      id: String(d.id ?? ''),
      name,
      type: d.type,
      constraints: d.constraints ?? {},
      appSheet: d.appSheet,
    });
  }
  return out;
}

export function applyCommonColumnsToTableInPlace(table: Table, defs: CommonColumnDefinition[]): boolean {
  const commonDefs = normalizeCommonColumns(defs);
  if (commonDefs.length === 0) return false;

  const byName = new Map<string, Column>();
  for (const c of table.columns) {
    const key = String(c.name ?? '').trim();
    if (!key) continue;
    if (!byName.has(key)) byName.set(key, c);
  }

  const usedNonKeyIds = new Set<string>();
  const appended: Column[] = [];

  for (const def of commonDefs) {
    const existing = byName.get(def.name);
    if (existing) {
      // 既存のカラム定義は壊さない（型/制約は上書きしない）。末尾へ移動だけ行う。
      if (!existing.isKey) {
        usedNonKeyIds.add(existing.id);
        appended.push(existing);
      }
      continue;
    }

    appended.push({
      id: uuidv4(),
      name: def.name,
      type: def.type,
      isKey: false,
      isLabel: false,
      constraints: def.constraints ?? {},
      appSheet: def.appSheet,
      order: -1,
    });
  }

  const nonCommon = table.columns.filter((c) => c.isKey || !usedNonKeyIds.has(c.id));
  const next = [...nonCommon, ...appended];

  let changed = false;
  if (next.length !== table.columns.length) {
    changed = true;
  } else {
    for (let i = 0; i < next.length; i++) {
      if (next[i].id !== table.columns[i].id) {
        changed = true;
        break;
      }
    }
  }

  for (let i = 0; i < next.length; i++) {
    if (next[i].order !== i) {
      next[i].order = i;
      changed = true;
    }
  }

  if (!changed) return false;
  table.columns = next;
  table.updatedAt = new Date().toISOString();
  return true;
}

// ========== サンプルデータマイグレーション ==========

export function migrateStoredSampleDataToIds(params: {
  tables: Table[];
  storedSampleData: SampleDataByTableId | null;
}): SampleDataByTableId | null {
  const { tables, storedSampleData } = params;
  if (!storedSampleData) return null;

  const out: SampleDataByTableId = {};

  for (const table of tables) {
    const rawRows =
      (storedSampleData as Record<string, unknown>)[table.id] ??
      (storedSampleData as Record<string, unknown>)[table.name];
    if (!Array.isArray(rawRows)) continue;

    out[table.id] = rawRows.map((raw) => {
      const row = raw && typeof raw === 'object' ? (raw as SampleRow) : {};
      const nextRow: SampleRow = {};

      for (const column of table.columns) {
        if (Object.prototype.hasOwnProperty.call(row, column.id)) {
          nextRow[column.id] = row[column.id];
          continue;
        }
        if (Object.prototype.hasOwnProperty.call(row, column.name)) {
          nextRow[column.id] = row[column.name];
        }
      }

      return nextRow;
    });
  }

  return out;
}
