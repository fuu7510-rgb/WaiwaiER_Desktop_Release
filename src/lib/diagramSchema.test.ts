import { describe, it, expect } from 'vitest';
import {
  DIAGRAM_SCHEMA_VERSION,
  MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION,
  encodeDiagramEnvelope,
  decodeAndMigrateDiagram,
} from './diagramSchema';
import type { ERDiagram, Table, Relation, Memo } from '../types';

/**
 * テストヘルパー: 最小構成のテーブルを作成
 */
function createMinimalTable(overrides: Partial<Table> = {}): Table {
  return {
    id: overrides.id ?? 'table1',
    name: overrides.name ?? 'TestTable',
    columns: overrides.columns ?? [],
    position: overrides.position ?? { x: 100, y: 100 },
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

/**
 * テストヘルパー: 最小構成のリレーションを作成
 */
function createMinimalRelation(overrides: Partial<Relation> = {}): Relation {
  return {
    id: overrides.id ?? 'rel1',
    sourceTableId: overrides.sourceTableId ?? 'table1',
    sourceColumnId: overrides.sourceColumnId ?? 'col1',
    targetTableId: overrides.targetTableId ?? 'table2',
    targetColumnId: overrides.targetColumnId ?? 'col2',
    type: overrides.type ?? 'one-to-many',
    ...overrides,
  };
}

/**
 * テストヘルパー: 最小構成のメモを作成
 */
function createMinimalMemo(overrides: Partial<Memo> = {}): Memo {
  return {
    id: overrides.id ?? 'memo1',
    text: overrides.text ?? 'Test memo',
    position: overrides.position ?? { x: 200, y: 200 },
    createdAt: overrides.createdAt ?? '2025-01-01T00:00:00.000Z',
    updatedAt: overrides.updatedAt ?? '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('diagramSchema', () => {
  describe('スキーマバージョン定数', () => {
    it('現在のスキーマバージョンが定義されている', () => {
      expect(DIAGRAM_SCHEMA_VERSION).toBe(4);
    });

    it('最小サポートバージョンが定義されている', () => {
      expect(MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION).toBeLessThanOrEqual(DIAGRAM_SCHEMA_VERSION);
      expect(MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION).toBeGreaterThanOrEqual(0);
    });
  });

  describe('encodeDiagramEnvelope', () => {
    it('ダイアグラムをエンベロープ形式でエンコードできる', () => {
      const diagram: ERDiagram = {
        tables: [createMinimalTable()],
        relations: [],
        memos: [],
      };

      const envelope = encodeDiagramEnvelope(diagram);

      expect(envelope.schemaVersion).toBe(DIAGRAM_SCHEMA_VERSION);
      expect(envelope.diagram.tables).toHaveLength(1);
      expect(envelope.diagram.relations).toHaveLength(0);
    });

    it('テーブル・リレーション・メモを正規化する', () => {
      const diagram: ERDiagram = {
        tables: [createMinimalTable({ id: 't1', name: 'Users' })],
        relations: [createMinimalRelation({ id: 'r1' })],
        memos: [createMinimalMemo({ id: 'm1', text: 'Note' })],
      };

      const envelope = encodeDiagramEnvelope(diagram);

      expect(envelope.diagram.tables[0].id).toBe('t1');
      expect(envelope.diagram.tables[0].name).toBe('Users');
      expect(envelope.diagram.relations[0].id).toBe('r1');
      expect(envelope.diagram.memos?.[0].id).toBe('m1');
    });

    it('空の配列を処理できる', () => {
      const diagram: ERDiagram = {
        tables: [],
        relations: [],
        memos: [],
      };

      const envelope = encodeDiagramEnvelope(diagram);

      expect(envelope.diagram.tables).toEqual([]);
      expect(envelope.diagram.relations).toEqual([]);
      expect(envelope.diagram.memos).toEqual([]);
    });
  });

  describe('decodeAndMigrateDiagram', () => {
    describe('null/undefined処理', () => {
      it('nullを渡すとnullを返す', () => {
        expect(decodeAndMigrateDiagram(null)).toBeNull();
      });

      it('undefinedを渡すとnullを返す', () => {
        expect(decodeAndMigrateDiagram(undefined)).toBeNull();
      });
    });

    describe('エンベロープ形式（V2）の処理', () => {
      it('V2エンベロープを正常にデコードできる', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [createMinimalTable()],
            relations: [],
            memos: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).not.toBeNull();
        expect(result?.tables).toHaveLength(1);
      });

      it('JSON文字列からデコードできる', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [createMinimalTable({ name: 'FromJSON' })],
            relations: [],
          },
        };
        const jsonString = JSON.stringify(envelope);

        const result = decodeAndMigrateDiagram(jsonString);

        expect(result).not.toBeNull();
        expect(result?.tables[0].name).toBe('FromJSON');
      });

      it('不正なJSON文字列はnullを返す', () => {
        const invalidJson = '{ invalid json }';

        const result = decodeAndMigrateDiagram(invalidJson);

        expect(result).toBeNull();
      });
    });

    describe('リレーションの追従アイコン個別設定の正規化', () => {
      it('未指定の場合は既定値に正規化される', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [createMinimalTable({ id: 't1' }), createMinimalTable({ id: 't2' })],
            relations: [createMinimalRelation({ id: 'r1' })],
            memos: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);
        expect(result).not.toBeNull();

        const rel = result!.relations[0];
        expect(rel.edgeFollowerIconName).toBe('arrow-right');
        expect(rel.edgeFollowerIconSize).toBe(14);
        expect(rel.edgeFollowerIconSpeed).toBe(90);
      });

      it('不正な値は範囲内に丸められる', () => {
        const legacy = {
          tables: [createMinimalTable({ id: 't1' }), createMinimalTable({ id: 't2' })],
          relations: [
            createMinimalRelation({
              id: 'r1',
              edgeFollowerIconName: '  ',
              edgeFollowerIconSize: 9999,
              edgeFollowerIconSpeed: 0,
            }),
          ],
        };

        const result = decodeAndMigrateDiagram(legacy);
        expect(result).not.toBeNull();

        const rel = result!.relations[0];
        expect(rel.edgeFollowerIconName).toBe('arrow-right');
        expect(rel.edgeFollowerIconSize).toBe(48);
        expect(rel.edgeFollowerIconSpeed).toBe(10);
      });
    });

    describe('リレーションのedgeVisibilityの正規化', () => {
      it('未指定の場合はundefinedのまま（=通常表示）', () => {
        const envelope = {
          schemaVersion: 4,
          diagram: {
            tables: [createMinimalTable({ id: 't1' }), createMinimalTable({ id: 't2' })],
            relations: [createMinimalRelation({ id: 'r1' })],
            memos: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);
        expect(result).not.toBeNull();

        const rel = result!.relations[0];
        expect(rel.edgeVisibility).toBeUndefined();
      });

      it('rootOnlyのみ許可され、それ以外はundefinedに正規化される', () => {
        const legacy = {
          tables: [createMinimalTable({ id: 't1' }), createMinimalTable({ id: 't2' })],
          relations: [
            createMinimalRelation({
              id: 'r1',
              // @ts-expect-error legacy/unknown values
              edgeVisibility: 'nope',
            }),
            createMinimalRelation({
              id: 'r2',
              edgeVisibility: 'rootOnly',
            }),
          ],
        };

        const result = decodeAndMigrateDiagram(legacy);
        expect(result).not.toBeNull();

        const [r1, r2] = result!.relations;
        expect(r1.edgeVisibility).toBeUndefined();
        expect(r2.edgeVisibility).toBe('rootOnly');
      });
    });

    describe('レガシー形式（エンベロープなし）の処理', () => {
      it('エンベロープなしのダイアグラムをV1にマイグレートできる', () => {
        const legacyDiagram = {
          tables: [createMinimalTable({ name: 'Legacy' })],
          relations: [],
        };

        const result = decodeAndMigrateDiagram(legacyDiagram);

        expect(result).not.toBeNull();
        expect(result?.tables[0].name).toBe('Legacy');
      });

      it('memosが未定義でも処理できる', () => {
        const legacyDiagram = {
          tables: [createMinimalTable()],
          relations: [],
          // memos is undefined
        };

        const result = decodeAndMigrateDiagram(legacyDiagram);

        expect(result).not.toBeNull();
        expect(result?.memos).toEqual([]);
      });
    });

    describe('バージョンチェック', () => {
      it('新しすぎるバージョンでも、diagramの形が合えば読み込める（前方互換）', () => {
        const futureEnvelope = {
          schemaVersion: DIAGRAM_SCHEMA_VERSION + 1,
          diagram: {
            tables: [],
            relations: [],
            memos: [],
          },
        };

        const result = decodeAndMigrateDiagram(futureEnvelope);
        expect(result).not.toBeNull();
        expect(result?.tables).toEqual([]);
        expect(result?.relations).toEqual([]);
        expect(result?.memos).toEqual([]);
      });

      it('新しすぎるバージョンでも、diagramの形が合わない場合はエラーを投げる', () => {
        const futureEnvelope = {
          schemaVersion: 999,
          diagram: 'not a diagram',
        };

        expect(() => decodeAndMigrateDiagram(futureEnvelope)).toThrow(
          'このデータは新しいバージョンで作成されています'
        );
      });

      it('古すぎるバージョンはエラーを投げる', () => {
        // MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION未満のバージョン
        const veryOldEnvelope = {
          schemaVersion: -1, // 確実にサポート範囲外
          diagram: {
            tables: [],
            relations: [],
          },
        };

        expect(() => decodeAndMigrateDiagram(veryOldEnvelope)).toThrow(
          'このデータは古すぎるため'
        );
      });
    });

    describe('部分欠落データ救済', () => {
      it('envelope内diagramでrelationsが欠落していても読み込める', () => {
        const envelope = {
          schemaVersion: DIAGRAM_SCHEMA_VERSION,
          diagram: {
            tables: [createMinimalTable({ name: 'NoRelations' })],
            // relations missing
          },
        };

        const result = decodeAndMigrateDiagram(envelope);
        expect(result).not.toBeNull();
        expect(result?.tables[0].name).toBe('NoRelations');
        expect(result?.relations).toEqual([]);
      });
    });

    describe('データ正規化', () => {
      it('テーブルのカラムを正規化する', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [
              {
                id: 't1',
                name: 'Test',
                columns: [
                  {
                    id: 'c1',
                    name: 'Column1',
                    type: 'Text',
                    // isKey, isLabel, order が欠けている
                  },
                ],
                position: { x: 0, y: 0 },
              },
            ],
            relations: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).not.toBeNull();
        const col = result?.tables[0].columns[0];
        expect(col?.isKey).toBe(false);
        expect(col?.isLabel).toBe(false);
        expect(col?.order).toBe(0);
        expect(col?.constraints).toEqual({});
      });

      it('リレーションのtypeを正規化する', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [],
            relations: [
              {
                id: 'r1',
                sourceTableId: 't1',
                sourceColumnId: 'c1',
                targetTableId: 't2',
                targetColumnId: 'c2',
                // type が欠けている
              },
            ],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).not.toBeNull();
        expect(result?.relations[0].type).toBe('one-to-many');
      });

      it('メモのサイズを保持する', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [],
            relations: [],
            memos: [
              {
                id: 'm1',
                text: 'Test',
                position: { x: 100, y: 100 },
                width: 300,
                height: 200,
              },
            ],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).not.toBeNull();
        const memo = result?.memos?.[0];
        expect(memo?.width).toBe(300);
        expect(memo?.height).toBe(200);
      });

      it('欠落したIDを生成する', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [
              {
                // id が欠けている
                name: 'NoID',
                columns: [],
                position: { x: 0, y: 0 },
              },
            ],
            relations: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).not.toBeNull();
        expect(result?.tables[0].id).toBeTruthy();
        expect(typeof result?.tables[0].id).toBe('string');
      });

      it('欠落したタイムスタンプを生成する', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [
              {
                id: 't1',
                name: 'Test',
                columns: [],
                position: { x: 0, y: 0 },
                // createdAt, updatedAt が欠けている
              },
            ],
            relations: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).not.toBeNull();
        expect(result?.tables[0].createdAt).toBeTruthy();
        expect(result?.tables[0].updatedAt).toBeTruthy();
      });
    });

    describe('不正なデータの処理', () => {
      it('tablesが配列でない場合は空配列として扱う', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: 'not an array',
            relations: [],
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).toBeNull(); // isLegacyDiagramがfalseになる
      });

      it('relationsが配列でない場合は空配列として扱う', () => {
        const envelope = {
          schemaVersion: 2,
          diagram: {
            tables: [],
            relations: 'not an array',
          },
        };

        const result = decodeAndMigrateDiagram(envelope);

        expect(result).toBeNull(); // isLegacyDiagramがfalseになる
      });
    });
  });

  describe('ラウンドトリップテスト', () => {
    it('エンコード→デコードで同等のデータが得られる', () => {
      const originalDiagram: ERDiagram = {
        tables: [
          createMinimalTable({
            id: 't1',
            name: 'Users',
            columns: [
              {
                id: 'c1',
                name: 'ID',
                type: 'Text',
                isKey: true,
                isLabel: false,
                constraints: {},
                order: 0,
              },
              {
                id: 'c2',
                name: 'Name',
                type: 'Text',
                isKey: false,
                isLabel: true,
                constraints: { required: true },
                order: 1,
              },
            ],
          }),
          createMinimalTable({ id: 't2', name: 'Orders' }),
        ],
        relations: [
          createMinimalRelation({
            id: 'r1',
            sourceTableId: 't1',
            sourceColumnId: 'c1',
            targetTableId: 't2',
            targetColumnId: 'c3',
            type: 'one-to-many',
          }),
        ],
        memos: [
          createMinimalMemo({ id: 'm1', text: 'Test memo', width: 250, height: 150 }),
        ],
      };

      const encoded = encodeDiagramEnvelope(originalDiagram);
      const decoded = decodeAndMigrateDiagram(encoded);

      expect(decoded).not.toBeNull();
      expect(decoded?.tables).toHaveLength(2);
      expect(decoded?.tables[0].name).toBe('Users');
      expect(decoded?.tables[0].columns).toHaveLength(2);
      expect(decoded?.tables[0].columns[0].isKey).toBe(true);
      expect(decoded?.tables[0].columns[1].constraints.required).toBe(true);
      expect(decoded?.relations).toHaveLength(1);
      expect(decoded?.relations[0].type).toBe('one-to-many');
      expect(decoded?.memos).toHaveLength(1);
      expect(decoded?.memos?.[0].width).toBe(250);
    });

    it('JSON文字列でのラウンドトリップ', () => {
      const diagram: ERDiagram = {
        tables: [createMinimalTable({ name: 'TestRoundTrip' })],
        relations: [],
        memos: [],
      };

      const encoded = encodeDiagramEnvelope(diagram);
      const jsonString = JSON.stringify(encoded);
      const decoded = decodeAndMigrateDiagram(jsonString);

      expect(decoded).not.toBeNull();
      expect(decoded?.tables[0].name).toBe('TestRoundTrip');
    });
  });
});
