import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BaseEdge, EdgeLabelRenderer } from 'reactflow';
import type { EdgeProps, Position } from 'reactflow';
import { ArrowRight as DefaultFollowerIcon } from 'lucide-react';
import { DynamicIcon } from 'lucide-react/dynamic';

import { coerceLucideIconName } from '../../lib/lucideIcons';

import { useERStore } from '../../stores';

interface RelationEdgeData {
  label?: string;
  rawLabel?: string;
  autoLabel?: string;
  offsetIndex?: number;  // 同じテーブルペア間のエッジのインデックス
  totalEdges?: number;   // 同じテーブルペア間のエッジの総数
  isDimmed?: boolean;
  followerIconEnabled?: boolean;
  followerIconName?: string;
  followerIconSize?: number;
  followerIconSpeed?: number;
}

/**
 * カスタムベジェ曲線パスを生成
 * 同じテーブル間に複数のリレーションがある場合、曲線の膨らみでオフセットを表現
 */
function getCustomBezierPath({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  curvature = 0,
}: {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourcePosition: Position;
  targetPosition: Position;
  curvature?: number;
}): [string, number, number] {
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // 制御点のベース距離（距離に応じて調整）
  const controlDistance = Math.min(distance * 0.5, 150);
  
  // ソース側の制御点方向
  let sourceControlX = sourceX;
  let sourceControlY = sourceY;
  
  if (sourcePosition === 'right') {
    sourceControlX = sourceX + controlDistance;
  } else if (sourcePosition === 'left') {
    sourceControlX = sourceX - controlDistance;
  } else if (sourcePosition === 'top') {
    sourceControlY = sourceY - controlDistance;
  } else if (sourcePosition === 'bottom') {
    sourceControlY = sourceY + controlDistance;
  }
  
  // ターゲット側の制御点方向
  let targetControlX = targetX;
  let targetControlY = targetY;
  
  if (targetPosition === 'right') {
    targetControlX = targetX + controlDistance;
  } else if (targetPosition === 'left') {
    targetControlX = targetX - controlDistance;
  } else if (targetPosition === 'top') {
    targetControlY = targetY - controlDistance;
  } else if (targetPosition === 'bottom') {
    targetControlY = targetY + controlDistance;
  }
  
  // curvatureによる曲線のオフセット（垂直方向に膨らませる）
  if (curvature !== 0) {
    // エッジの方向に垂直なベクトルを計算
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / length;
    const perpY = dx / length;
    
    // 制御点を垂直方向にオフセット
    const offsetAmount = curvature;
    sourceControlX += perpX * offsetAmount;
    sourceControlY += perpY * offsetAmount;
    targetControlX += perpX * offsetAmount;
    targetControlY += perpY * offsetAmount;
  }
  
  // 3次ベジェ曲線のパス
  const path = `M ${sourceX} ${sourceY} C ${sourceControlX} ${sourceControlY}, ${targetControlX} ${targetControlY}, ${targetX} ${targetY}`;
  
  // ラベル位置（曲線の中点付近）
  const t = 0.5;
  const labelX = Math.pow(1 - t, 3) * sourceX +
    3 * Math.pow(1 - t, 2) * t * sourceControlX +
    3 * (1 - t) * Math.pow(t, 2) * targetControlX +
    Math.pow(t, 3) * targetX;
  const labelY = Math.pow(1 - t, 3) * sourceY +
    3 * Math.pow(1 - t, 2) * t * sourceControlY +
    3 * (1 - t) * Math.pow(t, 2) * targetControlY +
    Math.pow(t, 3) * targetY;
  
  return [path, labelX, labelY];
}

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

  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const ignoreBlurRef = useRef(false);

  const followerPathRef = useRef<SVGPathElement | null>(null);
  const followerElRef = useRef<HTMLDivElement | null>(null);
  const followerRafRef = useRef<number | null>(null);
  const followerLastTsRef = useRef<number | null>(null);
  const followerLenRef = useRef<number>(0);

  const startEditing = useCallback(() => {
    setDraftLabel(label ?? '');
    setIsEditing(true);
  }, [label]);

  useEffect(() => {
    if (!isEditing) return;
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEditing]);

  const commit = useCallback(() => {
    const trimmed = draftLabel.trim();

    // 空文字は「非表示」として保存する
    if (trimmed.length === 0) {
      updateRelation(id, { label: '' });
      setIsEditing(false);
      return;
    }

    // 現在が自動ラベル(=未設定)で、入力も自動ラベルと同じなら未設定のままにする
    if (rawLabel === undefined && autoLabel && trimmed === autoLabel) {
      updateRelation(id, { label: undefined });
      setIsEditing(false);
      return;
    }

    updateRelation(id, { label: trimmed });
    setIsEditing(false);
  }, [autoLabel, draftLabel, id, rawLabel, updateRelation]);

  const cancel = useCallback(() => {
    setDraftLabel(label ?? '');
    setIsEditing(false);
  }, [label]);

  // 曲線のオフセット量を計算（エッジが複数ある場合に曲線の膨らみで分散）
  const curvature = useMemo(() => {
    if (totalEdges <= 1) return 0;
    
    // 中央を基準に上下に曲線を膨らませる
    // 例: totalEdges=2の場合: インデックス0は-40, インデックス1は+40
    // 例: totalEdges=3の場合: インデックス0は-50, インデックス1は0, インデックス2は+50
    const spacing = 50; // 曲線間の間隔（ピクセル）
    const centerOffset = (totalEdges - 1) / 2;
    return (offsetIndex - centerOffset) * spacing;
  }, [offsetIndex, totalEdges]);

  // カスタムベジェパスを生成
  const [edgePath, labelX, labelY] = useMemo(() => {
    return getCustomBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      curvature,
    });
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, curvature]);

  const followerIconName = coerceLucideIconName(followerIconNameRaw, 'arrow-right');

  useEffect(() => {
    if (!followerIconEnabled) return;

    const pathEl = followerPathRef.current;
    const followerEl = followerElRef.current;
    if (!pathEl || !followerEl) return;

    // パスが変わったら進捗をリセット（急なジャンプを避ける）
    followerLenRef.current = 0;
    followerLastTsRef.current = null;

    const tick = (ts: number) => {
      const total = pathEl.getTotalLength();
      if (!(total > 0)) {
        followerRafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const last = followerLastTsRef.current ?? ts;
      const dt = Math.max(0, (ts - last) / 1000);
      followerLastTsRef.current = ts;

      const nextLen = (followerLenRef.current + followerIconSpeed * dt) % total;
      followerLenRef.current = nextLen;

      const p = pathEl.getPointAtLength(nextLen);
      const p2 = pathEl.getPointAtLength((nextLen + 1) % total);
      const angle = Math.atan2(p2.y - p.y, p2.x - p.x) * (180 / Math.PI);

      followerEl.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) rotate(${angle}deg)`;
      followerRafRef.current = window.requestAnimationFrame(tick);
    };

    followerRafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (followerRafRef.current !== null) {
        window.cancelAnimationFrame(followerRafRef.current);
        followerRafRef.current = null;
      }
    };
  }, [followerIconEnabled, followerIconSpeed, edgePath]);

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#f59e0b' : '#6366f1',
          strokeWidth: selected ? 4 : 2,
          filter: selected ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.6))' : undefined,
          ...style,
        }}
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
                fallback={DefaultFollowerIcon}
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
          fill="#6366f1"
          stroke="#ffffff"
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
              onBlur={() => {
                if (ignoreBlurRef.current) {
                  ignoreBlurRef.current = false;
                  return;
                }
                commit();
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  ignoreBlurRef.current = true;
                  commit();
                }
                if (e.key === 'Escape') {
                  e.preventDefault();
                  ignoreBlurRef.current = true;
                  cancel();
                }
              }}
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#6366f1',
              }}
              className="rounded border border-zinc-200 bg-white px-1 py-0.5 leading-none shadow-sm"
            />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});

RelationEdge.displayName = 'RelationEdge';
