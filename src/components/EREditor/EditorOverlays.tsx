import { useTranslation } from 'react-i18next';

interface OverlayPosition {
  x: number;
  y: number;
}

interface ConnectDragOverlayProps {
  position: OverlayPosition;
}

export function ConnectDragOverlay({ position }: ConnectDragOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute z-50 flex items-center justify-center rounded-full border text-xs"
      style={{
        left: position.x + 10,
        top: position.y + 10,
        width: 24,
        height: 24,
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      aria-hidden="true"
    >
      ×
    </div>
  );
}

interface ConnectFlashOverlayProps {
  position: OverlayPosition;
}

export function ConnectFlashOverlay({ position }: ConnectFlashOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute z-50 flex items-center justify-center rounded-full border text-xs"
      style={{
        left: position.x + 10,
        top: position.y + 10,
        width: 24,
        height: 24,
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      aria-hidden="true"
    >
      ×
    </div>
  );
}

interface EdgeUpdateOverlayProps {
  position: OverlayPosition;
}

export function EdgeUpdateOverlay({ position }: EdgeUpdateOverlayProps) {
  const { t } = useTranslation();
  
  return (
    <div
      className="pointer-events-none absolute z-50 select-none rounded-md border px-2 py-1 text-xs shadow-sm"
      style={{
        left: position.x + 12,
        top: position.y + 12,
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      aria-hidden="true"
    >
      {t('editor.edgeRetargetHint')}
    </div>
  );
}

interface EdgeUpdaterHoverOverlayProps {
  position: OverlayPosition;
}

export function EdgeUpdaterHoverOverlay({ position }: EdgeUpdaterHoverOverlayProps) {
  const { t } = useTranslation();
  
  return (
    <div
      className="pointer-events-none absolute z-50 select-none rounded-md border px-2 py-1 text-xs shadow-sm"
      style={{
        left: position.x + 12,
        top: position.y + 12,
        backgroundColor: 'var(--card)',
        borderColor: 'var(--border)',
        color: 'var(--text-secondary)',
      }}
      aria-hidden="true"
    >
      {t('editor.edgeRetargetHint')}
    </div>
  );
}
