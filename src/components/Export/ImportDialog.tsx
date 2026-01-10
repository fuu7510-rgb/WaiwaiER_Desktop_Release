import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, Button } from '../common';
import { useERStore } from '../../stores';
import { parseJSONDiagramText, readJSONDiagramTextFromFile } from './importJSONDiagram';
import { validateAIGeneratedJSON, formatValidationResultForDisplay, type ValidationResult } from './validateAIGeneratedJSON';
import { parseDSL, isDSLFormat, isJSONFormat } from '../../lib/dslFormat';

type ImportMode = 'overwrite' | 'append';

interface ImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ImportDialog({ isOpen, onClose }: ImportDialogProps) {
  const { t } = useTranslation();
  const { importDiagram, mergeDiagram } = useERStore();

  const [jsonText, setJsonText] = useState('');
  const [detectedFormat, setDetectedFormat] = useState<'json' | 'dsl' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [showFixPrompt, setShowFixPrompt] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('overwrite');

  useEffect(() => {
    if (!isOpen) {
      setJsonText('');
      setDetectedFormat(null);
      setErrorMessage(null);
      setValidationResult(null);
      setShowFixPrompt(false);
      setIsImporting(false);
      setImportMode('overwrite');
    }
  }, [isOpen]);

  const handleLoadFromFile = useCallback(async () => {
    try {
      setErrorMessage(null);
      const content = await readJSONDiagramTextFromFile();
      if (content == null) return;
      setJsonText(content);
    } catch (error) {
      console.error('Load JSON from file failed:', error);
      setErrorMessage(t('import.importError'));
    }
  }, [t]);

  const handleImport = useCallback(async () => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setErrorMessage(t('import.pasteEmpty'));
      setValidationResult(null);
      setDetectedFormat(null);
      return;
    }

    // 形式を自動検出
    const formatIsDSL = isDSLFormat(trimmed);
    const formatIsJSON = isJSONFormat(trimmed);
    setDetectedFormat(formatIsDSL ? 'dsl' : formatIsJSON ? 'json' : null);

    if (formatIsDSL) {
      // DSL形式のパース
      try {
        setIsImporting(true);
        setErrorMessage(null);
        setValidationResult(null);

        const diagram = parseDSL(trimmed);
        if (importMode === 'overwrite') {
          importDiagram(diagram);
        } else {
          mergeDiagram(diagram);
        }
        onClose();
      } catch (error) {
        console.error('DSL import failed:', error);
        const message =
          error instanceof Error && error.message
            ? error.message
            : t('import.importError');
        setErrorMessage(message);
      } finally {
        setIsImporting(false);
      }
      return;
    }

    // JSON形式のバリデーションを実行
    const validation = validateAIGeneratedJSON(trimmed);
    setValidationResult(validation);

    if (!validation.isValid) {
      // エラーがある場合はユーザー向けメッセージを表示
      setErrorMessage(formatValidationResultForDisplay(validation));
      setShowFixPrompt(false);
      return;
    }

    // 警告のみの場合は続行可能
    if (validation.warnings.length > 0) {
      // 警告があることを表示しつつインポート続行
      console.warn('Import warnings:', validation.warnings);
    }

    try {
      setIsImporting(true);
      setErrorMessage(null);

      const diagram = parseJSONDiagramText(trimmed);
      if (importMode === 'overwrite') {
        importDiagram(diagram);
      } else {
        mergeDiagram(diagram);
      }
      onClose();
    } catch (error) {
      console.error('Import from pasted JSON failed:', error);
      const message =
        error instanceof Error && error.message
          ? error.message
          : t('import.importError');
      setErrorMessage(message);
    } finally {
      setIsImporting(false);
    }
  }, [importDiagram, mergeDiagram, jsonText, onClose, t, importMode]);

  const handleCopyFixPrompt = useCallback(async () => {
    if (validationResult?.combinedFixPrompt) {
      await navigator.clipboard.writeText(validationResult.combinedFixPrompt);
    }
  }, [validationResult]);

  const handleCopyDSLPromptTemplate = useCallback(async () => {
    const dslPromptTemplate = `# 指示

以下のデータベース設計書（Markdown形式）を読み取り、WaiwaiER（ER図モデリングツール）で読み込めるDSL形式に変換してください。

## DSL形式の構文

### テーブル定義
\`\`\`
TABLE テーブル名 "説明" PK=主キーカラム名 LABEL=ラベルカラム名 [COLOR=#RRGGBB]
\`\`\`

### 通常カラム定義
\`\`\`
COL テーブル名.カラム名 型 [req] [uniq] [virtual] "説明"
\`\`\`

### 外部キー（Ref型）定義
\`\`\`
REF テーブル名.カラム名 -> 参照先テーブル.参照先カラム [req] "説明"
\`\`\`
- \`->\` の左側: 外部キーを持つテーブル（子テーブル、N側）
- \`->\` の右側: 参照先テーブルの主キー（親テーブル、1側）

### メモ定義
\`\`\`
MEMO "メモ内容（複数行は \\n で表現）"
\`\`\`

## 型のマッピングルール
| DB型 | DSL型 |
|------|-------|
| BIGSERIAL, BIGINT, INTEGER | Number |
| VARCHAR, CHAR, TEXT | Text |
| TEXT（長文用途） | LongText |
| BOOLEAN | Yes/No |
| DATE | Date |
| TIMESTAMP, DATETIME | DateTime |
| DECIMAL, NUMERIC | Decimal |

カラム名からも型を推測：email→Email, phone→Phone, url→Url, price→Price

## 出力例
\`\`\`
TABLE orgs "組織" PK=id LABEL=org_name
COL orgs.id Number req uniq "主キー"
COL orgs.org_name Text req "組織名"
COL orgs.created_at DateTime req "作成日時"

TABLE users "ユーザー" PK=id LABEL=name
COL users.id Number req uniq "主キー"
COL users.name Text req "表示名"
COL users.email Email "メール"
REF users.org_id -> orgs.id req "所属組織"
\`\`\`

## 重要な注意事項
- 各テーブルには必ず1つのPKとLABELを指定
- 外部キーは必ずREF行で定義（COL行ではなく）
- TABLE行の後にそのテーブルのCOL/REF行を続ける

---
`;

    try {
      await navigator.clipboard.writeText(dslPromptTemplate);
    } catch (err) {
      console.error('Failed to copy DSL prompt template:', err);
    }
  }, []);

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title={t('import.title')} size="xl">
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{t('import.pasteHint')}</p>
          <Button variant="secondary" size="sm" onClick={handleLoadFromFile}>
            {t('import.selectFile')}
          </Button>
        </div>

        <textarea
          value={jsonText}
          onChange={(e) => {
            const value = e.currentTarget.value;
            setJsonText(value);
            // リアルタイムでフォーマットを検出
            const trimmed = value.trim();
            if (!trimmed) {
              setDetectedFormat(null);
            } else if (isDSLFormat(trimmed)) {
              setDetectedFormat('dsl');
            } else if (isJSONFormat(trimmed)) {
              setDetectedFormat('json');
            } else {
              setDetectedFormat(null);
            }
          }}
          aria-label={t('import.title')}
          placeholder={t('import.pastePlaceholder')}
          className="w-full h-60 rounded border p-2 font-mono text-[10px]"
          style={{
            backgroundColor: 'var(--input-bg)',
            borderColor: 'var(--input-border)',
            color: 'var(--text-primary)',
          }}
        />

        {/* 検出されたフォーマット表示 */}
        {detectedFormat && (
          <div
            className="rounded border p-2 text-[10px] flex items-center gap-2"
            style={{
              backgroundColor: detectedFormat === 'dsl' ? 'var(--accent-bg)' : 'var(--muted)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
            }}
          >
            <span>📝</span>
            <span>{t(`import.detectedFormat.${detectedFormat}`)}</span>
          </div>
        )}

        {/* インポートモード選択 */}
        <div className="p-3 rounded-md border" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
          <p className="text-[10px] font-medium mb-2" style={{ color: 'var(--text-primary)' }}>{t('import.modeLabel')}</p>
          <div className="flex flex-col gap-1.5">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="overwrite"
                checked={importMode === 'overwrite'}
                onChange={() => setImportMode('overwrite')}
                className="w-3 h-3"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('import.modeOverwrite')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="importMode"
                value="append"
                checked={importMode === 'append'}
                onChange={() => setImportMode('append')}
                className="w-3 h-3"
              />
              <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{t('import.modeAppend')}</span>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded border p-2 text-[10px]" style={{ backgroundColor: 'var(--danger)', borderColor: 'var(--danger)', color: 'white' }}>
            <pre className="whitespace-pre-wrap font-sans">{errorMessage}</pre>
          </div>
        )}

        {/* 修正プロンプト表示エリア */}
        {validationResult && !validationResult.isValid && validationResult.combinedFixPrompt && (
          <div className="rounded border p-2" style={{ backgroundColor: 'var(--muted)', borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-medium" style={{ color: 'var(--text-primary)' }}>
                {t('import.aiFixPromptTitle')}
              </p>
              <div className="flex gap-1">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowFixPrompt(!showFixPrompt)}
                >
                  {showFixPrompt ? t('import.hideFixPrompt') : t('import.showFixPrompt')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleCopyFixPrompt}
                >
                  {t('import.copyFixPrompt')}
                </Button>
              </div>
            </div>
            <p className="text-[9px] mb-2" style={{ color: 'var(--text-muted)' }}>
              {t('import.aiFixPromptHint')}
            </p>
            {showFixPrompt && (
              <textarea
                readOnly
                value={validationResult.combinedFixPrompt}
                className="w-full h-40 rounded border p-2 font-mono text-[9px]"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
            )}
          </div>
        )}

        <div className="flex justify-between items-center gap-2 pt-2">
          <div className="flex gap-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyDSLPromptTemplate}
              title={t('import.copyDSLPromptTemplate')}
            >
              {t('import.copyDslPrompt')}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" onClick={handleImport} disabled={isImporting}>
              {isImporting
                ? t('common.loading')
                : importMode === 'overwrite'
                  ? t('import.importOverwrite')
                  : t('import.importAppend')}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
