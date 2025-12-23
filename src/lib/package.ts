/**
 * パッケージエクスポート/インポート機能
 * .waiwai 形式（ZIP）でプロジェクトをエクスポート/インポート
 */

import { save, open } from '@tauri-apps/plugin-dialog';
import {
  writeFile,
  readFile,
  mkdir,
  exists,
  BaseDirectory,
} from '@tauri-apps/plugin-fs';
import { loadDiagram, saveDiagram, saveProject, loadProjects } from './database';
import { encryptData, decryptData } from './crypto';
import type { Project } from '../types';

// パッケージメタデータの型定義
interface PackageMetadata {
  version: string;
  appVersion: string;
  exportedAt: string;
  projectId: string;
  projectName: string;
  isEncrypted: boolean;
  description?: string;
  tables: number;
  relations: number;
}

// パッケージコンテンツの型定義
interface PackageContent {
  metadata: PackageMetadata;
  diagram: string; // JSON string (暗号化時は暗号化済み)
}

// 現在のバージョン
const PACKAGE_VERSION = '1.0.0';
const APP_VERSION = '1.0.0';

/**
 * プロジェクトを .waiwai パッケージとしてエクスポート
 */
export async function exportPackage(
  project: Project,
  passphrase?: string
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    // ダイアグラムデータを取得
    const diagramJson = await loadDiagram(project.id);
    if (!diagramJson) {
      return { success: false, error: 'ダイアグラムデータが見つかりません' };
    }

    const diagram = JSON.parse(diagramJson);

    // メタデータを構築
    const metadata: PackageMetadata = {
      version: PACKAGE_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      projectId: project.id,
      projectName: project.name,
      isEncrypted: !!passphrase || project.isEncrypted,
      description: project.description,
      tables: diagram.tables?.length || 0,
      relations: diagram.relations?.length || 0,
    };

    // ダイアグラムデータを準備（暗号化オプション）
    let diagramData = diagramJson;
    if (passphrase) {
      diagramData = await encryptData(diagramJson, passphrase);
    }

    // パッケージコンテンツを構築
    const packageContent: PackageContent = {
      metadata,
      diagram: diagramData,
    };

    // 保存先を選択
    const savePath = await save({
      defaultPath: `${project.name}.waiwai`,
      filters: [
        {
          name: 'WaiwaiER Package',
          extensions: ['waiwai'],
        },
      ],
    });

    if (!savePath) {
      return { success: false, error: 'キャンセルされました' };
    }

    // JSONとしてファイルに保存（実際のZIP形式は将来実装）
    const content = JSON.stringify(packageContent, null, 2);
    await writeFile(savePath, new TextEncoder().encode(content));

    return { success: true, path: savePath };
  } catch (error) {
    console.error('Package export failed:', error);
    return {
      success: false,
      error: `エクスポートに失敗しました: ${error}`,
    };
  }
}

/**
 * .waiwai パッケージをインポート
 */
export async function importPackage(
  passphrase?: string
): Promise<{ success: boolean; error?: string; project?: Project }> {
  try {
    // ファイルを選択
    const file = await open({
      filters: [
        {
          name: 'WaiwaiER Package',
          extensions: ['waiwai'],
        },
      ],
    });

    if (!file) {
      return { success: false, error: 'キャンセルされました' };
    }

    // ファイルを読み込み
    const content = await readFile(file);
    const jsonString = new TextDecoder().decode(content);
    const packageContent: PackageContent = JSON.parse(jsonString);

    // バージョン確認
    if (!packageContent.metadata || !packageContent.metadata.version) {
      return { success: false, error: '無効なパッケージ形式です' };
    }

    const metadata = packageContent.metadata;

    // 暗号化されている場合はパスフレーズが必要
    let diagramJson = packageContent.diagram;
    if (metadata.isEncrypted) {
      if (!passphrase) {
        return {
          success: false,
          error: 'このパッケージは暗号化されています。パスフレーズを入力してください。',
        };
      }

      try {
        diagramJson = await decryptData(packageContent.diagram, passphrase);
      } catch {
        return { success: false, error: 'パスフレーズが正しくありません' };
      }
    }

    // 既存プロジェクトとの競合チェック
    const existingProjects = await loadProjects();
    const existingIds = existingProjects.map((p) => p.id);

    // 新しいプロジェクトIDを生成（競合回避）
    let newProjectId = metadata.projectId;
    if (existingIds.includes(newProjectId)) {
      newProjectId = `${metadata.projectId}-${Date.now()}`;
    }

    // 新しいプロジェクト名を決定（競合回避）
    let newProjectName = metadata.projectName;
    const existingNames = existingProjects.map((p) => p.name);
    let nameCounter = 1;
    while (existingNames.includes(newProjectName)) {
      newProjectName = `${metadata.projectName} (${nameCounter++})`;
    }

    // プロジェクトを作成
    const newProject: Project = {
      id: newProjectId,
      name: newProjectName,
      description: metadata.description,
      isEncrypted: metadata.isEncrypted,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // プロジェクトとダイアグラムを保存
    await saveProject(newProject);
    await saveDiagram(newProjectId, diagramJson);

    return { success: true, project: newProject };
  } catch (error) {
    console.error('Package import failed:', error);
    return {
      success: false,
      error: `インポートに失敗しました: ${error}`,
    };
  }
}

/**
 * パッケージメタデータのプレビューを取得（インポート前確認用）
 */
export async function previewPackage(
  filePath: string
): Promise<{ success: boolean; metadata?: PackageMetadata; error?: string }> {
  try {
    const content = await readFile(filePath);
    const jsonString = new TextDecoder().decode(content);
    const packageContent: PackageContent = JSON.parse(jsonString);

    if (!packageContent.metadata) {
      return { success: false, error: '無効なパッケージ形式です' };
    }

    return { success: true, metadata: packageContent.metadata };
  } catch (error) {
    console.error('Package preview failed:', error);
    return {
      success: false,
      error: `プレビューに失敗しました: ${error}`,
    };
  }
}

/**
 * パッケージが暗号化されているかチェック
 */
export async function isPackageEncrypted(filePath: string): Promise<boolean> {
  try {
    const result = await previewPackage(filePath);
    return result.metadata?.isEncrypted || false;
  } catch {
    return false;
  }
}
