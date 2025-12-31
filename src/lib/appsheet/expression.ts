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
      tables: ctx.tables,
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
    case 'binary': {
      const left = evalAst(ast.left, ctx);
      const right = evalAst(ast.right, ctx);

      if (ast.op === '&') return `${asString(left)}${asString(right)}`;

      if (ast.op === '+' || ast.op === '-' || ast.op === '*' || ast.op === '/') {
        const a = toNumber(left);
        const b = toNumber(right);
        if (a === null || b === null) return '';
        if (ast.op === '+') return a + b;
        if (ast.op === '-') return a - b;
        if (ast.op === '*') return a * b;
        if (ast.op === '/') return b === 0 ? '' : a / b;
      }

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
    case 'call': {
      const name = ast.name.toUpperCase();
      const now = ctx.now ?? new Date();

      if (name === 'IF') {
        const cond = ast.args[0] ? evalAst(ast.args[0], ctx) : '';
        const thenExpr = ast.args[1] ? evalAst(ast.args[1], ctx) : '';
        const elseExpr = ast.args[2] ? evalAst(ast.args[2], ctx) : '';
        return truthy(cond) ? thenExpr : elseExpr;
      }

      if (name === 'AND') {
        for (const a of ast.args) {
          if (!truthy(evalAst(a, ctx))) return false;
        }
        return true;
      }

      if (name === 'OR') {
        for (const a of ast.args) {
          if (truthy(evalAst(a, ctx))) return true;
        }
        return false;
      }

      if (name === 'NOT') {
        const v = ast.args[0] ? evalAst(ast.args[0], ctx) : '';
        return !truthy(v);
      }

      if (name === 'ISBLANK') {
        const v = ast.args[0] ? evalAst(ast.args[0], ctx) : '';
        return isBlank(v);
      }

      if (name === 'CONCATENATE') {
        return ast.args.map((a) => asString(evalAst(a, ctx))).join('');
      }

      if (name === 'TEXT') {
        const v = ast.args[0] ? evalAst(ast.args[0], ctx) : '';
        return asString(v);
      }

      if (name === 'TODAY') {
        const iso = now.toISOString();
        return iso.split('T')[0] ?? '';
      }

      if (name === 'NOW') {
        return now.toISOString();
      }

      if (name === 'ANY') {
        const v = ast.args[0] ? evalAst(ast.args[0], ctx) : '';
        if (Array.isArray(v)) return v[0] ?? '';
        return v;
      }

      if (name === 'LOOKUP') {
        // LOOKUP(key, "Table", "KeyColumn", "ReturnColumn")
        const keyValue = ast.args[0] ? asString(evalAst(ast.args[0], ctx)).trim() : '';
        const tableName = ast.args[1] ? asString(evalAst(ast.args[1], ctx)).trim() : '';
        const keyColumnName = ast.args[2] ? asString(evalAst(ast.args[2], ctx)).trim() : '';
        const returnColumnName = ast.args[3] ? asString(evalAst(ast.args[3], ctx)).trim() : '';
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

      if (name === 'FILTER') {
        // FILTER("Table", condition) -> list of key values
        const tableName = ast.args[0] ? asString(evalAst(ast.args[0], ctx)).trim() : '';
        if (!tableName) return [];

        const table = findTableByName(ctx.tables, tableName);
        if (!table) return [];

        const keyColId = getKeyColumnIdForTable(table);
        if (!keyColId) return [];

        const rows = ctx.sampleDataByTableId[table.id] ?? [];
        const out: unknown[] = [];
        const condExpr = ast.args[1];

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

      if (name === 'SELECT') {
        // SELECT(Table[Column], condition) -> list of values
        const listExpr = ast.args[0];
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
        const condExpr = ast.args[1];

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

      // 未対応関数は空にする（fail-soft）
      return '';
    }
    default:
      return '';
  }
}

type TableColumnRuntimeRef = { __kind: 'tableColumnRef'; tableName: string; columnName: string };

function isTableColumnRuntimeRef(value: unknown): value is TableColumnRuntimeRef {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    v.__kind === 'tableColumnRef' &&
    typeof v.tableName === 'string' &&
    typeof v.columnName === 'string'
  );
}

export function getAppFormulaString(column: Column): string {
  const raw = column.appSheet?.AppFormula;
  return typeof raw === 'string' ? raw.trim() : '';
}

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
