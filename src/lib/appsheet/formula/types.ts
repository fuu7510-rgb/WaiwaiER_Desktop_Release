/**
 * AppSheet式評価エンジンの型定義
 */
import type { Table } from '../../../types';

/**
 * AppSheet式の評価結果の型
 */
export type AppSheetValue = string | number | boolean | null | unknown[];

/**
 * 式評価時のコンテキスト
 */
export type AppSheetEvalContext = {
  /** 全テーブル定義 */
  tables: Table[];
  /** テーブルIDをキーとするサンプルデータのマップ */
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  /** 現在行の所属テーブル */
  table: Table;
  /** 現在行（保存されている生データ） */
  row: Record<string, unknown>;
  /** SELECT/FILTERの行評価中に使う外側行コンテキスト（AppSheetの _THISROW 相当） */
  thisTable?: Table;
  thisRow?: Record<string, unknown>;
  /** NOW()/TODAY() の基準時刻（テストや再現性用） */
  now?: Date;
  /** 再帰参照の深さ制限（デフォルト: 5） */
  maxDerefDepth?: number;
  /** AppFormula計算の再帰深さ（循環参照ガード） */
  recursionDepth?: number;
  /** AppFormula計算の最大再帰深さ（デフォルト: 5） */
  maxRecursionDepth?: number;
};

/**
 * 字句解析後のトークン型
 */
export type Token =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'identifier'; value: string }
  | { kind: 'bracket'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'punct'; value: '(' | ')' | ',' | '.' };

/**
 * 構文解析後のAST（抽象構文木）ノード型
 */
export type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'blank' }
  | { kind: 'columnRef'; path: string[] }
  | { kind: 'tableColumnRef'; tableName: string; columnName: string }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'unary'; op: string; expr: Expr };

/**
 * SELECT/FILTER関数で使うテーブルカラム参照のランタイム型
 */
export type TableColumnRuntimeRef = {
  __kind: 'tableColumnRef';
  tableName: string;
  columnName: string;
};

/**
 * TableColumnRuntimeRef型かどうかを判定するタイプガード
 */
export function isTableColumnRuntimeRef(value: unknown): value is TableColumnRuntimeRef {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.__kind === 'tableColumnRef' &&
    typeof v.tableName === 'string' &&
    typeof v.columnName === 'string'
  );
}
