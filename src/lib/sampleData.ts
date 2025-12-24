import { faker } from '@faker-js/faker/locale/ja';
import type { Table, Column, ColumnType } from '../types';

const ALPHANUM_UPPER = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const PERSON_NAMES_JA = [
  '佐藤 太郎',
  '鈴木 花子',
  '高橋 健',
  '田中 彩',
  '伊藤 翔',
  '渡辺 美咲',
  '山本 大輔',
  '中村 優奈',
  '小林 亮',
  '加藤 愛',
  '吉田 恒一',
  '山田 さくら',
  '佐々木 悠斗',
  '斎藤 未来',
  '井上 直樹',
  '木村 玲奈',
  '林 誠',
  '清水 里奈',
  '松本 恒一',
  '阿部 みなみ',
];

const PRODUCT_NAMES_JA = [
  'ワイヤレスマウス',
  'USB-Cケーブル 1m',
  'ノートPCスタンド',
  'Bluetoothイヤホン',
  'ポータブルSSD 1TB',
  'モバイルバッテリー 10000mAh',
  '卓上LEDライト',
  'A4コピー用紙 500枚',
  'ボールペン（黒）',
  '付箋セット',
  'キーボード（テンキー付き）',
  'HDMIケーブル 2m',
  'Webカメラ 1080p',
  'ヘッドセット',
  '延長コード 3m',
  'クリアファイル 10枚',
  '折りたたみ傘',
  '保温マグカップ',
  '空気清浄機（小型）',
  'デスクチェア',
];

function pickFromList(list: string[], index: number): string {
  if (list.length === 0) return '';
  return list[index % list.length];
}

function getSecureRandomInt(maxExclusive: number): number {
  // maxExclusive は ALPHANUM_UPPER.length 程度の小さい値想定
  if (maxExclusive <= 0) return 0;
  try {
    const cryptoObj = globalThis.crypto;
    if (cryptoObj?.getRandomValues) {
      const buf = new Uint32Array(1);
      cryptoObj.getRandomValues(buf);
      return buf[0] % maxExclusive;
    }
  } catch {
    // ignore
  }
  return Math.floor(Math.random() * maxExclusive);
}

function randomUpperAlphaNum(length: number): string {
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHANUM_UPPER[getSecureRandomInt(ALPHANUM_UPPER.length)];
  }
  return out;
}

function isIdLikeColumnName(columnName: string): boolean {
  const raw = String(columnName ?? '');
  const upper = raw.toUpperCase();
  if (upper.includes('ＩＤ')) return true;
  // 例: ID / 社員ID / product_id / user-id / user id
  if (/(^|[^A-Z0-9])ID($|[^A-Z0-9])/.test(upper)) return true;
  if (/ID$/.test(upper)) return true;
  if (/_ID$/.test(upper)) return true;
  return false;
}

function isNameLikeColumnName(columnName: string): boolean {
  const raw = String(columnName ?? '');
  return raw.includes('名前') || raw.endsWith('名') || raw.toLowerCase().includes('name');
}

type SampleDataContext = {
  uniqueByColumnId: Map<string, Set<string>>;
  nextUniqueId: (columnId: string) => string;
};

function createSampleDataContext(): SampleDataContext {
  const uniqueByColumnId = new Map<string, Set<string>>();
  const nextUniqueId = (columnId: string): string => {
    const used = uniqueByColumnId.get(columnId) ?? new Set<string>();
    if (!uniqueByColumnId.has(columnId)) uniqueByColumnId.set(columnId, used);

    // 8桁英数字（大文字）
    let candidate = '';
    for (let guard = 0; guard < 10000; guard++) {
      candidate = randomUpperAlphaNum(8);
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    // ほぼ起きないが、念のためフォールバック
    candidate = `${randomUpperAlphaNum(6)}${String(used.size).padStart(2, '0')}`.slice(0, 8);
    used.add(candidate);
    return candidate;
  };
  return { uniqueByColumnId, nextUniqueId };
}

// カラムタイプに応じたサンプルデータを生成
function generateValueForColumn(column: Column, index: number, ctx: SampleDataContext): unknown {
  const { type, constraints } = column;
  
  switch (type) {
    case 'Text': {
      // カラム名に応じて適切なデータを生成
      if (isIdLikeColumnName(column.name)) {
        return ctx.nextUniqueId(column.id);
      }

      const nameLower = column.name.toLowerCase();
      const hasMei = column.name.includes('名前') || column.name.endsWith('名');
      if ((hasMei && (nameLower.includes('employee') || column.name.includes('社員') || column.name.includes('従業員') || column.name.includes('担当'))) || column.name.includes('社員名')) {
        return pickFromList(PERSON_NAMES_JA, index);
      }
      if (hasMei && (nameLower.includes('product') || column.name.includes('商品'))) {
        return pickFromList(PRODUCT_NAMES_JA, index);
      }
      if (isNameLikeColumnName(column.name)) {
        // 「〇〇名」など、特定できない場合は人名寄りで埋める
        return pickFromList(PERSON_NAMES_JA, index) || faker.person.fullName();
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
        return pickFromList(PRODUCT_NAMES_JA, index) || faker.commerce.productName();
      }
      if (nameLower.includes('description') || nameLower.includes('説明') || nameLower.includes('備考')) {
        return faker.lorem.sentence();
      }
      if (nameLower.includes('title') || nameLower.includes('タイトル')) {
        return faker.lorem.words(3);
      }
      return faker.lorem.words(2);
    }

    case 'Number': {
      const minNum = constraints.minValue ?? 0;
      const maxNum = constraints.maxValue ?? 1000;
      return faker.number.int({ min: minNum, max: maxNum });
    }

    case 'Decimal': {
      const minDec = constraints.minValue ?? 0;
      const maxDec = constraints.maxValue ?? 10000;
      return faker.number.float({ min: minDec, max: maxDec, fractionDigits: 2 });
    }

    case 'Date':
      return faker.date.recent({ days: 365 }).toLocaleDateString('ja-JP');

    case 'DateTime':
      return faker.date.recent({ days: 365 }).toLocaleString('ja-JP');

    case 'Time':
      return faker.date.recent().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });

    case 'Duration': {
      const hours = faker.number.int({ min: 0, max: 8 });
      const minutes = faker.number.int({ min: 0, max: 59 });
      return `${hours}:${String(minutes).padStart(2, '0')}`;
    }

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

    case 'Enum': {
      const options = constraints.enumValues || ['オプションA', 'オプションB', 'オプションC'];
      return faker.helpers.arrayElement(options);
    }

    case 'EnumList': {
      const listOptions = constraints.enumValues || ['タグ1', 'タグ2', 'タグ3'];
      const selectedCount = faker.number.int({ min: 1, max: Math.min(3, listOptions.length) });
      return faker.helpers.arrayElements(listOptions, selectedCount).join(', ');
    }

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
      return ctx.nextUniqueId(column.id);

    default:
      return `${type} ${index + 1}`;
  }
}

// テーブルのサンプルデータを生成
export function generateSampleData(table: Table, count: number = 5): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = [];

  const ctx = createSampleDataContext();
  
  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {};
    table.columns.forEach((column) => {
      row[column.id] = generateValueForColumn(column, i, ctx);
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
