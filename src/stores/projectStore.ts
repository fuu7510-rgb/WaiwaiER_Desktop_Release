import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Project, SubscriptionPlan } from '../types';
import { saveProject as dbSaveProject, loadProjects as dbLoadProjects, deleteProject as dbDeleteProject } from '../lib/database';

// Free版の制限
const FREE_LIMITS = {
  maxProjects: 3,
  maxTablesPerProject: 5,
} as const;

interface ProjectState {
  // プロジェクト一覧
  projects: Project[];
  currentProjectId: string | null;
  isLoading: boolean;
  
  // サブスクリプション
  subscriptionPlan: SubscriptionPlan;
  
  // アクション
  loadProjectsFromDB: () => Promise<void>;
  createProject: (
    name: string,
    options?: {
      isEncrypted?: boolean;
      passphraseSalt?: string;
      passphraseHash?: string;
    }
  ) => string | null;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  openProject: (id: string) => void;
  closeProject: () => void;
  
  // 制限チェック
  canCreateProject: () => boolean;
  canAddTable: (projectId: string, currentTableCount: number) => boolean;
  getProjectLimit: () => number;
  getTableLimit: () => number;
  
  // サブスクリプション
  setSubscriptionPlan: (plan: SubscriptionPlan) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],
      currentProjectId: null,
      isLoading: false,
      subscriptionPlan: 'pro',
      
      loadProjectsFromDB: async () => {
        set({ isLoading: true });
        try {
          const projects = await dbLoadProjects();
          set({ projects });
        } catch (error) {
          console.error('Failed to load projects from DB:', error);
        } finally {
          set({ isLoading: false });
        }
      },
      
      createProject: (name, options) => {
        if (!get().canCreateProject()) {
          return null;
        }

        const isEncrypted = options?.isEncrypted ?? false;
        
        const now = new Date().toISOString();
        const project: Project = {
          id: uuidv4(),
          name,
          isEncrypted,
          passphraseSalt: options?.passphraseSalt,
          passphraseHash: options?.passphraseHash,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          projects: [...state.projects, project],
        }));
        
        // 非同期でDBに保存
        dbSaveProject(project).catch((error) => {
          console.error('Failed to save project to DB:', error);
        });
        
        return project.id;
      },
      
      updateProject: (id, updates) => {
        const updatedProject = get().projects.find((p) => p.id === id);
        if (updatedProject) {
          const newProject = { ...updatedProject, ...updates, updatedAt: new Date().toISOString() };
          set((state) => ({
            projects: state.projects.map((p) => p.id === id ? newProject : p),
          }));
          // 非同期でDBに保存
          dbSaveProject(newProject).catch((error) => {
            console.error('Failed to update project in DB:', error);
          });
        }
      },
      
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
        // 非同期でDBから削除
        dbDeleteProject(id).catch((error) => {
          console.error('Failed to delete project from DB:', error);
        });
      },
      
      openProject: (id) => {
        const project = get().projects.find((p) => p.id === id);
        if (project) {
          set((state) => ({
            currentProjectId: id,
            projects: state.projects.map((p) =>
              p.id === id ? { ...p, lastOpenedAt: new Date().toISOString() } : p
            ),
          }));
        }
      },
      
      closeProject: () => {
        set({ currentProjectId: null });
      },
      
      canCreateProject: () => {
        const { projects, subscriptionPlan } = get();
        if (subscriptionPlan === 'pro') {
          return true;
        }
        return projects.length < FREE_LIMITS.maxProjects;
      },
      
      canAddTable: (_projectId, currentTableCount) => {
        const { subscriptionPlan } = get();
        if (subscriptionPlan === 'pro') {
          return true;
        }
        return currentTableCount < FREE_LIMITS.maxTablesPerProject;
      },
      
      getProjectLimit: () => {
        const { subscriptionPlan } = get();
        return subscriptionPlan === 'pro' ? Infinity : FREE_LIMITS.maxProjects;
      },
      
      getTableLimit: () => {
        const { subscriptionPlan } = get();
        return subscriptionPlan === 'pro' ? Infinity : FREE_LIMITS.maxTablesPerProject;
      },
      
      setSubscriptionPlan: (plan) => {
        // 現状アクティベート機能は未提供のため、常にProとして扱う
        if (plan === 'pro') set({ subscriptionPlan: 'pro' });
      },
    }),
    {
      name: 'waiwaier-projects',
      version: 2,
      migrate: (persistedState) => {
        // 旧データでfreeが保存されていても、アルファでは常にPro扱いにする
        const state = persistedState as Partial<ProjectState> | undefined;
        return {
          ...state,
          subscriptionPlan: 'pro',
        } as ProjectState;
      },
      partialize: (state) => ({
        projects: state.projects,
        // subscriptionPlanは永続化しない（常にPro扱い）
      }),
    }
  )
);
