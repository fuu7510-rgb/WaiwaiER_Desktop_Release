import type { Column, Table } from '../../types';

export type AppSheetValue = string | number | boolean | null | unknown[];

export type AppSheetEvalContext = {
  tables: Table[];
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

type Token =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'identifier'; value: string }
  | { kind: 'bracket'; value: string }
  | { kind: 'op'; value: string }
  | { kind: 'punct'; value: '(' | ')' | ',' | '.' };

type Expr =
  | { kind: 'number'; value: number }
  | { kind: 'string'; value: string }
  | { kind: 'boolean'; value: boolean }
  | { kind: 'blank' }
  | { kind: 'columnRef'; path: string[] }
  | { kind: 'tableColumnRef'; tableName: string; columnName: string }
  | { kind: 'call'; name: string; args: Expr[] }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
  | { kind: 'unary'; op: string; expr: Expr };

const parseCache = new Map<string, Expr>();

function isBlank(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  if (s.length === 0) return true;
  // 旧サンプルデータやUIで使われがちな「空の代替表現」を空扱いにする
  if (s === '-' || s === '—' || s === '−') return true;
  return false;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(asString).filter((s) => s.trim().length > 0).join(', ');
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  return String(value);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const s = String(value ?? '').trim().replace(/,/g, '');
  if (!s) return null;
  if (s === '-' || s === '—' || s === '−') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function normalizeExpressionInput(input: string): string {
  // 日本語IME等で入りがちな全角記号をASCIIへ寄せる
  const normalized = String(input ?? '')
    .replace(/[×＊]/g, '*')
    .replace(/[＋]/g, '+')
    .replace(/[－−]/g, '-')
    .replace(/[／]/g, '/')
    .replace(/[＝]/g, '=')
    .replace(/[＆]/g, '&')
    .replace(/[＜]/g, '<')
    .replace(/[＞]/g, '>')
    .replace(/[，]/g, ',')
    .replace(/[．]/g, '.')
    .replace(/[（]/g, '(')
    .replace(/[）]/g, ')');

  // Excel系の癖で先頭に "=" を付けるケースを許容する
  const trimmed = normalized.trimStart();
  if (trimmed.startsWith('=')) {
    return trimmed.slice(1);
  }
  return normalized;
}

function truthy(value: unknown): boolean {
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

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const pushOp = (value: string) => tokens.push({ kind: 'op', value });

  while (i < input.length) {
    const ch = input[i];

    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    if (ch === '(' || ch === ')' || ch === ',' || ch === '.') {
      tokens.push({ kind: 'punct', value: ch });
      i++;
      continue;
    }

    // operators (multi-char first)
    if (ch === '<' || ch === '>' || ch === '=' || ch === '&' || ch === '+' || ch === '-' || ch === '*' || ch === '/') {
      const next = input[i + 1];
      if (ch === '<' && next === '>') {
        pushOp('<>');
        i += 2;
        continue;
      }
      if (ch === '<' && next === '=') {
        pushOp('<=');
        i += 2;
        continue;
      }
      if (ch === '>' && next === '=') {
        pushOp('>=');
        i += 2;
        continue;
      }
      pushOp(ch);
      i++;
      continue;
    }

    // bracket identifier: [Column Name]
    if (ch === '[') {
      const end = input.indexOf(']', i + 1);
      const raw = end >= 0 ? input.slice(i + 1, end) : input.slice(i + 1);
      tokens.push({ kind: 'bracket', value: raw.trim() });
      i = end >= 0 ? end + 1 : input.length;
      continue;
    }

    // string literal: "..." (supports \\ and \" only)
    if (ch === '"') {
      i++;
      let out = '';
      while (i < input.length) {
        const c = input[i];
        if (c === '"') {
          i++;
          break;
        }
        if (c === '\\') {
          const n = input[i + 1];
          if (n === '\\' || n === '"') {
            out += n;
            i += 2;
            continue;
          }
        }
        out += c;
        i++;
      }
      tokens.push({ kind: 'string', value: out });
      continue;
    }

    // number
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const raw = input.slice(i, j);
      const n = Number(raw);
      tokens.push({ kind: 'number', value: Number.isFinite(n) ? n : 0 });
      i = j;
      continue;
    }

    // identifier (function name, TRUE/FALSE)
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_]/.test(input[j])) j++;
      tokens.push({ kind: 'identifier', value: input.slice(i, j) });
      i = j;
      continue;
    }

    // unknown char: skip (fail-soft)
    i++;
  }

  return tokens;
}

class Parser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parseExpression(): Expr {
    return this.parseConcat();
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private consume(): Token | undefined {
    const t = this.tokens[this.pos];
    this.pos++;
    return t;
  }

  private matchOp(op: string): boolean {
    const t = this.peek();
    if (t?.kind === 'op' && t.value === op) {
      this.consume();
      return true;
    }
    return false;
  }

  private matchPunct(value: Token['kind'] extends never ? never : '(' | ')' | ',' | '.'): boolean {
    const t = this.peek();
    if (t?.kind === 'punct' && t.value === value) {
      this.consume();
      return true;
    }
    return false;
  }

  private parseConcat(): Expr {
    let expr = this.parseCompare();
    while (this.matchOp('&')) {
      const right = this.parseCompare();
      expr = { kind: 'binary', op: '&', left: expr, right };
    }
    return expr;
  }

  private parseCompare(): Expr {
    let expr = this.parseAdd();
    while (true) {
      const t = this.peek();
      if (t?.kind !== 'op') break;
      const op = t.value;
      if (!['=', '<>', '<', '>', '<=', '>='].includes(op)) break;
      this.consume();
      const right = this.parseAdd();
      expr = { kind: 'binary', op, left: expr, right };
    }
    return expr;
  }

  private parseAdd(): Expr {
    let expr = this.parseMul();
    while (true) {
      const t = this.peek();
      if (t?.kind !== 'op') break;
      const op = t.value;
      if (op !== '+' && op !== '-') break;
      this.consume();
      const right = this.parseMul();
      expr = { kind: 'binary', op, left: expr, right };
    }
    return expr;
  }

  private parseMul(): Expr {
    let expr = this.parseUnary();
    while (true) {
      const t = this.peek();
      if (t?.kind !== 'op') break;
      const op = t.value;
      if (op !== '*' && op !== '/') break;
      this.consume();
      const right = this.parseUnary();
      expr = { kind: 'binary', op, left: expr, right };
    }
    return expr;
  }

  private parseUnary(): Expr {
    const t = this.peek();
    if (t?.kind === 'op' && (t.value === '+' || t.value === '-')) {
      const op = t.value;
      this.consume();
      return { kind: 'unary', op, expr: this.parseUnary() };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (!t) return { kind: 'blank' };

    if (t.kind === 'number') {
      this.consume();
      return { kind: 'number', value: t.value };
    }

    if (t.kind === 'string') {
      this.consume();
      return { kind: 'string', value: t.value };
    }

    if (t.kind === 'identifier') {
      this.consume();
      const upper = t.value.toUpperCase();
      if (upper === 'TRUE') return { kind: 'boolean', value: true };
      if (upper === 'FALSE') return { kind: 'boolean', value: false };
      if (upper === 'BLANK') return { kind: 'blank' };

      // table column ref: Table[Column]
      const maybeBracket = this.peek();
      if (maybeBracket?.kind === 'bracket') {
        this.consume();
        return { kind: 'tableColumnRef', tableName: t.value, columnName: maybeBracket.value };
      }

      // function call
      if (this.matchPunct('(')) {
        const args: Expr[] = [];
        if (!this.matchPunct(')')) {
          while (true) {
            args.push(this.parseExpression());
            if (this.matchPunct(')')) break;
            this.matchPunct(',');
          }
        }
        return { kind: 'call', name: t.value, args };
      }

      // fail-soft: unknown identifier -> blank
      return { kind: 'blank' };
    }

    if (t.kind === 'bracket') {
      this.consume();
      const path = [t.value];
      while (this.matchPunct('.')) {
        const next = this.peek();
        if (next?.kind === 'bracket') {
          this.consume();
          path.push(next.value);
          continue;
        }
        break;
      }
      return { kind: 'columnRef', path };
    }

    if (t.kind === 'punct' && t.value === '(') {
      this.consume();
      const inner = this.parseExpression();
      this.matchPunct(')');
      return inner;
    }

    // unknown token
    this.consume();
    return { kind: 'blank' };
  }
}

function parseExpressionCached(input: string): Expr {
  const key = normalizeExpressionInput(input).trim();
  if (!key) return { kind: 'blank' };
  const cached = parseCache.get(key);
  if (cached) return cached;
  const tokens = tokenize(key);
  const parser = new Parser(tokens);
  const ast = parser.parseExpression();
  parseCache.set(key, ast);
  return ast;
}

function findColumnIdByName(table: Table, name: string): string | null {
  const needle = String(name ?? '').trim();
  const exact = table.columns.find((c) => String(c.name ?? '').trim() === needle);
  if (exact) return exact.id;
  const lower = needle.toLowerCase();
  const ci = table.columns.find((c) => String(c.name ?? '').trim().toLowerCase() === lower);
  return ci ? ci.id : null;
}

function findTableByName(tables: Table[], name: string): Table | null {
  const trimmed = String(name ?? '').trim();
  if (!trimmed) return null;
  const exact = tables.find((t) => String(t.name ?? '').trim() === trimmed);
  if (exact) return exact;
  const lower = trimmed.toLowerCase();
  const ci = tables.find((t) => String(t.name ?? '').trim().toLowerCase() === lower);
  return ci ?? null;
}

function getKeyColumnIdForTable(table: Table): string | null {
  return table.columns.find((c) => c.isKey)?.id ?? table.columns[0]?.id ?? null;
}

function getRefRow(params: {
  tables: Table[];
  sampleDataByTableId: Record<string, Record<string, unknown>[]>;
  refTableId: string;
  refKeyColumnId: string;
  refKeyValue: string;
}): Record<string, unknown> | null {
  const rows = params.sampleDataByTableId[params.refTableId] ?? [];
  const row = rows.find((r) => String(r[params.refKeyColumnId] ?? '').trim() === params.refKeyValue);
  return row ?? null;
}

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
        tables: ctx.tables,
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
        const tableColumn =
          typeof listValue === 'object' && listValue && (listValue as any).__kind === 'tableColumnRef'
            ? (listValue as any)
            : null;

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
