import { faker } from '@faker-js/faker/locale/ja';
import type { Table, Column, ColumnType } from '../types';

// カラムタイプに応じたサンプルデータを生成
function generateValueForColumn(column: Column, index: number): unknown {
  const { type, constraints } = column;
  
  switch (type) {
    case 'Text':
      // カラム名に応じて適切なデータを生成
      const nameLower = column.name.toLowerCase();
      if (nameLower.includes('name') || nameLower.includes('名前')) {
        return faker.person.fullName();
      }
      if (nameLower.includes('company') || nameLower.includes('会社')) {
        return faker.company.name();
      }
      if (nameLower.includes('address') || nameLower.includes('住所')) {
        return faker.location.streetAddress();
      }
      if (nameLower.includes('city') || nameLower.includes('市')) {
        return faker.location.city();
      }
      if (nameLower.includes('product') || nameLower.includes('商品')) {
        return faker.commerce.productName();
      }
      if (nameLower.includes('description') || nameLower.includes('説明') || nameLower.includes('備考')) {
        return faker.lorem.sentence();
      }
      if (nameLower.includes('title') || nameLower.includes('タイトル')) {
        return faker.lorem.words(3);
      }
      return faker.lorem.words(2);

    case 'Number':
      const minNum = constraints.minValue ?? 0;
      const maxNum = constraints.maxValue ?? 1000;
      return faker.number.int({ min: minNum, max: maxNum });

    case 'Decimal':
      const minDec = constraints.minValue ?? 0;
      const maxDec = constraints.maxValue ?? 10000;
      return faker.number.float({ min: minDec, max: maxDec, fractionDigits: 2 });

    case 'Date':
      return faker.date.recent({ days: 365 }).toLocaleDateString('ja-JP');

    case 'DateTime':
      return faker.date.recent({ days: 365 }).toLocaleString('ja-JP');

    case 'Time':
      return faker.date.recent().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    case 'Duration':
      const hours = faker.number.int({ min: 0, max: 8 });
      const minutes = faker.number.int({ min: 0, max: 59 });
      return `${hours}:${String(minutes).padStart(2, '0')}`;

    case 'Email':
      return faker.internet.email();

    case 'Phone':
      return faker.phone.number({ style: 'national' });

    case 'Url':
      return faker.internet.url();

    case 'Image':
      return faker.image.url({ width: 200, height: 200 });

    case 'File':
      return `file_${index + 1}.pdf`;

    case 'Enum':
      const options = constraints.enumValues || ['オプションA', 'オプションB', 'オプションC'];
      return faker.helpers.arrayElement(options);

    case 'EnumList':
      const listOptions = constraints.enumValues || ['タグ1', 'タグ2', 'タグ3'];
      const selectedCount = faker.number.int({ min: 1, max: Math.min(3, listOptions.length) });
      return faker.helpers.arrayElements(listOptions, selectedCount).join(', ');

    case 'Yes/No':
      return faker.datatype.boolean() ? 'Yes' : 'No';

    case 'Color':
      return faker.color.rgb();

    case 'LatLong':
      return `${faker.location.latitude()}, ${faker.location.longitude()}`;

    case 'Address':
      return faker.location.streetAddress(true);

    case 'Ref':
      // 参照先のサンプル値
      return `REF-${String(faker.number.int({ min: 1, max: 100 })).padStart(3, '0')}`;

    case 'ChangeCounter':
      return faker.number.int({ min: 1, max: 50 });

    case 'ChangeLocation':
      return faker.location.city();

    case 'ChangeTimestamp':
      return faker.date.recent({ days: 30 }).toLocaleString('ja-JP');

    case 'Progress':
      return faker.number.float({ min: 0, max: 1, fractionDigits: 2 });

    case 'UniqueID':
      return `ID-${String(index + 1).padStart(5, '0')}`;

    default:
      return `${type} ${index + 1}`;
  }
}

// テーブルのサンプルデータを生成
export function generateSampleData(table: Table, count: number = 5): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = [];
  
  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {};
    table.columns.forEach((column) => {
      row[column.id] = generateValueForColumn(column, i);
    });
    data.push(row);
  }
  
  return data;
}

// 1行のサンプルデータを生成
export function generateSampleRow(table: Table): Record<string, unknown> {
  return generateSampleData(table, 1)[0];
}

// カラムタイプの表示値を取得
export function formatValue(value: unknown, type: ColumnType): string {
  if (value === null || value === undefined) {
    return '-';
  }
  
  if (type === 'Progress' && typeof value === 'number') {
    return `${Math.round(value * 100)}%`;
  }
  
  if (type === 'Decimal' && typeof value === 'number') {
    return value.toLocaleString('ja-JP', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  
  if (type === 'Number' && typeof value === 'number') {
    return value.toLocaleString('ja-JP');
  }
  
  return String(value);
}
