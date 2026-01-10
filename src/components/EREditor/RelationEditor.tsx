import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useERStore, useUIStore } from '../../stores';
import { CollapsibleSection, IconPicker, Input, Select } from '../common';

type LabelMode = 'auto' | 'hidden' | 'custom';
type EdgeAnimationMode = 'default' | 'on' | 'off';
type EdgeLineStyleMode = 'default' | 'solid' | 'dashed' | 'dotted';
type FollowerIconMode = 'default' | 'on' | 'off';
type EdgeVisibilityMode = 'full' | 'rootOnly';

function getLabelMode(label: string | undefined): LabelMode {
  if (label === undefined) return 'auto';
  if (label === '') return 'hidden';
  return 'custom';
}

export function RelationEditor() {
  const { t } = useTranslation();
  const { relations, tables, selectedRelationId, updateRelation } = useERStore();
  const { settings } = useUIStore();

  const selectedRelation = relations.find((r) => r.id === selectedRelationId) ?? null;

  const resolved = useMemo(() => {
    if (!selectedRelation) return null;

    const sourceTable = tables.find((tb) => tb.id === selectedRelation.sourceTableId) ?? null;
    const targetTable = tables.find((tb) => tb.id === selectedRelation.targetTableId) ?? null;

    const sourceColumn =
      sourceTable?.columns.find((c) => c.id === selectedRelation.sourceColumnId) ?? null;
    const targetColumn =
      targetTable?.columns.find((c) => c.id === selectedRelation.targetColumnId) ?? null;

    return { sourceTable, targetTable, sourceColumn, targetColumn };
  }, [selectedRelation, tables]);

  const typeOptions = useMemo(
    () => [
      { value: 'one-to-one', label: t('relation.oneToOne') },
      { value: 'one-to-many', label: t('relation.oneToMany') },
      { value: 'many-to-many', label: t('relation.manyToMany') },
    ],
    [t]
  );

  const labelModeOptions = useMemo(
    () => [
      { value: 'auto', label: t('relation.label.modes.auto') },
      { value: 'hidden', label: t('relation.label.modes.hidden') },
      { value: 'custom', label: t('relation.label.modes.custom') },
    ],
    [t]
  );

  const edgeAnimationOptions = useMemo(
    () => [
      { value: 'default', label: t('relation.edgeAnimation.modes.default') },
      { value: 'on', label: t('relation.edgeAnimation.modes.on') },
      { value: 'off', label: t('relation.edgeAnimation.modes.off') },
    ],
    [t]
  );

  const followerIconModeOptions = useMemo(
    () => [
      { value: 'default', label: t('relation.edgeFollowerIconAnimation.modes.default') },
      { value: 'on', label: t('relation.edgeFollowerIconAnimation.modes.on') },
      { value: 'off', label: t('relation.edgeFollowerIconAnimation.modes.off') },
    ],
    [t]
  );

  const edgeLineStyleOptions = useMemo(
    () => [
      { value: 'default', label: t('relation.edgeLineStyle.modes.default') },
      { value: 'solid', label: t('relation.edgeLineStyle.modes.solid') },
      { value: 'dashed', label: t('relation.edgeLineStyle.modes.dashed') },
      { value: 'dotted', label: t('relation.edgeLineStyle.modes.dotted') },
    ],
    [t]
  );

  const edgeVisibilityOptions = useMemo(
    () => [
      { value: 'full', label: t('relation.edgeVisibility.modes.full') },
      { value: 'rootOnly', label: t('relation.edgeVisibility.modes.rootOnly') },
    ],
    [t]
  );

  // 追従アイコンは自由入力(datalist)で指定する

  const handleUpdate = useCallback(
    (
      updates: Partial<{
        type: 'one-to-one' | 'one-to-many' | 'many-to-many';
        label: string | undefined;
      }>
    ) => {
      if (!selectedRelationId) return;
      updateRelation(selectedRelationId, updates);
    },
    [selectedRelationId, updateRelation]
  );

  const handleEdgeLineStyleUpdate = useCallback(
    (mode: EdgeLineStyleMode) => {
      if (!selectedRelationId) return;
      if (mode === 'default') {
        updateRelation(selectedRelationId, { edgeLineStyle: undefined });
        return;
      }
      updateRelation(selectedRelationId, { edgeLineStyle: mode });
    },
    [selectedRelationId, updateRelation]
  );

  const handleEdgeAnimationUpdate = useCallback(
    (mode: EdgeAnimationMode) => {
      if (!selectedRelationId) return;
      if (mode === 'default') {
        updateRelation(selectedRelationId, { edgeAnimationEnabled: undefined });
        return;
      }
      updateRelation(selectedRelationId, { edgeAnimationEnabled: mode === 'on' });
    },
    [selectedRelationId, updateRelation]
  );

  const handleFollowerIconModeUpdate = useCallback(
    (mode: FollowerIconMode) => {
      if (!selectedRelationId) return;
      if (mode === 'default') {
        updateRelation(selectedRelationId, { edgeFollowerIconEnabled: undefined });
        return;
      }
      updateRelation(selectedRelationId, { edgeFollowerIconEnabled: mode === 'on' });
    },
    [selectedRelationId, updateRelation]
  );

  // Keep this guard AFTER all hooks so hook order/count never changes.
  if (!selectedRelation) return null;

  const relationId = selectedRelation.id;

  const labelMode = getLabelMode(selectedRelation.label);
  const edgeAnimationMode: EdgeAnimationMode =
    selectedRelation.edgeAnimationEnabled === undefined
      ? 'default'
      : selectedRelation.edgeAnimationEnabled
        ? 'on'
        : 'off';

  const edgeLineStyleMode: EdgeLineStyleMode =
    selectedRelation.edgeLineStyle === undefined
      ? 'default'
      : selectedRelation.edgeLineStyle as EdgeLineStyleMode;

  const edgeVisibilityMode: EdgeVisibilityMode =
    selectedRelation.edgeVisibility === 'rootOnly' ? 'rootOnly' : 'full';

  const followerIconMode: FollowerIconMode =
    selectedRelation.edgeFollowerIconEnabled === undefined
      ? 'default'
      : selectedRelation.edgeFollowerIconEnabled
        ? 'on'
        : 'off';

  // 追従アイコン設定欄の有効/無効判定
  // ON の場合のみ有効（独自設定可能）
  // デフォルト/OFF の場合は無効（暗くする）
  const isFollowerIconSettingsEnabled = followerIconMode === 'on';

  // 表示用の値（デフォルト時はユーザー設定の値を使用）
  const displayFollowerIconName =
    followerIconMode === 'on'
      ? (selectedRelation.edgeFollowerIconName ?? 'arrow-right')
      : (settings.edgeFollowerIconName ?? 'arrow-right');
  const displayFollowerIconSize =
    followerIconMode === 'on'
      ? (selectedRelation.edgeFollowerIconSize ?? 14)
      : (settings.edgeFollowerIconSize ?? 14);
  const displayFollowerIconSpeed =
    followerIconMode === 'on'
      ? (selectedRelation.edgeFollowerIconSpeed ?? 90)
      : (settings.edgeFollowerIconSpeed ?? 90);

  return (
    <div className="p-4 space-y-4">
      <h3 className="font-bold text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
        {t('relation.settingsTitle')}
      </h3>

      <CollapsibleSection title={t('relation.sections.display')} storageKey="relation-editor-display" defaultOpen={true}>
        <div className="space-y-3">
          {/* 表示 */}
          <Select
            label={t('relation.edgeAnimation.title')}
            value={edgeAnimationMode}
            onChange={(e) => handleEdgeAnimationUpdate(e.target.value as EdgeAnimationMode)}
            options={edgeAnimationOptions}
          />

          <Select
            label={t('relation.edgeLineStyle.title')}
            value={edgeLineStyleMode}
            onChange={(e) => handleEdgeLineStyleUpdate(e.target.value as EdgeLineStyleMode)}
            options={edgeLineStyleOptions}
          />

          <Select
            label={t('relation.edgeVisibility.title')}
            value={edgeVisibilityMode}
            onChange={(e) => {
              const mode = e.target.value as EdgeVisibilityMode;
              if (mode === 'full') {
                updateRelation(relationId, { edgeVisibility: undefined });
                return;
              }
              updateRelation(relationId, { edgeVisibility: 'rootOnly' });
            }}
            options={edgeVisibilityOptions}
          />
          <p className="-mt-2 text-[10px] theme-text-muted">{t('relation.edgeVisibility.description')}</p>

          <Select
            label={t('relation.label.title')}
            value={labelMode}
            onChange={(e) => {
              const nextMode = e.target.value as LabelMode;
              if (nextMode === 'auto') {
                handleUpdate({ label: undefined });
                return;
              }
              if (nextMode === 'hidden') {
                handleUpdate({ label: '' });
                return;
              }
              // custom
              const current = selectedRelation.label;
              const seed = current === undefined || current === '' ? '' : current;
              handleUpdate({ label: seed });
            }}
            options={labelModeOptions}
          />

          <Input
            label={t('relation.label.customText')}
            placeholder={t('relation.label.customTextPlaceholder')}
            value={selectedRelation.label ?? ''}
            onChange={(e) => {
              // 入力があれば自動的にカスタムモードに切り替え
              handleUpdate({ label: e.target.value });
            }}
          />
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t('relation.sections.iconAnimation')} storageKey="relation-editor-icon-animation" defaultOpen={true}>
        <div className="space-y-3">
          <Select
            label={t('relation.edgeFollowerIconAnimation.title')}
            value={followerIconMode}
            onChange={(e) => handleFollowerIconModeUpdate(e.target.value as FollowerIconMode)}
            options={followerIconModeOptions}
          />
          <p className="-mt-2 text-[10px] theme-text-muted">{t('relation.edgeFollowerIconAnimation.description')}</p>

          <div 
            className="grid grid-cols-3 gap-2.5"
            style={{ opacity: isFollowerIconSettingsEnabled ? 1 : 0.5 }}
          >
            <IconPicker
              label={t('settings.editor.edgeFollowerIcon.icon')}
              value={displayFollowerIconName}
              onChange={(iconName: string) => updateRelation(relationId, { edgeFollowerIconName: iconName })}
              disabled={!isFollowerIconSettingsEnabled}
            />

            <Input
              label={t('settings.editor.edgeFollowerIcon.size')}
              type="number"
              min={8}
              max={48}
              step={1}
              disabled={!isFollowerIconSettingsEnabled}
              value={String(displayFollowerIconSize)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                updateRelation(relationId, {
                  edgeFollowerIconSize: Math.max(8, Math.min(48, Math.trunc(n))),
                });
              }}
            />

            <Input
              label={t('settings.editor.edgeFollowerIcon.speed')}
              type="number"
              min={10}
              max={1000}
              step={5}
              disabled={!isFollowerIconSettingsEnabled}
              value={String(displayFollowerIconSpeed)}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) return;
                updateRelation(relationId, {
                  edgeFollowerIconSpeed: Math.max(10, Math.min(1000, n)),
                });
              }}
            />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title={t('relation.sections.relationSettings')} storageKey="relation-editor-relation-settings" defaultOpen={true}>
        <div className="space-y-3">
          {/* リレーション設定 */}
          <Input label={t('relation.sourceTable')} value={resolved?.sourceTable?.name ?? ''} disabled />
          <Input label={t('relation.sourceColumn')} value={resolved?.sourceColumn?.name ?? ''} disabled />
          <Input label={t('relation.targetTable')} value={resolved?.targetTable?.name ?? ''} disabled />
          <Input label={t('relation.targetColumn')} value={resolved?.targetColumn?.name ?? ''} disabled />

          <Select
            label={t('relation.type')}
            value={selectedRelation.type}
            onChange={(e) => {
              const nextType = e.target.value as 'one-to-one' | 'one-to-many' | 'many-to-many';
              handleUpdate({ type: nextType });
            }}
            options={typeOptions}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
}
