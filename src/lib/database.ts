/**
 * データベース抽象化レイヤー
 * Tauri環境ではSQLiteを使用し、ブラウザ環境ではLocalStorageを使用
 */
import type { Project, ERDiagram } from '../types';
import { decryptData, encryptData } from './crypto';

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

type EncryptedDiagramPayload = {
  v: 1;
  encrypted: string;
  salt: string;
  iv: string;
};

function isEncryptedDiagramPayload(value: unknown): value is EncryptedDiagramPayload {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.v === 1 &&
    typeof obj.encrypted === 'string' &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string'
  );
}

async function encodeDiagramForStorage(diagram: ERDiagram, passphrase?: string): Promise<ERDiagram | EncryptedDiagramPayload> {
  if (!passphrase) return diagram;
  const json = JSON.stringify(diagram);
  const { encrypted, salt, iv } = await encryptData(json, passphrase);
  return { v: 1, encrypted, salt, iv };
}

async function decodeDiagramFromStorage(value: unknown, passphrase?: string): Promise<ERDiagram | null> {
  if (!value) return null;

  if (isEncryptedDiagramPayload(value)) {
    if (!passphrase) {
      throw new Error('このプロジェクトは暗号化されています。パスフレーズを入力してください。');
    }
    const json = await decryptData(value.encrypted, value.salt, value.iv, passphrase);
    return JSON.parse(json) as ERDiagram;
  }

  // 平文(従来形式)
  if (typeof value === 'object') {
    const obj = value as ERDiagram;
    if (Array.isArray((obj as ERDiagram).tables) && Array.isArray((obj as ERDiagram).relations)) {
      return obj;
    }
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return decodeDiagramFromStorage(parsed, passphrase);
    } catch {
      return null;
    }
  }

  return null;
}

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

  async saveDiagram(projectId: string, diagram: ERDiagram, options?: { passphrase?: string }): Promise<void> {
    const diagrams = getLocalStorageData<Record<string, unknown>>(STORAGE_KEYS.DIAGRAMS, {});
    diagrams[projectId] = await encodeDiagramForStorage(diagram, options?.passphrase);
    setLocalStorageData(STORAGE_KEYS.DIAGRAMS, diagrams);
  },

  async loadDiagram(projectId: string, options?: { passphrase?: string }): Promise<ERDiagram | null> {
    const diagrams = getLocalStorageData<Record<string, unknown>>(STORAGE_KEYS.DIAGRAMS, {});
    return decodeDiagramFromStorage(diagrams[projectId], options?.passphrase);
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
      passphrase_salt TEXT,
      passphrase_hash TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      last_opened_at TEXT
    )
  `);

  // 既存DB向けの軽量マイグレーション（列追加）
  try {
    const cols = await database.select<{ name: string }[]>('PRAGMA table_info(projects)');
    const existing = new Set(cols.map((c) => c.name));
    if (!existing.has('passphrase_salt')) {
      await database.execute('ALTER TABLE projects ADD COLUMN passphrase_salt TEXT');
    }
    if (!existing.has('passphrase_hash')) {
      await database.execute('ALTER TABLE projects ADD COLUMN passphrase_hash TEXT');
    }
  } catch (e) {
    console.warn('Failed to ensure projects encryption columns:', e);
  }

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
      `INSERT OR REPLACE INTO projects (id, name, description, is_encrypted, passphrase_salt, passphrase_hash, created_at, updated_at, last_opened_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        project.id,
        project.name,
        project.description || null,
        project.isEncrypted ? 1 : 0,
        project.passphraseSalt || null,
        project.passphraseHash || null,
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
        passphrase_salt?: string | null;
        passphrase_hash?: string | null;
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
      passphraseSalt: row.passphrase_salt || undefined,
      passphraseHash: row.passphrase_hash || undefined,
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

  async saveDiagram(projectId: string, diagram: ERDiagram, options?: { passphrase?: string }): Promise<void> {
    const database = await initTauriDatabase();
    const now = new Date().toISOString();
    const stored = await encodeDiagramForStorage(diagram, options?.passphrase);
    const data = JSON.stringify(stored);

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

  async loadDiagram(projectId: string, options?: { passphrase?: string }): Promise<ERDiagram | null> {
    const database = await initTauriDatabase();
    const rows = await database.select<{ data: string }[]>(
      'SELECT data FROM diagrams WHERE project_id = $1',
      [projectId]
    );

    if (rows.length === 0) return null;

    try {
      const parsed = JSON.parse(rows[0].data) as unknown;
      return await decodeDiagramFromStorage(parsed, options?.passphrase);
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

export async function saveDiagram(projectId: string, diagram: ERDiagram, options?: { passphrase?: string }): Promise<void> {
  return getDb().saveDiagram(projectId, diagram, options);
}

export async function loadDiagram(projectId: string, options?: { passphrase?: string }): Promise<ERDiagram | null> {
  return getDb().loadDiagram(projectId, options);
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
