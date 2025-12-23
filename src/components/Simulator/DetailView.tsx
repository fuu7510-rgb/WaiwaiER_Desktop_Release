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
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-zinc-100 overflow-hidden">
        {/* Header */}
        <div 
          className="px-4 py-3 text-white"
          style={{ backgroundColor: table.color || '#6366f1' }}
        >
          <h2 className="text-sm font-medium">
            {String(sampleData[labelColumn?.id] ?? table.name)}
          </h2>
          <p className="text-[10px] opacity-75">{table.name}</p>
        </div>

        {/* Fields */}
        <div className="divide-y divide-zinc-100">
          {table.columns.map((column) => (
            <div key={column.id} className="px-4 py-2.5 flex items-start">
              <div className="flex-1">
                <label className="flex items-center text-[10px] font-medium text-zinc-400 mb-0.5">
                  {column.isKey && (
                    <svg className="w-2.5 h-2.5 text-amber-500 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  )}
                  {column.name}
                  {column.constraints.required && <span className="text-red-400 ml-0.5">*</span>}
                </label>
                <p className="text-xs text-zinc-700">{String(sampleData[column.id] ?? '-')}</p>
              </div>
              <span className="text-[9px] text-zinc-400 bg-zinc-50 px-1.5 py-0.5 rounded">
                {t(`columnTypes.${column.type}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
