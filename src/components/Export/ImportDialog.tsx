import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from '../common';
import { useERStore } from '../../stores';
import { parseJSONDiagramText, readJSONDiagramTextFromFile } from './importJSONDiagram';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const { t } = useTranslation();
  const { importDiagram } = useERStore();

  const [jsonText, setJsonText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setErrorMessage(null);
      setIsImporting(false);
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
      importDiagram(diagram);
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
  }, [importDiagram, jsonText, onClose, t]);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('import.title')} size="xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] text-zinc-500">{t('import.pasteHint')}</p>
          <Button variant="secondary" size="sm" onClick={handleLoadFromFile}>
            {t('import.selectFile')}
          </Button>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.currentTarget.value)}
          aria-label={t('import.title')}
          placeholder={t('import.pastePlaceholder')}
          className="w-full h-72 rounded border border-zinc-200 bg-white p-2 font-mono text-[10px] text-zinc-700"
        />

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
            {isImporting ? t('common.loading') : t('common.import')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
