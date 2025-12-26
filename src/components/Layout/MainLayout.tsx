import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore, useERStore, useLicenseStore, initializeLicenseStore, useProjectStore } from '../../stores';
import { ProjectDialog } from '../Project/ProjectDialog';
import { SettingsDialog } from '../Settings/SettingsDialog';
import { ExportDialog, ImportDialog } from '../Export';
import { LicenseDialog } from '../License';
import { AboutDialog } from '../About';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { i18n, t } = useTranslation();
  const releaseChannel = (import.meta.env.VITE_RELEASE_CHANNEL || 'alpha').toLowerCase();
  const showDestructiveBanner = releaseChannel !== 'stable';
  const channelLabel =
    releaseChannel === 'beta'
      ? t('app.channel.beta')
      : releaseChannel === 'stable'
        ? t('app.channel.stable')
        : t('app.channel.alpha');
  const { 
    viewMode,
    settings, 
    isProjectDialogOpen, 
    closeProjectDialog, 
    isSettingsOpen, 
    closeSettings,
    isImportDialogOpen,
    closeImportDialog,
    isExportDialogOpen,
    closeExportDialog,
    isAboutDialogOpen,
    closeAboutDialog,
  } = useUIStore();
  const { undo, redo, deletedSampleRowStack, undoDeleteSampleRow } = useERStore();
  const { showLicenseDialog, setShowLicenseDialog, warning } = useLicenseStore();
  const { loadProjectsFromDB, projects, currentProjectId } = useProjectStore();
  const { loadFromDB, currentProjectId: erCurrentProjectId, setCurrentProjectId, setCurrentProjectPassphrase } = useERStore();

  // ライセンス初期化
  useEffect(() => {
    initializeLicenseStore();
  }, []);

  // プロジェクト一覧をDBからロード（Tauri環境で永続化を優先）
  useEffect(() => {
    void loadProjectsFromDB();
  }, [loadProjectsFromDB]);

  // 起動時/切替時に、非暗号プロジェクトはER図を自動ロード
  useEffect(() => {
    if (!currentProjectId) return;
    if (erCurrentProjectId === currentProjectId) return;
    const project = projects.find((p) => p.id === currentProjectId);
    if (!project) return;
    if (project.isEncrypted) return;

    setCurrentProjectPassphrase(null);
    setCurrentProjectId(project.id);
    void loadFromDB(project.id, { passphrase: null });
  }, [currentProjectId, erCurrentProjectId, projects, loadFromDB, setCurrentProjectId, setCurrentProjectPassphrase]);

  // 言語変更の監視
  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language, i18n]);

  // キーボードショートカット
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const isTypingTarget =
      !!target &&
      (target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT');

    // Undo: Ctrl+Z
    if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
      if (isTypingTarget) return;
      e.preventDefault();

      if (viewMode === 'simulator') {
        if (deletedSampleRowStack.length > 0) undoDeleteSampleRow();
        return;
      }

      undo();
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
      if (isTypingTarget) return;
      if (viewMode === 'simulator') return;
      e.preventDefault();
      redo();
    }
  }, [deletedSampleRowStack.length, redo, undo, undoDeleteSampleRow, viewMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 min-h-screen">
      {/* ライセンス警告バナー */}
      {warning && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm text-yellow-800 flex items-center justify-between">
          <span>⚠️ {warning}</span>
          <button
            onClick={() => setShowLicenseDialog(true)}
            className="text-yellow-900 underline hover:no-underline"
          >
            {t('license.check')}
          </button>
        </div>
      )}

      {/* 破壊的変更の注意（常時表示：stable以外） */}
      {showDestructiveBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 text-[11px] text-amber-900">
          <span className="block truncate">{t('app.destructiveChangesNotice', { channel: channelLabel })}</span>
        </div>
      )}
      
      <Header />
      
      <div className="flex-1 flex overflow-hidden">
        {viewMode === 'editor' && <Sidebar />}
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
      <ImportDialog
        isOpen={isImportDialogOpen}
        onClose={closeImportDialog}
      />
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={closeExportDialog}
      />
      <LicenseDialog
        isOpen={showLicenseDialog}
        onClose={() => setShowLicenseDialog(false)}
      />

      <AboutDialog
        isOpen={isAboutDialogOpen}
        onClose={closeAboutDialog}
      />
    </div>
  );
}
