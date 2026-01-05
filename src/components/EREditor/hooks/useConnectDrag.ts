import { useState, useRef, useCallback, useEffect } from 'react';

interface ConnectDragState {
  isConnectDragging: boolean;
  isConnectDragNotAllowed: boolean;
  connectDragPos: { x: number; y: number } | null;
  connectFlashPos: { x: number; y: number } | null;
}

interface UseConnectDragReturn extends ConnectDragState {
  isConnectDragNotAllowedRef: React.MutableRefObject<boolean>;
  setIsConnectDragNotAllowed: React.Dispatch<React.SetStateAction<boolean>>;
  setConnectDragPos: React.Dispatch<React.SetStateAction<{ x: number; y: number } | null>>;
  flashConnectNotAllowed: () => void;
  onConnectStart: () => void;
  onConnectEnd: () => void;
}

export function useConnectDrag(
  lastPointerPosRef: React.MutableRefObject<{ x: number; y: number } | null>
): UseConnectDragReturn {
  const [isConnectDragging, setIsConnectDragging] = useState(false);
  const [isConnectDragNotAllowed, setIsConnectDragNotAllowed] = useState(false);
  const [connectDragPos, setConnectDragPos] = useState<{ x: number; y: number } | null>(null);
  const [connectFlashPos, setConnectFlashPos] = useState<{ x: number; y: number } | null>(null);

  const isConnectDragNotAllowedRef = useRef(false);
  const connectFlashTimerRef = useRef<number | null>(null);

  useEffect(() => {
    isConnectDragNotAllowedRef.current = isConnectDragNotAllowed;
  }, [isConnectDragNotAllowed]);

  const flashConnectNotAllowed = useCallback(() => {
    const pos = lastPointerPosRef.current;
    if (!pos) return;

    setConnectFlashPos({ x: pos.x, y: pos.y });

    if (connectFlashTimerRef.current !== null) {
      window.clearTimeout(connectFlashTimerRef.current);
    }
    connectFlashTimerRef.current = window.setTimeout(() => {
      setConnectFlashPos(null);
      connectFlashTimerRef.current = null;
    }, 800);
  }, [lastPointerPosRef]);

  const onConnectStart = useCallback(() => {
    setIsConnectDragging(true);
  }, []);

  const onConnectEnd = useCallback(() => {
    setIsConnectDragging(false);
    setIsConnectDragNotAllowed(false);
    setConnectDragPos(null);
  }, []);

  return {
    isConnectDragging,
    isConnectDragNotAllowed,
    connectDragPos,
    connectFlashPos,
    isConnectDragNotAllowedRef,
    setIsConnectDragNotAllowed,
    setConnectDragPos,
    flashConnectNotAllowed,
    onConnectStart,
    onConnectEnd,
  };
}
