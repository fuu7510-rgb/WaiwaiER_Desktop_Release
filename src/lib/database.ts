/**
 * データベース抽象化レイヤー
 * Tauri環境ではSQLiteを使用し、ブラウザ環境ではLocalStorageを使用
 */
import type { Project, ERDiagram } from '../types';

// Tauri環境かどうかをチェック
function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

// ============================================
// LocalStorage フォールバック実装
// ============================================

const STORAGE_KEYS = {
  PROJECTS: 'waiwaier_projects',
  DIAGRAMS: 'waiwaier_diagrams',
  SETTINGS: 'waiwaier_settings',
};

function getLocalStorageData<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setLocalStorageData<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// LocalStorage版のプロジェクト操作
const localStorageDb = {
  async saveProject(project: Project): Promise<void> {
    const projects = getLocalStorageData<Project[]>(STORAGE_KEYS.PROJECTS, []);
    const index = projects.findIndex((p) => p.id === project.id);
    if (index >= 0) {
      projects[index] = project;
    } else {
      projects.push(project);
    }
    setLocalStorageData(STORAGE_KEYS.PROJECTS, projects);
  },

  async loadProjects(): Promise<Project[]> {
    return getLocalStorageData<Project[]>(STORAGE_KEYS.PROJECTS, []);
  },

  async deleteProject(projectId: string): Promise<void> {
    const projects = getLocalStorageData<Project[]>(STORAGE_KEYS.PROJECTS, []);
    setLocalStorageData(
      STORAGE_KEYS.PROJECTS,
      projects.filter((p) => p.id !== projectId)
    );
    // ダイアグラムも削除
    const diagrams = getLocalStorageData<Record<string, ERDiagram>>(STORAGE_KEYS.DIAGRAMS, {});
    delete diagrams[projectId];
    setLocalStorageData(STORAGE_KEYS.DIAGRAMS, diagrams);
  },

  async saveDiagram(projectId: string, diagram: ERDiagram): Promise<void> {
    const diagrams = getLocalStorageData<Record<string, ERDiagram>>(STORAGE_KEYS.DIAGRAMS, {});
    diagrams[projectId] = diagram;
    setLocalStorageData(STORAGE_KEYS.DIAGRAMS, diagrams);
  },

  async loadDiagram(projectId: string): Promise<ERDiagram | null> {
    const diagrams = getLocalStorageData<Record<string, ERDiagram>>(STORAGE_KEYS.DIAGRAMS, {});
    return diagrams[projectId] || null;
  },

  async saveSetting(key: string, value: string): Promise<void> {
    const settings = getLocalStorageData<Record<string, string>>(STORAGE_KEYS.SETTINGS, {});
    settings[key] = value;
    setLocalStorageData(STORAGE_KEYS.SETTINGS, settings);
  },

  async loadSetting(key: string): Promise<string | null> {
    const settings = getLocalStorageData<Record<string, string>>(STORAGE_KEYS.SETTINGS, {});
    return settings[key] || null;
  },
};

// ============================================
// SQLite 実装 (Tauri環境)
// ============================================

type TauriDatabase = {
  execute: (query: string, params?: unknown[]) => Promise<unknown>;
  select: <T>(query: string, params?: unknown[]) => Promise<T>;
  close: () => Promise<boolean | void>;
};

let db: TauriDatabase | null = null;

async function initTauriDatabase(): Promise<TauriDatabase> {
  if (db) return db;

  // 動的インポートでTauriプラグインを読み込む
  const { default: Database } = await import('@tauri-apps/plugin-sql');
  const database = await Database.load('sqlite:waiwaier.db');

  // テーブル作成
  await database.execute(`
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_encrypted INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_opened_at TEXT
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);

  db = database;
  return database;
}

// SQLite版のプロジェクト操作
const tauriDb = {
  async saveProject(project: Project): Promise<void> {
    const database = await initTauriDatabase();
    await database.execute(
      `INSERT OR REPLACE INTO projects (id, name, description, is_encrypted, created_at, updated_at, last_opened_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        project.id,
        project.name,
        project.description || null,
        project.isEncrypted ? 1 : 0,
        project.createdAt,
        project.updatedAt,
        project.lastOpenedAt || null,
      ]
    );
  },

  async loadProjects(): Promise<Project[]> {
    const database = await initTauriDatabase();
    const rows = await database.select<
      {
        id: string;
        name: string;
        description: string | null;
        is_encrypted: number;
        created_at: string;
        updated_at: string;
        last_opened_at: string | null;
      }[]
    >('SELECT * FROM projects ORDER BY updated_at DESC');

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      isEncrypted: row.is_encrypted === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastOpenedAt: row.last_opened_at || undefined,
    }));
  },

  async deleteProject(projectId: string): Promise<void> {
    const database = await initTauriDatabase();
    await database.execute('DELETE FROM projects WHERE id = $1', [projectId]);
    await database.execute('DELETE FROM diagrams WHERE project_id = $1', [projectId]);
  },

  async saveDiagram(projectId: string, diagram: ERDiagram): Promise<void> {
    const database = await initTauriDatabase();
    const now = new Date().toISOString();
    const data = JSON.stringify(diagram);

    const existing = await database.select<{ id: string }[]>(
      'SELECT id FROM diagrams WHERE project_id = $1',
      [projectId]
    );

    if (existing.length > 0) {
      await database.execute(
        'UPDATE diagrams SET data = $1, updated_at = $2 WHERE project_id = $3',
        [data, now, projectId]
      );
    } else {
      await database.execute(
        'INSERT INTO diagrams (id, project_id, data, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)',
        [crypto.randomUUID(), projectId, data, now, now]
      );
    }
  },

  async loadDiagram(projectId: string): Promise<ERDiagram | null> {
    const database = await initTauriDatabase();
    const rows = await database.select<{ data: string }[]>(
      'SELECT data FROM diagrams WHERE project_id = $1',
      [projectId]
    );

    if (rows.length === 0) return null;

    try {
      return JSON.parse(rows[0].data) as ERDiagram;
    } catch {
      return null;
    }
  },

  async saveSetting(key: string, value: string): Promise<void> {
    const database = await initTauriDatabase();
    await database.execute(
      'INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)',
      [key, value]
    );
  },

  async loadSetting(key: string): Promise<string | null> {
    const database = await initTauriDatabase();
    const rows = await database.select<{ value: string }[]>(
      'SELECT value FROM settings WHERE key = $1',
      [key]
    );
    return rows.length > 0 ? rows[0].value : null;
  },
};

// ============================================
// エクスポート - 環境に応じて自動切り替え
// ============================================

function getDb() {
  return isTauriEnv() ? tauriDb : localStorageDb;
}

export async function saveProject(project: Project): Promise<void> {
  return getDb().saveProject(project);
}

export async function loadProjects(): Promise<Project[]> {
  return getDb().loadProjects();
}

export async function deleteProject(projectId: string): Promise<void> {
  return getDb().deleteProject(projectId);
}

export async function saveDiagram(projectId: string, diagram: ERDiagram): Promise<void> {
  return getDb().saveDiagram(projectId, diagram);
}

export async function loadDiagram(projectId: string): Promise<ERDiagram | null> {
  return getDb().loadDiagram(projectId);
}

export async function saveSetting(key: string, value: string): Promise<void> {
  return getDb().saveSetting(key, value);
}

export async function loadSetting(key: string): Promise<string | null> {
  return getDb().loadSetting(key);
}

export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
