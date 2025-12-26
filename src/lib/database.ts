/**
 * データベース抽象化レイヤー
 * Tauri環境ではSQLiteを使用し、ブラウザ環境ではLocalStorageを使用
 */
import type { Project, ERDiagram } from '../types';
import { decryptData, encryptData } from './crypto';
import { decodeAndMigrateDiagram, encodeDiagramEnvelope } from './diagramSchema';
import { invoke } from '@tauri-apps/api/core';

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
  SAMPLE_DATA: 'waiwaier_sample_data',
  SETTINGS: 'waiwaier_settings',
};

type DbImpl = {
  saveProject: (project: Project) => Promise<void>;
  loadProjects: () => Promise<Project[]>;
  deleteProject: (projectId: string) => Promise<void>;
  saveDiagram: (projectId: string, diagram: ERDiagram, options?: { passphrase?: string }) => Promise<void>;
  loadDiagram: (projectId: string, options?: { passphrase?: string }) => Promise<ERDiagram | null>;
  saveSampleData: (
    projectId: string,
    sampleDataByTableId: Record<string, Record<string, unknown>[]>,
    options?: { passphrase?: string }
  ) => Promise<void>;
  loadSampleData: (
    projectId: string,
    options?: { passphrase?: string }
  ) => Promise<Record<string, Record<string, unknown>[]> | null>;
  saveSetting: (key: string, value: string) => Promise<void>;
  loadSetting: (key: string) => Promise<string | null>;
};

type EncryptedDiagramPayload = {
  v: 1;
  encrypted: string;
  salt: string;
  iv: string;
};

function isEncryptedPayload(value: unknown): value is EncryptedDiagramPayload {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return (
    obj.v === 1 &&
    typeof obj.encrypted === 'string' &&
    typeof obj.salt === 'string' &&
    typeof obj.iv === 'string'
  );
}

async function encodeDiagramForStorage(
  diagram: ERDiagram,
  passphrase?: string
): Promise<ReturnType<typeof encodeDiagramEnvelope> | EncryptedDiagramPayload> {
  const envelope = encodeDiagramEnvelope(diagram);
  if (!passphrase) return envelope;
  const json = JSON.stringify(envelope);
  const { encrypted, salt, iv } = await encryptData(json, passphrase);
  return { v: 1, encrypted, salt, iv };
}

async function decodeDiagramFromStorage(value: unknown, passphrase?: string): Promise<ERDiagram | null> {
  if (!value) return null;

  if (isEncryptedPayload(value)) {
    if (!passphrase) {
      throw new Error('このプロジェクトは暗号化されています。パスフレーズを入力してください。');
    }
    const json = await decryptData(value.encrypted, value.salt, value.iv, passphrase);
    // 暗号化ペイロードの中身は v0(legacy) / v1(envelope) の両方を受け入れてmigrate
    return decodeAndMigrateDiagram(json);
  }

  // 平文: v0(legacy) / v1(envelope) の両方を受け入れてmigrate
  return decodeAndMigrateDiagram(value);
}

async function encodeJsonForStorage<T>(value: T, passphrase?: string): Promise<T | EncryptedDiagramPayload> {
  if (!passphrase) return value;
  const json = JSON.stringify(value);
  const { encrypted, salt, iv } = await encryptData(json, passphrase);
  return { v: 1, encrypted, salt, iv };
}

async function decodeJsonFromStorage<T>(value: unknown, passphrase?: string): Promise<T | null> {
  if (!value) return null;
  if (isEncryptedPayload(value)) {
    if (!passphrase) {
      throw new Error('このプロジェクトは暗号化されています。パスフレーズを入力してください。');
    }
    const json = await decryptData(value.encrypted, value.salt, value.iv, passphrase);
    try {
      return JSON.parse(json) as T;
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object') return null;
  return value as T;
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
const localStorageDb: DbImpl = {
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
    const diagrams = getLocalStorageData<Record<string, unknown>>(STORAGE_KEYS.DIAGRAMS, {});
    delete diagrams[projectId];
    setLocalStorageData(STORAGE_KEYS.DIAGRAMS, diagrams);

    // サンプルデータも削除
    const sampleData = getLocalStorageData<Record<string, unknown>>(STORAGE_KEYS.SAMPLE_DATA, {});
    delete sampleData[projectId];
    setLocalStorageData(STORAGE_KEYS.SAMPLE_DATA, sampleData);
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

  async saveSampleData(
    projectId: string,
    sampleDataByTableId: Record<string, Record<string, unknown>[]>,
    options?: { passphrase?: string }
  ): Promise<void> {
    const sampleData = getLocalStorageData<Record<string, unknown>>(STORAGE_KEYS.SAMPLE_DATA, {});
    sampleData[projectId] = await encodeJsonForStorage(sampleDataByTableId, options?.passphrase);
    setLocalStorageData(STORAGE_KEYS.SAMPLE_DATA, sampleData);
  },

  async loadSampleData(
    projectId: string,
    options?: { passphrase?: string }
  ): Promise<Record<string, Record<string, unknown>[]> | null> {
    const sampleData = getLocalStorageData<Record<string, unknown>>(STORAGE_KEYS.SAMPLE_DATA, {});
    const value = sampleData[projectId];
    return decodeJsonFromStorage<Record<string, Record<string, unknown>[]>>(value, options?.passphrase);
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
      sort_order INTEGER,
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
    if (!existing.has('sort_order')) {
      await database.execute('ALTER TABLE projects ADD COLUMN sort_order INTEGER');
    }
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
    CREATE TABLE IF NOT EXISTS sample_data (
      project_id TEXT PRIMARY KEY,
      data TEXT NOT NULL,
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
const tauriDb: DbImpl = {
  async saveProject(project: Project): Promise<void> {
    const database = await initTauriDatabase();
    await database.execute(
      `INSERT OR REPLACE INTO projects (id, name, description, sort_order, is_encrypted, passphrase_salt, passphrase_hash, created_at, updated_at, last_opened_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        project.id,
        project.name,
        project.description || null,
        project.sortOrder ?? null,
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
        sort_order: number | null;
        is_encrypted: number;
        passphrase_salt?: string | null;
        passphrase_hash?: string | null;
        created_at: string;
        updated_at: string;
        last_opened_at: string | null;
      }[]
    >(
      'SELECT * FROM projects ORDER BY (sort_order IS NULL) ASC, sort_order ASC, updated_at DESC'
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || undefined,
      sortOrder: row.sort_order ?? undefined,
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
    // legacy tables (may exist from older versions)
    await database.execute('DELETE FROM diagrams WHERE project_id = $1', [projectId]);
    await database.execute('DELETE FROM sample_data WHERE project_id = $1', [projectId]);

    // per-project db file
    await invoke('project_db_delete', { projectId });
  },

  async saveDiagram(projectId: string, diagram: ERDiagram, options?: { passphrase?: string }): Promise<void> {
    const stored = await encodeDiagramForStorage(diagram, options?.passphrase);
    const value = JSON.stringify(stored);
    await invoke('project_db_save', {
      projectId,
      passphrase: options?.passphrase ?? null,
      key: 'diagram',
      value,
    });
  },

  async loadDiagram(projectId: string, options?: { passphrase?: string }): Promise<ERDiagram | null> {
    const value = await invoke<string | null>('project_db_load', {
      projectId,
      passphrase: options?.passphrase ?? null,
      key: 'diagram',
    });
    const tryDecode = async (raw: string): Promise<ERDiagram | null> => {
      try {
        const parsed = JSON.parse(raw) as unknown;
        return await decodeDiagramFromStorage(parsed, options?.passphrase);
      } catch {
        return null;
      }
    };

    if (value) {
      const decoded = await tryDecode(value);
      if (decoded) return decoded;
    }

    // Fallback (legacy): read from plugin-sql tables if present.
    try {
      const database = await initTauriDatabase();
      const rows = await database.select<{ data: string }[]>('SELECT data FROM diagrams WHERE project_id = $1', [
        projectId,
      ]);
      if (rows.length === 0) return null;
      return await tryDecode(rows[0].data);
    } catch {
      return null;
    }
  },

  async saveSampleData(
    projectId: string,
    sampleDataByTableId: Record<string, Record<string, unknown>[]>,
    options?: { passphrase?: string }
  ): Promise<void> {
    const stored = await encodeJsonForStorage(sampleDataByTableId ?? {}, options?.passphrase);
    const value = JSON.stringify(stored);
    await invoke('project_db_save', {
      projectId,
      passphrase: options?.passphrase ?? null,
      key: 'sample_data',
      value,
    });
  },

  async loadSampleData(
    projectId: string,
    options?: { passphrase?: string }
  ): Promise<Record<string, Record<string, unknown>[]> | null> {
    const value = await invoke<string | null>('project_db_load', {
      projectId,
      passphrase: options?.passphrase ?? null,
      key: 'sample_data',
    });

    const tryDecode = async (raw: string): Promise<Record<string, Record<string, unknown>[]> | null> => {
      try {
        const parsed = JSON.parse(raw) as unknown;
        // decodeJsonFromStorage may throw on missing passphrase; let it bubble to caller.
        return await decodeJsonFromStorage<Record<string, Record<string, unknown>[]>>(parsed, options?.passphrase);
      } catch {
        return null;
      }
    };

    if (value) {
      const decoded = await tryDecode(value);
      if (decoded) return decoded;
    }

    // Fallback (legacy): read from plugin-sql tables if present.
    try {
      const database = await initTauriDatabase();
      const rows = await database.select<{ data: string }[]>('SELECT data FROM sample_data WHERE project_id = $1', [
        projectId,
      ]);
      if (rows.length === 0) return null;
      return await tryDecode(rows[0].data);
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

function getDb(): DbImpl {
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

export async function saveSampleData(
  projectId: string,
  sampleDataByTableId: Record<string, Record<string, unknown>[]>,
  options?: { passphrase?: string }
): Promise<void> {
  return getDb().saveSampleData(projectId, sampleDataByTableId, options);
}

export async function loadSampleData(
  projectId: string,
  options?: { passphrase?: string }
): Promise<Record<string, Record<string, unknown>[]> | null> {
  return getDb().loadSampleData(projectId, options);
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
