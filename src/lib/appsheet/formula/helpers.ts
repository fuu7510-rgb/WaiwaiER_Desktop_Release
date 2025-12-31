/**
 * AppSheet式評価で使用するヘルパー関数
 */
import type { Table, Column } from '../../../types';

/**
 * 値がブランク（空）かどうかを判定
 */
export function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s.length === 0) return true;
  // 旧サンプルデータやUIで使われがちな「空の代替表現」を空扱いにする
  if (s === '-' || s === '—' || s === '−') return true;
  return false;
}

/**
 * 値を文字列に変換
 */
export function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(asString).filter((s) => s.trim().length > 0).join(', ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

/**
 * 値を数値に変換（変換不可の場合は null）
 */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value ?? '').trim().replace(/,/g, '');
  if (!s) return null;
  if (s === '-' || s === '—' || s === '−') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * 値がtruthy（真値）かどうかを判定
 * AppSheet互換の判定ロジック
 */
export function truthy(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;

  const s = String(value).trim();
  if (!s) return false;
  const upper = s.toUpperCase();
  if (upper === 'FALSE' || upper === 'NO') return false;
  if (upper === 'TRUE' || upper === 'YES') return true;
  return true;
}

/**
 * テーブル内でカラム名からカラムIDを検索
 */
export function findColumnIdByName(table: Table, name: string): string | null {
  const needle = String(name ?? '').trim();
  const exact = table.columns.find((c) => String(c.name ?? '').trim() === needle);
  if (exact) return exact.id;
  const lower = needle.toLowerCase();
  const ci = table.columns.find((c) => String(c.name ?? '').trim().toLowerCase() === lower);
  return ci ? ci.id : null;
}

/**
 * テーブル名からテーブルを検索
 */
export function findTableByName(tables: Table[], name: string): Table | null {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  const exact = tables.find((t) => String(t.name ?? '').trim() === trimmed);
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  const ci = tables.find((t) => String(t.name ?? '').trim().toLowerCase() === lower);
  return ci ?? null;
}

/**
 * テーブルのキーカラムIDを取得
 */
export function getKeyColumnIdForTable(table: Table): string | null {
  return table.columns.find((c) => c.isKey)?.id ?? table.columns[0]?.id ?? null;
}

/**
 * 参照先の行を取得
 */
export function getRefRow(params: {
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  refTableId: string;
  refKeyColumnId: string;
  refKeyValue: string;
}): Record<string, unknown> | null {
  const rows = params.sampleDataByTableId[params.refTableId] ?? [];
  const row = rows.find((r) => String(r[params.refKeyColumnId] ?? '').trim() === params.refKeyValue);
  return row ?? null;
}

/**
 * カラムのAppFormula式文字列を取得
 */
export function getAppFormulaString(column: Column): string {
  const raw = column.appSheet?.AppFormula;
  return typeof raw === 'string' ? raw.trim() : '';
}
