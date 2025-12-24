import { open } from '@tauri-apps/plugin-dialog';
import { readTextFile } from '@tauri-apps/plugin-fs';
import type { ERDiagram } from '../../types';

// JSONインポート機能
export async function importJSONDiagram(): Promise<ERDiagram | null> {
  try {
    const filePath = await open({
      filters: [{ name: 'JSON', extensions: ['json'] }],
      multiple: false,
    });

    if (!filePath) return null;

    const content = await readTextFile(filePath as string);
    const diagram = JSON.parse(content) as ERDiagram;

    // 基本的なバリデーション
    if (!diagram.tables || !Array.isArray(diagram.tables)) {
      throw new Error('Invalid diagram format: tables missing');
    }
    if (!diagram.relations || !Array.isArray(diagram.relations)) {
      diagram.relations = [];
    }

    if (!('memos' in diagram) || !Array.isArray((diagram as ERDiagram).memos)) {
      (diagram as ERDiagram).memos = [];
    }

    return diagram;
  } catch (error) {
    console.error('Import failed:', error);
    throw error;
  }
}
