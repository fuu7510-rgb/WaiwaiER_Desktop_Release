import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import type { ERDiagram } from '../../types';

export function parseJSONDiagramText(content: string): ERDiagram {
  const diagram = JSON.parse(content) as ERDiagram;

  // 基本的なバリデーション
  if (!diagram || typeof diagram !== 'object') {
    throw new Error('Invalid diagram format');
  }
  if (!('tables' in diagram) || !Array.isArray(diagram.tables)) {
    throw new Error('Invalid diagram format: tables missing');
  }

  return {
    ...diagram,
    relations: Array.isArray(diagram.relations) ? diagram.relations : [],
    memos: Array.isArray(diagram.memos) ? diagram.memos : [],
  };
}

export async function readJSONDiagramTextFromFile(): Promise<string | null> {
  const filePath = await open({
    filters: [{ name: 'JSON / DSL', extensions: ['json', 'dsl'] }],
    multiple: false,
  });

  if (!filePath) return null;

  return await readTextFile(filePath as string);
}

// JSONインポート機能（ファイル選択）
export async function importJSONDiagram(): Promise<ERDiagram | null> {
  try {
    const content = await readJSONDiagramTextFromFile();
    if (content == null) return null;
    return parseJSONDiagramText(content);
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}
