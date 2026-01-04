/**
 * リレーション操作スライス
 */
import { v4 as uuidv4 } from 'uuid';
import type { RelationState, RelationActions, SliceCreator } from './types';

export type RelationSlice = RelationState & RelationActions;

export const createRelationSlice: SliceCreator<RelationSlice> = (set, get) => ({
  relations: [],

  addRelation: (relation) => {
    const existing = get().relations.find(
      (r) =>
        r.sourceTableId === relation.sourceTableId &&
        r.sourceColumnId === relation.sourceColumnId &&
        r.targetTableId === relation.targetTableId &&
        r.targetColumnId === relation.targetColumnId
    );

    if (existing) {
      return existing.id;
    }

    const id = uuidv4();
    set((state) => {
      state.relations.push({
        edgeFollowerIconName: relation.edgeFollowerIconName ?? 'arrow-right',
        edgeFollowerIconSize: relation.edgeFollowerIconSize ?? 14,
        edgeFollowerIconSpeed: relation.edgeFollowerIconSpeed ?? 90,
        ...relation,
        id,
      });
    });
    get().saveHistory('リレーションを追加');
    get().queueSaveToDB();
    return id;
  },

  updateRelation: (id, updates) => {
    set((state) => {
      const relation = state.relations.find((r) => r.id === id);
      if (relation) {
        Object.assign(relation, updates);
      }
    });
    get().saveHistory('リレーションを更新');
    get().queueSaveToDB();
  },

  deleteRelation: (id) => {
    set((state) => {
      state.relations = state.relations.filter((r) => r.id !== id);
      if (state.selectedRelationId === id) {
        state.selectedRelationId = null;
      }
    });
    get().saveHistory('リレーションを削除');
    get().queueSaveToDB();
  },
});
