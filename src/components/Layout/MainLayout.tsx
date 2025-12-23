import { useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useUIStore, useERStore } from '../../stores';
import { ProjectDialog } from '../Project/ProjectDialog';
import { SettingsDialog } from '../Settings/SettingsDialog';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { i18n } = useTranslation();
  const { settings, isProjectDialogOpen, closeProjectDialog, isSettingsOpen, closeSettings } = useUIStore();
  const { undo, redo } = useERStore();

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

  return (
    <div className="h-screen flex flex-col bg-gray-50">
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
    </div>
  );
}
