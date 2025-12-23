import { useTranslation } from 'react-i18next';
import type { Table } from '../../types';

interface TableViewProps {
  table: Table;
}

// サンプルデータ生成（後でFaker.jsを使用）
function generateSampleData(table: Table, count: number = 5): Record<string, unknown>[] {
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
        case 'Decimal':
          row[column.id] = (Math.random() * 1000).toFixed(2);
          break;
        case 'Date':
          row[column.id] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleDateString();
          break;
        case 'DateTime':
          row[column.id] = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toLocaleString();
          break;
        case 'Email':
          row[column.id] = `user${i + 1}@example.com`;
          break;
        case 'Phone':
          row[column.id] = `090-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;
          break;
        case 'Yes/No':
          row[column.id] = Math.random() > 0.5 ? 'Yes' : 'No';
          break;
        case 'Enum':
          const options = column.constraints.enumValues || ['Option A', 'Option B', 'Option C'];
          row[column.id] = options[Math.floor(Math.random() * options.length)];
          break;
        case 'UniqueID':
          row[column.id] = `ID-${String(i + 1).padStart(5, '0')}`;
          break;
        default:
          row[column.id] = `${column.type} ${i + 1}`;
      }
    });
    data.push(row);
  }
  
  return data;
}

export function TableView({ table }: TableViewProps) {
  const { t } = useTranslation();
  const sampleData = generateSampleData(table);

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column.id}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  <div className="flex items-center gap-1">
                    {column.isKey && <span className="text-yellow-500">🔑</span>}
                    {column.name}
                    {column.constraints.required && <span className="text-red-500">*</span>}
                  </div>
                  <div className="text-gray-400 font-normal normal-case">
                    {t(`columnTypes.${column.type}`)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sampleData.length === 0 ? (
              <tr>
                <td
                  colSpan={table.columns.length}
                  className="px-4 py-8 text-center text-gray-500"
                >
                  {t('simulator.noData')}
                </td>
              </tr>
            ) : (
              sampleData.map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {table.columns.map((column) => (
                    <td key={column.id} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {String(row[column.id] ?? '')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
