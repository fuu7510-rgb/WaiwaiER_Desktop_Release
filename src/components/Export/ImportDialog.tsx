import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from '../common';
import { useERStore } from '../../stores';
import { parseJSONDiagramText, readJSONDiagramTextFromFile } from './importJSONDiagram';

type ImportMode = 'overwrite' | 'append';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const { t } = useTranslation();
  const { importDiagram, mergeDiagram } = useERStore();

  const [jsonText, setJsonText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('overwrite');

  useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setErrorMessage(null);
      setIsImporting(false);
      setImportMode('overwrite');
    }
  }, [isOpen]);

  const handleLoadFromFile = useCallback(async () => {
    try {
      setErrorMessage(null);
      const content = await readJSONDiagramTextFromFile();
      if (content == null) return;
      setJsonText(content);
    } catch (error) {
      console.error('Load JSON from file failed:', error);
      setErrorMessage(t('import.importError'));
    }
  }, [t]);

  const handleImport = useCallback(async () => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setErrorMessage(t('import.pasteEmpty'));
      return;
    }

    try {
      setIsImporting(true);
      setErrorMessage(null);

      const diagram = parseJSONDiagramText(trimmed);
      if (importMode === 'overwrite') {
        importDiagram(diagram);
      } else {
        mergeDiagram(diagram);
      }
      onClose();
    } catch (error) {
      console.error('Import from pasted JSON failed:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : t('import.importError');
      setErrorMessage(message);
    } finally {
      setIsImporting(false);
    }
  }, [importDiagram, mergeDiagram, jsonText, onClose, t, importMode]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('import.title')} size="xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('import.pasteHint')}</p>
          <Button variant="secondary" size="sm" onClick={handleLoadFromFile}>
            {t('import.selectFile')}
          </Button>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.currentTarget.value)}
          aria-label={t('import.title')}
          placeholder={t('import.pastePlaceholder')}
          className="w-full h-60 rounded border p-2 font-mono text-[10px]"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text-primary)',
          }}
        />

        {/* インポートモード選択 */}
        <div className="p-3 rounded-md border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('import.modeLabel')}</p>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="overwrite"
                checked={importMode === 'overwrite'}
                onChange={() => setImportMode('overwrite')}
                className="w-3 h-3"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('import.modeOverwrite')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="w-3 h-3"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('import.modeAppend')}</span>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-amber-50/80 border border-amber-200 rounded p-2 text-[10px] text-amber-900">
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleImport} disabled={isImporting}>
            {isImporting
              ? t('common.loading')
              : importMode === 'overwrite'
                ? t('import.importOverwrite')
                : t('import.importAppend')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
