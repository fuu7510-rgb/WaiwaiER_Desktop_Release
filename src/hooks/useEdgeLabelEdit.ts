import { useCallback, useEffect, useRef, useState } from 'react';

interface UseEdgeLabelEditProps {
  edgeId: string;
  label: string | undefined;
  rawLabel: string | undefined;
  autoLabel: string | undefined;
  onUpdate: (id: string, updates: { label: string | undefined }) => void;
}

interface UseEdgeLabelEditResult {
  isEditing: boolean;
  draftLabel: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  setDraftLabel: (value: string) => void;
  startEditing: () => void;
  commit: () => void;
  cancel: () => void;
  handleBlur: () => void;
  handleKeyDown: (e: React.KeyboardEvent) => void;
}

/**
 * エッジラベルの編集ロジックを管理するフック
 */
export function useEdgeLabelEdit({
  edgeId,
  label,
  rawLabel,
  autoLabel,
  onUpdate,
}: UseEdgeLabelEditProps): UseEdgeLabelEditResult {
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(label ?? '');
  const inputRef = useRef<HTMLInputElement | null>(null);
  const ignoreBlurRef = useRef(false);

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
      onUpdate(edgeId, { label: '' });
      setIsEditing(false);
      return;
    }

    // 現在が自動ラベル(=未設定)で、入力も自動ラベルと同じなら未設定のままにする
    if (rawLabel === undefined && autoLabel && trimmed === autoLabel) {
      onUpdate(edgeId, { label: undefined });
      setIsEditing(false);
      return;
    }

    onUpdate(edgeId, { label: trimmed });
    setIsEditing(false);
  }, [autoLabel, draftLabel, edgeId, rawLabel, onUpdate]);

  const cancel = useCallback(() => {
    setDraftLabel(label ?? '');
    setIsEditing(false);
  }, [label]);

  const handleBlur = useCallback(() => {
    if (ignoreBlurRef.current) {
      ignoreBlurRef.current = false;
      return;
    }
    commit();
  }, [commit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
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
    },
    [commit, cancel]
  );

  return {
    isEditing,
    draftLabel,
    inputRef,
    setDraftLabel,
    startEditing,
    commit,
    cancel,
    handleBlur,
    handleKeyDown,
  };
}
