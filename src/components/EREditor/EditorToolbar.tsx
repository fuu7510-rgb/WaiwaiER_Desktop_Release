import { useTranslation } from 'react-i18next';
import { Button } from '../common/Button';

interface EditorToolbarProps {
  zoom: number;
  isMemosVisible: boolean;
  isRelationHighlightEnabled: boolean;
  isGridVisible: boolean;
  isAnimationTemporarilyEnabled: boolean;
  memosLength: number;
  tablesCount: number;
  toggleMemosVisible: () => void;
  toggleRelationHighlight: () => void;
  toggleGridVisible: () => void;
  toggleAnimationEnabled: () => void;
  addMemo: (position: { x: number; y: number }) => void;
  setAllTablesCollapsed: (collapsed: boolean) => void;
}

export function EditorToolbar({
  zoom,
  isMemosVisible,
  isRelationHighlightEnabled,
  isGridVisible,
  isAnimationTemporarilyEnabled,
  memosLength,
  tablesCount,
  toggleMemosVisible,
  toggleRelationHighlight,
  toggleGridVisible,
  toggleAnimationEnabled,
  addMemo,
  setAllTablesCollapsed,
}: EditorToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="absolute left-16 bottom-3 z-10 flex flex-col gap-2">
      <div 
        className="select-none rounded-md border px-2 py-1 text-xs shadow-sm"
        style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        {t('editor.zoomLevel', { percent: Math.round(zoom * 100) })}
      </div>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={toggleMemosVisible}
        aria-pressed={isMemosVisible}
        title={isMemosVisible ? t('editor.hideMemos') : t('editor.showMemos')}
      >
        {t('editor.memo')}: {isMemosVisible ? 'ON' : 'OFF'}
      </Button>

      {isMemosVisible && (
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={() => {
          const offset = memosLength * 24;
          addMemo({ x: 200 + offset, y: 200 + offset });
        }}
        title={t('editor.addMemoTooltip')}
      >
        {t('editor.addMemo')}
      </Button>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={toggleRelationHighlight}
        aria-pressed={isRelationHighlightEnabled}
        title={
          isRelationHighlightEnabled
            ? t('editor.disableRelationHighlight')
            : t('editor.enableRelationHighlight')
        }
      >
        {t('editor.relationHighlight')}: {isRelationHighlightEnabled ? 'ON' : 'OFF'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={toggleGridVisible}
        aria-pressed={isGridVisible}
        title={isGridVisible ? t('editor.hideGrid') : t('editor.showGrid')}
      >
        {t('editor.grid')}: {isGridVisible ? 'ON' : 'OFF'}
      </Button>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={toggleAnimationEnabled}
        aria-pressed={isAnimationTemporarilyEnabled}
        title={
          isAnimationTemporarilyEnabled
            ? t('editor.disableAnimations')
            : t('editor.enableAnimations')
        }
      >
        {t('editor.animations')}: {isAnimationTemporarilyEnabled ? 'ON' : 'OFF'}
      </Button>

      {tablesCount > 0 && (
        <>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAllTablesCollapsed(true)}
            title={t('editor.collapseAllTables')}
          >
            {t('editor.collapseAll')}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => setAllTablesCollapsed(false)}
            title={t('editor.expandAllTables')}
          >
            {t('editor.expandAll')}
          </Button>
        </>
      )}
    </div>
  );
}
