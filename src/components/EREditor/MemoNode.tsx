import { memo as reactMemo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { NodeProps } from 'reactflow';
import { useTranslation } from 'react-i18next';

import { useERStore } from '../../stores';
import type { Memo } from '../../types';
import { Tooltip } from '../common';

interface MemoNodeData {
  memo: Memo;
}

export const MemoNode = reactMemo(({ data, selected }: NodeProps<MemoNodeData>) => {
  const { t } = useTranslation();
  const { memo } = data;
  const { updateMemo, deleteMemo } = useERStore();

  const isCollapsed = memo.isCollapsed ?? false;
  const [draft, setDraft] = useState(memo.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startW: number;
    startH: number;
  } | null>(null);

  const [liveSize, setLiveSize] = useState(() => ({
    w: memo.width ?? 260,
    h: isCollapsed ? 50 : (memo.height ?? 140),
  }));

  useEffect(() => {
    setDraft(memo.text);
  }, [memo.text]);

  useEffect(() => {
    setLiveSize({
      w: memo.width ?? 260,
      h: isCollapsed ? 50 : (memo.height ?? 140)
    });
  }, [memo.height, memo.width, isCollapsed]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.style.width = `${liveSize.w}px`;
    el.style.height = `${liveSize.h}px`;
  }, [liveSize.h, liveSize.w]);

  const commit = useCallback(() => {
    if (draft === memo.text) return;
    updateMemo(memo.id, { text: draft });
  }, [draft, memo.id, memo.text, updateMemo]);

  const cancel = useCallback(() => {
    setDraft(memo.text);
    textareaRef.current?.blur();
  }, [memo.text]);

  const handleToggleCollapsed = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateMemo(memo.id, { isCollapsed: !isCollapsed });
    },
    [memo.id, isCollapsed, updateMemo]
  );

  const containerClassName = useMemo(() => {
    const base = 'rounded-md border bg-white shadow-sm';
    const focus = selected ? ' border-indigo-300 ring-2 ring-indigo-500/20' : ' border-zinc-200';
    return base + focus;
  }, [selected]);

  const commitSize = useCallback(
    (nextW: number, nextH: number) => {
      const width = Math.round(nextW);
      const height = Math.round(nextH);
      if (width === (memo.width ?? 260) && height === (memo.height ?? 140)) return;
      updateMemo(memo.id, { width, height });
    },
    [memo.height, memo.id, memo.width, updateMemo]
  );

  const onResizePointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation();
    const el = containerRef.current;
    if (!el) return;

    const startW = el.offsetWidth;
    const startH = el.offsetHeight;
    resizeStateRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startW,
      startH,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }, []);

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    const state = resizeStateRef.current;
    if (!state) return;
    if (e.pointerId !== state.pointerId) return;

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;
    const nextW = Math.max(180, state.startW + dx);
    const nextH = Math.max(110, state.startH + dy);
    setLiveSize({ w: nextW, h: nextH });
  }, []);

  const onResizePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const state = resizeStateRef.current;
      if (!state) return;
      if (e.pointerId !== state.pointerId) return;

      resizeStateRef.current = null;
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
      commitSize(liveSize.w, liveSize.h);
    },
    [commitSize, liveSize.h, liveSize.w]
  );

  return (
    <div ref={containerRef} className={containerClassName + ' relative min-w-[180px]' + (isCollapsed ? '' : ' min-h-[110px]')}>
      <div className="memo-drag-handle flex items-center justify-between border-b border-zinc-200 px-2 py-1 cursor-move select-none">
        <div className="flex items-center gap-1">
          <Tooltip content={isCollapsed ? t('table.expand') : t('table.collapse')}>
            <button
              type="button"
              onClick={handleToggleCollapsed}
              className="nodrag nopan p-0.5 rounded-sm transition-colors text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
              aria-label={isCollapsed ? t('table.expand') : t('table.collapse')}
              title={isCollapsed ? t('table.expand') : t('table.collapse')}
            >
              {isCollapsed ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          </Tooltip>
          <div className="text-[10px] font-medium text-zinc-500">{t('editor.memo')}</div>
        </div>
        <button
          type="button"
          className="nodrag nopan rounded px-1 py-0.5 text-[10px] text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
          title={t('editor.deleteMemo')}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            deleteMemo(memo.id);
          }}
        >
          ×
        </button>
      </div>

      {isCollapsed ? (
        <div className="px-2 py-1.5 text-[11px] text-zinc-500 truncate leading-normal">
          {memo.text || t('editor.memoPlaceholder')}
        </div>
      ) : (
        <>
          <textarea
            ref={textareaRef}
            className="nodrag nopan h-[calc(100%-26px)] w-full resize-none bg-transparent p-2 text-[11px] leading-relaxed text-zinc-700 outline-none"
            value={draft}
            placeholder={t('editor.memoPlaceholder')}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                commit();
                textareaRef.current?.blur();
              }
              if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
              }
            }}
          />

          <div
            className="nodrag nopan absolute bottom-1 right-1 h-3 w-3 cursor-se-resize rounded-sm border border-zinc-300 bg-white"
            title="ドラッグでサイズ変更"
            onPointerDown={onResizePointerDown}
            onPointerMove={onResizePointerMove}
            onPointerUp={onResizePointerUp}
            onPointerCancel={onResizePointerUp}
          />
        </>
      )}
    </div>
  );
});

MemoNode.displayName = 'MemoNode';
