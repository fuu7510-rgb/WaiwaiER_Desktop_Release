import type { Table } from '../../types';

interface DeckViewProps {
  table: Table;
}

// サンプルデータ生成
function generateSampleData(table: Table, count: number = 6): Record<string, unknown>[] {
  const data: Record<string, unknown>[] = [];
  
  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {};
    table.columns.forEach((column) => {
      switch (column.type) {
        case 'Text':
          row[column.id] = `サンプル ${column.name} ${i + 1}`;
          break;
        case 'Number':
          row[column.id] = Math.floor(Math.random() * 1000);
          break;
        default:
          row[column.id] = `${column.type} ${i + 1}`;
      }
    });
    data.push(row);
  }
  
  return data;
}

export function DeckView({ table }: DeckViewProps) {
  const sampleData = generateSampleData(table);
  const labelColumn = table.columns.find((c) => c.isLabel) || table.columns[0];
  const keyColumn = table.columns.find((c) => c.isKey) || table.columns[0];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sampleData.map((row, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow cursor-pointer"
        >
          {/* Header */}
          <div className="border-b pb-2 mb-3">
            <h3 className="font-semibold text-lg text-gray-900">
              {String(row[labelColumn?.id] ?? `Item ${index + 1}`)}
            </h3>
            <p className="text-xs text-gray-500">
              {String(row[keyColumn?.id] ?? '')}
            </p>
          </div>

          {/* Preview columns (first 3) */}
          <div className="space-y-2">
            {table.columns.slice(0, 3).map((column) => (
              <div key={column.id} className="flex justify-between text-sm">
                <span className="text-gray-500">{column.name}</span>
                <span className="text-gray-900 font-medium">
                  {String(row[column.id] ?? '-')}
                </span>
              </div>
            ))}
            {table.columns.length > 3 && (
              <p className="text-xs text-gray-400 text-center pt-2">
                他 {table.columns.length - 3} 項目...
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
