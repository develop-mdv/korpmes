import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchBar } from '@/components/common/SearchBar';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import * as searchApi from '@/api/search.api';
import { useOrganizationStore } from '@/stores/organization.store';
import { formatDistanceToNow } from 'date-fns';

type SearchResult = searchApi.SearchResult;

const SCOPE_LABELS: Record<string, string> = {
  message: 'Messages',
  file: 'Files',
  task: 'Tasks',
  member: 'People',
};

function ResultItem({ result }: { result: SearchResult }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (result.type === 'message' && result.metadata.chatId) {
      navigate(`/chats/${result.metadata.chatId as string}`);
    } else if (result.type === 'task') {
      navigate('/tasks');
    }
  };

  return (
    <div
      style={styles.resultItem}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
    >
      <div style={styles.resultIcon}>
        {result.type === 'message' && '💬'}
        {result.type === 'file' && '📄'}
        {result.type === 'task' && '✅'}
        {result.type === 'member' && <Avatar name={result.title} size="sm" />}
      </div>
      <div style={styles.resultBody}>
        <div style={styles.resultTitle}>{result.title}</div>
        {result.snippet && (
          <div style={styles.resultSnippet}>{result.snippet}</div>
        )}
      </div>
      <div style={styles.resultTime}>
        {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true })}
      </div>
    </div>
  );
}

function ResultGroup({ type, results }: { type: string; results: SearchResult[] }) {
  return (
    <div style={styles.group}>
      <div style={styles.groupHeader}>{SCOPE_LABELS[type] ?? type}</div>
      {results.map((r) => (
        <ResultItem key={r.id} result={r} />
      ))}
    </div>
  );
}

export function SearchPage() {
  const { currentOrg } = useOrganizationStore();
  const [results, setResults] = useState<searchApi.SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const handleSearch = async (q: string, scope: string) => {
    if (!q.trim() || !currentOrg) return;
    setQuery(q);
    setLoading(true);
    try {
      const res = await searchApi.search({
        q,
        scope: scope.toLowerCase() as searchApi.SearchParams['scope'],
        orgId: currentOrg.id,
      });
      setResults(res);
    } finally {
      setLoading(false);
    }
  };

  const grouped = results
    ? results.results.reduce<Record<string, SearchResult[]>>((acc, r) => {
        if (!acc[r.type]) acc[r.type] = [];
        acc[r.type].push(r);
        return acc;
      }, {})
    : {};

  const groupOrder: SearchResult['type'][] = ['member', 'message', 'task', 'file'];

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Search</h1>
      <SearchBar onSearch={handleSearch} />

      {loading && (
        <div style={styles.centered}>
          <LoadingSpinner />
        </div>
      )}

      {!loading && results && (
        <>
          <p style={styles.summary}>
            {results.total} result{results.total !== 1 ? 's' : ''} for &ldquo;{query}&rdquo;
          </p>
          {results.total === 0 && (
            <p style={styles.empty}>No results found. Try different keywords or filters.</p>
          )}
          {groupOrder
            .filter((type) => (grouped[type]?.length ?? 0) > 0)
            .map((type) => (
              <ResultGroup key={type} type={type} results={grouped[type]} />
            ))}
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 800, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24, color: 'var(--color-text)' },
  centered: { display: 'flex', justifyContent: 'center', paddingTop: 32 },
  summary: { fontSize: 13, color: 'var(--color-text-secondary)', margin: '16px 0 8px' },
  empty: { fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 16 },
  group: { marginBottom: 24 },
  groupHeader: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: 'var(--color-text-secondary)',
    padding: '8px 0 6px',
    borderBottom: '1px solid var(--color-border)',
    marginBottom: 4,
  },
  resultItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 6,
    cursor: 'pointer',
  },
  resultIcon: {
    fontSize: 16,
    minWidth: 24,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 2,
  },
  resultBody: { flex: 1, minWidth: 0 },
  resultTitle: {
    fontSize: 14,
    fontWeight: 500,
    color: 'var(--color-text)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultSnippet: {
    fontSize: 12,
    color: 'var(--color-text-secondary)',
    marginTop: 2,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultTime: {
    fontSize: 11,
    color: 'var(--color-text-secondary)',
    whiteSpace: 'nowrap',
    paddingTop: 2,
  },
};
