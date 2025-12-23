import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore, useERStore, useLicenseStore, initializeLicenseStore } from '../../stores';
import { ProjectDialog } from '../Project/ProjectDialog';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { ExportDialog } from '../Export';
import { LicenseDialog } from '../License';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { i18n } = useTranslation();
  const { 
    settings, 
    isProjectDialogOpen, 
    closeProjectDialog, 
    isSettingsOpen, 
    closeSettings,
    isExportDialogOpen,
    closeExportDialog
  } = useUIStore();
  const { undo, redo } = useERStore();
  const { showLicenseDialog, setShowLicenseDialog, warning } = useLicenseStore();

  // ライセンス初期化
  useEffect(() => {
    initializeLicenseStore();
  }, []);

  // 言語変更の監視
  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Undo: Ctrl+Z
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
      e.preventDefault();
      redo();
    }
  }, [undo, redo]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // デバッグ: コンポーネントがレンダリングされているか確認
  console.log('MainLayout rendering');

  return (
    <div className="h-screen flex flex-col bg-gray-50" style={{ backgroundColor: '#f0f0f0', minHeight: '100vh' }}>
      {/* ライセンス警告バナー */}
      {warning && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm text-yellow-800 flex items-center justify-between">
          <span>⚠️ {warning}</span>
          <button
            onClick={() => setShowLicenseDialog(true)}
            className="text-yellow-900 underline hover:no-underline"
          >
            ライセンスを確認
          </button>
        </div>
      )}
      
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>

      {/* Dialogs */}
      <ProjectDialog
        isOpen={isProjectDialogOpen}
        onClose={closeProjectDialog}
      />
      <SettingsDialog
        isOpen={isSettingsOpen}
        onClose={closeSettings}
      />
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={closeExportDialog}
      />
      <LicenseDialog
        isOpen={showLicenseDialog}
        onClose={() => setShowLicenseDialog(false)}
      />
    </div>
  );
}
