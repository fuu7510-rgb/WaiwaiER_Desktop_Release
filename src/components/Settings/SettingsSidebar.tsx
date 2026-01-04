import { useTranslation } from 'react-i18next';
import type { SettingsSectionId } from '../../stores/uiStore';

interface SettingsSidebarProps {
  activeSection: SettingsSectionId;
  onSectionChange: (section: SettingsSectionId) => void;
}

interface SectionItem {
  id: SettingsSectionId;
  labelKey: string;
  icon: React.ReactNode;
  group?: 'main' | 'advanced' | 'info';
}

const SECTION_ITEMS: SectionItem[] = [
  {
    id: 'general',
    labelKey: 'settings.general',
    group: 'main',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: 'tableCreationRules',
    labelKey: 'settings.tableCreationRules.title',
    group: 'main',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'relationSettings',
    labelKey: 'settings.relationSettings.title',
    group: 'main',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    id: 'commonColumns',
    labelKey: 'settings.commonColumns.title',
    group: 'main',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: 'backup',
    labelKey: 'settings.backup',
    group: 'advanced',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7C5 4 4 5 4 7z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 4v4a1 1 0 001 1h6a1 1 0 001-1V4" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 16v-4a1 1 0 00-1-1H9a1 1 0 00-1 1v4" />
      </svg>
    ),
  },
  {
    id: 'noteParams',
    labelKey: 'settings.noteParams.title',
    group: 'advanced',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: 'shortcuts',
    labelKey: 'settings.shortcuts.title',
    group: 'advanced',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ),
  },
  {
    id: 'license',
    labelKey: 'settings.license',
    group: 'info',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    id: 'about',
    labelKey: 'settings.about',
    group: 'info',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

const GROUPS = [
  { id: 'main', labelKey: 'settings.groups.main' },
  { id: 'advanced', labelKey: 'settings.groups.advanced' },
  { id: 'info', labelKey: 'settings.groups.info' },
] as const;

export function SettingsSidebar({ activeSection, onSectionChange }: SettingsSidebarProps) {
  const { t } = useTranslation();

  return (
    <nav
      className="flex flex-col h-full py-2 overflow-y-auto"
      style={{ backgroundColor: 'var(--muted)' }}
    >
      {GROUPS.map((group) => {
        const items = SECTION_ITEMS.filter((item) => item.group === group.id);
        if (items.length === 0) return null;

        return (
          <div key={group.id} className="mb-3">
            <div
              className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--text-muted)' }}
            >
              {t(group.labelKey)}
            </div>
            <ul className="space-y-0.5 px-1.5">
              {items.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => onSectionChange(item.id)}
                      className={`
                        w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-left text-xs
                        transition-all duration-150 ease-out
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1
                      `}
                      style={{
                        backgroundColor: isActive ? 'var(--accent-bg)' : 'transparent',
                        color: isActive ? 'var(--accent-text)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 500 : 400,
                      }}
                    >
                      <span
                        className="flex-shrink-0"
                        style={{ color: isActive ? 'var(--accent-text)' : 'var(--text-muted)' }}
                      >
                        {item.icon}
                      </span>
                      <span className="truncate">{t(item.labelKey)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
