/**
 * 行指向DSL形式 ↔ ERDiagram の相互変換
 *
 * DSL形式は以下の構文:
 *   TABLE テーブル名 "説明" PK=カラム名 LABEL=カラム名 [COLOR=#xxxxxx]
 *   COL テーブル名.カラム名 型 [req] [uniq] [virtual] "説明"
 *   REF テーブル名.カラム名 -> 参照先テーブル.参照先カラム [req] "説明"
 *   MEMO "メモ内容（複数行は\nで表現）"
 *
 * 特徴:
 * - position/createdAt/updatedAt/IDはDSLに含めない（インポート時に自動生成）
 * - 軽量で人間も読める
 * - 差分管理しやすい
 */

import type { Column, ColumnType, ERDiagram, Memo, Relation, Table } from '../types';

// ============================================
// DSL → ERDiagram パース
// ============================================

interface ParsedTable {
  name: string;
  description?: string;
  pkColumnName?: string;
  labelColumnName?: string;
  color?: string;
  columns: ParsedColumn[];
}

interface ParsedColumn {
  name: string;
  type: ColumnType;
  required: boolean;
  unique: boolean;
  isVirtual: boolean;
  description?: string;
  refTarget?: { tableName: string; columnName: string };
}

interface ParsedMemo {
  text: string;
}

/**
 * DSLテキストをパースしてERDiagramに変換
 */
export function parseDSL(dslText: string): ERDiagram {
  const lines = dslText.split('\n');
  const tableMap = new Map<string, ParsedTable>();
  const memos: ParsedMemo[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('//')) {
      continue; // コメントや空行をスキップ
    }

    if (line.startsWith('TABLE ')) {
      const parsed = parseTableLine(line);
      if (parsed) {
        tableMap.set(parsed.name, { ...parsed, columns: [] });
      }
    } else if (line.startsWith('COL ')) {
      const parsed = parseColumnLine(line);
      if (parsed) {
        const table = tableMap.get(parsed.tableName);
        if (table) {
          table.columns.push(parsed.column);
        } else {
          // テーブルがまだ定義されていない場合、自動作成
          tableMap.set(parsed.tableName, {
            name: parsed.tableName,
            columns: [parsed.column],
          });
        }
      }
    } else if (line.startsWith('REF ')) {
      const parsed = parseRefLine(line);
      if (parsed) {
        const table = tableMap.get(parsed.tableName);
        if (table) {
          table.columns.push(parsed.column);
        } else {
          tableMap.set(parsed.tableName, {
            name: parsed.tableName,
            columns: [parsed.column],
          });
        }
      }
    } else if (line.startsWith('MEMO ')) {
      const parsed = parseMemoLine(line);
      if (parsed) {
        memos.push(parsed);
      }
    }
  }

  // ParsedTable → Table に変換
  const tables: Table[] = [];
  const tableIdMap = new Map<string, string>(); // name → id
  let tableIndex = 0;

  for (const [name, parsed] of tableMap.entries()) {
    const tableId = crypto.randomUUID();
    tableIdMap.set(name, tableId);

    const columns: Column[] = parsed.columns.map((col, colIndex) => ({
      id: crypto.randomUUID(),
      name: col.name,
      type: col.type,
      isKey: parsed.pkColumnName === col.name,
      isLabel: parsed.labelColumnName === col.name,
      isVirtual: col.isVirtual,
      description: col.description,
      constraints: {
        required: col.required,
        unique: col.unique,
      },
      order: colIndex,
    }));

    // 位置を自動計算（3列配置）
    const row = Math.floor(tableIndex / 3);
    const col = tableIndex % 3;

    tables.push({
      id: tableId,
      name: name,
      description: parsed.description,
      columns,
      position: { x: col * 400, y: row * 500 },
      color: parsed.color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    tableIndex++;
  }

  // Ref型カラムの参照先IDを解決 & Relations生成
  const relations: Relation[] = [];
  for (const table of tables) {
    const parsed = tableMap.get(table.name);
    if (!parsed) continue;

    for (const col of table.columns) {
      // カラム名でマッチング（インデックスではなく名前で照合）
      const parsedCol = parsed.columns.find((pc) => pc.name === col.name);
      if (parsedCol?.refTarget) {
        const targetTableId = tableIdMap.get(parsedCol.refTarget.tableName);
        const targetTable = tables.find((t) => t.id === targetTableId);
        const targetColumn = targetTable?.columns.find(
          (c) => c.name === parsedCol.refTarget!.columnName
        );

        if (targetTableId && targetColumn) {
          col.constraints.refTableId = targetTableId;
          col.constraints.refColumnId = targetColumn.id;

          // WaiwaiERのリレーション定義:
          // - source = 親テーブル（1側、参照先）
          // - target = 子テーブル（N側、外部キーを持つ側）
          relations.push({
            id: crypto.randomUUID(),
            sourceTableId: targetTableId,      // 親テーブル（参照先）
            sourceColumnId: targetColumn.id,   // 参照先の主キー
            targetTableId: table.id,           // 子テーブル（Refを持つ側）
            targetColumnId: col.id,            // 外部キーカラム
            type: 'one-to-many',
          });
        }
      }
    }
  }

  // Memos生成
  const erMemos: Memo[] = memos.map((m, idx) => ({
    id: crypto.randomUUID(),
    text: m.text,
    position: { x: 0, y: -200 - idx * 250 },
    width: 300,
    height: 150,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  return { tables, relations, memos: erMemos };
}

// --- パースヘルパー ---

function parseTableLine(line: string): Omit<ParsedTable, 'columns'> | null {
  // TABLE テーブル名 "説明" PK=col LABEL=col COLOR=#xxx
  const match = line.match(
    /^TABLE\s+(\S+)(?:\s+"([^"]*)")?(?:\s+PK=(\S+))?(?:\s+LABEL=(\S+))?(?:\s+COLOR=(\S+))?/i
  );
  if (!match) return null;

  return {
    name: match[1],
    description: match[2] || undefined,
    pkColumnName: match[3] || undefined,
    labelColumnName: match[4] || undefined,
    color: match[5] || undefined,
  };
}

function parseColumnLine(
  line: string
): { tableName: string; column: ParsedColumn } | null {
  // COL テーブル.カラム 型 [req] [uniq] [virtual] "説明"
  const match = line.match(
    /^COL\s+(\S+)\.(\S+)\s+(\S+)(?:\s+(req|uniq|virtual))*(?:\s+"([^"]*)")?/i
  );
  if (!match) {
    // 正規表現で全てのフラグをキャプチャするのは複雑なので、別アプローチ
    return parseColumnLineManual(line);
  }

  return parseColumnLineManual(line);
}

function parseColumnLineManual(
  line: string
): { tableName: string; column: ParsedColumn } | null {
  // COL テーブル.カラム 型 [req] [uniq] [virtual] "説明"
  const tokens = tokenizeLine(line.substring(4).trim());
  if (tokens.length < 2) return null;

  const [tableCol, typeStr, ...rest] = tokens;
  const dotIdx = tableCol.indexOf('.');
  if (dotIdx === -1) return null;

  const tableName = tableCol.substring(0, dotIdx);
  const colName = tableCol.substring(dotIdx + 1);

  const type = normalizeColumnType(typeStr);

  const flags = rest.filter((t) => !t.startsWith('"'));
  const descToken = rest.find((t) => t.startsWith('"'));

  return {
    tableName,
    column: {
      name: colName,
      type,
      required: flags.some((f) => f.toLowerCase() === 'req'),
      unique: flags.some((f) => f.toLowerCase() === 'uniq'),
      isVirtual: flags.some((f) => f.toLowerCase() === 'virtual'),
      description: descToken ? descToken.slice(1, -1) : undefined,
    },
  };
}

function parseRefLine(
  line: string
): { tableName: string; column: ParsedColumn } | null {
  // REF テーブル.カラム -> 参照先テーブル.カラム [req] "説明"
  const tokens = tokenizeLine(line.substring(4).trim());
  if (tokens.length < 3) return null;

  const [tableCol, arrow, targetTableCol, ...rest] = tokens;
  if (arrow !== '->') return null;

  const dotIdx1 = tableCol.indexOf('.');
  const dotIdx2 = targetTableCol.indexOf('.');
  if (dotIdx1 === -1 || dotIdx2 === -1) return null;

  const tableName = tableCol.substring(0, dotIdx1);
  const colName = tableCol.substring(dotIdx1 + 1);
  const targetTableName = targetTableCol.substring(0, dotIdx2);
  const targetColName = targetTableCol.substring(dotIdx2 + 1);

  const flags = rest.filter((t) => !t.startsWith('"'));
  const descToken = rest.find((t) => t.startsWith('"'));

  return {
    tableName,
    column: {
      name: colName,
      type: 'Ref',
      required: flags.some((f) => f.toLowerCase() === 'req'),
      unique: false,
      isVirtual: false,
      description: descToken ? descToken.slice(1, -1) : undefined,
      refTarget: { tableName: targetTableName, columnName: targetColName },
    },
  };
}

function parseMemoLine(line: string): ParsedMemo | null {
  // MEMO "メモ内容"
  const match = line.match(/^MEMO\s+"(.*)"/i);
  if (!match) return null;
  // \n をエスケープ解除
  return { text: match[1].replace(/\\n/g, '\n') };
}

function tokenizeLine(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuote) {
        current += char;
        tokens.push(current);
        current = '';
        inQuote = false;
      } else {
        if (current) tokens.push(current);
        current = '"';
        inQuote = true;
      }
    } else if (/\s/.test(char) && !inQuote) {
      if (current) tokens.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

function normalizeColumnType(typeStr: string): ColumnType {
  const map: Record<string, ColumnType> = {
    text: 'Text',
    longtext: 'LongText',
    number: 'Number',
    decimal: 'Decimal',
    date: 'Date',
    datetime: 'DateTime',
    time: 'Time',
    'yes/no': 'Yes/No',
    yesno: 'Yes/No',
    email: 'Email',
    phone: 'Phone',
    url: 'Url',
    address: 'Address',
    name: 'Name',
    price: 'Price',
    percent: 'Percent',
    duration: 'Duration',
    ref: 'Ref',
    enum: 'Enum',
    enumlist: 'EnumList',
    image: 'Image',
    file: 'File',
    color: 'Color',
    latlong: 'LatLong',
    progress: 'Progress',
    signature: 'Signature',
    drawing: 'Drawing',
    video: 'Video',
    thumbnail: 'Thumbnail',
    show: 'Show',
    app: 'App',
    xy: 'XY',
    changetimestamp: 'ChangeTimestamp',
    changecounter: 'ChangeCounter',
    changelocation: 'ChangeLocation',
    uniqueid: 'UniqueID',
  };

  const lower = typeStr.toLowerCase();
  return map[lower] || 'Text';
}

// ============================================
// ERDiagram → DSL エクスポート
// ============================================

export interface DSLExportOptions {
  /** コメントとしてヘッダーを含める */
  includeHeader?: boolean;
}

/**
 * ERDiagramをDSL形式の文字列に変換
 */
export function exportToDSL(
  diagram: ERDiagram,
  options: DSLExportOptions = {}
): string {
  const { includeHeader = true } = options;
  const lines: string[] = [];

  if (includeHeader) {
    lines.push('# WaiwaiER DSL Format');
    lines.push(`# Generated at: ${new Date().toISOString()}`);
    lines.push('');
  }

  // カラムIDからカラム名へのマップ（テーブル横断）
  const columnIdToInfo = new Map<string, { tableName: string; columnName: string }>();
  for (const table of diagram.tables) {
    for (const col of table.columns) {
      columnIdToInfo.set(col.id, { tableName: table.name, columnName: col.name });
    }
  }

  for (const table of diagram.tables) {
    // TABLE行
    const pkCol = table.columns.find((c) => c.isKey);
    const labelCol = table.columns.find((c) => c.isLabel);

    let tableLine = `TABLE ${table.name}`;
    if (table.description) {
      tableLine += ` "${escapeQuotes(table.description)}"`;
    }
    if (pkCol) {
      tableLine += ` PK=${pkCol.name}`;
    }
    if (labelCol) {
      tableLine += ` LABEL=${labelCol.name}`;
    }
    if (table.color) {
      tableLine += ` COLOR=${table.color}`;
    }
    lines.push(tableLine);

    // カラム行（order順）
    const sortedColumns = [...table.columns].sort((a, b) => a.order - b.order);
    for (const col of sortedColumns) {
      if (col.type === 'Ref' && col.constraints.refTableId && col.constraints.refColumnId) {
        // REF行
        const targetInfo = columnIdToInfo.get(col.constraints.refColumnId);
        if (targetInfo) {
          let refLine = `REF ${table.name}.${col.name} -> ${targetInfo.tableName}.${targetInfo.columnName}`;
          if (col.constraints.required) refLine += ' req';
          if (col.description) refLine += ` "${escapeQuotes(col.description)}"`;
          lines.push(refLine);
        } else {
          // 参照先が見つからない場合は通常カラムとして出力
          lines.push(formatColumnLine(table.name, col));
        }
      } else {
        lines.push(formatColumnLine(table.name, col));
      }
    }

    lines.push(''); // テーブル間の空行
  }

  // メモ
  if (diagram.memos && diagram.memos.length > 0) {
    for (const memo of diagram.memos) {
      const escapedText = memo.text.replace(/\n/g, '\\n');
      lines.push(`MEMO "${escapeQuotes(escapedText)}"`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatColumnLine(tableName: string, col: Column): string {
  let line = `COL ${tableName}.${col.name} ${col.type}`;
  if (col.constraints.required) line += ' req';
  if (col.constraints.unique) line += ' uniq';
  if (col.isVirtual) line += ' virtual';
  if (col.description) line += ` "${escapeQuotes(col.description)}"`;
  return line;
}

function escapeQuotes(str: string): string {
  return str.replace(/"/g, '\\"');
}

// ============================================
// ユーティリティ
// ============================================

/**
 * テキストがDSL形式かどうかを判定
 */
export function isDSLFormat(text: string): boolean {
  const trimmed = text.trim();
  // DSL形式の特徴: 最初の非コメント行がTABLE/COL/REF/MEMOで始まる
  const lines = trimmed.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (!l || l.startsWith('#') || l.startsWith('//')) continue;
    return /^(TABLE|COL|REF|MEMO)\s/i.test(l);
  }
  return false;
}

/**
 * テキストがJSON形式かどうかを判定
 */
export function isJSONFormat(text: string): boolean {
  const trimmed = text.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
}
