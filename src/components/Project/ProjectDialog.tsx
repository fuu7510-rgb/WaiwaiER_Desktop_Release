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
      <div className="space-y-4">
        {/* Create New Project */}
        {isCreating ? (
          <div className="bg-blue-50 rounded-lg p-4 space-y-3">
            <Input
              label={t('project.projectName')}
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="新しいプロジェクト名"
              autoFocus
            />
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isEncrypted}
                onChange={(e) => setIsEncrypted(e.target.checked)}
                className="rounded border-gray-300"
              />
              <span className="text-sm">🔒 {t('project.encryption.enable')}</span>
            </label>
            
            {isEncrypted && (
              <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded">
                ⚠️ {t('project.encryption.warning')}
              </p>
            )}
            
            <div className="flex gap-2">
              <Button onClick={handleCreate}>{t('project.createProject')}</Button>
              <Button variant="secondary" onClick={() => setIsCreating(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setIsCreating(true)} className="w-full">
            + {t('project.newProject')}
          </Button>
        )}

        {/* Plan Info */}
        {subscriptionPlan === 'free' && (
          <div className="bg-gray-100 rounded-lg p-3 text-sm text-gray-600">
            <p>Free版: {projects.length} / {getProjectLimit()} プロジェクト</p>
            <button className="text-blue-600 hover:underline text-xs mt-1">
              {t('project.limits.upgradeToPro')}
            </button>
          </div>
        )}

        {/* Project List */}
        <div className="divide-y max-h-[400px] overflow-y-auto">
          {projects.length === 0 ? (
            <p className="text-center text-gray-500 py-8">{t('project.noProjects')}</p>
          ) : (
            projects.map((project) => (
              <div
                key={project.id}
                className={`py-3 flex items-center justify-between ${
                  currentProjectId === project.id ? 'bg-blue-50 -mx-4 px-4' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{project.name}</h3>
                    {project.isEncrypted && <span>🔒</span>}
                    {currentProjectId === project.id && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                        現在開いている
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    更新日: {new Date(project.updatedAt).toLocaleString()}
                  </p>
                </div>
                
                <div className="flex gap-2">
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
                      🗑️
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
