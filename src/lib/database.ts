import Database from '@tauri-apps/plugin-sql';
import type { Project, ERDiagram, Table, Relation } from '../types';

let db: Database | null = null;

// データベース初期化
export async function initDatabase(): Promise<Database> {
  if (db) return db;
  
  db = await Database.load('sqlite:waiwaier.db');
  
  // テーブル作成
  await db.execute(`
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
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      data TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )
  `);
  
  await db.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `);
  
  return db;
}

// プロジェクト操作
export async function saveProject(project: Project): Promise<void> {
  const database = await initDatabase();
  
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
}

export async function loadProjects(): Promise<Project[]> {
  const database = await initDatabase();
  
  const rows = await database.select<{
    id: string;
    name: string;
    description: string | null;
    is_encrypted: number;
    created_at: string;
    updated_at: string;
    last_opened_at: string | null;
  }[]>('SELECT * FROM projects ORDER BY updated_at DESC');
  
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    isEncrypted: row.is_encrypted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastOpenedAt: row.last_opened_at || undefined,
  }));
}

export async function deleteProject(projectId: string): Promise<void> {
  const database = await initDatabase();
  await database.execute('DELETE FROM projects WHERE id = $1', [projectId]);
  await database.execute('DELETE FROM diagrams WHERE project_id = $1', [projectId]);
}

// ダイアグラム操作
export async function saveDiagram(projectId: string, diagram: ERDiagram): Promise<void> {
  const database = await initDatabase();
  const now = new Date().toISOString();
  const data = JSON.stringify(diagram);
  
  // 既存のダイアグラムがあれば更新、なければ挿入
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
}

export async function loadDiagram(projectId: string): Promise<ERDiagram | null> {
  const database = await initDatabase();
  
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
}

// 設定操作
export async function saveSetting(key: string, value: string): Promise<void> {
  const database = await initDatabase();
  await database.execute(
    'INSERT OR REPLACE INTO settings (key, value) VALUES ($1, $2)',
    [key, value]
  );
}

export async function loadSetting(key: string): Promise<string | null> {
  const database = await initDatabase();
  
  const rows = await database.select<{ value: string }[]>(
    'SELECT value FROM settings WHERE key = $1',
    [key]
  );
  
  return rows.length > 0 ? rows[0].value : null;
}

// データベースを閉じる
export async function closeDatabase(): Promise<void> {
  if (db) {
    await db.close();
    db = null;
  }
}
