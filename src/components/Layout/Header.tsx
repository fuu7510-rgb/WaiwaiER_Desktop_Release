import { useTranslation } from 'react-i18next';
import { useUIStore, useERStore, useProjectStore, useLicenseStore } from '../../stores';
import type { ViewMode } from '../../types';

export function Header() {
  const { t } = useTranslation();
  const releaseChannel = (import.meta.env.VITE_RELEASE_CHANNEL || 'alpha').toLowerCase();
  const channelLabel =
    releaseChannel === 'beta'
      ? t('app.channel.beta')
      : releaseChannel === 'stable'
        ? t('app.channel.stable')
        : t('app.channel.alpha');
  const {
    viewMode,
    setViewMode,
    isSidebarOpen,
    toggleSidebar,
    openSettings,
    openProjectDialog,
    openImportDialog,
    openExportDialog,
    settings,
    setLanguage,
  } = useUIStore();
  const {
    undo,
    redo,
    history,
    historyIndex,
    deletedSampleRowStack,
    undoDeleteSampleRow,
    isDirty,
    isSaving,
    saveError,
  } = useERStore();
  const { currentProjectId, projects } = useProjectStore();
  const { license, setShowLicenseDialog } = useLicenseStore();
  
  const currentProject = projects.find((p) => p.id === currentProjectId);
  const showNoProjectWarning = !currentProjectId;
  const canUndo = viewMode === 'simulator' ? deletedSampleRowStack.length > 0 : historyIndex > 0;
  const canRedo = viewMode === 'simulator' ? false : historyIndex < history.length - 1;
  const isPro = license.plan === 'pro';

  const handleUndo = () => {
    if (viewMode === 'simulator') {
      undoDeleteSampleRow();
      return;
    }
    undo();
  };

  const handleRedo = () => {
    if (viewMode === 'simulator') return;
    redo();
  };

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
        {/* Sidebar Toggle (Editor only) */}
        {viewMode === 'editor' && (
          <button
            type="button"
            onClick={toggleSidebar}
            className="p-1.5 text-zinc-500 hover:bg-zinc-100 rounded transition-colors"
            title={t(isSidebarOpen ? 'common.collapseSidebar' : 'common.expandSidebar')}
            aria-label={t(isSidebarOpen ? 'common.collapseSidebar' : 'common.expandSidebar')}
          >
            {isSidebarOpen ? (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M12.707 4.293a1 1 0 010 1.414L8.414 10l4.293 4.293a1 1 0 01-1.414 1.414l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M7.293 4.293a1 1 0 011.414 0l5 5a1 1 0 010 1.414l-5 5a1 1 0 11-1.414-1.414L11.586 10 7.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </button>
        )}

        <h1 className="text-sm font-semibold text-indigo-600 flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z" />
          </svg>
          <span className="text-[15px]">WaiwaiER</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 font-medium">
            {channelLabel}
          </span>
        </h1>
        
        <button
          type="button"
          onClick={openProjectDialog}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-zinc-200 bg-white text-xs font-medium text-zinc-700 hover:bg-zinc-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          title={t('project.projects')}
          aria-label={t('project.projects')}
        >
          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h10" />
          </svg>
          <span>{t('project.projects')}</span>
          <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {currentProject && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-100 rounded text-xs">
            <span className="font-medium text-zinc-700 max-w-32 truncate">{currentProject.name}</span>
            {currentProject.isEncrypted && <span className="text-xs">🔒</span>}
            <span
              className={
                `text-[10px] px-1.5 py-0.5 rounded-full font-medium ` +
                (saveError
                  ? 'bg-zinc-200 text-zinc-700'
                  : isSaving
                    ? 'bg-indigo-100 text-indigo-700'
                    : isDirty
                      ? 'bg-zinc-200 text-zinc-700'
                      : 'bg-indigo-100 text-indigo-700')
              }
              title={
                saveError
                  ? t('project.saveStatus.errorWithMessage', { message: saveError })
                  : isSaving
                    ? t('project.saveStatus.savingTitle')
                    : isDirty
                      ? t('project.saveStatus.unsavedTitle')
                      : t('project.saveStatus.savedTitle')
              }
            >
              {saveError
                ? t('project.saveStatus.error')
                : isSaving
                  ? t('project.saveStatus.saving')
                  : isDirty
                    ? t('project.saveStatus.unsaved')
                    : t('project.saveStatus.saved')}
            </span>
          </div>
        )}

        {showNoProjectWarning && (
          <button
            type="button"
            onClick={openProjectDialog}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-50/80 text-amber-700 text-[10px] whitespace-nowrap hover:bg-amber-50 transition-colors"
            title={t('project.noProjectAutosaveWarning')}
            aria-label={t('project.noProjectAutosaveWarning')}
          >
            <svg className="w-3 h-3 text-amber-500 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.72-1.36 3.486 0l6.518 11.59c.75 1.334-.213 2.99-1.743 2.99H3.482c-1.53 0-2.493-1.656-1.743-2.99l6.518-11.59zM11 14a1 1 0 10-2 0 1 1 0 002 0zm-1-2a1 1 0 01-1-1V8a1 1 0 012 0v3a1 1 0 01-1 1z"
                clipRule="evenodd"
              />
            </svg>
            <span>{t('project.noProjectAutosaveWarning')}</span>
          </button>
        )}
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
        {/* Import/Export */}
        <div className="flex border border-zinc-200 rounded">
          <button
            onClick={openImportDialog}
            className="p-1 text-zinc-500 hover:bg-zinc-50 transition-colors"
            title={t('common.import')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </button>
          <button
            onClick={openExportDialog}
            className="p-1 text-zinc-500 hover:bg-zinc-50 border-l border-zinc-200 transition-colors"
            title={t('common.export')}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>

        {/* Undo/Redo */}
        <div className="flex border border-zinc-200 rounded">
          <button
            onClick={handleUndo}
            disabled={!canUndo}
            className="p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title={`${t('common.undo')} (Ctrl+Z)`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </button>
          <button
            onClick={handleRedo}
            disabled={!canRedo}
            className="p-1 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed border-l border-zinc-200 transition-colors"
            title={`${t('common.redo')} (Ctrl+Y)`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
            </svg>
          </button>
        </div>

        {/* License Badge */}
        <button
          onClick={() => setShowLicenseDialog(true)}
          className={`px-2 py-0.5 text-xs rounded font-medium transition-colors ${
            isPro
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
          }`}
          title={t('license.title', 'ライセンス管理')}
        >
          {isPro ? 'Pro' : 'Free'}
        </button>

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
