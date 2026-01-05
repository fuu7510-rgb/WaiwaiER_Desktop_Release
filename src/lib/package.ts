/**
 * パッケージエクスポート/インポート機能
 * .waiwai 形式（ZIP）でプロジェクトをエクスポート/インポート
 */

import { save, open } from '@tauri-apps/plugin-dialog';
import {
  writeFile,
  readFile,
} from '@tauri-apps/plugin-fs';
import { loadDiagram, saveDiagram, saveProject, loadProjects } from './database';
import { encryptData, decryptData, hashPassphrase } from './crypto';
import { decodeAndMigrateDiagram, encodeDiagramEnvelope, DIAGRAM_SCHEMA_VERSION, MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION } from './diagramSchema';
import { filterDiagramForExport } from './exportFilter';
import type { Project } from '../types';

// パッケージメタデータの型定義
interface PackageMetadata {
  version: string;
  /**
   * パッケージ形式の世代。直近2世代のみサポート。
   * 旧パッケージには存在しないため optional。
   */
  packageFormatVersion?: number;
  /**
   * ER図JSONのスキーマ世代。直近2世代のみサポート。
   * 旧パッケージには存在しないため optional。
   */
  diagramSchemaVersion?: number;
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
  diagram: string | { v: 1; encrypted: string; salt: string; iv: string }; // JSON string (暗号化時は暗号化済み)
}

// 現在のバージョン
const PACKAGE_VERSION = '1.0.0';
const APP_VERSION = (typeof __APP_VERSION__ === 'string' && __APP_VERSION__) || '0.0.0';

function normalizePackageFormatVersion(metadata: PackageMetadata): number {
  if (typeof metadata.packageFormatVersion === 'number') return metadata.packageFormatVersion;

  // 旧: version(semver) の major を formatVersion と見なす
  const raw = metadata.version;
  if (typeof raw !== 'string') return 0;
  const major = Number.parseInt(raw.split('.')[0] || '0', 10);
  return Number.isFinite(major) ? major : 0;
}

const PACKAGE_FORMAT_VERSION = 1;
const MIN_SUPPORTED_PACKAGE_FORMAT_VERSION = Math.max(0, PACKAGE_FORMAT_VERSION - 2);

function inferDiagramSchemaVersionFromJson(diagramJson: string): number | null {
  try {
    const parsed = JSON.parse(diagramJson) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;

    const asRecord = parsed as Record<string, unknown>;
    const v = asRecord.schemaVersion;
    if (typeof v === 'number' && Number.isFinite(v)) return v;

    // legacy形式（envelopeなし）は v0 相当として扱う
    if ('tables' in asRecord || 'relations' in asRecord || 'memos' in asRecord) return 0;

    return null;
  } catch {
    return null;
  }
}

export interface ImportPackageResult {
  success: boolean;
  error?: string;
  project?: Project;
  /**
   * 暗号化パッケージのためパスフレーズが必要。
   * filePath が返る場合、同一ファイルで再試行可能。
   */
  requiresPassphrase?: boolean;
  filePath?: string;
}

function pickFirstPath(file: string | string[] | null): string | null {
  if (!file) return null;
  if (Array.isArray(file)) return file[0] ?? null;
  return file;
}

function generateSaltBase64(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * プロジェクトを .waiwai パッケージとしてエクスポート
 */
export async function exportPackage(
  project: Project,
  passphrase?: string
): Promise<{ success: boolean; error?: string; path?: string }> {
  try {
    if (project.isEncrypted && !passphrase) {
      return { success: false, error: '暗号化プロジェクトのエクスポートにはパスフレーズが必要です' };
    }

    // ダイアグラムデータを取得
    const diagram = await loadDiagram(project.id, { passphrase });
    if (!diagram) {
      return { success: false, error: 'ダイアグラムデータが見つかりません' };
    }

    const exportDiagram = filterDiagramForExport(diagram, 'package');

    // パッケージ内のダイアグラムは常に envelope 形式で格納する
    const diagramJson = JSON.stringify(encodeDiagramEnvelope(exportDiagram));

    // メタデータを構築
    const metadata: PackageMetadata = {
      version: PACKAGE_VERSION,
      packageFormatVersion: PACKAGE_FORMAT_VERSION,
      diagramSchemaVersion: DIAGRAM_SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      projectId: project.id,
      projectName: project.name,
      // パッケージ内データが暗号化されているか（プロジェクト状態とは独立）
      isEncrypted: !!passphrase,
      description: project.description,
      tables: exportDiagram.tables?.length || 0,
      relations: exportDiagram.relations?.length || 0,
    };

    // ダイアグラムデータを準備（暗号化オプション）
    let diagramData: PackageContent['diagram'] = diagramJson;
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
): Promise<ImportPackageResult> {
  try {
    // ファイルを選択
    const picked = await open({
      filters: [
        {
          name: 'WaiwaiER Package',
          extensions: ['waiwai'],
        },
      ],
    });

    const filePath = pickFirstPath(picked);
    if (!filePath) {
      return { success: false, error: 'キャンセルされました' };
    }

    return await importPackageFromFile(filePath, passphrase);
  } catch (error) {
    console.error('Package import failed:', error);
    return {
      success: false,
      error: `インポートに失敗しました: ${error}`,
    };
  }
}

export async function importPackageFromFile(
  filePath: string,
  passphrase?: string
): Promise<ImportPackageResult> {
  try {
    // ファイルを読み込み
    const content = await readFile(filePath);
    const jsonString = new TextDecoder().decode(content);
    const packageContent: PackageContent = JSON.parse(jsonString);

    // バージョン確認
    if (!packageContent.metadata || !packageContent.metadata.version) {
      return { success: false, error: '無効なパッケージ形式です' };
    }

    const metadata = packageContent.metadata;

    // パッケージ形式の世代チェック（直近2世代のみ）
    const packageFormatVersion = normalizePackageFormatVersion(metadata);
    if (packageFormatVersion > PACKAGE_FORMAT_VERSION) {
      return {
        success: false,
        error: `このパッケージは新しいバージョンで作成されています。アプリをアップデートしてください。（パッケージ世代: v${packageFormatVersion} / サポート: v${MIN_SUPPORTED_PACKAGE_FORMAT_VERSION}〜v${PACKAGE_FORMAT_VERSION}）`,
      };
    }
    if (packageFormatVersion < MIN_SUPPORTED_PACKAGE_FORMAT_VERSION) {
      return {
        success: false,
        error: `このパッケージは古すぎるため、このバージョンではインポートできません。中間バージョンを経由してアップデートしてください。（パッケージ世代: v${packageFormatVersion} / サポート: v${MIN_SUPPORTED_PACKAGE_FORMAT_VERSION}〜v${PACKAGE_FORMAT_VERSION}）`,
      };
    }

    // 暗号化されている場合はパスフレーズが必要
    let diagramJson = typeof packageContent.diagram === 'string' ? packageContent.diagram : JSON.stringify(packageContent.diagram);
    if (metadata.isEncrypted) {
      if (!passphrase) {
        return {
          success: false,
          requiresPassphrase: true,
          filePath,
          error: 'このパッケージは暗号化されています。パスフレーズを入力してください。',
        };
      }

      try {
        if (typeof packageContent.diagram === 'string') {
          // 旧形式（未暗号化扱い）
          diagramJson = packageContent.diagram;
        } else {
          diagramJson = await decryptData(
            packageContent.diagram.encrypted,
            packageContent.diagram.salt,
            packageContent.diagram.iv,
            passphrase
          );
        }
      } catch {
        return { success: false, error: 'パスフレーズが正しくありません' };
      }
    }

    // ダイアグラムスキーマ世代チェック（直近2世代のみ）
    // metadata.diagramSchemaVersion が無い旧パッケージでも、実データから推定して誤判定を減らす。
    const metadataDiagramSchemaVersion =
      typeof metadata.diagramSchemaVersion === 'number' ? metadata.diagramSchemaVersion : null;
    const inferredDiagramSchemaVersion = inferDiagramSchemaVersionFromJson(diagramJson);
    const diagramSchemaVersion = metadataDiagramSchemaVersion ?? inferredDiagramSchemaVersion ?? 0;

    if (diagramSchemaVersion > DIAGRAM_SCHEMA_VERSION) {
      return {
        success: false,
        error: `このパッケージ内のデータは新しいバージョンで作成されています。アプリをアップデートしてください。（データ世代: v${diagramSchemaVersion} / サポート: v${MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION}〜v${DIAGRAM_SCHEMA_VERSION}）`,
      };
    }
    if (diagramSchemaVersion < MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION) {
      return {
        success: false,
        error: `このパッケージ内のデータは古すぎるため、このバージョンではインポートできません。中間バージョンを経由してアップデートしてください。（データ世代: v${diagramSchemaVersion} / サポート: v${MIN_SUPPORTED_DIAGRAM_SCHEMA_VERSION}〜v${DIAGRAM_SCHEMA_VERSION}）`,
      };
    }

    // ダイアグラムは v0(legacy) / v1(envelope) の両方を受け入れてmigrate
    const diagram = decodeAndMigrateDiagram(diagramJson);
    if (!diagram) {
      return { success: false, error: 'ダイアグラムデータの読み込みに失敗しました' };
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
    let passphraseSalt: string | undefined;
    let passphraseHash: string | undefined;
    if (metadata.isEncrypted) {
      passphraseSalt = generateSaltBase64();
      passphraseHash = await hashPassphrase(passphrase ?? '', passphraseSalt);
    }

    const newProject: Project = {
      id: newProjectId,
      name: newProjectName,
      description: metadata.description,
      isEncrypted: metadata.isEncrypted,
      passphraseSalt,
      passphraseHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // プロジェクトとダイアグラムを保存
    await saveProject(newProject);
    await saveDiagram(newProjectId, diagram, { passphrase: metadata.isEncrypted ? passphrase : undefined });

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
