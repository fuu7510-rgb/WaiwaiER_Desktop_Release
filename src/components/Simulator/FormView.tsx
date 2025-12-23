import { useTranslation } from 'react-i18next';
import { Button } from '../common';
import type { Table, Column } from '../../types';

interface FormViewProps {
  table: Table;
}

function getInputType(column: Column): string {
  switch (column.type) {
    case 'Number':
    case 'Decimal':
      return 'number';
    case 'Date':
      return 'date';
    case 'DateTime':
      return 'datetime-local';
    case 'Time':
      return 'time';
    case 'Email':
      return 'email';
    case 'Phone':
      return 'tel';
    case 'Url':
      return 'url';
    case 'Color':
      return 'color';
    default:
      return 'text';
  }
}

function renderFormField(column: Column, _t: (key: string) => string) {
  const inputType = getInputType(column);
  const baseInputClass = "w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500";

  if (column.type === 'Yes/No') {
    return (
      <select className={baseInputClass}>
        <option value="">選択してください</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }

  if (column.type === 'Enum') {
    const options = column.constraints.enumValues || [];
    return (
      <select className={baseInputClass}>
        <option value="">選択してください</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    );
  }

  if (column.type === 'EnumList') {
    const options = column.constraints.enumValues || [];
    return (
      <div className="space-y-2">
        {options.map((opt) => (
          <label key={opt} className="flex items-center gap-2">
            <input type="checkbox" className="rounded border-gray-300" />
            <span className="text-sm text-gray-700">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (column.type === 'Image' || column.type === 'File') {
    return (
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
        <div className="text-gray-500">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-2 text-sm">クリックしてファイルを選択</p>
          <p className="text-xs text-gray-400">またはドラッグ＆ドロップ</p>
        </div>
        <input type="file" className="hidden" />
      </div>
    );
  }

  if (column.type === 'Address' || column.constraints.maxLength && column.constraints.maxLength > 100) {
    return (
      <textarea 
        className={baseInputClass}
        rows={3}
        placeholder={column.description || `${column.name}を入力`}
      />
    );
  }

  return (
    <input
      type={inputType}
      className={baseInputClass}
      placeholder={column.description || `${column.name}を入力`}
      min={column.constraints.minValue}
      max={column.constraints.maxValue}
      minLength={column.constraints.minLength}
      maxLength={column.constraints.maxLength}
      pattern={column.constraints.pattern}
      required={column.constraints.required}
    />
  );
}

export function FormView({ table }: FormViewProps) {
  const { t } = useTranslation();

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div 
          className="px-6 py-4 text-white"
          style={{ backgroundColor: table.color || '#6366f1' }}
        >
          <h2 className="text-xl font-bold">{table.name}</h2>
          <p className="text-sm opacity-75">新規作成フォーム</p>
        </div>

        {/* Form */}
        <form className="p-6 space-y-4">
          {table.columns.map((column) => (
            <div key={column.id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {column.isKey && <span className="text-yellow-500 mr-1">🔑</span>}
                {column.name}
                {column.constraints.required && <span className="text-red-500 ml-1">*</span>}
                <span className="text-xs text-gray-400 ml-2">
                  ({t(`columnTypes.${column.type}`)})
                </span>
              </label>
              {renderFormField(column, t)}
              {column.description && (
                <p className="mt-1 text-xs text-gray-500">{column.description}</p>
              )}
            </div>
          ))}

          {/* Submit buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary">
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
