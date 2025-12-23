import { writeTextFile, mkdir, readDir, remove } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';
import type { ERDiagram, AppSettings } from '../types';

const BACKUP_DIR = 'backups';
const MAX_BACKUPS = 10;
const DAILY_BACKUPS_DAYS = 7;

interface BackupMetadata {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  type: 'auto' | 'manual' | 'daily';
}

// バックアップディレクトリのパスを取得
async function getBackupDir(): Promise<string> {
  const appData = await appDataDir();
  return await join(appData, BACKUP_DIR);
}

// バックアップディレクトリを作成（なければ）
async function ensureBackupDir(): Promise<string> {
  const backupDir = await getBackupDir();
  try {
    await mkdir(backupDir, { recursive: true });
  } catch {
    // ディレクトリが既に存在する場合は無視
  }
  return backupDir;
}

// バックアップファイル名を生成
function generateBackupFileName(projectId: string, type: 'auto' | 'manual' | 'daily'): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${projectId}_${type}_${timestamp}.json`;
}

// バックアップを作成
export async function createBackup(
  projectId: string,
  projectName: string,
  diagram: ERDiagram,
  type: 'auto' | 'manual' | 'daily' = 'auto'
): Promise<void> {
  try {
    const backupDir = await ensureBackupDir();
    const fileName = generateBackupFileName(projectId, type);
    const filePath = await join(backupDir, fileName);
    
    const backupData = {
      metadata: {
        id: crypto.randomUUID(),
        projectId,
        projectName,
        createdAt: new Date().toISOString(),
        type,
      } as BackupMetadata,
      diagram,
    };
    
    await writeTextFile(filePath, JSON.stringify(backupData, null, 2));
    
    // 古いバックアップを削除
    await cleanupOldBackups(projectId);
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
}

// 古いバックアップを削除
async function cleanupOldBackups(projectId: string): Promise<void> {
  try {
    const backupDir = await getBackupDir();
    const entries = await readDir(backupDir);
    
    // このプロジェクトのバックアップをフィルタ
    const projectBackups = entries
      .filter((entry) => entry.name?.startsWith(`${projectId}_auto_`))
      .sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    
    // 最大件数を超えたバックアップを削除
    if (projectBackups.length > MAX_BACKUPS) {
      for (let i = MAX_BACKUPS; i < projectBackups.length; i++) {
        const entry = projectBackups[i];
        if (entry.name) {
          const filePath = await join(backupDir, entry.name);
          await remove(filePath);
        }
      }
    }
    
    // 日次バックアップの古いものを削除
    const dailyBackups = entries
      .filter((entry) => entry.name?.includes('_daily_'))
      .sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - DAILY_BACKUPS_DAYS);
    
    for (const entry of dailyBackups) {
      if (entry.name) {
        // ファイル名から日付を抽出
        const match = entry.name.match(/_daily_(\d{4}-\d{2}-\d{2})/);
        if (match) {
          const backupDate = new Date(match[1]);
          if (backupDate < cutoffDate) {
            const filePath = await join(backupDir, entry.name);
            await remove(filePath);
          }
        }
      }
    }
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
  }
}

// バックアップ一覧を取得
export async function listBackups(projectId?: string): Promise<BackupMetadata[]> {
  try {
    const backupDir = await getBackupDir();
    const entries = await readDir(backupDir);
    
    const backups: BackupMetadata[] = [];
    
    for (const entry of entries) {
      if (!entry.name?.endsWith('.json')) continue;
      if (projectId && !entry.name.startsWith(`${projectId}_`)) continue;
      
      try {
        // メタデータのみを抽出（ファイル名から）
        const parts = entry.name.replace('.json', '').split('_');
        if (parts.length >= 3) {
          const [pId, type, ...timestampParts] = parts;
          const timestamp = timestampParts.join('_').replace(/-/g, (m, i) => i < 16 ? (i === 10 ? 'T' : ':') : m);
          
          backups.push({
            id: entry.name,
            projectId: pId,
            projectName: '', // 実際のファイルを読まないと取得できない
            createdAt: timestamp,
            type: type as 'auto' | 'manual' | 'daily',
          });
        }
      } catch {
        // パースエラーは無視
      }
    }
    
    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  } catch (error) {
    console.error('Failed to list backups:', error);
    return [];
  }
}

// バックアップマネージャー（自動バックアップ用）
let backupIntervalId: number | null = null;
let lastBackupProjectId: string | null = null;
let getDiagramFn: (() => ERDiagram) | null = null;
let getProjectInfoFn: (() => { id: string; name: string } | null) | null = null;

export function startAutoBackup(
  settings: AppSettings,
  getDiagram: () => ERDiagram,
  getProjectInfo: () => { id: string; name: string } | null
): void {
  stopAutoBackup();
  
  if (!settings.autoBackupEnabled) return;
  
  getDiagramFn = getDiagram;
  getProjectInfoFn = getProjectInfo;
  
  const intervalMs = settings.autoBackupIntervalMinutes * 60 * 1000;
  
  backupIntervalId = window.setInterval(async () => {
    if (!getDiagramFn || !getProjectInfoFn) return;
    
    const projectInfo = getProjectInfoFn();
    if (!projectInfo) return;
    
    const diagram = getDiagramFn();
    if (diagram.tables.length === 0) return;
    
    try {
      await createBackup(projectInfo.id, projectInfo.name, diagram, 'auto');
      lastBackupProjectId = projectInfo.id;
      console.log(`Auto backup created for project: ${projectInfo.name}`);
    } catch (error) {
      console.error('Auto backup failed:', error);
    }
  }, intervalMs);
}

export function stopAutoBackup(): void {
  if (backupIntervalId !== null) {
    clearInterval(backupIntervalId);
    backupIntervalId = null;
  }
  getDiagramFn = null;
  getProjectInfoFn = null;
}

// アプリ終了時のバックアップ
export async function createExitBackup(
  projectId: string,
  projectName: string,
  diagram: ERDiagram
): Promise<void> {
  await createBackup(projectId, projectName, diagram, 'auto');
}
