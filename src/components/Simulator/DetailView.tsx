import { useTranslation } from 'react-i18next';
import type { Table } from '../../types';

interface DetailViewProps {
  table: Table;
}

// サンプルデータ生成
function generateSampleRow(table: Table): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  table.columns.forEach((column) => {
    switch (column.type) {
      case 'Text':
        row[column.id] = `サンプル${column.name}`;
        break;
      case 'Number':
        row[column.id] = Math.floor(Math.random() * 1000);
        break;
      case 'Decimal':
        row[column.id] = (Math.random() * 1000).toFixed(2);
        break;
      case 'Date':
        row[column.id] = new Date().toLocaleDateString();
        break;
      case 'DateTime':
        row[column.id] = new Date().toLocaleString();
        break;
      case 'Email':
        row[column.id] = 'sample@example.com';
        break;
      case 'Phone':
        row[column.id] = '090-1234-5678';
        break;
      case 'Yes/No':
        row[column.id] = 'Yes';
        break;
      case 'UniqueID':
        row[column.id] = 'ID-00001';
        break;
      default:
        row[column.id] = `${column.type}サンプル`;
    }
  });
  return row;
}

export function DetailView({ table }: DetailViewProps) {
  const { t } = useTranslation();
  const sampleData = generateSampleRow(table);
  const labelColumn = table.columns.find((c) => c.isLabel) || table.columns[0];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-4 text-white"
          style={{ backgroundColor: table.color || '#6366f1' }}
        >
          <h2 className="text-xl font-bold">
            {String(sampleData[labelColumn?.id] ?? table.name)}
          </h2>
          <p className="text-sm opacity-75">{table.name}</p>
        </div>

        {/* Fields */}
        <div className="divide-y">
          {table.columns.map((column) => (
            <div key={column.id} className="px-6 py-4 flex items-start">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  {column.isKey && <span className="text-yellow-500 mr-1">🔑</span>}
                  {column.name}
                  {column.constraints.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                <p className="text-gray-900">{String(sampleData[column.id] ?? '-')}</p>
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                {t(`columnTypes.${column.type}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
