/**
 * AppSheet式の字句解析（トークナイザー）
 */
import type { Token } from './types';

/**
 * 入力文字列を正規化する
 * - 全角記号をASCIIへ変換
 * - 先頭の "=" を除去（Excel風の記述を許容）
 */
export function normalizeExpressionInput(input: string): string {
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

/**
 * 入力文字列をトークン列に変換する
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  const pushOp = (value: string) => tokens.push({ kind: 'op', value });

  while (i < input.length) {
    const ch = input[i];

    // 空白スキップ
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // 括弧・カンマ・ドット
    if (ch === '(' || ch === ')' || ch === ',' || ch === '.') {
      tokens.push({ kind: 'punct', value: ch });
      i++;
      continue;
    }

    // 演算子（複数文字を先に判定）
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

    // ブラケット識別子: [Column Name]
    if (ch === '[') {
      const end = input.indexOf(']', i + 1);
      const raw = end >= 0 ? input.slice(i + 1, end) : input.slice(i + 1);
      tokens.push({ kind: 'bracket', value: raw.trim() });
      i = end >= 0 ? end + 1 : input.length;
      continue;
    }

    // 文字列リテラル: "..." (supports \\ and \" only)
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

    // 数値
    if (/[0-9]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[0-9.]/.test(input[j])) j++;
      const raw = input.slice(i, j);
      const n = Number(raw);
      tokens.push({ kind: 'number', value: Number.isFinite(n) ? n : 0 });
      i = j;
      continue;
    }

    // 識別子（関数名、TRUE/FALSE）
    if (/[A-Za-z_]/.test(ch)) {
      let j = i + 1;
      while (j < input.length && /[A-Za-z0-9_]/.test(input[j])) j++;
      tokens.push({ kind: 'identifier', value: input.slice(i, j) });
      i = j;
      continue;
    }

    // 不明な文字: スキップ（fail-soft）
    i++;
  }

  return tokens;
}
