import type { ReactNode } from 'react';

interface SettingsSectionContentProps {
  title: string;
  description?: string;
  children: ReactNode;
}

/**
 * 2カラム設定画面の右ペイン用コンテンツラッパー
 * セクションタイトルと説明を表示し、コンテンツを整形する
 */
export function SettingsSectionContent({
  title,
  description,
  children,
}: SettingsSectionContentProps) {
  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div
        className="flex-shrink-0 px-5 py-4 border-b"
        style={{ borderColor: 'var(--border)' }}
      >
        <h2
          className="text-sm font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {title}
        </h2>
        {description && (
          <p
            className="mt-1 text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            {description}
          </p>
        )}
      </div>

      {/* コンテンツエリア */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-4">
          {children}
        </div>
      </div>
    </div>
  );
}
