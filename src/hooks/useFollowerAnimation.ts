import { useEffect, useRef } from 'react';

interface UseFollowerAnimationProps {
  enabled: boolean;
  speed: number;
  edgePath: string;
}

interface UseFollowerAnimationResult {
  pathRef: React.RefObject<SVGPathElement | null>;
  followerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * エッジ上を移動するフォロワーアイコンのアニメーションを制御するフック
 */
export function useFollowerAnimation({
  enabled,
  speed,
  edgePath,
}: UseFollowerAnimationProps): UseFollowerAnimationResult {
  const pathRef = useRef<SVGPathElement | null>(null);
  const followerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const lenRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    const pathEl = pathRef.current;
    const followerEl = followerRef.current;
    if (!pathEl || !followerEl) return;

    // パスが変わったら進捗をリセット（急なジャンプを避ける）
    lenRef.current = 0;
    lastTsRef.current = null;

    const tick = (ts: number) => {
      const total = pathEl.getTotalLength();
      if (!(total > 0)) {
        rafRef.current = window.requestAnimationFrame(tick);
        return;
      }

      const last = lastTsRef.current ?? ts;
      const dt = Math.max(0, (ts - last) / 1000);
      lastTsRef.current = ts;

      const nextLen = (lenRef.current + speed * dt) % total;
      lenRef.current = nextLen;

      const p = pathEl.getPointAtLength(nextLen);
      const p2 = pathEl.getPointAtLength((nextLen + 1) % total);
      const angle = Math.atan2(p2.y - p.y, p2.x - p.x) * (180 / Math.PI);

      followerEl.style.transform = `translate(-50%, -50%) translate(${p.x}px, ${p.y}px) rotate(${angle}deg)`;
      rafRef.current = window.requestAnimationFrame(tick);
    };

    rafRef.current = window.requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, speed, edgePath]);

  return { pathRef, followerRef };
}
