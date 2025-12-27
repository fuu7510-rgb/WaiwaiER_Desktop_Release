import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Button } from '../common';
import { useERStore, useProjectStore, useUIStore } from '../../stores';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'json' | 'excel' | 'package';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { t } = useTranslation();
  const { exportDiagram, tables, ensureSampleData } = useERStore();
  const { currentProjectId, projects } = useProjectStore();
  const { openProjectDialog } = useUIStore();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeData, setIncludeData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [jsonExportText, setJsonExportText] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const primaryButtonLabel = format === 'package' ? 'プロジェクト管理に移動' : t('common.export');
  
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleClose = useCallback(() => {
    setJsonExportText(null);
    setCopyStatus('idle');
    onClose();
  }, [onClose]);

  const handleExportJSON = useCallback(async () => {
    try {
      setIsExporting(true);
      const diagram = exportDiagram();
      const jsonString = JSON.stringify(diagram, null, 2);

      // JSON形式は「ファイル保存」ではなく、コピー用テキストとして表示する
      setJsonExportText(jsonString);
      setCopyStatus('idle');
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('export.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [exportDiagram, t]);

  const handleCopyJSON = useCallback(async () => {
    if (!jsonExportText) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonExportText);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = jsonExportText;
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
    } catch (error) {
      console.error('Copy failed:', error);
      setCopyStatus('failed');
    }
  }, [jsonExportText]);

  const handleExportExcel = useCallback(async () => {
    try {
      setIsExporting(true);
      
      const filePath = await save({
        defaultPath: `${currentProject?.name || 'diagram'}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      
      if (!filePath) return;

      if (includeData) {
        // まずはストア上のサンプルデータを確実に用意する
        ensureSampleData();
      }

      const latestSampleDataByTableId = includeData
        ? useERStore.getState().sampleDataByTableId
        : {};
      
      // サンプルデータを生成
      const sampleData: Record<string, Record<string, unknown>[]> = {};
      if (includeData) {
        tables.forEach((table) => {
          sampleData[table.id] = (latestSampleDataByTableId[table.id] ?? []).slice(0, 5);
        });
      }
      
      // Rust側のコマンドを呼び出し
      await invoke('export_excel', {
        request: {
          tables: tables,
          sampleData: sampleData,
          includeData: includeData,
        },
        filePath: filePath,
      });
      
      onClose();
    } catch (error) {
      console.error('Excel export failed:', error);
      alert(t('export.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [tables, currentProject, includeData, onClose, t, ensureSampleData]);

  const handleExport = useCallback(async () => {
    switch (format) {
      case 'json':
        await handleExportJSON();
        break;
      case 'excel':
        await handleExportExcel();
        break;
      case 'package':
        // .waiwai パッケージのエクスポートは「プロジェクト管理」画面から行う
        handleClose();
        openProjectDialog();
        break;
    }
  }, [format, handleExportJSON, handleExportExcel, handleClose, openProjectDialog]);

  const formats: { id: ExportFormat; label: string; description: string }[] = [
    { id: 'json', label: t('export.formats.json'), description: t('export.descriptions.json') },
    { id: 'excel', label: t('export.formats.excel'), description: t('export.descriptions.excel') },
    { id: 'package', label: t('export.formats.package'), description: t('export.descriptions.package') },
  ];

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={jsonExportText ? t('menu.exportJson') : t('export.title')}
      size={jsonExportText ? 'xl' : 'md'}
    >
      {jsonExportText ? (
        <div className="space-y-3">
          <p className="text-[10px] text-zinc-500">{t('export.jsonText.hint')}</p>

          <textarea
            value={jsonExportText}
            readOnly
            aria-label={t('menu.exportJson')}
            className="w-full h-72 rounded border border-zinc-200 bg-white p-2 font-mono text-[10px] text-zinc-700"
            onFocus={(e) => e.currentTarget.select()}
          />

          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] text-zinc-500">
              {copyStatus === 'copied' && t('export.jsonText.copied')}
              {copyStatus === 'failed' && t('export.jsonText.copyFailed')}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={handleClose}>
                {t('common.close')}
              </Button>
              <Button size="sm" onClick={handleCopyJSON}>
                {t('common.copy')}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Export Format Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-2">
              {t('export.format')}
            </label>
            <div className="space-y-2">
              {formats.map((f) => (
                <label
                  key={f.id}
                  className={`flex items-start gap-3 p-2.5 border rounded-lg cursor-pointer transition-colors ${
                    format === f.id
                      ? 'border-indigo-400 bg-indigo-50/50'
                      : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="format"
                    value={f.id}
                    checked={format === f.id}
                    onChange={(e) => setFormat(e.target.value as ExportFormat)}
                    className="mt-0.5"
                  />
                  <div>
                    <p className="text-xs font-medium text-zinc-700">{f.label}</p>
                    <p className="text-[10px] text-zinc-400">{f.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Options */}
          {format === 'excel' && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeData}
                  onChange={(e) => setIncludeData(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600"
                />
                <span className="text-xs text-zinc-600">{t('export.includeData')}</span>
              </label>
            </div>
          )}

          {/* Info */}
          <div className="bg-zinc-50 rounded p-2.5 text-[10px] text-zinc-500">
            <p>
              {t('export.info.tablesCount')}:{' '}
              <span className="font-medium text-zinc-700">{tables.length}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleExport} disabled={isExporting}>
              {isExporting ? t('common.loading') : primaryButtonLabel}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
