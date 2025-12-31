/**
 * AppSheet式の構文解析（パーサー）
 */
import type { Token, Expr } from './types';
import { tokenize, normalizeExpressionInput } from './tokenizer';

/**
 * パース結果のキャッシュ
 * パフォーマンス最適化のため、同じ式を繰り返しパースしないようにする
 */
const parseCache = new Map<string, Expr>();

/**
 * 再帰下降パーサークラス
 */
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

  private matchPunct(value: '(' | ')' | ',' | '.'): boolean {
    const t = this.peek();
    if (t?.kind === 'punct' && t.value === value) {
      this.consume();
      return true;
    }
    return false;
  }

  // 演算子優先順位: 低 → 高
  // 1. 連結 (&)
  // 2. 比較 (=, <>, <, >, <=, >=)
  // 3. 加減 (+, -)
  // 4. 乗除 (*, /)
  // 5. 単項 (+, -)
  // 6. プライマリ (数値、文字列、関数呼び出し等)

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

    // 数値リテラル
    if (t.kind === 'number') {
      this.consume();
      return { kind: 'number', value: t.value };
    }

    // 文字列リテラル
    if (t.kind === 'string') {
      this.consume();
      return { kind: 'string', value: t.value };
    }

    // 識別子（関数名、TRUE/FALSE/BLANK）
    if (t.kind === 'identifier') {
      this.consume();
      const upper = t.value.toUpperCase();
      if (upper === 'TRUE') return { kind: 'boolean', value: true };
      if (upper === 'FALSE') return { kind: 'boolean', value: false };
      if (upper === 'BLANK') return { kind: 'blank' };

      // テーブルカラム参照: Table[Column]
      const maybeBracket = this.peek();
      if (maybeBracket?.kind === 'bracket') {
        this.consume();
        return { kind: 'tableColumnRef', tableName: t.value, columnName: maybeBracket.value };
      }

      // 関数呼び出し
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

      // fail-soft: 不明な識別子 -> blank
      return { kind: 'blank' };
    }

    // ブラケット参照: [Column] または [Column].[SubColumn]
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

    // 括弧で囲まれた式
    if (t.kind === 'punct' && t.value === '(') {
      this.consume();
      const inner = this.parseExpression();
      this.matchPunct(')');
      return inner;
    }

    // 不明なトークン -> スキップ
    this.consume();
    return { kind: 'blank' };
  }
}

/**
 * 式をパースしてASTを返す（キャッシュ付き）
 */
export function parseExpressionCached(input: string): Expr {
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

/**
 * パースキャッシュをクリアする（テスト用）
 */
export function clearParseCache(): void {
  parseCache.clear();
}
