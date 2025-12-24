import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { save, open } from '@tauri-apps/plugin-dialog';
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { Dialog, Button } from '../common';
import { useERStore, useProjectStore, useLicenseStore } from '../../stores';
import { generateSampleData, exportPackage } from '../../lib';
import type { ERDiagram } from '../../types';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'json' | 'excel' | 'package';

export function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const { t } = useTranslation();
  const { exportDiagram, tables } = useERStore();
  const { currentProjectId, projects } = useProjectStore();
  const { limits } = useLicenseStore();
  const [format, setFormat] = useState<ExportFormat>('json');
  const [includeData, setIncludeData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [encryptPackage, setEncryptPackage] = useState(false);
  
  const currentProject = projects.find((p) => p.id === currentProjectId);

  const handleExportJSON = useCallback(async () => {
    try {
      setIsExporting(true);
      const diagram = exportDiagram();
      const jsonString = JSON.stringify(diagram, null, 2);
      
      const filePath = await save({
        defaultPath: `${currentProject?.name || 'diagram'}.json`,
        filters: [{ name: 'JSON', extensions: ['json'] }],
      });
      
      if (filePath) {
        await writeTextFile(filePath, jsonString);
        onClose();
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert(t('export.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [exportDiagram, currentProject, onClose, t]);

  const handleExportExcel = useCallback(async () => {
    try {
      setIsExporting(true);
      
      const filePath = await save({
        defaultPath: `${currentProject?.name || 'diagram'}.xlsx`,
        filters: [{ name: 'Excel', extensions: ['xlsx'] }],
      });
      
      if (!filePath) return;
      
      // サンプルデータを生成
      const sampleData: Record<string, Record<string, unknown>[]> = {};
      if (includeData) {
        tables.forEach((table) => {
          sampleData[table.id] = generateSampleData(table, 5);
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
  }, [tables, currentProject, includeData, onClose, t]);

  const handleExportPackage = useCallback(async () => {
    if (!currentProject) {
      alert('プロジェクトが選択されていません');
      return;
    }

    // 暗号化オプションでパスフレーズ確認
    if (encryptPackage) {
      if (!passphrase) {
        alert('パスフレーズを入力してください');
        return;
      }
      if (passphrase !== confirmPassphrase) {
        alert('パスフレーズが一致しません');
        return;
      }
      if (!limits.canEncrypt) {
        alert('暗号化機能はProプランで利用可能です');
        return;
      }
    }

    try {
      setIsExporting(true);
      const result = await exportPackage(
        currentProject,
        encryptPackage ? passphrase : undefined
      );

      if (result.success) {
        onClose();
        // 状態をリセット
        setPassphrase('');
        setConfirmPassphrase('');
        setEncryptPackage(false);
      } else {
        alert(result.error || 'エクスポートに失敗しました');
      }
    } catch (error) {
      console.error('Package export failed:', error);
      alert(t('export.exportError'));
    } finally {
      setIsExporting(false);
    }
  }, [currentProject, encryptPackage, passphrase, confirmPassphrase, limits, onClose, t]);

  const handleExport = useCallback(async () => {
    switch (format) {
      case 'json':
        await handleExportJSON();
        break;
      case 'excel':
        await handleExportExcel();
        break;
      case 'package':
        await handleExportPackage();
        break;
    }
  }, [format, handleExportJSON, handleExportExcel, handleExportPackage]);

  const formats: { id: ExportFormat; label: string; description: string }[] = [
    { id: 'json', label: t('export.formats.json'), description: 'ER図の構造をJSON形式で保存' },
    { id: 'excel', label: t('export.formats.excel'), description: 'Googleスプレッドシート連携用' },
    { id: 'package', label: t('export.formats.package'), description: 'データ移行用パッケージ' },
  ];

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('export.title')} size="md">
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
        {(format === 'excel' || format === 'package') && (
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

        {/* Package Encryption Option */}
        {format === 'package' && (
          <div className="space-y-3 border-t pt-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={encryptPackage}
                onChange={(e) => setEncryptPackage(e.target.checked)}
                disabled={!limits.canEncrypt}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 disabled:opacity-50"
              />
              <span className="text-xs text-zinc-600">
                パッケージを暗号化する
                {!limits.canEncrypt && (
                  <span className="text-[10px] text-amber-600 ml-1">(Proプラン限定)</span>
                )}
              </span>
            </label>

            {encryptPackage && (
              <div className="space-y-2 pl-5">
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">パスフレーズ</label>
                  <input
                    type="password"
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded border-zinc-200 focus:border-indigo-400 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-zinc-500 mb-1">パスフレーズ確認</label>
                  <input
                    type="password"
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded border-zinc-200 focus:border-indigo-400 focus:outline-none"
                    placeholder="••••••••"
                  />
                </div>
                {passphrase && confirmPassphrase && passphrase !== confirmPassphrase && (
                  <p className="text-[10px] text-red-500">パスフレーズが一致しません</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-zinc-50 rounded p-2.5 text-[10px] text-zinc-500">
          <p>テーブル数: <span className="font-medium text-zinc-700">{tables.length}</span></p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button size="sm" onClick={handleExport} disabled={isExporting}>
            {isExporting ? t('common.loading') : t('common.export')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

// JSONインポート機能
export async function importJSONDiagram(): Promise<ERDiagram | null> {
  try {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });
    
    if (!filePath) return null;
    
    const content = await readTextFile(filePath as string);
    const diagram = JSON.parse(content) as ERDiagram;
    
    // 基本的なバリデーション
    if (!diagram.tables || !Array.isArray(diagram.tables)) {
      throw new Error('Invalid diagram format: tables missing');
    }
    if (!diagram.relations || !Array.isArray(diagram.relations)) {
      diagram.relations = [];
    }

    if (!('memos' in diagram) || !Array.isArray((diagram as ERDiagram).memos)) {
      (diagram as ERDiagram).memos = [];
    }
    
    return diagram;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}
