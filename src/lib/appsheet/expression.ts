/**
 * AppSheet式評価エンジン
 *
 * このファイルは後方互換性のためのエクスポートポイントです。
 * 実際の実装は formula/ サブディレクトリに分割されています。
 *
 * @see ./formula/types.ts - 型定義
 * @see ./formula/tokenizer.ts - 字句解析
 * @see ./formula/parser.ts - 構文解析
 * @see ./formula/helpers.ts - ユーティリティ関数
 * @see ./formula/evaluator.ts - AST評価器
 */

// 型定義の再エクスポート
export type {
  AppSheetValue,
  AppSheetEvalContext,
  Token,
  Expr,
  TableColumnRuntimeRef,
} from './formula';

export { isTableColumnRuntimeRef } from './formula';

// トークナイザーの再エクスポート
export { tokenize, normalizeExpressionInput } from './formula';

// パーサーの再エクスポート
export { parseExpressionCached, clearParseCache } from './formula';

// ヘルパー関数の再エクスポート
export {
  isBlank,
  asString,
  toNumber,
  truthy,
  findColumnIdByName,
  findTableByName,
  getKeyColumnIdForTable,
  getRefRow,
  getAppFormulaString,
} from './formula';

// 評価器の再エクスポート
export {
  evaluateAppSheetExpression,
  computeRowWithAppFormulas,
} from './formula';
