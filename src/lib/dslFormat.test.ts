import { describe, it, expect } from 'vitest';
import { parseDSL, exportToDSL, isDSLFormat, isJSONFormat } from './dslFormat';
import type { ERDiagram, Table, Relation } from '../types';

describe('dslFormat', () => {
  describe('parseDSL', () => {
    it('基本的なテーブル定義をパースできる', () => {
      const dsl = `
TABLE users "ユーザー" PK=id LABEL=name
COL users.id Number req uniq "主キー"
COL users.name Text req "表示名"
COL users.email Email "メールアドレス"
      `.trim();

      const result = parseDSL(dsl);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].name).toBe('users');
      expect(result.tables[0].description).toBe('ユーザー');
      expect(result.tables[0].columns).toHaveLength(3);

      const idCol = result.tables[0].columns.find((c) => c.name === 'id');
      expect(idCol?.type).toBe('Number');
      expect(idCol?.isKey).toBe(true);
      expect(idCol?.constraints.required).toBe(true);
      expect(idCol?.constraints.unique).toBe(true);

      const nameCol = result.tables[0].columns.find((c) => c.name === 'name');
      expect(nameCol?.isLabel).toBe(true);
    });

    it('REF型カラムをパースしてリレーションを生成する', () => {
      const dsl = `
TABLE orgs "組織" PK=id LABEL=org_name
COL orgs.id Number req uniq
COL orgs.org_name Text req

TABLE users "ユーザー" PK=id LABEL=name
COL users.id Number req uniq
COL users.name Text req
REF users.org_id -> orgs.id req "所属組織"
      `.trim();

      const result = parseDSL(dsl);

      expect(result.tables).toHaveLength(2);
      expect(result.relations).toHaveLength(1);

      const relation = result.relations[0];
      const usersTable = result.tables.find((t) => t.name === 'users');
      const orgsTable = result.tables.find((t) => t.name === 'orgs');
      const orgIdCol = usersTable?.columns.find((c) => c.name === 'org_id');
      const orgsIdCol = orgsTable?.columns.find((c) => c.name === 'id');

      // WaiwaiERのリレーション定義: source=親(1側), target=子(N側)
      expect(relation.sourceTableId).toBe(orgsTable?.id);      // 親テーブル
      expect(relation.sourceColumnId).toBe(orgsIdCol?.id);     // 親の主キー
      expect(relation.targetTableId).toBe(usersTable?.id);     // 子テーブル
      expect(relation.targetColumnId).toBe(orgIdCol?.id);      // 子の外部キー
      expect(relation.type).toBe('one-to-many');

      expect(orgIdCol?.type).toBe('Ref');
      expect(orgIdCol?.constraints.refTableId).toBe(orgsTable?.id);
      expect(orgIdCol?.constraints.refColumnId).toBe(orgsIdCol?.id);
    });

    it('REF型をエクスポート→インポートでラウンドトリップできる', () => {
      // 既存のERDiagramからDSLをエクスポートし、再インポートしてリレーションが保持されるか確認
      const originalDiagram: ERDiagram = {
        tables: [
          {
            id: 'tbl-orgs',
            name: 'orgs',
            description: '組織',
            columns: [
              { id: 'col-orgs-id', name: 'id', type: 'Number', isKey: true, isLabel: false, constraints: { required: true, unique: true }, order: 0 },
              { id: 'col-orgs-name', name: 'org_name', type: 'Text', isKey: false, isLabel: true, constraints: { required: true }, order: 1 },
            ],
            position: { x: 0, y: 0 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          {
            id: 'tbl-users',
            name: 'users',
            description: 'ユーザー',
            columns: [
              { id: 'col-users-id', name: 'id', type: 'Number', isKey: true, isLabel: false, constraints: { required: true, unique: true }, order: 0 },
              { id: 'col-users-name', name: 'name', type: 'Text', isKey: false, isLabel: true, constraints: { required: true }, order: 1 },
              { id: 'col-users-org', name: 'org_id', type: 'Ref', isKey: false, isLabel: false, constraints: { required: true, refTableId: 'tbl-orgs', refColumnId: 'col-orgs-id' }, order: 2, description: '所属' },
            ],
            position: { x: 400, y: 0 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
        relations: [
          // WaiwaiER: source=親(orgs), target=子(users)
          { id: 'rel-1', sourceTableId: 'tbl-orgs', sourceColumnId: 'col-orgs-id', targetTableId: 'tbl-users', targetColumnId: 'col-users-org', type: 'one-to-many' },
        ],
        memos: [],
      };

      // エクスポート
      const dsl = exportToDSL(originalDiagram, { includeHeader: false });
      
      // DSLにREF行が含まれていることを確認
      expect(dsl).toContain('REF users.org_id -> orgs.id req');
      
      // 再インポート
      const reimported = parseDSL(dsl);
      
      // リレーションが正しく復元されていることを確認
      expect(reimported.relations).toHaveLength(1);
      
      const rel = reimported.relations[0];
      const usersTable = reimported.tables.find(t => t.name === 'users');
      const orgsTable = reimported.tables.find(t => t.name === 'orgs');
      const orgIdCol = usersTable?.columns.find(c => c.name === 'org_id');
      const orgsIdCol = orgsTable?.columns.find(c => c.name === 'id');
      
      // WaiwaiERのリレーション定義: source=親(1側), target=子(N側)
      expect(rel.sourceTableId).toBe(orgsTable?.id);       // 親テーブル
      expect(rel.sourceColumnId).toBe(orgsIdCol?.id);      // 親の主キー
      expect(rel.targetTableId).toBe(usersTable?.id);      // 子テーブル
      expect(rel.targetColumnId).toBe(orgIdCol?.id);       // 子の外部キー
      
      // Ref型カラムの参照先も正しいことを確認
      expect(orgIdCol?.constraints.refTableId).toBe(orgsTable?.id);
      expect(orgIdCol?.constraints.refColumnId).toBe(orgsIdCol?.id);
    });

    it('MEMOをパースできる', () => {
      const dsl = `
TABLE users PK=id
COL users.id Number req
MEMO "これはテストメモです"
MEMO "複数行\\nメモ"
      `.trim();

      const result = parseDSL(dsl);

      expect(result.memos).toHaveLength(2);
      expect(result.memos?.[0].text).toBe('これはテストメモです');
      expect(result.memos?.[1].text).toBe('複数行\nメモ');
    });

    it('コメント行と空行を無視する', () => {
      const dsl = `
# コメント
// これもコメント

TABLE users PK=id
COL users.id Number req

# 別のコメント
      `.trim();

      const result = parseDSL(dsl);

      expect(result.tables).toHaveLength(1);
      expect(result.tables[0].columns).toHaveLength(1);
    });

    it('virtual カラムをパースできる', () => {
      const dsl = `
TABLE items PK=id
COL items.id Number req
COL items.fullName Text virtual "計算列"
      `.trim();

      const result = parseDSL(dsl);

      const fullNameCol = result.tables[0].columns.find((c) => c.name === 'fullName');
      expect(fullNameCol?.isVirtual).toBe(true);
    });

    it('テーブルにCOLORを指定できる', () => {
      const dsl = `
TABLE users PK=id COLOR=#FF5733
COL users.id Number req
      `.trim();

      const result = parseDSL(dsl);

      expect(result.tables[0].color).toBe('#FF5733');
    });
  });

  describe('exportToDSL', () => {
    const createTestDiagram = (): ERDiagram => {
      const orgTable: Table = {
        id: 'org-1',
        name: 'orgs',
        description: '組織',
        columns: [
          {
            id: 'org-col-1',
            name: 'id',
            type: 'Number',
            isKey: true,
            isLabel: false,
            constraints: { required: true, unique: true },
            order: 0,
          },
          {
            id: 'org-col-2',
            name: 'org_name',
            type: 'Text',
            isKey: false,
            isLabel: true,
            constraints: { required: true },
            order: 1,
          },
        ],
        position: { x: 0, y: 0 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const userTable: Table = {
        id: 'user-1',
        name: 'users',
        description: 'ユーザー',
        columns: [
          {
            id: 'user-col-1',
            name: 'id',
            type: 'Number',
            isKey: true,
            isLabel: false,
            constraints: { required: true, unique: true },
            order: 0,
          },
          {
            id: 'user-col-2',
            name: 'name',
            type: 'Text',
            isKey: false,
            isLabel: true,
            constraints: { required: true },
            order: 1,
          },
          {
            id: 'user-col-3',
            name: 'org_id',
            type: 'Ref',
            isKey: false,
            isLabel: false,
            constraints: { required: true, refTableId: 'org-1', refColumnId: 'org-col-1' },
            order: 2,
            description: '所属組織',
          },
        ],
        position: { x: 400, y: 0 },
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      };

      const relation: Relation = {
        id: 'rel-1',
        // WaiwaiER: source=親(org), target=子(user)
        sourceTableId: 'org-1',
        sourceColumnId: 'org-col-1',
        targetTableId: 'user-1',
        targetColumnId: 'user-col-3',
        type: 'one-to-many',
      };

      return {
        tables: [orgTable, userTable],
        relations: [relation],
        memos: [
          {
            id: 'memo-1',
            text: 'テストメモ',
            position: { x: 0, y: -100 },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      };
    };

    it('ERDiagramをDSL形式に変換できる', () => {
      const diagram = createTestDiagram();
      const dsl = exportToDSL(diagram, { includeHeader: false });

      expect(dsl).toContain('TABLE orgs "組織" PK=id LABEL=org_name');
      expect(dsl).toContain('COL orgs.id Number req uniq');
      expect(dsl).toContain('COL orgs.org_name Text req');
      expect(dsl).toContain('TABLE users "ユーザー" PK=id LABEL=name');
      expect(dsl).toContain('REF users.org_id -> orgs.id req "所属組織"');
      expect(dsl).toContain('MEMO "テストメモ"');
    });

    it('ヘッダーを含めることができる', () => {
      const diagram = createTestDiagram();
      const dsl = exportToDSL(diagram, { includeHeader: true });

      expect(dsl).toContain('# WaiwaiER DSL Format');
      expect(dsl).toContain('# Generated at:');
    });
  });

  describe('ラウンドトリップ', () => {
    it('DSL → ERDiagram → DSL で情報が保持される', () => {
      const originalDSL = `
TABLE orgs "組織" PK=id LABEL=org_name
COL orgs.id Number req uniq "主キー"
COL orgs.org_name Text req "組織名"

TABLE users "ユーザー" PK=id LABEL=name
COL users.id Number req uniq "主キー"
COL users.name Text req "表示名"
REF users.org_id -> orgs.id req "所属組織"

MEMO "設計メモ"
      `.trim();

      const diagram = parseDSL(originalDSL);
      const exportedDSL = exportToDSL(diagram, { includeHeader: false });

      // 主要な情報が含まれていることを確認
      expect(exportedDSL).toContain('TABLE orgs "組織"');
      expect(exportedDSL).toContain('PK=id');
      expect(exportedDSL).toContain('LABEL=org_name');
      expect(exportedDSL).toContain('TABLE users "ユーザー"');
      expect(exportedDSL).toContain('REF users.org_id -> orgs.id');
      expect(exportedDSL).toContain('MEMO "設計メモ"');

      // 再パースしても同じ構造
      const reparsed = parseDSL(exportedDSL);
      expect(reparsed.tables).toHaveLength(2);
      expect(reparsed.relations).toHaveLength(1);
      expect(reparsed.memos).toHaveLength(1);
    });
  });

  describe('isDSLFormat / isJSONFormat', () => {
    it('DSL形式を正しく判定する', () => {
      expect(isDSLFormat('TABLE users PK=id')).toBe(true);
      expect(isDSLFormat('# comment\nTABLE users')).toBe(true);
      expect(isDSLFormat('COL users.id Number')).toBe(true);
      expect(isDSLFormat('{ "tables": [] }')).toBe(false);
      expect(isDSLFormat('random text')).toBe(false);
    });

    it('JSON形式を正しく判定する', () => {
      expect(isJSONFormat('{ "tables": [] }')).toBe(true);
      expect(isJSONFormat('  { "tables": [] }  ')).toBe(true);
      expect(isJSONFormat('[1, 2, 3]')).toBe(true);
      expect(isJSONFormat('TABLE users')).toBe(false);
    });
  });

  describe('階層配置アルゴリズム', () => {
    it('親テーブルが左、子テーブルが右に配置される', () => {
      // 3階層: orgs → departments → users
      const dsl = `
TABLE users "ユーザー" PK=id
COL users.id Number req uniq
REF users.dept_id -> departments.id req

TABLE departments "部署" PK=id
COL departments.id Number req uniq
REF departments.org_id -> orgs.id req

TABLE orgs "組織" PK=id
COL orgs.id Number req uniq
      `.trim();

      const result = parseDSL(dsl);

      const orgs = result.tables.find(t => t.name === 'orgs');
      const departments = result.tables.find(t => t.name === 'departments');
      const users = result.tables.find(t => t.name === 'users');

      // orgsが最も左（親）
      expect(orgs?.position.x).toBe(0);
      // departmentsが中央
      expect(departments?.position.x).toBe(400);
      // usersが最も右（子）
      expect(users?.position.x).toBe(800);
    });

    it('同階層のテーブルは縦に並ぶ', () => {
      // orgsを参照する複数の子テーブル
      const dsl = `
TABLE orgs "組織" PK=id
COL orgs.id Number req uniq

TABLE users "ユーザー" PK=id
COL users.id Number req uniq
REF users.org_id -> orgs.id req

TABLE projects "プロジェクト" PK=id
COL projects.id Number req uniq
REF projects.org_id -> orgs.id req

TABLE assets "資産" PK=id
COL assets.id Number req uniq
REF assets.org_id -> orgs.id req
      `.trim();

      const result = parseDSL(dsl);

      const orgs = result.tables.find(t => t.name === 'orgs');
      const users = result.tables.find(t => t.name === 'users');
      const projects = result.tables.find(t => t.name === 'projects');
      const assets = result.tables.find(t => t.name === 'assets');

      // orgsが左側（階層0）
      expect(orgs?.position.x).toBe(0);
      expect(orgs?.position.y).toBe(0);

      // 子テーブルはすべて右側（階層1）で同じx座標
      expect(users?.position.x).toBe(400);
      expect(projects?.position.x).toBe(400);
      expect(assets?.position.x).toBe(400);

      // 子テーブルは縦に並ぶ（異なるy座標）
      const childYPositions = [users?.position.y, projects?.position.y, assets?.position.y];
      const uniqueYPositions = new Set(childYPositions);
      expect(uniqueYPositions.size).toBe(3); // 3つとも異なるy座標
    });

    it('独立したテーブル（参照なし）は階層0に配置される', () => {
      const dsl = `
TABLE users PK=id
COL users.id Number req uniq

TABLE products PK=id
COL products.id Number req uniq

TABLE settings PK=id
COL settings.id Number req uniq
      `.trim();

      const result = parseDSL(dsl);

      // すべて階層0なので同じx座標
      for (const table of result.tables) {
        expect(table.position.x).toBe(0);
      }

      // それぞれ異なるy座標
      const yPositions = result.tables.map(t => t.position.y);
      const uniqueYPositions = new Set(yPositions);
      expect(uniqueYPositions.size).toBe(3);
    });

    it('循環参照があっても無限ループにならない', () => {
      const dsl = `
TABLE a PK=id
COL a.id Number req uniq
REF a.b_id -> b.id

TABLE b PK=id
COL b.id Number req uniq
REF b.a_id -> a.id
      `.trim();

      // 無限ループにならずにパースが完了すること
      const result = parseDSL(dsl);
      expect(result.tables).toHaveLength(2);
    });
  });
});
