import { useTranslation } from 'react-i18next';
import { useUIStore, useERStore, useProjectStore } from '../../stores';
import type { ViewMode } from '../../types';

export function Header() {
  const { t } = useTranslation();
  const { viewMode, setViewMode, openSettings, openProjectDialog, settings, setLanguage } = useUIStore();
  const { undo, redo, history, historyIndex } = useERStore();
  const { currentProjectId, projects } = useProjectStore();
  
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  const toggleLanguage = () => {
    setLanguage(settings.language === 'ja' ? 'en' : 'ja');
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      {/* Left: Logo and Project */}
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-bold text-blue-600 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          {t('app.title')}
        </h1>
        
        {currentProject && (
          <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-md">
            <span className="text-sm font-medium text-gray-700">{currentProject.name}</span>
            {currentProject.isEncrypted && <span title="暗号化">🔒</span>}
          </div>
        )}
        
        <button
          onClick={openProjectDialog}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          {t('project.projects')}
        </button>
      </div>

      {/* Center: View Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => handleViewModeChange('editor')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'editor'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('editor.title')}
        </button>
        <button
          onClick={() => handleViewModeChange('simulator')}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            viewMode === 'simulator'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {t('simulator.title')}
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <div className="flex border rounded-md">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            title={`${t('common.undo')} (Ctrl+Z)`}
          >
            ↩️
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="px-2 py-1 text-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed border-l"
            title={`${t('common.redo')} (Ctrl+Y)`}
          >
            ↪️
          </button>
        </div>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded"
        >
          {settings.language === 'ja' ? '🇯🇵' : '🇺🇸'}
        </button>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-md"
          title={t('common.settings')}
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
