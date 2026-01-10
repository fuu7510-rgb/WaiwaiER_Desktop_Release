/**
 * SQL DDL / Markdown テーブル エクスポート機能
 * 
 * ER図のテーブル定義をAI開発駆動用に出力するためのユーティリティ。
 * - DDL (CREATE TABLE文): データベース構造の「骨格」
 * - Markdownテーブル: サンプルデータの「中身」
 */

import type { Table, ColumnType, Relation } from '../types';

// AppSheet型からSQLデータ型へのマッピング
const COLUMN_TYPE_TO_SQL: Record<ColumnType, string> = {
  // 文字列系
  'Text': 'VARCHAR(255)',
  'LongText': 'TEXT',
  'Name': 'VARCHAR(255)',
  'Email': 'VARCHAR(255)',
  'Phone': 'VARCHAR(50)',
  'Url': 'VARCHAR(2048)',
  'Address': 'TEXT',
  'Color': 'VARCHAR(7)',
  
  // 数値系
  'Number': 'INTEGER',
  'Decimal': 'DECIMAL(18, 4)',
  'Percent': 'DECIMAL(5, 4)',
  'Price': 'DECIMAL(18, 2)',
  'Progress': 'DECIMAL(3, 2)',
  'Duration': 'INTEGER', // 秒数として
  
  // 日時系
  'Date': 'DATE',
  'DateTime': 'DATETIME',
  'Time': 'TIME',
  'ChangeTimestamp': 'DATETIME',
  
  // 真偽値
  'Yes/No': 'BOOLEAN',
  
  // 参照・選択系
  'Ref': 'VARCHAR(255)',
  'Enum': 'VARCHAR(255)',
  'EnumList': 'TEXT', // カンマ区切り
  
  // 特殊系（主にバイナリ/URLパス）
  'Image': 'TEXT',
  'File': 'TEXT',
  'Video': 'TEXT',
  'Drawing': 'TEXT',
  'Signature': 'TEXT',
  'Thumbnail': 'TEXT',
  
  // 位置・座標系
  'LatLong': 'VARCHAR(100)',
  'XY': 'VARCHAR(100)',
  'ChangeLocation': 'VARCHAR(100)',
  
  // AppSheet固有
  'App': 'VARCHAR(255)',
  'Show': 'VARCHAR(255)',
  'ChangeCounter': 'INTEGER',
  'UniqueID': 'VARCHAR(255)',
};

export interface DDLGeneratorOptions {
  /** SQLダイアレクト */
  dialect: 'generic' | 'mysql' | 'postgresql' | 'sqlite';
  /** 外部キー制約を含めるか */
  includeForeignKeys: boolean;
  /** コメントを含めるか */
  includeComments: boolean;
  /** DROP TABLE IF EXISTS を含めるか */
  includeDropTable: boolean;
}

export const DEFAULT_DDL_OPTIONS: DDLGeneratorOptions = {
  dialect: 'generic',
  includeForeignKeys: true,
  includeComments: true,
  includeDropTable: false,
};

/**
 * カラム名をSQLセーフな形式に変換
 */
function escapeIdentifier(name: string, dialect: string): string {
  // 基本的なサニタイズ: スペースを_に変換、特殊文字を除去
  const safeName = name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  
  // ダイアレクト別のクォート
  switch (dialect) {
    case 'mysql':
      return `\`${safeName}\``;
    case 'postgresql':
    case 'sqlite':
      return `"${safeName}"`;
    default:
      return safeName;
  }
}

/**
 * テーブル名をSQLセーフな形式に変換
 */
function escapeTableName(name: string, dialect: string): string {
  const safeName = name
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '');
  
  switch (dialect) {
    case 'mysql':
      return `\`${safeName}\``;
    case 'postgresql':
    case 'sqlite':
      return `"${safeName}"`;
    default:
      return safeName;
  }
}

/**
 * SQLデータ型を取得（ダイアレクト対応）
 */
function getSqlType(columnType: ColumnType, dialect: string): string {
  const baseType = COLUMN_TYPE_TO_SQL[columnType] || 'TEXT';
  
  // ダイアレクト別の調整
  if (dialect === 'mysql') {
    if (baseType === 'BOOLEAN') return 'TINYINT(1)';
    if (baseType === 'TEXT') return 'TEXT';
  }
  
  if (dialect === 'sqlite') {
    if (baseType.startsWith('VARCHAR')) return 'TEXT';
    if (baseType.startsWith('DECIMAL')) return 'REAL';
    if (baseType === 'BOOLEAN') return 'INTEGER';
    if (baseType === 'DATETIME') return 'TEXT';
    if (baseType === 'DATE') return 'TEXT';
    if (baseType === 'TIME') return 'TEXT';
  }
  
  return baseType;
}

/**
 * 単一テーブルのCREATE TABLE文を生成
 */
function generateCreateTable(
  table: Table,
  relations: Relation[],
  tableMap: Map<string, Table>,
  options: DDLGeneratorOptions
): string {
  const lines: string[] = [];
  const { dialect, includeForeignKeys, includeComments, includeDropTable } = options;
  
  const tableName = escapeTableName(table.name, dialect);
  
  // DROP TABLE
  if (includeDropTable) {
    lines.push(`DROP TABLE IF EXISTS ${tableName};`);
    lines.push('');
  }
  
  // テーブルコメント
  if (includeComments) {
    lines.push(`-- ${table.name}`);
    const tableDescription = typeof table.description === 'string' ? table.description.trim() : '';
    if (tableDescription) {
      lines.push(`-- ${tableDescription.replace(/\r?\n/g, ' ')}`);
    }
  }
  
  lines.push(`CREATE TABLE ${tableName} (`);
  
  // カラム定義
  const columnDefs: string[] = [];
  const primaryKeys: string[] = [];
  
  // order順にソート
  const sortedColumns = [...table.columns]
    .filter(col => !col.isVirtual) // Virtual Columnは除外
    .sort((a, b) => a.order - b.order);
  
  for (const column of sortedColumns) {
    const colName = escapeIdentifier(column.name, dialect);
    const sqlType = getSqlType(column.type, dialect);
    
    let def = `  ${colName} ${sqlType}`;
    
    // NOT NULL
    if (column.constraints.required) {
      def += ' NOT NULL';
    }
    
    // UNIQUE
    if (column.constraints.unique) {
      def += ' UNIQUE';
    }
    
    // DEFAULT
    if (column.constraints.defaultValue !== undefined && column.constraints.defaultValue !== '') {
      const defaultVal = column.constraints.defaultValue;
      // 数値型の場合はそのまま、それ以外はクォート
      if (column.type === 'Number' || column.type === 'Decimal' || 
          column.type === 'Percent' || column.type === 'Price' ||
          column.type === 'Progress' || column.type === 'ChangeCounter') {
        def += ` DEFAULT ${defaultVal}`;
      } else if (column.type === 'Yes/No') {
        def += ` DEFAULT ${defaultVal.toLowerCase() === 'true' || defaultVal === '1' ? 'TRUE' : 'FALSE'}`;
      } else {
        def += ` DEFAULT '${defaultVal.replace(/'/g, "''")}'`;
      }
    }
    
    // カラムコメント（PostgreSQLの場合は別途COMMENT文）
    if (includeComments && column.description && dialect === 'mysql') {
      def += ` COMMENT '${column.description.replace(/'/g, "''")}'`;
    }
    
    columnDefs.push(def);
    
    // 主キー収集
    if (column.isKey) {
      primaryKeys.push(colName);
    }
  }
  
  // 主キー制約
  if (primaryKeys.length > 0) {
    columnDefs.push(`  PRIMARY KEY (${primaryKeys.join(', ')})`);
  }
  
  // 外部キー制約
  if (includeForeignKeys) {
    const tableRelations = relations.filter(r => r.sourceTableId === table.id);
    for (const rel of tableRelations) {
      const targetTable = tableMap.get(rel.targetTableId);
      if (!targetTable) continue;
      
      const sourceColumn = table.columns.find(c => c.id === rel.sourceColumnId);
      const targetColumn = targetTable.columns.find(c => c.id === rel.targetColumnId);
      
      if (sourceColumn && targetColumn) {
        const fkName = `fk_${table.name}_${sourceColumn.name}`.replace(/\s+/g, '_').substring(0, 64);
        columnDefs.push(
          `  CONSTRAINT ${escapeIdentifier(fkName, dialect)} FOREIGN KEY (${escapeIdentifier(sourceColumn.name, dialect)}) ` +
          `REFERENCES ${escapeTableName(targetTable.name, dialect)}(${escapeIdentifier(targetColumn.name, dialect)})`
        );
      }
    }
  }
  
  lines.push(columnDefs.join(',\n'));
  lines.push(');');
  
  // PostgreSQL用のCOMMENT文
  if (includeComments && dialect === 'postgresql') {
    const tableDescription = typeof table.description === 'string' ? table.description.trim() : '';
    if (tableDescription) {
      lines.push(`COMMENT ON TABLE ${tableName} IS '${tableDescription.replace(/'/g, "''")}';`);
    }
    for (const column of sortedColumns) {
      if (column.description) {
        lines.push(
          `COMMENT ON COLUMN ${tableName}.${escapeIdentifier(column.name, dialect)} IS '${column.description.replace(/'/g, "''")}';`
        );
      }
    }
  }
  
  return lines.join('\n');
}

/**
 * ER図全体のDDL (CREATE TABLE文) を生成
 */
export function generateDDL(
  tables: Table[],
  relations: Relation[],
  options: Partial<DDLGeneratorOptions> = {}
): string {
  const opts: DDLGeneratorOptions = { ...DEFAULT_DDL_OPTIONS, ...options };
  
  const tableMap = new Map(tables.map(t => [t.id, t]));
  
  const ddlStatements: string[] = [];
  
  // ヘッダーコメント
  if (opts.includeComments) {
    ddlStatements.push('-- ============================================');
    ddlStatements.push('-- DDL generated by WaiwaiER Desktop');
    ddlStatements.push(`-- Dialect: ${opts.dialect}`);
    ddlStatements.push(`-- Generated at: ${new Date().toISOString()}`);
    ddlStatements.push('-- ============================================');
    ddlStatements.push('');
  }
  
  // 依存関係を考慮した順序でテーブルを出力
  // 簡易実装: リレーションのターゲットを先に出力
  const orderedTables = getTopologicallySortedTables(tables, relations);
  
  for (const table of orderedTables) {
    ddlStatements.push(generateCreateTable(table, relations, tableMap, opts));
    ddlStatements.push('');
  }
  
  return ddlStatements.join('\n').trim();
}

/**
 * テーブルをトポロジカルソート（外部キー依存を考慮）
 */
function getTopologicallySortedTables(tables: Table[], relations: Relation[]): Table[] {
  const tableMap = new Map(tables.map(t => [t.id, t]));
  const visited = new Set<string>();
  const result: Table[] = [];
  
  // 依存グラフを構築（source -> target の向き）
  const dependencies = new Map<string, Set<string>>();
  for (const table of tables) {
    dependencies.set(table.id, new Set());
  }
  for (const rel of relations) {
    dependencies.get(rel.sourceTableId)?.add(rel.targetTableId);
  }
  
  function visit(tableId: string) {
    if (visited.has(tableId)) return;
    visited.add(tableId);
    
    // 依存先を先に処理
    const deps = dependencies.get(tableId) || new Set();
    for (const depId of deps) {
      visit(depId);
    }
    
    const table = tableMap.get(tableId);
    if (table) {
      result.push(table);
    }
  }
  
  for (const table of tables) {
    visit(table.id);
  }
  
  return result;
}

// ============================================
// Markdown テーブル生成
// ============================================

export interface MarkdownTableOptions {
  /** 最大行数 */
  maxRows: number;
  /** カラム名のみ表示（データなし） */
  schemaOnly: boolean;
  /** テーブル説明を含める */
  includeDescription: boolean;
}

export const DEFAULT_MARKDOWN_OPTIONS: MarkdownTableOptions = {
  maxRows: 5,
  schemaOnly: false,
  includeDescription: true,
};

/**
 * 単一テーブルのMarkdownテーブルを生成
 */
function generateMarkdownTable(
  table: Table,
  sampleData: Record<string, unknown>[],
  options: MarkdownTableOptions
): string {
  const lines: string[] = [];
  const { maxRows, schemaOnly, includeDescription } = options;
  
  // テーブルヘッダー
  lines.push(`## ${table.name}`);
  lines.push('');
  
  // 説明
  if (includeDescription) {
    const quoteLines: string[] = [];

    const tableDescription = typeof table.description === 'string' ? table.description.trim() : '';
    if (tableDescription) {
      quoteLines.push(tableDescription.replace(/\r?\n/g, ' '));
    }

    // カラム情報を要約
    const keyColumns = table.columns.filter(c => c.isKey && !c.isVirtual);
    const labelColumns = table.columns.filter(c => c.isLabel && !c.isVirtual);
    const refColumns = table.columns.filter(c => c.type === 'Ref' && !c.isVirtual);
    
    const info: string[] = [];
    if (keyColumns.length > 0) {
      info.push(`Key: ${keyColumns.map(c => c.name).join(', ')}`);
    }
    if (labelColumns.length > 0) {
      info.push(`Label: ${labelColumns.map(c => c.name).join(', ')}`);
    }
    if (refColumns.length > 0) {
      info.push(`References: ${refColumns.map(c => c.name).join(', ')}`);
    }

    if (info.length > 0) {
      quoteLines.push(info.join(' | '));
    }

    if (quoteLines.length > 0) {
      for (const q of quoteLines) {
        lines.push(`> ${q}`);
      }
      lines.push('');
    }
  }
  
  // Virtual Column を除外してソート
  const visibleColumns = table.columns
    .filter(col => !col.isVirtual)
    .sort((a, b) => a.order - b.order);
  
  if (visibleColumns.length === 0) {
    lines.push('*No columns defined*');
    return lines.join('\n');
  }
  
  // ヘッダー行
  const headers = visibleColumns.map(c => {
    let header = c.name;
    if (c.isKey) header = `**${header}** 🔑`;
    else if (c.isLabel) header = `*${header}*`;
    return header;
  });
  lines.push(`| ${headers.join(' | ')} |`);
  
  // セパレーター行
  lines.push(`| ${visibleColumns.map(() => '---').join(' | ')} |`);
  
  // データ行
  if (!schemaOnly && sampleData.length > 0) {
    const rows = sampleData.slice(0, maxRows);
    for (const row of rows) {
      const cells = visibleColumns.map(col => {
        // サンプルデータは列ID（column.id）をキーとして保持している
        const value = row[col.id];
        if (value === null || value === undefined) return '';
        // 文字列に変換し、パイプ文字をエスケープ
        return String(value).replace(/\|/g, '\\|').replace(/\n/g, ' ');
      });
      lines.push(`| ${cells.join(' | ')} |`);
    }
    
    if (sampleData.length > maxRows) {
      lines.push(`| ... (${sampleData.length - maxRows} more rows) | ${visibleColumns.slice(1).map(() => '...').join(' | ')} |`);
    }
  } else if (!schemaOnly) {
    // サンプルデータなし
    lines.push(`| ${visibleColumns.map(() => '(no data)').join(' | ')} |`);
  }
  
  return lines.join('\n');
}

/**
 * カラムスキーマ情報のMarkdownテーブルを生成（型情報中心）
 */
function generateSchemaMarkdownTable(table: Table): string {
  const lines: string[] = [];
  
  lines.push(`### ${table.name} - Schema`);
  lines.push('');

  const tableDescription = typeof table.description === 'string' ? table.description.trim() : '';
  if (tableDescription) {
    lines.push(`> ${tableDescription.replace(/\r?\n/g, ' ')}`);
    lines.push('');
  }

  lines.push('| Column | Type | Key | Required | Description |');
  lines.push('| --- | --- | --- | --- | --- |');
  
  const visibleColumns = table.columns
    .filter(col => !col.isVirtual)
    .sort((a, b) => a.order - b.order);
  
  for (const col of visibleColumns) {
    const keyInfo = col.isKey ? '🔑 PK' : (col.type === 'Ref' ? '🔗 FK' : '');
    const required = col.constraints.required ? '✓' : '';
    const description = col.description?.replace(/\|/g, '\\|').replace(/\n/g, ' ') || '';
    
    lines.push(`| ${col.name} | ${col.type} | ${keyInfo} | ${required} | ${description} |`);
  }
  
  return lines.join('\n');
}

/**
 * ER図全体のMarkdownテーブルを生成
 */
export function generateMarkdownTables(
  tables: Table[],
  sampleDataByTableId: Record<string, Record<string, unknown>[]>,
  options: Partial<MarkdownTableOptions> = {}
): string {
  const opts: MarkdownTableOptions = { ...DEFAULT_MARKDOWN_OPTIONS, ...options };
  
  const sections: string[] = [];
  
  // ヘッダー
  sections.push('# Database Tables');
  sections.push('');
  sections.push(`Generated at: ${new Date().toISOString()}`);
  sections.push('');
  sections.push('---');
  sections.push('');
  
  for (const table of tables) {
    const sampleData = sampleDataByTableId[table.id] || [];
    sections.push(generateMarkdownTable(table, sampleData, opts));
    sections.push('');
    sections.push('---');
    sections.push('');
  }
  
  return sections.join('\n').trim();
}

/**
 * スキーマ情報のみのMarkdownを生成（型定義中心）
 */
export function generateSchemaMarkdown(tables: Table[]): string {
  const sections: string[] = [];
  
  sections.push('# Database Schema');
  sections.push('');
  sections.push(`Generated at: ${new Date().toISOString()}`);
  sections.push('');
  
  for (const table of tables) {
    sections.push(generateSchemaMarkdownTable(table));
    sections.push('');
  }
  
  return sections.join('\n').trim();
}
