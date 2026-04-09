import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';

interface SearchBarProps {
  onSearch: (query: string, scope: string) => void;
  placeholder?: string;
}

const scopes = [
  { value: 'ALL', label: 'Все' },
  { value: 'MESSAGES', label: 'Сообщения' },
  { value: 'USERS', label: 'Люди' },
  { value: 'FILES', label: 'Файлы' },
  { value: 'TASKS', label: 'Задачи' },
] as const;

export function SearchBar({ onSearch, placeholder = 'Поиск по рабочему пространству...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('ALL');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    (value: string, selectedScope: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (value.trim()) onSearch(value, selectedScope);
      }, 240);
    },
    [onSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleScopeChange = (nextScope: string) => {
    setScope(nextScope);
    if (query.trim()) onSearch(query, nextScope);
  };

  return (
    <div className="search-shell">
      <div className="search-shell__input-wrap">
        <svg className="search-shell__icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          className="lux-input"
          style={{ paddingLeft: 44, paddingRight: 44 }}
          value={query}
          onChange={(event) => {
            const value = event.target.value;
            setQuery(value);
            debouncedSearch(value, scope);
          }}
          placeholder={placeholder}
        />
        {query && (
          <button
            className="search-shell__clear"
            onClick={() => {
              setQuery('');
            }}
            aria-label="Очистить поиск"
          >
            ×
          </button>
        )}
      </div>

      <div className="search-shell__scopes">
        {scopes.map((item) => (
          <button
            key={item.value}
            className={clsx('lux-chip', scope === item.value && 'is-active')}
            onClick={() => handleScopeChange(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
