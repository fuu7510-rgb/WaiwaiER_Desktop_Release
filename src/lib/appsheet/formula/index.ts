/**
 * AppSheet式評価エンジン
 * 
 * このモジュールは以下のサブモジュールで構成されています:
 * - types.ts: 型定義
 * - tokenizer.ts: 字句解析
 * - parser.ts: 構文解析
 * - helpers.ts: ユーティリティ関数
 * - evaluator.ts: AST評価器
 */

// 型定義のエクスポート
export type {
  AppSheetValue,
  AppSheetEvalContext,
  Token,
  Expr,
  TableColumnRuntimeRef,
} from './types';

export { isTableColumnRuntimeRef } from './types';

// トークナイザーのエクスポート
export { tokenize, normalizeExpressionInput } from './tokenizer';

// パーサーのエクスポート
export { parseExpressionCached, clearParseCache } from './parser';

// ヘルパー関数のエクスポート
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
} from './helpers';

// 評価器のエクスポート
export {
  evaluateAppSheetExpression,
  computeRowWithAppFormulas,
} from './evaluator';
