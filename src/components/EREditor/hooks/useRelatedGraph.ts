import { useMemo } from 'react';
import type { Relation } from '../../../types';

interface RelatedGraphResult {
  hasSelection: boolean;
  upstreamTableIds: Set<string>;
  downstreamTableIds: Set<string>;
  relatedEdgeIds: Set<string>;
}

export function useRelatedGraph(
  selectedTableId: string | null,
  relations: Relation[],
  isRelationHighlightEnabled: boolean
): RelatedGraphResult {
  return useMemo(() => {
    const upstreamTableIds = new Set<string>();
    const downstreamTableIds = new Set<string>();
    const relatedEdgeIds = new Set<string>();

    if (!selectedTableId || !isRelationHighlightEnabled) {
      return {
        hasSelection: false,
        upstreamTableIds,
        downstreamTableIds,
        relatedEdgeIds,
      };
    }

    const upstreamVisited = new Set<string>([selectedTableId]);
    const downstreamVisited = new Set<string>([selectedTableId]);

    // 上流（参照元=source）を辿る: target -> source
    const upstreamQueue: string[] = [selectedTableId];
    while (upstreamQueue.length > 0) {
      const current = upstreamQueue.shift()!;
      for (const relation of relations) {
        if (relation.targetTableId !== current) continue;
        relatedEdgeIds.add(relation.id);
        if (!upstreamVisited.has(relation.sourceTableId)) {
          upstreamVisited.add(relation.sourceTableId);
          upstreamTableIds.add(relation.sourceTableId);
          upstreamQueue.push(relation.sourceTableId);
        }
      }
    }

    // 下流（参照先=target）を辿る: source -> target
    const downstreamQueue: string[] = [selectedTableId];
    while (downstreamQueue.length > 0) {
      const current = downstreamQueue.shift()!;
      for (const relation of relations) {
        if (relation.sourceTableId !== current) continue;
        relatedEdgeIds.add(relation.id);
        if (!downstreamVisited.has(relation.targetTableId)) {
          downstreamVisited.add(relation.targetTableId);
          downstreamTableIds.add(relation.targetTableId);
          downstreamQueue.push(relation.targetTableId);
        }
      }
    }

    return {
      hasSelection: true,
      upstreamTableIds,
      downstreamTableIds,
      relatedEdgeIds,
    };
  }, [isRelationHighlightEnabled, relations, selectedTableId]);
}
