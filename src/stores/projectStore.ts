import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import type { Project, SubscriptionPlan } from '../types';

// Free版の制限
const FREE_LIMITS = {
  maxProjects: 3,
  maxTablesPerProject: 5,
} as const;

interface ProjectState {
  // プロジェクト一覧
  projects: Project[];
  currentProjectId: string | null;
  
  // サブスクリプション
  subscriptionPlan: SubscriptionPlan;
  
  // アクション
  createProject: (name: string, isEncrypted?: boolean) => string | null;
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
      subscriptionPlan: 'free',
      
      createProject: (name, isEncrypted = false) => {
        if (!get().canCreateProject()) {
          return null;
        }
        
        const now = new Date().toISOString();
        const project: Project = {
          id: uuidv4(),
          name,
          isEncrypted,
          createdAt: now,
          updatedAt: now,
        };
        
        set((state) => ({
          projects: [...state.projects, project],
        }));
        
        return project.id;
      },
      
      updateProject: (id, updates) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id
              ? { ...p, ...updates, updatedAt: new Date().toISOString() }
              : p
          ),
        }));
      },
      
      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
        }));
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
        set({ subscriptionPlan: plan });
      },
    }),
    {
      name: 'waiwaier-projects',
      partialize: (state) => ({
        projects: state.projects,
        subscriptionPlan: state.subscriptionPlan,
      }),
    }
  )
);
