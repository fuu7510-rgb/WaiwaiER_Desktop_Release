import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react';
import {
  canonicalizeLucideIconName,
  getLucideIconComponent,
  listLucideIconNamesKebab,
} from '../../lib/lucideIcons';

interface IconPickerProps {
  label?: string;
  labelSuffix?: ReactNode;
  value: string;
  onChange: (iconName: string) => void;
  disabled?: boolean;
  /** プリセットアイコン（先頭に表示） */
  presetIcons?: string[];
}

const DEFAULT_PRESET_ICONS = [
  'arrow-right',
  'chevron-right',
  'circle-arrow-right',
  'move-right',
  'link-2',
  'link',
  'zap',
  'truck',
  'circle',
  'dot',
  'star',
  'heart',
  'play',
  'package',
  'database',
  'file',
];

export function IconPicker({
  label,
  labelSuffix,
  value,
  onChange,
  disabled = false,
  presetIcons = DEFAULT_PRESET_ICONS,
}: IconPickerProps) {
  const { t } = useTranslation();
  const pickerId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const allIconNames = useMemo(() => listLucideIconNamesKebab(), []);

  // フィルター後のアイコンリスト
  const filteredIcons = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // プリセットアイコンと残りに分ける
    const presetSet = new Set(presetIcons.map((name) => canonicalizeLucideIconName(name)));
    const preset = presetIcons
      .map((name) => canonicalizeLucideIconName(name))
      .filter((name) => getLucideIconComponent(name));
    const others = allIconNames.filter((name) => !presetSet.has(name));

    if (!query) {
      // 検索なし時はプリセット優先で表示
      return [...preset, ...others];
    }

    // 検索時はマッチしたものだけ（プリセット優先のまま）
    const matchIcon = (name: string) => name.includes(query);
    const matchedPreset = preset.filter(matchIcon);
    const matchedOthers = others.filter(matchIcon);

    return [...matchedPreset, ...matchedOthers];
  }, [allIconNames, presetIcons, searchQuery]);

  // クリック外でポップオーバーを閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // ポップオーバー開いたら検索入力にフォーカス
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggle = useCallback(() => {
    if (disabled) return;
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setSearchQuery('');
      setFocusedIndex(-1);
    }
  }, [disabled, isOpen]);

  const handleSelectIcon = useCallback(
    (iconName: string) => {
      onChange(iconName);
      setIsOpen(false);
      setSearchQuery('');
      setFocusedIndex(-1);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      const columns = 6;
      const totalItems = filteredIcons.length;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          setSearchQuery('');
          setFocusedIndex(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === -1) return 0;
            const next = prev + columns;
            return next >= totalItems ? prev : next;
          });
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === -1) return 0;
            const next = prev - columns;
            return next < 0 ? prev : next;
          });
          break;
        case 'ArrowRight':
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === -1) return 0;
            return prev + 1 >= totalItems ? prev : prev + 1;
          });
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setFocusedIndex((prev) => {
            if (prev === -1) return 0;
            return prev - 1 < 0 ? prev : prev - 1;
          });
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < filteredIcons.length) {
            handleSelectIcon(filteredIcons[focusedIndex]);
          }
          break;
      }
    },
    [isOpen, filteredIcons, focusedIndex, handleSelectIcon]
  );

  // フォーカスアイテムをスクロールビューに入れる
  useEffect(() => {
    if (focusedIndex >= 0 && gridRef.current) {
      const items = gridRef.current.querySelectorAll('[data-icon-item]');
      const item = items[focusedIndex] as HTMLElement | undefined;
      if (item) {
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex]);

  const CurrentIcon = getLucideIconComponent(value) ?? getLucideIconComponent('arrow-right');

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <div className="flex items-center mb-1">
          <label
            htmlFor={pickerId}
            className="block text-xs font-medium"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}
          </label>
          {labelSuffix}
        </div>
      )}

      {/* トリガーボタン */}
      <button
        id={pickerId}
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className="
          w-full flex items-center gap-2 px-2 py-1.5 text-sm border rounded
          focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500
          transition-colors
        "
        style={{
          backgroundColor: disabled ? 'var(--muted)' : 'var(--input-bg)',
          borderColor: 'var(--input-border)',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          opacity: disabled ? 0.75 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        <span
          className="flex items-center justify-center w-6 h-6 rounded border"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
          }}
        >
          {CurrentIcon && <CurrentIcon size={16} />}
        </span>
        <span className="flex-1 text-left truncate text-xs">{value}</span>
        <span
          className="text-xs"
          style={{ color: 'var(--text-muted)' }}
        >
          ▼
        </span>
      </button>

      {/* ポップオーバー */}
      {isOpen && (
        <div
          className="absolute z-50 mt-1 w-72 border rounded-lg shadow-lg"
          style={{
            backgroundColor: 'var(--card)',
            borderColor: 'var(--border)',
          }}
          onKeyDown={handleKeyDown}
        >
          {/* 検索バー */}
          <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setFocusedIndex(-1);
                }}
                placeholder={t('common.iconPicker.searchPlaceholder')}
                className="w-full pl-7 pr-7 py-1.5 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                style={{
                  backgroundColor: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setFocusedIndex(-1);
                    searchInputRef.current?.focus();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/10"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* アイコングリッド */}
          <div
            ref={gridRef}
            className="p-2 max-h-60 overflow-y-auto"
          >
            {filteredIcons.length === 0 ? (
              <p
                className="text-center py-4 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('common.iconPicker.noResults')}
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-1">
                {filteredIcons.slice(0, 120).map((iconName, index) => {
                  const IconComponent = getLucideIconComponent(iconName);
                  const isSelected = iconName === value;
                  const isFocused = index === focusedIndex;

                  return (
                    <button
                      key={iconName}
                      type="button"
                      data-icon-item
                      onClick={() => handleSelectIcon(iconName)}
                      title={iconName}
                      className="
                        flex items-center justify-center w-9 h-9 rounded
                        transition-colors
                      "
                      style={{
                        backgroundColor: isSelected
                          ? 'var(--primary)'
                          : isFocused
                            ? 'var(--muted)'
                            : 'transparent',
                        color: isSelected ? 'white' : 'var(--text-primary)',
                        outline: isFocused && !isSelected ? '2px solid var(--primary)' : 'none',
                        outlineOffset: '-2px',
                      }}
                    >
                      {IconComponent && <IconComponent size={18} />}
                    </button>
                  );
                })}
              </div>
            )}
            {filteredIcons.length > 120 && (
              <p
                className="text-center mt-2 text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                {t('common.iconPicker.moreIcons', { count: filteredIcons.length - 120 })}
              </p>
            )}
          </div>

          {/* 選択中のアイコン情報 */}
          <div
            className="px-2 py-1.5 border-t text-xs"
            style={{
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--muted)',
            }}
          >
            {t('common.iconPicker.selected')}: <span className="font-medium">{value}</span>
          </div>
        </div>
      )}
    </div>
  );
}
