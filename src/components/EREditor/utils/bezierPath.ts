import type { Position } from 'reactflow';

/**
 * カスタムベジェ曲線パスを生成
 * 同じテーブル間に複数のリレーションがある場合、曲線の膨らみでオフセットを表現
 */
export function getCustomBezierPath({
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
}): [path: string, labelX: number, labelY: number] {
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
  const labelX =
    Math.pow(1 - t, 3) * sourceX +
    3 * Math.pow(1 - t, 2) * t * sourceControlX +
    3 * (1 - t) * Math.pow(t, 2) * targetControlX +
    Math.pow(t, 3) * targetX;
  const labelY =
    Math.pow(1 - t, 3) * sourceY +
    3 * Math.pow(1 - t, 2) * t * sourceControlY +
    3 * (1 - t) * Math.pow(t, 2) * targetControlY +
    Math.pow(t, 3) * targetY;

  return [path, labelX, labelY];
}

/**
 * 複数エッジ間の曲線オフセット量を計算
 */
export function calculateEdgeCurvature(offsetIndex: number, totalEdges: number): number {
  if (totalEdges <= 1) return 0;

  // 中央を基準に上下に曲線を膨らませる
  // 例: totalEdges=2の場合: インデックス0は-40, インデックス1は+40
  // 例: totalEdges=3の場合: インデックス0は-50, インデックス1は0, インデックス2は+50
  const spacing = 50; // 曲線間の間隔（ピクセル）
  const centerOffset = (totalEdges - 1) / 2;
  return (offsetIndex - centerOffset) * spacing;
}
