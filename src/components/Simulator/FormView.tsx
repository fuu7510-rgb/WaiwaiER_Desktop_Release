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
    case 'Percent':
    case 'Price':
    case 'Progress':
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

function renderFormField(column: Column, columnId: string) {
  const inputType = getInputType(column);
  const baseInputClass = "w-full px-2.5 py-1.5 text-xs border border-zinc-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400";

  if (column.type === 'Yes/No') {
    return (
      <select id={columnId} className={baseInputClass}>
        <option value="">選択してください</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }

  if (column.type === 'Enum') {
    const options = column.constraints.enumValues || [];
    return (
      <select id={columnId} className={baseInputClass}>
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
      <div className="space-y-1">
        {options.map((opt, index) => (
          <label key={opt} className="flex items-center gap-1.5 cursor-pointer">
            <input 
              type="checkbox" 
              id={`${columnId}-${index}`}
              className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600" 
            />
            <span className="text-xs text-zinc-600">{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (column.type === 'Image' || column.type === 'File') {
    return (
      <div className="border-2 border-dashed border-zinc-200 rounded p-4 text-center hover:border-indigo-300 transition-colors">
        <div className="text-zinc-400">
          <svg className="mx-auto h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <p className="mt-1 text-[10px]">クリックしてファイルを選択</p>
          <p className="text-[9px] text-zinc-300">またはドラッグ＆ドロップ</p>
        </div>
        <input id={columnId} type="file" className="hidden" title={column.name} />
      </div>
    );
  }

  if (column.type === 'Address' || column.constraints.maxLength && column.constraints.maxLength > 100) {
    return (
      <textarea 
        id={columnId}
        className={baseInputClass}
        rows={3}
        placeholder={column.description || `${column.name}を入力`}
      />
    );
  }

  return (
    <input
      id={columnId}
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
    <div className="max-w-xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm border border-zinc-100 overflow-hidden">
        {/* Header */}
        <div 
          className="px-4 py-3 text-white"
          style={{ backgroundColor: table.color || '#6366f1' }}
        >
          <h2 className="text-sm font-medium">{table.name}</h2>
          <p className="text-[10px] opacity-75">新規作成フォーム</p>
        </div>

        {/* Form */}
        <form className="p-4 space-y-3">
          {table.columns.map((column) => (
            <div key={column.id}>
              <label 
                htmlFor={column.id}
                className="flex items-center text-[10px] font-medium text-zinc-500 mb-1"
              >
                {column.isKey && (
                  <svg className="w-2.5 h-2.5 text-amber-500 mr-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                )}
                {column.name}
                {column.constraints.required && <span className="text-red-400 ml-0.5">*</span>}
                <span className="text-[9px] text-zinc-400 ml-1.5">
                  ({t(`columnTypes.${column.type}`)})
                </span>
              </label>
              {renderFormField(column, column.id)}
              {column.description && (
                <p className="mt-0.5 text-[9px] text-zinc-400">{column.description}</p>
              )}
            </div>
          ))}

          {/* Submit buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
            <Button type="button" variant="secondary" size="sm">
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" size="sm">
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
