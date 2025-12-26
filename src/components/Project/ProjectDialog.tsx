import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button, Input } from '../common';
import { useProjectStore, useERStore, useLicenseStore } from '../../stores';
import { hashPassphrase, verifyPassphrase } from '../../lib/crypto';
import { exportPackage, importPackage, importPackageFromFile } from '../../lib';

interface ProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectDialog({ isOpen, onClose }: ProjectDialogProps) {
  const { t } = useTranslation();
  const { projects, currentProjectId, createProject, openProject, deleteProject, canCreateProject, getProjectLimit, subscriptionPlan, loadProjectsFromDB } = useProjectStore();
  const { clearDiagram, loadFromDB, setCurrentProjectId, setCurrentProjectPassphrase, saveToDB, isDirty } = useERStore();
  const { limits } = useLicenseStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [passphraseError, setPassphraseError] = useState<string | null>(null);

  const [unlockProjectId, setUnlockProjectId] = useState<string | null>(null);
  const [unlockPassphrase, setUnlockPassphrase] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState(false);
  const [exportingProjectId, setExportingProjectId] = useState<string | null>(null);

  const generateSaltBase64 = () => {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const handleCreate = useCallback(async () => {
    if (!newProjectName.trim()) return;
    
    if (!canCreateProject()) {
      alert(t('project.limits.maxProjects', { max: getProjectLimit() }));
      return;
    }

    setPassphraseError(null);

    let passphraseSalt: string | undefined;
    let passphraseHash: string | undefined;
    let runtimePassphrase: string | null = null;

    if (isEncrypted) {
      if (!limits.canEncrypt) {
        alert('暗号化機能はProプランで利用可能です');
        return;
      }
      if (!passphrase) {
        setPassphraseError('パスフレーズを入力してください');
        return;
      }
      if (passphrase !== confirmPassphrase) {
        setPassphraseError('パスフレーズが一致しません');
        return;
      }

      passphraseSalt = generateSaltBase64();
      passphraseHash = await hashPassphrase(passphrase, passphraseSalt);
      runtimePassphrase = passphrase;
    }
    
    const projectId = createProject(newProjectName.trim(), {
      isEncrypted,
      passphraseSalt,
      passphraseHash,
    });
    if (projectId) {
      // 先にER側の状態をセットしてから初期データを保存
      setCurrentProjectId(projectId);
      setCurrentProjectPassphrase(runtimePassphrase);
      clearDiagram();
      await saveToDB();

      openProject(projectId);
      setNewProjectName('');
      setIsEncrypted(false);
      setPassphrase('');
      setConfirmPassphrase('');
      setIsCreating(false);
      onClose();
    }
  }, [newProjectName, isEncrypted, passphrase, confirmPassphrase, limits.canEncrypt, canCreateProject, createProject, clearDiagram, openProject, onClose, t, getProjectLimit, setCurrentProjectId, setCurrentProjectPassphrase, saveToDB]);

  const handleOpen = useCallback(async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    // プロジェクト切替前に、現在の編集中データを確実に保存
    if (currentProjectId && currentProjectId !== projectId && isDirty) {
      await saveToDB();
    }

    if (project.isEncrypted) {
      // 解除フローへ
      setUnlockProjectId(projectId);
      setUnlockPassphrase('');
      setUnlockError(null);
      return;
    }

    setCurrentProjectId(projectId);
    setCurrentProjectPassphrase(null);
    await loadFromDB(projectId, { passphrase: null });
    openProject(projectId);
    onClose();
  }, [projects, loadFromDB, openProject, onClose, setCurrentProjectId, setCurrentProjectPassphrase, currentProjectId, isDirty, saveToDB]);

  const handleUnlockAndOpen = useCallback(async () => {
    if (!unlockProjectId) return;
    const project = projects.find((p) => p.id === unlockProjectId);
    if (!project) return;

    setUnlockError(null);
    if (!unlockPassphrase) {
      setUnlockError('パスフレーズを入力してください');
      return;
    }
    if (!project.passphraseSalt || !project.passphraseHash) {
      setUnlockError('このプロジェクトの暗号化情報が不完全です');
      return;
    }

    const ok = await verifyPassphrase(unlockPassphrase, project.passphraseSalt, project.passphraseHash);
    if (!ok) {
      setUnlockError('パスフレーズが正しくありません');
      return;
    }

    // プロジェクト切替前に、現在の編集中データを確実に保存
    if (currentProjectId && currentProjectId !== project.id && isDirty) {
      await saveToDB();
    }

    setCurrentProjectId(project.id);
    setCurrentProjectPassphrase(unlockPassphrase);

    try {
      await loadFromDB(project.id, { passphrase: unlockPassphrase });
    } catch (e) {
      console.error(e);
      setUnlockError('復号に失敗しました');
      return;
    }

    openProject(project.id);
    setUnlockProjectId(null);
    setUnlockPassphrase('');
    setUnlockError(null);
    onClose();
  }, [unlockProjectId, unlockPassphrase, projects, loadFromDB, openProject, onClose, setCurrentProjectId, setCurrentProjectPassphrase, currentProjectId, isDirty, saveToDB]);

  const handleDelete = useCallback((projectId: string) => {
    deleteProject(projectId);
    setDeleteConfirmId(null);
  }, [deleteProject]);

  const handleImportProject = useCallback(async () => {
    try {
      setIsImporting(true);

      const result = await importPackage();

      if (result.success) {
        await loadProjectsFromDB();
        alert(t('import.importSuccess'));
        return;
      }

      if (result.requiresPassphrase && result.filePath) {
        const pw = window.prompt(t('project.encryption.passphrase'));
        if (pw == null) return;

        const retry = await importPackageFromFile(result.filePath, pw);
        if (retry.success) {
          await loadProjectsFromDB();
          alert(t('import.importSuccess'));
          return;
        }

        alert(retry.error || t('import.importError'));
        return;
      }

      if (result.error && result.error !== 'キャンセルされました') {
        alert(result.error);
      }
    } catch (e) {
      console.error(e);
      alert(t('import.importError'));
    } finally {
      setIsImporting(false);
    }
  }, [loadProjectsFromDB, t]);

  const handleExportProject = useCallback(async (projectId: string) => {
    const targetProject = projects.find((p) => p.id === projectId);
    if (!targetProject) return;

    try {
      setExportingProjectId(projectId);

      // 念のため、編集中の内容を保存してから書き出す
      if (currentProjectId === targetProject.id && isDirty) {
        await saveToDB();
      }

      let passphrase: string | undefined;
      if (targetProject.isEncrypted) {
        const pw = window.prompt(t('project.encryption.passphrase'));
        if (pw == null) return;
        if (!pw) {
          alert(t('export.errors.enterPassphrase'));
          return;
        }
        passphrase = pw;
      }

      const result = await exportPackage(targetProject, passphrase);
      if (!result.success) {
        alert(result.error || t('export.errors.failed'));
      }
    } catch (e) {
      console.error(e);
      alert(t('export.exportError'));
    } finally {
      setExportingProjectId(null);
    }
  }, [projects, currentProjectId, isDirty, saveToDB, t]);

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
              <div className="space-y-2">
                <Input
                  type="password"
                  label={t('project.encryption.passphrase')}
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder={t('project.encryption.passphrase')}
                />
                <Input
                  type="password"
                  label={t('project.encryption.passphraseConfirm')}
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder={t('project.encryption.passphraseConfirm')}
                  error={passphraseError || undefined}
                />
              </div>
            )}
            
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

        {/* Import */}
        <div className="flex">
          <Button
            variant="secondary"
            size="sm"
            className="w-full"
            onClick={handleImportProject}
            disabled={isImporting}
          >
            {isImporting ? t('common.loading') : t('common.import')}
          </Button>
        </div>

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
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleExportProject(project.id)}
                    disabled={exportingProjectId !== null}
                  >
                    {exportingProjectId === project.id ? t('common.loading') : t('common.export')}
                  </Button>

                  {currentProjectId !== project.id && (
                    <Button size="sm" onClick={() => handleOpen(project.id)}>
                      開く
                    </Button>
                  )}

                  {unlockProjectId === project.id && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-44">
                        <Input
                          type="password"
                          value={unlockPassphrase}
                          onChange={(e) => setUnlockPassphrase(e.target.value)}
                          placeholder={t('project.encryption.passphrase')}
                          error={unlockError || undefined}
                        />
                      </div>
                      <Button size="sm" onClick={handleUnlockAndOpen}>
                        解除
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => {
                          setUnlockProjectId(null);
                          setUnlockPassphrase('');
                          setUnlockError(null);
                        }}
                      >
                        ×
                      </Button>
                    </div>
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
