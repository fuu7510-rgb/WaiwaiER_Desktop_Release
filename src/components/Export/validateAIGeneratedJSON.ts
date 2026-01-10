/**
 * AI生成JSONのバリデーションと修正プロンプト生成
 *
 * AIが生成したJSONを検証し、間違いやすいポイントを検出して
 * 修正のためのプロンプトを生成する
 */

import { APPSHEET_COLUMN_TYPES } from '../../types';
import type { Column, ColumnType, ERDiagram, Relation, Table } from '../../types';

/** バリデーションエラーの種類 */
export type ValidationErrorType =
  | 'envelope_format' // schemaVersion/diagram形式で出力してしまった
  | 'tables_missing' // tablesが存在しない
  | 'tables_not_array' // tablesが配列でない
  | 'invalid_column_type' // カラム型がAppSheet型と一致しない
  | 'multiple_keys' // 複数カラムがisKey=true
  | 'no_key' // isKey=trueのカラムがない
  | 'multiple_labels' // 複数カラムがisLabel=true（警告レベル）
  | 'ref_missing_target' // Ref型なのにrefTableId/refColumnIdがない
  | 'invalid_ref_table' // refTableIdが実在しない
  | 'invalid_ref_column' // refColumnIdが実在しない
  | 'invalid_relation_source_table' // リレーションのsourceTableIdが実在しない
  | 'invalid_relation_target_table' // リレーションのtargetTableIdが実在しない
  | 'invalid_relation_source_column' // リレーションのsourceColumnIdが実在しない
  | 'invalid_relation_target_column' // リレーションのtargetColumnIdが実在しない
  | 'missing_constraints' // constraintsがundefined
  | 'missing_position' // positionがない
  | 'invalid_position' // position.x/yが数値でない
  | 'missing_timestamps' // createdAt/updatedAtがない
  | 'missing_column_order' // orderがない
  | 'duplicate_table_id' // テーブルIDが重複
  | 'duplicate_column_id' // カラムIDが重複
  | 'empty_table_name' // テーブル名が空
  | 'empty_column_name'; // カラム名が空

/** バリデーションエラー */
export interface ValidationError {
  type: ValidationErrorType;
  severity: 'error' | 'warning';
  message: string;
  /** 修正のためのプロンプト（AIに再度渡す用） */
  fixPrompt: string;
  /** 対象（テーブル名、カラム名など） */
  target?: string;
  /** 詳細情報 */
  details?: Record<string, unknown>;
}

/** バリデーション結果 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  /** すべてのエラーをまとめた修正プロンプト */
  combinedFixPrompt: string | null;
}

/**
 * エンベロープ形式かどうかをチェック
 */
function isEnvelopeFormat(obj: unknown): obj is { schemaVersion: number; diagram: unknown } {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'schemaVersion' in obj &&
    'diagram' in obj
  );
}

/**
 * オブジェクトかどうかをチェック
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * AI生成JSONをバリデート
 */
export function validateAIGeneratedJSON(jsonText: string): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    errors.push({
      type: 'tables_missing',
      severity: 'error',
      message: 'JSONの構文エラーです。有効なJSONを生成してください。',
      fixPrompt: '出力されたJSONに構文エラーがあります。有効なJSON形式で再生成してください。',
    });
    return {
      isValid: false,
      errors,
      warnings,
      combinedFixPrompt: generateCombinedFixPrompt(errors, warnings),
    };
  }

  // エンベロープ形式チェック
  if (isEnvelopeFormat(parsed)) {
    errors.push({
      type: 'envelope_format',
      severity: 'error',
      message: 'schemaVersion/diagram形式ではなく、tables/relations/memos形式で出力してください。',
      fixPrompt: `エラー: JSONが { "schemaVersion": ..., "diagram": { ... } } 形式になっています。
WaiwaiERのインポートでは、以下のようにtables/relations/memosを直接持つ形式が必要です:
{
  "tables": [...],
  "relations": [...],
  "memos": []
}
schemaVersionとdiagramのラッパーを削除し、diagramの中身だけを出力してください。`,
    });

    // エンベロープの中身を取り出して続行
    parsed = (parsed as { diagram: unknown }).diagram;
  }

  if (!isObject(parsed)) {
    errors.push({
      type: 'tables_missing',
      severity: 'error',
      message: 'JSONがオブジェクトではありません。',
      fixPrompt: 'JSONはオブジェクト形式 { "tables": [...], "relations": [...], "memos": [] } である必要があります。',
    });
    return {
      isValid: false,
      errors,
      warnings,
      combinedFixPrompt: generateCombinedFixPrompt(errors, warnings),
    };
  }

  const diagram = parsed as Partial<ERDiagram>;

  // tables存在チェック
  if (!('tables' in diagram)) {
    errors.push({
      type: 'tables_missing',
      severity: 'error',
      message: 'tablesプロパティが存在しません。',
      fixPrompt: 'JSONに "tables" 配列が必要です。テーブル定義を "tables": [...] として追加してください。',
    });
  } else if (!Array.isArray(diagram.tables)) {
    errors.push({
      type: 'tables_not_array',
      severity: 'error',
      message: 'tablesが配列ではありません。',
      fixPrompt: '"tables" は配列形式 "tables": [{...}, {...}] である必要があります。',
    });
  }

  // tablesが有効な配列でない場合はここで終了
  if (!Array.isArray(diagram.tables)) {
    return {
      isValid: false,
      errors,
      warnings,
      combinedFixPrompt: generateCombinedFixPrompt(errors, warnings),
    };
  }

  const tables = diagram.tables as Partial<Table>[];
  const relations = (diagram.relations ?? []) as Partial<Relation>[];

  // テーブルIDの収集（重複チェック用）
  const tableIds = new Set<string>();
  const allColumnIds = new Set<string>();

  // 各テーブルのバリデーション
  for (let tableIndex = 0; tableIndex < tables.length; tableIndex++) {
    const table = tables[tableIndex];
    const tableLabel = table.name || `tables[${tableIndex}]`;

    // テーブルID重複チェック
    if (table.id) {
      if (tableIds.has(table.id)) {
        errors.push({
          type: 'duplicate_table_id',
          severity: 'error',
          message: `テーブルID "${table.id}" が重複しています。`,
          target: tableLabel,
          fixPrompt: `テーブル "${tableLabel}" のIDが重複しています。各テーブルに一意のIDを設定してください。`,
        });
      }
      tableIds.add(table.id);
    }

    // テーブル名チェック
    if (!table.name || table.name.trim() === '') {
      errors.push({
        type: 'empty_table_name',
        severity: 'error',
        message: `tables[${tableIndex}] のnameが空です。`,
        target: `tables[${tableIndex}]`,
        fixPrompt: `tables[${tableIndex}] にテーブル名(name)を設定してください。`,
      });
    }

    // positionチェック
    if (!table.position) {
      warnings.push({
        type: 'missing_position',
        severity: 'warning',
        message: `テーブル "${tableLabel}" にpositionがありません。`,
        target: tableLabel,
        fixPrompt: `テーブル "${tableLabel}" に position: { "x": 数値, "y": 数値 } を追加してください。`,
      });
    } else if (typeof table.position.x !== 'number' || typeof table.position.y !== 'number') {
      errors.push({
        type: 'invalid_position',
        severity: 'error',
        message: `テーブル "${tableLabel}" のposition.x/yが数値ではありません。`,
        target: tableLabel,
        fixPrompt: `テーブル "${tableLabel}" の position.x と position.y は数値である必要があります。例: "position": { "x": 0, "y": 0 }`,
      });
    }

    // timestampsチェック
    if (!table.createdAt || !table.updatedAt) {
      warnings.push({
        type: 'missing_timestamps',
        severity: 'warning',
        message: `テーブル "${tableLabel}" にcreatedAt/updatedAtがありません。`,
        target: tableLabel,
        fixPrompt: `テーブル "${tableLabel}" に createdAt と updatedAt をISO8601形式で追加してください。例: "createdAt": "2026-01-09T00:00:00.000Z"`,
      });
    }

    // カラムのバリデーション
    const columns = (table.columns ?? []) as Partial<Column>[];
    let keyCount = 0;
    let labelCount = 0;
    const columnIds = new Set<string>();

    for (let colIndex = 0; colIndex < columns.length; colIndex++) {
      const column = columns[colIndex];
      const colLabel = column.name || `columns[${colIndex}]`;
      const fullColLabel = `${tableLabel}.${colLabel}`;

      // カラムID重複チェック
      if (column.id) {
        if (columnIds.has(column.id) || allColumnIds.has(column.id)) {
          errors.push({
            type: 'duplicate_column_id',
            severity: 'error',
            message: `カラムID "${column.id}" が重複しています。`,
            target: fullColLabel,
            fixPrompt: `カラム "${fullColLabel}" のIDが重複しています。各カラムに一意のIDを設定してください。`,
          });
        }
        columnIds.add(column.id);
        allColumnIds.add(column.id);
      }

      // カラム名チェック
      if (!column.name || column.name.trim() === '') {
        errors.push({
          type: 'empty_column_name',
          severity: 'error',
          message: `${tableLabel}.columns[${colIndex}] のnameが空です。`,
          target: `${tableLabel}.columns[${colIndex}]`,
          fixPrompt: `${tableLabel}.columns[${colIndex}] にカラム名(name)を設定してください。`,
        });
      }

      // 型チェック
      if (column.type && !APPSHEET_COLUMN_TYPES.includes(column.type as ColumnType)) {
        errors.push({
          type: 'invalid_column_type',
          severity: 'error',
          message: `カラム "${fullColLabel}" の型 "${column.type}" は無効です。`,
          target: fullColLabel,
          details: { invalidType: column.type },
          fixPrompt: `カラム "${fullColLabel}" の型 "${column.type}" はAppSheetでサポートされていません。
以下の型から選択してください: ${APPSHEET_COLUMN_TYPES.join(', ')}
一般的なマッピング:
- VARCHAR/TEXT → "Text"
- INTEGER/BIGINT → "Number"
- BOOLEAN → "Yes/No"
- TIMESTAMP/DATETIME → "DateTime"
- DATE → "Date"`,
        });
      }

      // isKey/isLabelカウント
      if (column.isKey) keyCount++;
      if (column.isLabel) labelCount++;

      // constraintsチェック
      if (column.constraints === undefined) {
        warnings.push({
          type: 'missing_constraints',
          severity: 'warning',
          message: `カラム "${fullColLabel}" にconstraintsがありません。`,
          target: fullColLabel,
          fixPrompt: `カラム "${fullColLabel}" に constraints オブジェクトを追加してください。最低でも空オブジェクト {} が必要です。例: "constraints": { "required": true }`,
        });
      }

      // Ref型のrefTableId/refColumnIdチェック
      if (column.type === 'Ref') {
        const constraints = column.constraints as { refTableId?: string; refColumnId?: string } | undefined;
        if (!constraints?.refTableId || !constraints?.refColumnId) {
          errors.push({
            type: 'ref_missing_target',
            severity: 'error',
            message: `Ref型カラム "${fullColLabel}" にrefTableId/refColumnIdがありません。`,
            target: fullColLabel,
            fixPrompt: `Ref型カラム "${fullColLabel}" には参照先の設定が必要です:
"constraints": {
  "refTableId": "参照先テーブルのID",
  "refColumnId": "参照先テーブルの主キーカラムID"
}`,
          });
        } else {
          // 参照先が存在するかチェック
          if (!tableIds.has(constraints.refTableId)) {
            // 後でチェックするためにメモ（現時点では全テーブル未処理の可能性）
            const targetTable = tables.find((t) => t.id === constraints.refTableId);
            if (!targetTable) {
              errors.push({
                type: 'invalid_ref_table',
                severity: 'error',
                message: `Ref型カラム "${fullColLabel}" の参照先テーブル "${constraints.refTableId}" が存在しません。`,
                target: fullColLabel,
                fixPrompt: `Ref型カラム "${fullColLabel}" の refTableId "${constraints.refTableId}" が正しいか確認してください。存在するテーブルIDを指定する必要があります。`,
              });
            }
          }
        }
      }

      // orderチェック
      if (column.order === undefined) {
        warnings.push({
          type: 'missing_column_order',
          severity: 'warning',
          message: `カラム "${fullColLabel}" にorderがありません。`,
          target: fullColLabel,
          fixPrompt: `カラム "${fullColLabel}" に order（0から始まる連番）を設定してください。`,
        });
      }
    }

    // isKey数チェック
    if (keyCount === 0) {
      warnings.push({
        type: 'no_key',
        severity: 'warning',
        message: `テーブル "${tableLabel}" に主キー(isKey=true)がありません。`,
        target: tableLabel,
        fixPrompt: `テーブル "${tableLabel}" の主キーカラム（通常は "id"）に "isKey": true を設定してください。`,
      });
    } else if (keyCount > 1) {
      errors.push({
        type: 'multiple_keys',
        severity: 'error',
        message: `テーブル "${tableLabel}" に複数の主キー(isKey=true)があります。`,
        target: tableLabel,
        fixPrompt: `テーブル "${tableLabel}" で isKey: true が ${keyCount} 個のカラムに設定されています。主キーは1つだけにしてください。`,
      });
    }

    // isLabel数チェック（警告のみ）
    if (labelCount > 1) {
      warnings.push({
        type: 'multiple_labels',
        severity: 'warning',
        message: `テーブル "${tableLabel}" に複数のラベル(isLabel=true)があります。`,
        target: tableLabel,
        fixPrompt: `テーブル "${tableLabel}" で isLabel: true が ${labelCount} 個のカラムに設定されています。ラベルは1つだけを推奨します。`,
      });
    }
  }

  // リレーションのバリデーション
  for (let relIndex = 0; relIndex < relations.length; relIndex++) {
    const rel = relations[relIndex];
    const relLabel = rel.id || `relations[${relIndex}]`;

    // sourceTableIdチェック
    if (rel.sourceTableId && !tableIds.has(rel.sourceTableId)) {
      errors.push({
        type: 'invalid_relation_source_table',
        severity: 'error',
        message: `リレーション "${relLabel}" のsourceTableId "${rel.sourceTableId}" が存在しません。`,
        target: relLabel,
        fixPrompt: `リレーション "${relLabel}" の sourceTableId "${rel.sourceTableId}" が正しいか確認してください。tablesに存在するテーブルIDを指定してください。`,
      });
    }

    // targetTableIdチェック
    if (rel.targetTableId && !tableIds.has(rel.targetTableId)) {
      errors.push({
        type: 'invalid_relation_target_table',
        severity: 'error',
        message: `リレーション "${relLabel}" のtargetTableId "${rel.targetTableId}" が存在しません。`,
        target: relLabel,
        fixPrompt: `リレーション "${relLabel}" の targetTableId "${rel.targetTableId}" が正しいか確認してください。tablesに存在するテーブルIDを指定してください。`,
      });
    }

    // sourceColumnIdチェック
    if (rel.sourceTableId && rel.sourceColumnId) {
      const sourceTable = tables.find((t) => t.id === rel.sourceTableId);
      if (sourceTable) {
        const sourceColumn = (sourceTable.columns ?? []).find((c) => (c as Column).id === rel.sourceColumnId);
        if (!sourceColumn) {
          errors.push({
            type: 'invalid_relation_source_column',
            severity: 'error',
            message: `リレーション "${relLabel}" のsourceColumnId "${rel.sourceColumnId}" がテーブル "${sourceTable.name}" に存在しません。`,
            target: relLabel,
            fixPrompt: `リレーション "${relLabel}" の sourceColumnId "${rel.sourceColumnId}" が正しいか確認してください。sourceTableId のテーブルに存在するカラムIDを指定してください。`,
          });
        }
      }
    }

    // targetColumnIdチェック
    if (rel.targetTableId && rel.targetColumnId) {
      const targetTable = tables.find((t) => t.id === rel.targetTableId);
      if (targetTable) {
        const targetColumn = (targetTable.columns ?? []).find((c) => (c as Column).id === rel.targetColumnId);
        if (!targetColumn) {
          errors.push({
            type: 'invalid_relation_target_column',
            severity: 'error',
            message: `リレーション "${relLabel}" のtargetColumnId "${rel.targetColumnId}" がテーブル "${targetTable.name}" に存在しません。`,
            target: relLabel,
            fixPrompt: `リレーション "${relLabel}" の targetColumnId "${rel.targetColumnId}" が正しいか確認してください。targetTableId のテーブルに存在するカラムIDを指定してください。`,
          });
        }
      }
    }
  }

  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    combinedFixPrompt: generateCombinedFixPrompt(errors, warnings),
  };
}

/**
 * 全エラーをまとめた修正プロンプトを生成
 */
function generateCombinedFixPrompt(errors: ValidationError[], warnings: ValidationError[]): string | null {
  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  const parts: string[] = [];

  parts.push('# WaiwaiER JSONインポートエラー - 修正依頼\n');
  parts.push('以下のエラーを修正してJSONを再生成してください。\n');

  if (errors.length > 0) {
    parts.push('## エラー（必須修正）\n');
    errors.forEach((err, i) => {
      parts.push(`### ${i + 1}. ${err.message}`);
      if (err.target) {
        parts.push(`対象: ${err.target}`);
      }
      parts.push(`\n${err.fixPrompt}\n`);
    });
  }

  if (warnings.length > 0) {
    parts.push('## 警告（推奨修正）\n');
    warnings.forEach((warn, i) => {
      parts.push(`### ${i + 1}. ${warn.message}`);
      if (warn.target) {
        parts.push(`対象: ${warn.target}`);
      }
      parts.push(`\n${warn.fixPrompt}\n`);
    });
  }

  parts.push('---\n');
  parts.push('上記を修正した完全なJSONを出力してください。');

  return parts.join('\n');
}

/**
 * バリデーション結果をユーザー向けメッセージに変換
 */
export function formatValidationResultForDisplay(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.errors.length > 0) {
    lines.push(`❌ ${result.errors.length} 件のエラー:`);
    result.errors.forEach((err) => {
      lines.push(`  • ${err.message}`);
    });
  }

  if (result.warnings.length > 0) {
    lines.push(`⚠️ ${result.warnings.length} 件の警告:`);
    result.warnings.forEach((warn) => {
      lines.push(`  • ${warn.message}`);
    });
  }

  return lines.join('\n');
}
