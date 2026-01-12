/**
 * SQL/Markdown エクスポートダイアログ
 * 
 * AI開発駆動用にER図をDDL（CREATE TABLE文）とMarkdownテーブルで出力するダイアログ。
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from '../common';
import { useERStore, useUIStore } from '../../stores';
import { filterTablesForExport } from '../../lib/exportFilter';
import {
  generateDDL,
  generateMarkdownTables,
  generateSchemaMarkdown,
  type DDLGeneratorOptions,
} from '../../lib/sqlExport';

interface SQLExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportTab = 'ddl' | 'markdown' | 'schema';
type SQLDialect = DDLGeneratorOptions['dialect'];
type ExportScope = 'all' | 'selected';

export function SQLExportDialog({ isOpen, onClose }: SQLExportDialogProps) {
  const { t } = useTranslation();
  const { tables, relations, ensureSampleData, selectedTableId, sampleDataByTableId } = useERStore();
  const { sqlExportSelectedTableIds, canvasSelectedTableIds } = useUIStore();
  
  const [activeTab, setActiveTab] = useState<ExportTab>('ddl');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  
  // エクスポート範囲
  const [exportScope, setExportScope] = useState<ExportScope>('all');
  
  // DDL オプション
  const [dialect, setDialect] = useState<SQLDialect>('generic');
  const [includeForeignKeys, setIncludeForeignKeys] = useState(true);
  const [includeComments, setIncludeComments] = useState(true);
  const [includeDropTable, setIncludeDropTable] = useState(false);
  
  // Markdown オプション
  const [maxRows, setMaxRows] = useState(5);
  
  // ダイアログが開いたとき、またはMarkdownタブに切り替えたときにサンプルデータを確保
  useEffect(() => {
    if (isOpen && activeTab === 'markdown') {
      ensureSampleData();
    }
  }, [isOpen, activeTab, ensureSampleData]);
  
  // 選択可能なテーブル（エクスポート対象フィルタ適用後）
  const allExportTables = useMemo(() => {
    return filterTablesForExport(tables, 'json'); // SQLエクスポートはJSON同様全テーブル対象
  }, [tables]);
  
  // 選択されたテーブル（複数選択対応）
  // 優先順位: sqlExportSelectedTableIds（明示的に渡された） > canvasSelectedTableIds（キャンバスで選択中） > selectedTableId（単一選択）
  const selectedTables = useMemo(() => {
    const targetIds = sqlExportSelectedTableIds.length > 0 
      ? sqlExportSelectedTableIds 
      : canvasSelectedTableIds.length > 0
        ? canvasSelectedTableIds
        : selectedTableId ? [selectedTableId] : [];
    
    if (targetIds.length === 0) return [];
    
    const idSet = new Set(targetIds);
    return allExportTables.filter((t) => idSet.has(t.id));
  }, [allExportTables, sqlExportSelectedTableIds, canvasSelectedTableIds, selectedTableId]);
  
  // エクスポート対象テーブル（範囲に応じて）
  const exportTables = useMemo(() => {
    if (exportScope === 'selected' && selectedTables.length > 0) {
      return selectedTables;
    }
    return allExportTables;
  }, [exportScope, selectedTables, allExportTables]);
  
  // 生成テキスト
  const generatedText = useMemo(() => {
    if (exportTables.length === 0) return '';
    
    switch (activeTab) {
      case 'ddl':
        return generateDDL(exportTables, relations, {
          dialect,
          includeForeignKeys,
          includeComments,
          includeDropTable,
        });
      case 'markdown': {
        return generateMarkdownTables(exportTables, sampleDataByTableId, { maxRows });
      }
      case 'schema':
        return generateSchemaMarkdown(exportTables);
      default:
        return '';
    }
  }, [activeTab, exportTables, relations, dialect, includeForeignKeys, includeComments, includeDropTable, maxRows, sampleDataByTableId]);
  
  const handleCopy = useCallback(async () => {
    if (!generatedText) return;
    
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(generatedText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = generatedText;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyStatus('failed');
    }
  }, [generatedText]);
  
  const handleClose = useCallback(() => {
    setCopyStatus('idle');
    onClose();
  }, [onClose]);
  
  const tabs: { id: ExportTab; label: string }[] = [
    { id: 'ddl', label: t('sqlExport.tabs.ddl') },
    { id: 'markdown', label: t('sqlExport.tabs.markdown') },
    { id: 'schema', label: t('sqlExport.tabs.schema') },
  ];
  
  const dialects: { id: SQLDialect; label: string }[] = [
    { id: 'generic', label: t('sqlExport.dialects.generic') },
    { id: 'mysql', label: 'MySQL' },
    { id: 'postgresql', label: 'PostgreSQL' },
    { id: 'sqlite', label: 'SQLite' },
  ];
  
  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={t('sqlExport.title')}
      size="xl"
    >
      <div className="space-y-3">
        {/* タブ */}
        <div className="flex gap-1 border-b" style={{ borderColor: 'var(--border)' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-indigo-500'
                  : 'hover:bg-zinc-100'
              }`}
              style={{
                color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* オプション */}
        <div
          className="rounded p-2.5 space-y-2"
          style={{ backgroundColor: 'var(--muted)' }}
        >
          {/* エクスポート範囲 */}
          <div className="flex items-center gap-4">
            <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('sqlExport.options.scope')}:
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="exportScope"
                value="all"
                checked={exportScope === 'all'}
                onChange={() => setExportScope('all')}
                className="w-3.5 h-3.5"
              />
              <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                {t('sqlExport.options.scopeAll')}
              </span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="exportScope"
                value="selected"
                checked={exportScope === 'selected'}
                onChange={() => setExportScope('selected')}
                disabled={selectedTables.length === 0}
                className="w-3.5 h-3.5"
              />
              <span
                className="text-xs"
                style={{
                  color: selectedTables.length > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                {t('sqlExport.options.scopeSelected')}
                {selectedTables.length > 0 && (
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {' '}({selectedTables.length === 1 
                      ? selectedTables[0].name 
                      : t('sqlExport.options.scopeSelectedCount', { count: selectedTables.length })})
                  </span>
                )}
              </span>
            </label>
          </div>
          
          {activeTab === 'ddl' && (
            <>
              {/* SQLダイアレクト選択 */}
              <div className="flex items-center gap-2">
                <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {t('sqlExport.options.dialect')}:
                </label>
                <select
                  value={dialect}
                  onChange={(e) => setDialect(e.target.value as SQLDialect)}
                  className="text-xs rounded border px-2 py-1"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    borderColor: 'var(--input-border)',
                    color: 'var(--text-primary)',
                  }}
                >
                  {dialects.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* チェックボックスオプション */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeForeignKeys}
                    onChange={(e) => setIncludeForeignKeys(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {t('sqlExport.options.includeForeignKeys')}
                  </span>
                </label>
                
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeComments}
                    onChange={(e) => setIncludeComments(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {t('sqlExport.options.includeComments')}
                  </span>
                </label>
                
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeDropTable}
                    onChange={(e) => setIncludeDropTable(e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  <span className="text-xs" style={{ color: 'var(--text-primary)' }}>
                    {t('sqlExport.options.includeDropTable')}
                  </span>
                </label>
              </div>
            </>
          )}
          
          {activeTab === 'markdown' && (
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {t('sqlExport.options.maxRows')}:
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxRows}
                onChange={(e) => setMaxRows(Math.max(1, Math.min(100, parseInt(e.target.value) || 5)))}
                className="w-16 text-xs rounded border px-2 py-1"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
          
          {activeTab === 'schema' && (
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              {t('sqlExport.schemaHint')}
            </p>
          )}
        </div>
        
        {/* プレビュー */}
        <textarea
          value={generatedText}
          readOnly
          aria-label={t('sqlExport.preview')}
          className="w-full h-64 rounded border p-2 font-mono text-[10px]"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => e.currentTarget.select()}
        />
        
        {/* 情報 */}
        <div
          className="rounded p-2.5 text-[10px]"
          style={{ backgroundColor: 'var(--muted)', color: 'var(--text-secondary)' }}
        >
          <p>
            {t('export.info.tablesCount')}:{' '}
            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
              {exportTables.length}
            </span>
          </p>
        </div>
        
        {/* アクション */}
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>
            {copyStatus === 'copied' && t('export.jsonText.copied')}
            {copyStatus === 'failed' && t('export.jsonText.copyFailed')}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              {t('common.close')}
            </Button>
            <Button size="sm" onClick={handleCopy}>
              {t('common.copy')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
