import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  content: ReactNode;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  placement?: 'top' | 'bottom';
};

export function Tooltip({ content, children, className = '', disabled = false, placement = 'top' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const anchorRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const anchorEl = anchorRef.current;
      const tooltipEl = tooltipRef.current;
      if (!anchorEl) return;

      const rect = anchorEl.getBoundingClientRect();
      const gap = 8;

      // Use actual tooltip width if available, otherwise estimate
      const tooltipWidth = tooltipEl?.offsetWidth || 200;
      const tooltipHeight = tooltipEl?.offsetHeight || 36;

      const left = Math.min(
        Math.max(rect.left + rect.width / 2 - tooltipWidth / 2, 8),
        window.innerWidth - tooltipWidth - 8
      );

      const top =
        placement === 'bottom'
          ? rect.bottom + gap
          : Math.max(8, rect.top - gap - tooltipHeight);

      setPosition({ top, left });
    };

    // Initial position calculation
    updatePosition();

    // Recalculate after a frame to get accurate tooltip dimensions
    const rafId = window.requestAnimationFrame(updatePosition);

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, placement]);

  if (disabled) return <>{children}</>;

  const handleMouseEnter = () => setIsOpen(true);
  const handleMouseLeave = () => {
    setIsOpen(false);
    setPosition(null);
  };

  return (
    <div
      ref={anchorRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
    >
      {children}
      {isOpen &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] px-2 py-1 rounded-md text-[11px] leading-snug whitespace-nowrap shadow-xl pointer-events-none"
            style={{
              top: position?.top ?? -9999,
              left: position?.left ?? -9999,
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              opacity: position ? 1 : 0,
              transition: 'opacity 0.1s ease-in-out',
            }}
          >
            {content}
          </div>,
          document.body
        )}
    </div>
  );
}
