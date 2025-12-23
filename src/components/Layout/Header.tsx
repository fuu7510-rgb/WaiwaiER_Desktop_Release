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
    <header className="h-11 bg-white border-b border-zinc-200 px-3 flex items-center justify-between shrink-0">
      {/* Left: Logo and Project */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-indigo-600 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
          </svg>
          <span>WaiwaiER</span>
        </h1>
        
        {currentProject && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 rounded text-xs">
            <span className="font-medium text-zinc-700 max-w-32 truncate">{currentProject.name}</span>
            {currentProject.isEncrypted && <span className="text-xs">🔒</span>}
          </div>
        )}
        
        <button
          onClick={openProjectDialog}
          className="text-xs text-zinc-500 hover:text-zinc-700 transition-colors"
        >
          {t('project.projects')}
        </button>
      </div>

      {/* Center: View Mode Toggle */}
      <div className="flex bg-zinc-100 rounded-md p-0.5">
        <button
          onClick={() => handleViewModeChange('editor')}
          className={`px-3 py-1 text-xs font-medium rounded transition-all ${
            viewMode === 'editor'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {t('editor.title')}
        </button>
        <button
          onClick={() => handleViewModeChange('simulator')}
          className={`px-3 py-1 text-xs font-medium rounded transition-all ${
            viewMode === 'simulator'
              ? 'bg-white text-indigo-600 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          {t('simulator.title')}
        </button>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Undo/Redo */}
        <div className="flex border border-zinc-200 rounded">
          <button
            onClick={undo}
            disabled={!canUndo}
            className="p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={`${t('common.undo')} (Ctrl+Z)`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className="p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed border-l border-zinc-200 transition-colors"
            title={`${t('common.redo')} (Ctrl+Y)`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* Language Toggle */}
        <button
          onClick={toggleLanguage}
          className="p-1.5 text-xs text-zinc-500 hover:bg-zinc-100 rounded transition-colors"
        >
          {settings.language === 'ja' ? 'JA' : 'EN'}
        </button>

        {/* Settings */}
        <button
          onClick={openSettings}
          className="p-1.5 text-zinc-500 hover:bg-zinc-100 rounded transition-colors"
          title={t('common.settings')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
