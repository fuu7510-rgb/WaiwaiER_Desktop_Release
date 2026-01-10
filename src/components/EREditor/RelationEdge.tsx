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
  edgeVisibility?: 'rootOnly';
}

function positionToDir(pos: 'left' | 'right' | 'top' | 'bottom'): { x: number; y: number } {
  switch (pos) {
    case 'left':
      return { x: -1, y: 0 };
    case 'right':
      return { x: 1, y: 0 };
    case 'top':
      return { x: 0, y: -1 };
    case 'bottom':
      return { x: 0, y: 1 };
  }
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function buildRootOnlyPath(args: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: 'left' | 'right' | 'top' | 'bottom';
  targetPosition: 'left' | 'right' | 'top' | 'bottom';
}): string {
  const { sourceX, sourceY, targetX, targetY, sourcePosition: _sourcePosition, targetPosition } = args;

  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // 短めに。距離に応じて少し伸びるが上限は小さく。
  const stubLen = clamp(distance * 0.06, 6, 20);

  const tDir = positionToDir(targetPosition);
  const tx2 = targetX + tDir.x * stubLen;
  const ty2 = targetY + tDir.y * stubLen;

  // 子(ターゲット)テーブル側だけ残す
  return `M ${tx2} ${ty2} L ${targetX} ${targetY}`;
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
  const isRootOnly = data?.edgeVisibility === 'rootOnly';

  // 曲線のオフセット量を計算
  const curvature = useMemo(
    () => calculateEdgeCurvature(offsetIndex, totalEdges),
    [offsetIndex, totalEdges]
  );

  // カスタムベジェパス（通常表示用）を生成
  const [fullEdgePath, labelX, labelY] = useMemo(
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

  const edgePath = useMemo(() => {
    if (!isRootOnly) return fullEdgePath;
    return buildRootOnlyPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  }, [isRootOnly, fullEdgePath, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  // フォロワーアイコンのアニメーション
  const { pathRef: followerPathRef, followerRef: followerElRef } = useFollowerAnimation({
    enabled: followerIconEnabled && !isRootOnly,
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

      {followerIconEnabled && !isRootOnly && (
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

      {!isRootOnly && label && (
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

      {!isRootOnly && !isEditing && rawLabel === '' && (
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

      {!isRootOnly && isEditing && (
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
