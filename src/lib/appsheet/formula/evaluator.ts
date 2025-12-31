/**
 * AppSheet式のAST評価器
 */
import type { Table, Column } from '../../../types';
import type { Expr, AppSheetEvalContext, AppSheetValue } from './types';
import { isTableColumnRuntimeRef } from './types';
import { parseExpressionCached } from './parser';
import {
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

/**
 * カラムパス（[Column].[SubColumn]）を評価
 */
function evalColumnPath(ctx: AppSheetEvalContext, path: string[]): unknown {
  const maxDepth = ctx.maxDerefDepth ?? 5;
  let currentTable: Table | undefined = ctx.table;
  let currentRow: Record<string, unknown> | null = ctx.row;

  // AppSheetの [_THISROW] 相当
  if (path.length > 0 && path[0].toUpperCase() === '_THISROW') {
    if (!ctx.thisRow || !ctx.thisTable) return '';
    if (path.length === 1) return '';
    currentTable = ctx.thisTable;
    currentRow = ctx.thisRow;
    path = path.slice(1);
  }

  for (let depth = 0; depth < path.length; depth++) {
    const name = path[depth];
    if (!currentTable || !currentRow) return '';

    // first segment: local column lookup
    if (depth === 0) {
      const columnId = findColumnIdByName(currentTable, name);
      if (!columnId) return '';
      const baseValue = currentRow[columnId];

      if (path.length === 1) return baseValue;

      // deref requires Ref
      const col: Column | undefined = currentTable.columns.find((c: Column) => c.id === columnId);
      if (!col || col.type !== 'Ref' || !col.constraints.refTableId) return '';
      const refTable: Table | undefined = ctx.tables.find((t: Table) => t.id === col.constraints.refTableId);
      if (!refTable) return '';

      const refKeyColId =
        col.constraints.refColumnId ??
        refTable.columns.find((c: Column) => c.isKey)?.id ??
        refTable.columns[0]?.id;
      if (!refKeyColId) return '';

      const refKeyValue = String(baseValue ?? '').trim();
      if (!refKeyValue) return '';

      const refRowRaw = getRefRow({
        sampleDataByTableId: ctx.sampleDataByTableId,
        refTableId: refTable.id,
        refKeyColumnId: refKeyColId,
        refKeyValue,
      });
      if (!refRowRaw) return '';

      // AppFormulaがラベル等に使われるケースを考慮し、参照先行も計算してから使う
      currentTable = refTable;
      currentRow = computeRowWithAppFormulas({
        tables: ctx.tables,
        sampleDataByTableId: ctx.sampleDataByTableId,
        table: refTable,
        row: refRowRaw,
        recursionDepth: (ctx.recursionDepth ?? 0) + 1,
        maxRecursionDepth: ctx.maxRecursionDepth ?? maxDepth,
      });
      continue;
    }

    // subsequent segments: column on currentTable/currentRow
    const colId = findColumnIdByName(currentTable, name);
    if (!colId) return '';
    const v = currentRow[colId];

    if (depth === path.length - 1) return v;

    const col: Column | undefined = currentTable.columns.find((c: Column) => c.id === colId);
    if (!col || col.type !== 'Ref' || !col.constraints.refTableId) return '';
    const refTable: Table | undefined = ctx.tables.find((t: Table) => t.id === col.constraints.refTableId);
    if (!refTable) return '';

    const refKeyColId =
      col.constraints.refColumnId ??
      refTable.columns.find((c: Column) => c.isKey)?.id ??
      refTable.columns[0]?.id;
    if (!refKeyColId) return '';

    const refKeyValue = String(v ?? '').trim();
    if (!refKeyValue) return '';

    const refRowRaw = getRefRow({
      sampleDataByTableId: ctx.sampleDataByTableId,
      refTableId: refTable.id,
      refKeyColumnId: refKeyColId,
      refKeyValue,
    });
    if (!refRowRaw) return '';

    currentTable = refTable;
    currentRow = computeRowWithAppFormulas({
      tables: ctx.tables,
      sampleDataByTableId: ctx.sampleDataByTableId,
      table: refTable,
      row: refRowRaw,
      recursionDepth: (ctx.recursionDepth ?? 0) + 1,
      maxRecursionDepth: ctx.maxRecursionDepth ?? maxDepth,
    });
  }

  return '';
}

/**
 * ASTノードを評価して値を返す
 */
function evalAst(ast: Expr, ctx: AppSheetEvalContext): unknown {
  switch (ast.kind) {
    case 'number':
    case 'string':
    case 'boolean':
      return ast.value;
    case 'blank':
      return '';
    case 'columnRef':
      return evalColumnPath(ctx, ast.path);
    case 'tableColumnRef':
      // この式自体は値にならない（SELECT用のシグネチャとしてのみ使う）
      return { __kind: 'tableColumnRef', tableName: ast.tableName, columnName: ast.columnName };
    case 'unary': {
      const v = evalAst(ast.expr, ctx);
      if (ast.op === '+') return toNumber(v) ?? 0;
      if (ast.op === '-') {
        const n = toNumber(v) ?? 0;
        return -n;
      }
      return '';
    }
    case 'binary':
      return evalBinaryExpr(ast, ctx);
    case 'call':
      return evalFunctionCall(ast.name, ast.args, ctx);
    default:
      return '';
  }
}

/**
 * 二項演算式を評価
 */
function evalBinaryExpr(
  ast: { kind: 'binary'; op: string; left: Expr; right: Expr },
  ctx: AppSheetEvalContext
): unknown {
  const left = evalAst(ast.left, ctx);
  const right = evalAst(ast.right, ctx);

  // 文字列連結
  if (ast.op === '&') return `${asString(left)}${asString(right)}`;

  // 算術演算
  if (ast.op === '+' || ast.op === '-' || ast.op === '*' || ast.op === '/') {
    const a = toNumber(left);
    const b = toNumber(right);
    if (a === null || b === null) return '';
    if (ast.op === '+') return a + b;
    if (ast.op === '-') return a - b;
    if (ast.op === '*') return a * b;
    if (ast.op === '/') return b === 0 ? '' : a / b;
  }

  // 比較演算
  if (ast.op === '=' || ast.op === '<>' || ast.op === '<' || ast.op === '>' || ast.op === '<=' || ast.op === '>=') {
    const an = toNumber(left);
    const bn = toNumber(right);
    const bothNumeric = an !== null && bn !== null;

    const a = bothNumeric ? an : asString(left).trim();
    const b = bothNumeric ? bn : asString(right).trim();

    const cmp = a === b ? 0 : a < b ? -1 : 1;

    if (ast.op === '=') return cmp === 0;
    if (ast.op === '<>') return cmp !== 0;
    if (ast.op === '<') return cmp < 0;
    if (ast.op === '>') return cmp > 0;
    if (ast.op === '<=') return cmp <= 0;
    if (ast.op === '>=') return cmp >= 0;
  }

  return '';
}

/**
 * 関数呼び出しを評価
 */
function evalFunctionCall(name: string, args: Expr[], ctx: AppSheetEvalContext): unknown {
  const funcName = name.toUpperCase();
  const now = ctx.now ?? new Date();

  // 論理関数
  if (funcName === 'IF') {
    const cond = args[0] ? evalAst(args[0], ctx) : '';
    const thenExpr = args[1] ? evalAst(args[1], ctx) : '';
    const elseExpr = args[2] ? evalAst(args[2], ctx) : '';
    return truthy(cond) ? thenExpr : elseExpr;
  }

  if (funcName === 'AND') {
    for (const a of args) {
      if (!truthy(evalAst(a, ctx))) return false;
    }
    return true;
  }

  if (funcName === 'OR') {
    for (const a of args) {
      if (truthy(evalAst(a, ctx))) return true;
    }
    return false;
  }

  if (funcName === 'NOT') {
    const v = args[0] ? evalAst(args[0], ctx) : '';
    return !truthy(v);
  }

  if (funcName === 'ISBLANK') {
    const v = args[0] ? evalAst(args[0], ctx) : '';
    return isBlank(v);
  }

  // テキスト関数
  if (funcName === 'CONCATENATE') {
    return args.map((a) => asString(evalAst(a, ctx))).join('');
  }

  if (funcName === 'TEXT') {
    const v = args[0] ? evalAst(args[0], ctx) : '';
    return asString(v);
  }

  // 日付関数
  if (funcName === 'TODAY') {
    const iso = now.toISOString();
    return iso.split('T')[0] ?? '';
  }

  if (funcName === 'NOW') {
    return now.toISOString();
  }

  // 集約関数
  if (funcName === 'ANY') {
    const v = args[0] ? evalAst(args[0], ctx) : '';
    if (Array.isArray(v)) return v[0] ?? '';
    return v;
  }

  if (funcName === 'LOOKUP') {
    return evalLookup(args, ctx, now);
  }

  if (funcName === 'FILTER') {
    return evalFilter(args, ctx, now);
  }

  if (funcName === 'SELECT') {
    return evalSelect(args, ctx, now);
  }

  // 未対応関数は空にする（fail-soft）
  return '';
}

/**
 * LOOKUP関数を評価
 * LOOKUP(key, "Table", "KeyColumn", "ReturnColumn")
 */
function evalLookup(args: Expr[], ctx: AppSheetEvalContext, now: Date): unknown {
  const keyValue = args[0] ? asString(evalAst(args[0], ctx)).trim() : '';
  const tableName = args[1] ? asString(evalAst(args[1], ctx)).trim() : '';
  const keyColumnName = args[2] ? asString(evalAst(args[2], ctx)).trim() : '';
  const returnColumnName = args[3] ? asString(evalAst(args[3], ctx)).trim() : '';
  if (!keyValue || !tableName || !keyColumnName || !returnColumnName) return '';

  const table = findTableByName(ctx.tables, tableName);
  if (!table) return '';

  const keyColId = findColumnIdByName(table, keyColumnName);
  const retColId = findColumnIdByName(table, returnColumnName);
  if (!keyColId || !retColId) return '';

  const rows = ctx.sampleDataByTableId[table.id] ?? [];
  const found = rows.find((r) => asString(r[keyColId]).trim() === keyValue);
  if (!found) return '';

  const computed = computeRowWithAppFormulas({
    tables: ctx.tables,
    sampleDataByTableId: ctx.sampleDataByTableId,
    table,
    row: found,
    now,
    recursionDepth: (ctx.recursionDepth ?? 0) + 1,
    maxRecursionDepth: ctx.maxRecursionDepth ?? (ctx.maxDerefDepth ?? 5),
  });
  return computed[retColId] ?? '';
}

/**
 * FILTER関数を評価
 * FILTER("Table", condition) -> list of key values
 */
function evalFilter(args: Expr[], ctx: AppSheetEvalContext, now: Date): unknown[] {
  const tableName = args[0] ? asString(evalAst(args[0], ctx)).trim() : '';
  if (!tableName) return [];

  const table = findTableByName(ctx.tables, tableName);
  if (!table) return [];

  const keyColId = getKeyColumnIdForTable(table);
  if (!keyColId) return [];

  const rows = ctx.sampleDataByTableId[table.id] ?? [];
  const out: unknown[] = [];
  const condExpr = args[1];

  for (const r of rows) {
    const computed = computeRowWithAppFormulas({
      tables: ctx.tables,
      sampleDataByTableId: ctx.sampleDataByTableId,
      table,
      row: r,
      now,
      recursionDepth: (ctx.recursionDepth ?? 0) + 1,
      maxRecursionDepth: ctx.maxRecursionDepth ?? (ctx.maxDerefDepth ?? 5),
    });

    const ok = condExpr
      ? truthy(
          evalAst(condExpr, {
            ...ctx,
            table,
            row: computed,
            thisTable: ctx.table,
            thisRow: ctx.row,
            recursionDepth: (ctx.recursionDepth ?? 0) + 1,
          })
        )
      : true;

    if (!ok) continue;
    const k = computed[keyColId];
    const ks = asString(k).trim();
    if (!ks) continue;
    out.push(ks);
  }

  return out;
}

/**
 * SELECT関数を評価
 * SELECT(Table[Column], condition) -> list of values
 */
function evalSelect(args: Expr[], ctx: AppSheetEvalContext, now: Date): unknown[] {
  const listExpr = args[0];
  if (!listExpr) return [];

  const listValue = evalAst(listExpr, ctx) as unknown;
  const tableColumn = isTableColumnRuntimeRef(listValue) ? listValue : null;

  if (!tableColumn) return [];

  const table = findTableByName(ctx.tables, asString(tableColumn.tableName));
  if (!table) return [];

  const colId = findColumnIdByName(table, asString(tableColumn.columnName));
  if (!colId) return [];

  const rows = ctx.sampleDataByTableId[table.id] ?? [];
  const out: unknown[] = [];
  const condExpr = args[1];

  for (const r of rows) {
    const computed = computeRowWithAppFormulas({
      tables: ctx.tables,
      sampleDataByTableId: ctx.sampleDataByTableId,
      table,
      row: r,
      now,
      recursionDepth: (ctx.recursionDepth ?? 0) + 1,
      maxRecursionDepth: ctx.maxRecursionDepth ?? (ctx.maxDerefDepth ?? 5),
    });

    const ok = condExpr
      ? truthy(
          evalAst(condExpr, {
            ...ctx,
            table,
            row: computed,
            thisTable: ctx.table,
            thisRow: ctx.row,
            recursionDepth: (ctx.recursionDepth ?? 0) + 1,
          })
        )
      : true;

    if (!ok) continue;
    const v = computed[colId];
    if (isBlank(v)) continue;
    out.push(v);
  }

  return out;
}

/**
 * AppSheet式を評価して値を返す
 */
export function evaluateAppSheetExpression(expression: string, ctx: AppSheetEvalContext): AppSheetValue {
  try {
    const ast = parseExpressionCached(expression);
    const v = evalAst(ast, ctx);
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return v;
    return asString(v);
  } catch {
    return '';
  }
}

/**
 * 行データにAppFormula列の計算結果を適用して返す
 */
export function computeRowWithAppFormulas(params: {
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  table: Table;
  row: Record<string, unknown>;
  now?: Date;
  recursionDepth?: number;
  maxRecursionDepth?: number;
}): Record<string, unknown> {
  const {
    tables,
    sampleDataByTableId,
    table,
    row,
    now,
    recursionDepth = 0,
    maxRecursionDepth = 5,
  } = params;

  if (recursionDepth > maxRecursionDepth) return { ...row };

  const formulaColumns = table.columns.filter((c) => getAppFormulaString(c).length > 0);
  if (formulaColumns.length === 0) return { ...row };

  // 既存値はベースとして保持しつつ、AppFormula列だけ上書きする。
  const out: Record<string, unknown> = { ...row };

  // 依存関係解析は重いので、まずは数回の固定点反復で十分に追従させる。
  const maxIters = Math.min(8, Math.max(2, formulaColumns.length));

  for (let iter = 0; iter < maxIters; iter++) {
    let anyChanged = false;

    for (const col of formulaColumns) {
      const expr = getAppFormulaString(col);
      if (!expr) continue;

      const nextValue = evaluateAppSheetExpression(expr, {
        tables,
        sampleDataByTableId,
        table,
        row: out,
        now,
        maxDerefDepth: maxRecursionDepth,
        recursionDepth,
        maxRecursionDepth,
      });

      const prev = out[col.id];
      if (!Object.is(prev, nextValue)) {
        out[col.id] = nextValue;
        anyChanged = true;
      }
    }

    if (!anyChanged) break;
  }

  return out;
}
