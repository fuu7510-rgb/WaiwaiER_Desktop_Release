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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sampleData.map((row, index) => (
        <div
          key={index}
          className="bg-white rounded-lg shadow-sm border border-zinc-100 p-3 hover:shadow-md transition-shadow cursor-pointer"
        >
          {/* Header */}
          <div className="border-b border-zinc-100 pb-2 mb-2">
            <h3 className="font-medium text-xs text-zinc-700">
              {String(row[labelColumn?.id] ?? `Item ${index + 1}`)}
            </h3>
            <p className="text-[10px] text-zinc-400">
              {String(row[keyColumn?.id] ?? '')}
            </p>
          </div>

          {/* Preview columns (first 3) */}
          <div className="space-y-1">
            {table.columns.slice(0, 3).map((column) => (
              <div key={column.id} className="flex justify-between text-[10px]">
                <span className="text-zinc-400">{column.name}</span>
                <span className="text-zinc-700 font-medium">
                  {String(row[column.id] ?? '-')}
                </span>
              </div>
            ))}
            {table.columns.length > 3 && (
              <p className="text-[9px] text-zinc-400 text-center pt-1">
                他 {table.columns.length - 3} 項目...
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
