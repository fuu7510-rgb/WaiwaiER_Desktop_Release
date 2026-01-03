import { useState, useRef, useEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

interface InfoTooltipProps {
  content: ReactNode;
  className?: string;
  ariaLabel?: string;
}

export function InfoTooltip({ content, className = '', ariaLabel }: InfoTooltipProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const tooltipEl = tooltipRef.current;
      const buttonEl = buttonRef.current;
      if (!tooltipEl || !buttonEl) return;

      const rect = buttonEl.getBoundingClientRect();
      const top = rect.bottom + 8;
      const left = Math.min(rect.left, window.innerWidth - 300);

      tooltipEl.style.top = `${top}px`;
      tooltipEl.style.left = `${left}px`;
      tooltipEl.classList.remove('invisible');
    };

    const rafId = window.requestAnimationFrame(updatePosition);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        className="ml-1.5 focus:outline-none transition-colors"
        aria-label={ariaLabel ?? t('common.help')}
        style={{ color: 'var(--text-muted)' }}
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          ref={tooltipRef}
          className="fixed z-[9999] w-72 p-3 rounded-lg shadow-xl text-xs leading-relaxed invisible"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
