import { memo, useMemo } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import type { EdgeProps } from 'reactflow';
import { ArrowRight as DefaultFollowerIcon } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';

import { coerceLucideIconName } from '../../lib/lucideIcons';
import { useERStore } from '../../stores';
import { useFollowerAnimation } from '../../hooks/useFollowerAnimation';
import { useEdgeLabelEdit } from '../../hooks/useEdgeLabelEdit';
import { getCustomBezierPath, calculateEdgeCurvature } from './utils/bezierPath';

interface RelationEdgeData {
  label?: string;
  rawLabel?: string;
  autoLabel?: string;
  offsetIndex?: number;
  totalEdges?: number;
  isDimmed?: boolean;
  followerIconEnabled?: boolean;
  followerIconName?: string;
  followerIconSize?: number;
  followerIconSpeed?: number;
}

// スタイル定数
const EDGE_STYLES = {
  default: {
    stroke: 'var(--edge-color, #6366f1)',
    strokeWidth: 2,
  },
  selected: {
    stroke: 'var(--edge-selected-color, #f59e0b)',
    strokeWidth: 4,
    filter: 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))',
  },
} as const;

/**
 * 同じテーブル間に複数のリレーションがある場合にオフセットを適用するカスタムエッジ
 */
export const RelationEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
  selected,
}: EdgeProps<RelationEdgeData>) => {
  const updateRelation = useERStore((state) => state.updateRelation);

  // データ抽出
  const followerIconEnabled = data?.followerIconEnabled ?? false;
  const followerIconNameRaw = data?.followerIconName ?? 'arrow-right';
  const followerIconSize = data?.followerIconSize ?? 14;
  const followerIconSpeed = data?.followerIconSpeed ?? 90;
  const offsetIndex = data?.offsetIndex ?? 0;
  const totalEdges = data?.totalEdges ?? 1;
  const label = data?.label;
  const rawLabel = data?.rawLabel;
  const autoLabel = data?.autoLabel;
  const isDimmed = data?.isDimmed ?? false;

  // 曲線のオフセット量を計算
  const curvature = useMemo(
    () => calculateEdgeCurvature(offsetIndex, totalEdges),
    [offsetIndex, totalEdges]
  );

  // カスタムベジェパスを生成
  const [edgePath, labelX, labelY] = useMemo(
    () =>
      getCustomBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
        curvature,
      }),
    [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature]
  );

  // フォロワーアイコンのアニメーション
  const { pathRef: followerPathRef, followerRef: followerElRef } = useFollowerAnimation({
    enabled: followerIconEnabled,
    speed: followerIconSpeed,
    edgePath,
  });

  // ラベル編集
  const {
    isEditing,
    draftLabel,
    inputRef,
    setDraftLabel,
    startEditing,
    handleBlur,
    handleKeyDown,
  } = useEdgeLabelEdit({
    edgeId: id,
    label,
    rawLabel,
    autoLabel,
    onUpdate: updateRelation,
  });

  const followerIconName = coerceLucideIconName(followerIconNameRaw, 'arrow-right');

  // エッジスタイルを計算
  const edgeStyle = useMemo(
    () => ({
      ...(selected ? EDGE_STYLES.selected : EDGE_STYLES.default),
      ...style,
    }),
    [selected, style]
  );

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={edgeStyle}
        markerEnd={markerEnd}
        interactionWidth={20}
      />

      {followerIconEnabled && (
        <>
          <path ref={followerPathRef} d={edgePath} fill="none" stroke="none" pointerEvents="none" />
          <EdgeLabelRenderer>
            <div
              ref={followerElRef}
              className="nodrag nopan"
              style={{
                position: 'absolute',
                width: followerIconSize,
                height: followerIconSize,
                pointerEvents: 'none',
                opacity: isDimmed ? 0.35 : 1,
                color: 'var(--text-primary)',
                transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              }}
            >
              <DynamicIcon
                name={followerIconName}
                size={followerIconSize}
                fallback={() => <DefaultFollowerIcon size={followerIconSize} />}
              />
            </div>
          </EdgeLabelRenderer>
        </>
      )}

      {label && (
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={10}
          fontWeight={600}
          fill="var(--edge-color, #6366f1)"
          stroke="var(--background, #ffffff)"
          strokeWidth={3}
          paintOrder="stroke"
          opacity={isDimmed ? 0.3 : 1}
          style={{ cursor: 'text', pointerEvents: 'all' }}
          onDoubleClick={(e) => {
            e.stopPropagation();
            startEditing();
          }}
        >
          {label}
        </text>
      )}

      {!isEditing && rawLabel === '' && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              width: 28,
              height: 16,
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              cursor: 'text',
              opacity: isDimmed ? 0.3 : 1,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => {
              e.stopPropagation();
              startEditing();
            }}
          />
        </EdgeLabelRenderer>
      )}

      {isEditing && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              opacity: isDimmed ? 0.6 : 1,
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onDoubleClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={draftLabel}
              onChange={(e) => setDraftLabel(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--edge-color, #6366f1)',
                backgroundColor: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
              }}
              className="rounded border px-1 py-0.5 leading-none shadow-sm"
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

RelationEdge.displayName = 'RelationEdge';
