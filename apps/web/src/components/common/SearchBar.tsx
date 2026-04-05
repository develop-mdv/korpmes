import React, { useState, useCallback, useRef, useEffect } from 'react';

interface SearchBarProps {
  onSearch: (query: string, scope: string) => void;
  placeholder?: string;
}

const SCOPES = ['ALL', 'MESSAGES', 'USERS', 'FILES', 'TASKS'];

export function SearchBar({ onSearch, placeholder = 'Search...' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState('ALL');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedSearch = useCallback(
    (q: string, s: string) => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (q.trim()) onSearch(q, s);
      }, 300);
    },
    [onSearch],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleChange = (value: string) => {
    setQuery(value);
    debouncedSearch(value, scope);
  };

  const handleScopeChange = (s: string) => {
    setScope(s);
    if (query.trim()) onSearch(query, s);
  };

  return (
    <div style={styles.container}>
      <div style={styles.inputWrapper}>
        <svg style={styles.icon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          style={styles.input}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={placeholder}
        />
        {query && (
          <button style={styles.clear} onClick={() => { setQuery(''); }}>
            &times;
          </button>
        )}
      </div>
      <div style={styles.scopes}>
        {SCOPES.map((s) => (
          <button
            key={s}
            style={{ ...styles.scopeBtn, ...(scope === s ? styles.scopeBtnActive : {}) }}
            onClick={() => handleScopeChange(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {},
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center' },
  icon: { position: 'absolute', left: 12, color: 'var(--color-text-tertiary)' },
  input: { width: '100%', padding: '10px 14px 10px 36px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', boxSizing: 'border-box' },
  clear: { position: 'absolute', right: 8, border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: 'var(--color-text-tertiary)', padding: '2px 6px' },
  scopes: { display: 'flex', gap: 6, marginTop: 8 },
  scopeBtn: { padding: '4px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', background: 'transparent', fontSize: 12, cursor: 'pointer', color: 'var(--color-text-secondary)' },
  scopeBtnActive: { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' },
};
