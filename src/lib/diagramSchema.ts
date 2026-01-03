import type { Column, ERDiagram, Memo, Relation, Table } from '../types';

const ALL_EXPORT_TARGETS = ['excel', 'json', 'package'] as const;

function normalizeExportTargets(raw: unknown): Table['exportTargets'] {
  if (!Array.isArray(raw)) return [...ALL_EXPORT_TARGETS];
  const allowed = new Set<string>(ALL_EXPORT_TARGETS);
  const out: string[] = [];
  for (const v of raw) {
    if (typeof v === 'string' && allowed.has(v) && !out.includes(v)) out.push(v);
  }
  // 空配列は「どこにもエクスポートしない」を表すため、そのまま許可する。
  return out as Table['exportTargets'];
}

/**
 * ER図(ダイアグラム)の保存スキーマ互換レイヤー。
 *
 * - 保存時は envelope 形式 { schemaVersion, diagram } で保存する。
 * - 読込時は過去形式(legacy)も受け入れ、最新版へ段階的に migrate する。
 * - サポート対象は「直近2世代」(current と current-1 と current-2)。
 */

export const DIAGRAM_SCHEMA_VERSION = 2 as const;
export const MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION = Math.max(0, DIAGRAM_SCHEMA_VERSION - 2);

export type DiagramEnvelopeV1 = {
  schemaVersion: 1;
  diagram: ERDiagram;
};

export type DiagramEnvelopeV2 = {
  schemaVersion: 2;
  diagram: ERDiagram;
};

type AnyEnvelope = {
  schemaVersion: number;
  diagram: unknown;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object';
}

function isDiagramEnvelope(value: unknown): value is AnyEnvelope {
  if (!isObject(value)) return false;
  return typeof value.schemaVersion === 'number' && 'diagram' in value;
}

function isLegacyDiagram(value: unknown): value is ERDiagram {
  if (!isObject(value)) return false;
  const tables = value.tables;
  const relations = value.relations;
  return Array.isArray(tables) && Array.isArray(relations);
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeColumn(raw: unknown, index: number): Column {
  const obj = (isObject(raw) ? raw : {}) as Record<string, unknown>;

  const appSheet = isObject(obj.appSheet) ? (obj.appSheet as Record<string, unknown>) : undefined;

  return {
    id: (typeof obj.id === 'string' && obj.id) || crypto.randomUUID(),
    name: (typeof obj.name === 'string' && obj.name) || `Column${index + 1}`,
    type: (typeof obj.type === 'string' ? (obj.type as Column['type']) : 'Text'),
    isKey: typeof obj.isKey === 'boolean' ? obj.isKey : false,
    isLabel: typeof obj.isLabel === 'boolean' ? obj.isLabel : false,
    isVirtual: typeof obj.isVirtual === 'boolean' ? obj.isVirtual : false,
    description: typeof obj.description === 'string' ? obj.description : undefined,
    appSheet,
    dummyValues: Array.isArray(obj.dummyValues) ? (obj.dummyValues as string[]) : undefined,
    constraints: isObject(obj.constraints) ? (obj.constraints as Column['constraints']) : {},
    order: typeof obj.order === 'number' ? obj.order : index,
  };
}

function normalizeTable(raw: unknown, index: number, fallbackNow: string): Table {
  const obj = (isObject(raw) ? raw : {}) as Record<string, unknown>;

  const columnsRaw = Array.isArray(obj.columns) ? obj.columns : [];

  const position = isObject(obj.position)
    ? {
        x: typeof obj.position.x === 'number' ? obj.position.x : 100 + index * 30,
        y: typeof obj.position.y === 'number' ? obj.position.y : 100 + index * 30,
      }
    : { x: 100 + index * 30, y: 100 + index * 30 };

  return {
    id: (typeof obj.id === 'string' && obj.id) || crypto.randomUUID(),
    name: (typeof obj.name === 'string' && obj.name) || `Table${index + 1}`,
    columns: columnsRaw.map((c, i) => normalizeColumn(c, i)),
    position,
    color: typeof obj.color === 'string' ? obj.color : undefined,
    exportTargets: normalizeExportTargets(obj.exportTargets),
    syncGroupId: typeof obj.syncGroupId === 'string' ? obj.syncGroupId : undefined,
    createdAt: (typeof obj.createdAt === 'string' && obj.createdAt) || fallbackNow,
    updatedAt: (typeof obj.updatedAt === 'string' && obj.updatedAt) || fallbackNow,
  };
}

function normalizeRelation(raw: unknown): Relation {
  const obj = (isObject(raw) ? raw : {}) as Record<string, unknown>;

  return {
    id: (typeof obj.id === 'string' && obj.id) || crypto.randomUUID(),
    sourceTableId: (typeof obj.sourceTableId === 'string' && obj.sourceTableId) || '',
    sourceColumnId: (typeof obj.sourceColumnId === 'string' && obj.sourceColumnId) || '',
    targetTableId: (typeof obj.targetTableId === 'string' && obj.targetTableId) || '',
    targetColumnId: (typeof obj.targetColumnId === 'string' && obj.targetColumnId) || '',
    type:
      obj.type === 'one-to-one' || obj.type === 'one-to-many' || obj.type === 'many-to-many'
        ? obj.type
        : 'one-to-many',
    label: typeof obj.label === 'string' ? obj.label : undefined,
  };
}

function normalizeMemo(raw: unknown, index: number, fallbackNow: string): Memo {
  const obj = (isObject(raw) ? raw : {}) as Record<string, unknown>;

  const position = isObject(obj.position)
    ? {
        x: typeof obj.position.x === 'number' ? obj.position.x : 200 + index * 20,
        y: typeof obj.position.y === 'number' ? obj.position.y : 200 + index * 20,
      }
    : { x: 200 + index * 20, y: 200 + index * 20 };

  return {
    id: (typeof obj.id === 'string' && obj.id) || crypto.randomUUID(),
    text: typeof obj.text === 'string' ? obj.text : '',
    position,
    width: typeof obj.width === 'number' ? obj.width : undefined,
    height: typeof obj.height === 'number' ? obj.height : undefined,
    createdAt: (typeof obj.createdAt === 'string' && obj.createdAt) || fallbackNow,
    updatedAt: (typeof obj.updatedAt === 'string' && obj.updatedAt) || fallbackNow,
  };
}

function normalizeDiagram(diagram: ERDiagram): ERDiagram {
  const fallbackNow = nowIso();

  const tables = Array.isArray(diagram.tables) ? diagram.tables : [];
  const relations = Array.isArray(diagram.relations) ? diagram.relations : [];
  const memos = Array.isArray(diagram.memos) ? diagram.memos : [];

  return {
    tables: tables.map((t, i) => normalizeTable(t, i, fallbackNow)),
    relations: relations.map((r) => normalizeRelation(r)),
    memos: memos.map((m, i) => normalizeMemo(m, i, fallbackNow)),
  };
}

function migrateV0ToV1(legacy: ERDiagram): DiagramEnvelopeV1 {
  // v0 = legacy形式（envelopeなし）
  // v1 = envelope + 正規化(memosを含む)
  return {
    schemaVersion: 1,
    diagram: normalizeDiagram({
      tables: legacy.tables ?? [],
      relations: legacy.relations ?? [],
      memos: legacy.memos ?? [],
    }),
  };
}

function migrateV1ToV2(v1: DiagramEnvelopeV1): DiagramEnvelopeV2 {
  return {
    schemaVersion: 2,
    diagram: normalizeDiagram(v1.diagram),
  };
}

export function encodeDiagramEnvelope(diagram: ERDiagram): DiagramEnvelopeV2 {
  // 書き込みは常に最新
  return {
    schemaVersion: DIAGRAM_SCHEMA_VERSION,
    diagram: normalizeDiagram(diagram),
  };
}

export function decodeAndMigrateDiagram(value: unknown): ERDiagram | null {
  if (value == null) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return decodeAndMigrateDiagram(parsed);
    } catch {
      return null;
    }
  }

  // envelope形式
  if (isDiagramEnvelope(value)) {
    const fromVersion = value.schemaVersion;

    if (fromVersion > DIAGRAM_SCHEMA_VERSION) {
      throw new Error('このデータは新しいバージョンで作成されています。アプリをアップデートしてください。');
    }

    if (fromVersion < MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION) {
      throw new Error('このデータは古すぎるため、このバージョンでは読み込めません。中間バージョンを経由してアップデートしてください。');
    }

    // v2
    if (fromVersion === 2) {
      if (!isLegacyDiagram(value.diagram)) {
        return null;
      }
      return normalizeDiagram(value.diagram);
    }

    // v1
    if (fromVersion === 1) {
      if (!isLegacyDiagram(value.diagram)) {
        return null;
      }
      return migrateV1ToV2({ schemaVersion: 1, diagram: value.diagram }).diagram;
    }

    if (fromVersion === 0) {
      // envelope付きv0という形は通常出ないが、念のため
      if (!isLegacyDiagram(value.diagram)) return null;
      return migrateV0ToV1(value.diagram).diagram;
    }

    return null;
  }

  // legacy形式（envelopeなし）
  if (isLegacyDiagram(value)) {
    return migrateV0ToV1(value).diagram;
  }

  return null;
}
