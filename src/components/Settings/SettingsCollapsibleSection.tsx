import React from 'react';

interface SettingsCollapsibleSectionProps {
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * 設定画面用の折りたたみセクション
 * CSS変数を使用してテーマ対応
 */
export function SettingsCollapsibleSection({
  title,
  isOpen,
  onToggle,
  children,
}: SettingsCollapsibleSectionProps) {
  return (
    <section>
      <button
        type="button"
        onClick={onToggle}
        className="settings-collapsible-button w-full flex items-center justify-between text-left px-3 py-2 rounded border transition-colors focus:outline-none focus:ring-2"
        style={{
          borderColor: isOpen ? 'var(--accent-border)' : 'var(--border)',
          backgroundColor: isOpen ? 'var(--accent-bg)' : 'var(--accent-bg-subtle)',
        }}
      >
        <h3
          className="settings-collapsible-title text-xs font-semibold uppercase tracking-wide"
          style={{ color: 'var(--accent-text)' }}
        >
          {title}
        </h3>
        <svg
          className={`settings-collapsible-icon w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : 'rotate-0'}`}
          style={{ color: isOpen ? 'var(--accent-text)' : 'var(--accent-text-muted)' }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2.5 space-y-2.5">
          {children}
        </div>
      )}
    </section>
  );
}
