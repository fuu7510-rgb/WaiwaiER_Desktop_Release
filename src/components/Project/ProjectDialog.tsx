import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input } from '../common';
import { useProjectStore, useERStore } from '../../stores';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDialog({ isOpen, onClose }: ProjectDialogProps) {
  const { t } = useTranslation();
  const { projects, currentProjectId, createProject, openProject, deleteProject, canCreateProject, getProjectLimit, subscriptionPlan } = useProjectStore();
  const { clearDiagram } = useERStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!newProjectName.trim()) return;
    
    if (!canCreateProject()) {
      alert(t('project.limits.maxProjects', { max: getProjectLimit() }));
      return;
    }
    
    const projectId = createProject(newProjectName.trim(), isEncrypted);
    if (projectId) {
      clearDiagram();
      openProject(projectId);
      setNewProjectName('');
      setIsCreating(false);
      onClose();
    }
  }, [newProjectName, isEncrypted, canCreateProject, createProject, clearDiagram, openProject, onClose, t, getProjectLimit]);

  const handleOpen = useCallback((projectId: string) => {
    // TODO: 実際のプロジェクトデータを読み込む
    openProject(projectId);
    onClose();
  }, [openProject, onClose]);

  const handleDelete = useCallback((projectId: string) => {
    deleteProject(projectId);
    setDeleteConfirmId(null);
  }, [deleteProject]);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={t('project.projects')}
      size="lg"
    >
      <div className="space-y-3">
        {/* Create New Project */}
        {isCreating ? (
          <div className="bg-indigo-50 rounded-lg p-3 space-y-2.5">
            <Input
              label={t('project.projectName')}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="新しいプロジェクト名"
              autoFocus
            />
            
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="w-3.5 h-3.5 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500/20"
              />
              <span className="text-xs text-zinc-600 flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t('project.encryption.enable')}
              </span>
            </label>
            
            {isEncrypted && (
              <p className="text-[10px] text-amber-600 bg-amber-50/80 p-2 rounded flex items-start gap-1">
                <svg className="w-3 h-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {t('project.encryption.warning')}
              </p>
            )}
            
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreate}>{t('project.createProject')}</Button>
              <Button variant="secondary" size="sm" onClick={() => setIsCreating(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsCreating(true)} className="w-full" size="sm">
            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('project.newProject')}
          </Button>
        )}

        {/* Plan Info */}
        {subscriptionPlan === 'free' && (
          <div className="bg-zinc-50 rounded p-2.5 text-[10px] text-zinc-500">
            <p>Free版: <span className="font-medium text-zinc-700">{projects.length} / {getProjectLimit()}</span> プロジェクト</p>
            <button className="text-indigo-600 hover:underline mt-0.5">
              {t('project.limits.upgradeToPro')}
            </button>
          </div>
        )}

        {/* Project List */}
        <div className="divide-y divide-zinc-100 max-h-[320px] overflow-y-auto">
          {projects.length === 0 ? (
            <p className="text-center text-zinc-400 py-6 text-xs">{t('project.noProjects')}</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`py-2 flex items-center justify-between ${
                  currentProjectId === project.id ? 'bg-indigo-50 -mx-4 px-4' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-medium text-xs text-zinc-700">{project.name}</h3>
                    {project.isEncrypted && (
                      <svg className="w-3 h-3 text-zinc-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                    )}
                    {currentProjectId === project.id && (
                      <span className="text-[9px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-medium">
                        現在
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-zinc-400">
                    更新日: {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex gap-1.5">
                  {currentProjectId !== project.id && (
                    <Button size="sm" onClick={() => handleOpen(project.id)}>
                      開く
                    </Button>
                  )}
                  
                  {deleteConfirmId === project.id ? (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => handleDelete(project.id)}
                      >
                        確認
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        ×
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteConfirmId(project.id)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Dialog>
  );
}
