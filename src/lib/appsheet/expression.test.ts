import { describe, it, expect } from 'vitest';
import { evaluateAppSheetExpression, computeRowWithAppFormulas, type AppSheetEvalContext } from './expression';
import type { Table, Column } from '../../types';

/**
 * テストヘルパー: 最小構成の評価コンテキストを作成
 */
function createMinimalContext(overrides: Partial<AppSheetEvalContext> = {}): AppSheetEvalContext {
  const table: Table = {
    id: 'table1',
    name: 'TestTable',
    columns: [],
    position: { x: 0, y: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return {
    tables: [table],
    sampleDataByTableId: {},
    table,
    row: {},
    now: new Date('2025-12-31T00:00:00.000Z'),
    ...overrides,
  };
}

/**
 * テストヘルパー: カラムを作成
 */
function createColumn(overrides: Partial<Column> = {}): Column {
  return {
    id: overrides.id ?? 'col1',
    name: overrides.name ?? 'Column1',
    type: overrides.type ?? 'Text',
    isKey: overrides.isKey ?? false,
    isLabel: overrides.isLabel ?? false,
    constraints: overrides.constraints ?? {},
    order: overrides.order ?? 0,
    ...overrides,
  };
}

describe('evaluateAppSheetExpression', () => {
  describe('基本的な値', () => {
    it('数値リテラルを評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('42', ctx)).toBe(42);
      expect(evaluateAppSheetExpression('3.14', ctx)).toBe(3.14);
      expect(evaluateAppSheetExpression('0', ctx)).toBe(0);
    });

    it('文字列リテラルを評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('"Hello"', ctx)).toBe('Hello');
      expect(evaluateAppSheetExpression('"こんにちは"', ctx)).toBe('こんにちは');
      expect(evaluateAppSheetExpression('""', ctx)).toBe('');
    });

    it('ブール値を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('TRUE', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('FALSE', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('true', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('false', ctx)).toBe(false);
    });

    it('BLANKを空文字列として評価する', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('BLANK', ctx)).toBe('');
    });
  });

  describe('算術演算子', () => {
    it('加算を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('1 + 2', ctx)).toBe(3);
      expect(evaluateAppSheetExpression('10 + 20 + 30', ctx)).toBe(60);
    });

    it('減算を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('10 - 3', ctx)).toBe(7);
      expect(evaluateAppSheetExpression('100 - 50 - 25', ctx)).toBe(25);
    });

    it('乗算を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('3 * 4', ctx)).toBe(12);
      expect(evaluateAppSheetExpression('2 * 3 * 4', ctx)).toBe(24);
    });

    it('除算を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('10 / 2', ctx)).toBe(5);
      expect(evaluateAppSheetExpression('100 / 10 / 2', ctx)).toBe(5);
    });

    it('ゼロ除算は空を返す', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('10 / 0', ctx)).toBe('');
    });

    it('演算子の優先順位が正しい', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('2 + 3 * 4', ctx)).toBe(14); // 2 + 12 = 14
      expect(evaluateAppSheetExpression('(2 + 3) * 4', ctx)).toBe(20); // 5 * 4 = 20
    });

    it('単項演算子を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('-5', ctx)).toBe(-5);
      expect(evaluateAppSheetExpression('+10', ctx)).toBe(10);
      expect(evaluateAppSheetExpression('--3', ctx)).toBe(3);
    });
  });

  describe('比較演算子', () => {
    it('等価比較を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('1 = 1', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('1 = 2', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('"a" = "a"', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('"a" = "b"', ctx)).toBe(false);
    });

    it('不等価比較を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('1 <> 2', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('1 <> 1', ctx)).toBe(false);
    });

    it('大小比較を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('3 < 5', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('5 < 3', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('5 > 3', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('3 > 5', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('3 <= 3', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('3 <= 5', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('5 >= 5', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('5 >= 3', ctx)).toBe(true);
    });
  });

  describe('文字列連結', () => {
    it('& 演算子で文字列を連結できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('"Hello" & " " & "World"', ctx)).toBe('Hello World');
    });

    it('数値と文字列を連結できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('"Value: " & 42', ctx)).toBe('Value: 42');
    });
  });

  describe('論理関数', () => {
    it('IF関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('IF(TRUE, "yes", "no")', ctx)).toBe('yes');
      expect(evaluateAppSheetExpression('IF(FALSE, "yes", "no")', ctx)).toBe('no');
      expect(evaluateAppSheetExpression('IF(1 = 1, 100, 200)', ctx)).toBe(100);
    });

    it('AND関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('AND(TRUE, TRUE)', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('AND(TRUE, FALSE)', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('AND(FALSE, TRUE)', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('AND(TRUE, TRUE, TRUE)', ctx)).toBe(true);
    });

    it('OR関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('OR(TRUE, FALSE)', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('OR(FALSE, FALSE)', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('OR(FALSE, FALSE, TRUE)', ctx)).toBe(true);
    });

    it('NOT関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('NOT(TRUE)', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('NOT(FALSE)', ctx)).toBe(true);
    });

    it('ISBLANK関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('ISBLANK("")', ctx)).toBe(true);
      expect(evaluateAppSheetExpression('ISBLANK("text")', ctx)).toBe(false);
      expect(evaluateAppSheetExpression('ISBLANK(BLANK)', ctx)).toBe(true);
    });
  });

  describe('文字列関数', () => {
    it('CONCATENATE関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('CONCATENATE("A", "B", "C")', ctx)).toBe('ABC');
      expect(evaluateAppSheetExpression('CONCATENATE("Hello", " ", "World")', ctx)).toBe('Hello World');
    });

    it('TEXT関数を評価できる', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('TEXT(123)', ctx)).toBe('123');
      expect(evaluateAppSheetExpression('TEXT(TRUE)', ctx)).toBe('TRUE');
    });
  });

  describe('日付・時刻関数', () => {
    it('TODAY関数を評価できる', () => {
      const ctx = createMinimalContext({ now: new Date('2025-12-31T12:00:00.000Z') });
      expect(evaluateAppSheetExpression('TODAY()', ctx)).toBe('2025-12-31');
    });

    it('NOW関数を評価できる', () => {
      const now = new Date('2025-12-31T12:30:45.000Z');
      const ctx = createMinimalContext({ now });
      expect(evaluateAppSheetExpression('NOW()', ctx)).toBe('2025-12-31T12:30:45.000Z');
    });
  });

  describe('ANY関数', () => {
    it('配列の最初の要素を返す', () => {
      const ctx = createMinimalContext();
      // ANY関数はリストの先頭を取るので、直接リストは評価できないがSELECTやFILTER結果に使われる
      expect(evaluateAppSheetExpression('ANY("single")', ctx)).toBe('single');
    });
  });

  describe('カラム参照 [ColumnName]', () => {
    it('カラム値を参照できる', () => {
      const col = createColumn({ id: 'name', name: 'Name' });
      const table: Table = {
        id: 'table1',
        name: 'Users',
        columns: [col],
        position: { x: 0, y: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ctx = createMinimalContext({
        table,
        tables: [table],
        row: { name: 'Alice' },
      });
      expect(evaluateAppSheetExpression('[Name]', ctx)).toBe('Alice');
    });

    it('存在しないカラムは空を返す', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('[NonExistent]', ctx)).toBe('');
    });
  });

  describe('全角文字の正規化', () => {
    it('全角演算子をASCIIに変換して評価できる', () => {
      const ctx = createMinimalContext();
      // 全角数字は数値リテラルとして認識されないため、演算子だけASCIIに変換されても
      // tokenizerでスキップされ、結果として0になる（単項+の処理）
      expect(evaluateAppSheetExpression('１０＋２０', ctx)).toBe(0);
      expect(evaluateAppSheetExpression('10＋20', ctx)).toBe(30); // 全角 + は変換される
      expect(evaluateAppSheetExpression('5×3', ctx)).toBe(15); // 全角 × は * に変換
      expect(evaluateAppSheetExpression('10／2', ctx)).toBe(5); // 全角 ／ は / に変換
    });

    it('先頭の=を許容する（Excel形式）', () => {
      const ctx = createMinimalContext();
      expect(evaluateAppSheetExpression('=10 + 5', ctx)).toBe(15);
      expect(evaluateAppSheetExpression('=IF(TRUE, 1, 0)', ctx)).toBe(1);
    });
  });
});

describe('computeRowWithAppFormulas', () => {
  it('AppFormula列を計算できる', () => {
    const col1 = createColumn({ id: 'col1', name: 'Price', type: 'Number' });
    const col2 = createColumn({ id: 'col2', name: 'Quantity', type: 'Number' });
    const col3 = createColumn({
      id: 'col3',
      name: 'Total',
      type: 'Number',
      appSheet: { AppFormula: '[Price] * [Quantity]' },
    });

    const table: Table = {
      id: 'table1',
      name: 'Orders',
      columns: [col1, col2, col3],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = computeRowWithAppFormulas({
      tables: [table],
      sampleDataByTableId: {},
      table,
      row: { col1: 100, col2: 3 },
    });

    expect(result.col3).toBe(300);
  });

  it('複数のAppFormula列を計算できる', () => {
    const colA = createColumn({ id: 'a', name: 'A', type: 'Number' });
    const colB = createColumn({
      id: 'b',
      name: 'B',
      type: 'Number',
      appSheet: { AppFormula: '[A] * 2' },
    });
    const colC = createColumn({
      id: 'c',
      name: 'C',
      type: 'Text',
      appSheet: { AppFormula: '"Result: " & [B]' },
    });

    const table: Table = {
      id: 'table1',
      name: 'Test',
      columns: [colA, colB, colC],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = computeRowWithAppFormulas({
      tables: [table],
      sampleDataByTableId: {},
      table,
      row: { a: 5 },
    });

    expect(result.b).toBe(10);
    expect(result.c).toBe('Result: 10');
  });

  it('AppFormulaがない場合は元の行をそのまま返す', () => {
    const col = createColumn({ id: 'col1', name: 'Name' });
    const table: Table = {
      id: 'table1',
      name: 'Test',
      columns: [col],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const originalRow = { col1: 'Alice', extra: 'data' };
    const result = computeRowWithAppFormulas({
      tables: [table],
      sampleDataByTableId: {},
      table,
      row: originalRow,
    });

    expect(result.col1).toBe('Alice');
    expect(result.extra).toBe('data');
  });
});

describe('LOOKUP関数', () => {
  it('他のテーブルから値を検索できる', () => {
    const productsTable: Table = {
      id: 'products',
      name: 'Products',
      columns: [
        createColumn({ id: 'pid', name: 'ProductID', isKey: true }),
        createColumn({ id: 'pname', name: 'ProductName' }),
        createColumn({ id: 'pprice', name: 'Price', type: 'Number' }),
      ],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ordersTable: Table = {
      id: 'orders',
      name: 'Orders',
      columns: [
        createColumn({ id: 'oid', name: 'OrderID', isKey: true }),
        createColumn({ id: 'opid', name: 'ProductID' }),
      ],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sampleData = {
      products: [
        { pid: 'P001', pname: 'Apple', pprice: 100 },
        { pid: 'P002', pname: 'Banana', pprice: 80 },
      ],
      orders: [{ oid: 'O001', opid: 'P001' }],
    };

    const ctx = createMinimalContext({
      tables: [productsTable, ordersTable],
      sampleDataByTableId: sampleData,
      table: ordersTable,
      row: { oid: 'O001', opid: 'P001' },
    });

    expect(evaluateAppSheetExpression('LOOKUP([ProductID], "Products", "ProductID", "ProductName")', ctx)).toBe('Apple');
    expect(evaluateAppSheetExpression('LOOKUP([ProductID], "Products", "ProductID", "Price")', ctx)).toBe(100);
  });

  it('見つからない場合は空を返す', () => {
    const table: Table = {
      id: 'table1',
      name: 'Test',
      columns: [createColumn({ id: 'col1', name: 'Key', isKey: true })],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ctx = createMinimalContext({
      tables: [table],
      sampleDataByTableId: { table1: [{ col1: 'A' }] },
      table,
      row: { col1: 'B' },
    });

    expect(evaluateAppSheetExpression('LOOKUP("X", "Test", "Key", "Key")', ctx)).toBe('');
  });
});

describe('FILTER関数', () => {
  it('条件に合う行のキー値リストを返す', () => {
    const table: Table = {
      id: 'items',
      name: 'Items',
      columns: [
        createColumn({ id: 'id', name: 'ID', isKey: true }),
        createColumn({ id: 'category', name: 'Category' }),
        createColumn({ id: 'price', name: 'Price', type: 'Number' }),
      ],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sampleData = {
      items: [
        { id: 'I001', category: 'Fruit', price: 100 },
        { id: 'I002', category: 'Vegetable', price: 50 },
        { id: 'I003', category: 'Fruit', price: 80 },
      ],
    };

    const ctx = createMinimalContext({
      tables: [table],
      sampleDataByTableId: sampleData,
      table,
      row: {},
    });

    const result = evaluateAppSheetExpression('FILTER("Items", [Category] = "Fruit")', ctx);
    expect(result).toEqual(['I001', 'I003']);
  });
});

describe('SELECT関数', () => {
  it('条件に合う行の特定カラム値リストを返す', () => {
    const table: Table = {
      id: 'items',
      name: 'Items',
      columns: [
        createColumn({ id: 'id', name: 'ID', isKey: true }),
        createColumn({ id: 'name', name: 'Name' }),
        createColumn({ id: 'active', name: 'Active', type: 'Yes/No' }),
      ],
      position: { x: 0, y: 0 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const sampleData = {
      items: [
        { id: 'I001', name: 'Item A', active: true },
        { id: 'I002', name: 'Item B', active: false },
        { id: 'I003', name: 'Item C', active: true },
      ],
    };

    const ctx = createMinimalContext({
      tables: [table],
      sampleDataByTableId: sampleData,
      table,
      row: {},
    });

    const result = evaluateAppSheetExpression('SELECT(Items[Name], [Active] = TRUE)', ctx);
    expect(result).toEqual(['Item A', 'Item C']);
  });
});
