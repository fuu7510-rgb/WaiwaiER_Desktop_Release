import { useCallback, useRef, useState, useEffect, type ReactNode } from 'react';

interface ResizableSplitterProps {
  /** 上部パネルの内容 */
  topPanel: ReactNode;
  /** 下部パネルの内容 */
  bottomPanel: ReactNode;
  /** 初期の上部パネルの高さ（パーセンテージ、0-100） */
  initialTopHeightPercent?: number;
  /** 上部パネルの最小高さ（px） */
  minTopHeight?: number;
  /** 下部パネルの最小高さ（px） */
  minBottomHeight?: number;
  /** コンテナのクラス名 */
  className?: string;
  /** ストレージキー（設定を保存する場合） */
  storageKey?: string;
}

export function ResizableSplitter({
  topPanel,
  bottomPanel,
  initialTopHeightPercent = 50,
  minTopHeight = 100,
  minBottomHeight = 100,
  className = '',
  storageKey,
}: ResizableSplitterProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [topHeightPercent, setTopHeightPercent] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 90) {
          return parsed;
        }
      }
    }
    return initialTopHeightPercent;
  });
  const [isDragging, setIsDragging] = useState(false);

  // ドラッグ開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  // ドラッグ中の処理
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRect.height;
      const relativeY = e.clientY - containerRect.top;

      // 最小高さを考慮してパーセンテージを計算
      const minTopPercent = (minTopHeight / containerHeight) * 100;
      const maxTopPercent = 100 - (minBottomHeight / containerHeight) * 100;

      let newPercent = (relativeY / containerHeight) * 100;
      newPercent = Math.max(minTopPercent, Math.min(maxTopPercent, newPercent));

      setTopHeightPercent(newPercent);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // 設定を保存
      if (storageKey) {
        localStorage.setItem(storageKey, topHeightPercent.toString());
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, minTopHeight, minBottomHeight, storageKey, topHeightPercent]);

  // ドラッグ終了時に保存
  useEffect(() => {
    if (!isDragging && storageKey) {
      localStorage.setItem(storageKey, topHeightPercent.toString());
    }
  }, [isDragging, storageKey, topHeightPercent]);

  return (
    <div ref={containerRef} className={`flex flex-col min-h-0 ${className}`}>
      {/* 上部パネル */}
      <div
        className="overflow-hidden flex flex-col min-h-0"
        style={{ height: `${topHeightPercent}%` }}
      >
        {topPanel}
      </div>

      {/* リサイズハンドル */}
      <div
        className={`
          flex-shrink-0 h-1 cursor-row-resize relative
          border-t border-b border-zinc-200 bg-zinc-100
          hover:bg-indigo-200 transition-colors
          ${isDragging ? 'bg-indigo-300' : ''}
        `}
        onMouseDown={handleMouseDown}
      >
        {/* ドラッグハンドルのインジケーター */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center pointer-events-none">
          <div className="flex gap-0.5">
            <div className="w-6 h-0.5 bg-zinc-300 rounded-full" />
          </div>
        </div>
      </div>

      {/* 下部パネル */}
      <div
        className="overflow-hidden flex flex-col min-h-0"
        style={{ height: `${100 - topHeightPercent}%` }}
      >
        {bottomPanel}
      </div>

      {/* ドラッグ中のオーバーレイ（選択を防ぐ） */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-row-resize" />
      )}
    </div>
  );
}
