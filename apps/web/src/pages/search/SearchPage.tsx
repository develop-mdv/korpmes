import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Avatar } from '@/components/common/Avatar';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { SearchBar } from '@/components/common/SearchBar';
import * as searchApi from '@/api/search.api';
import { useOrganizationStore } from '@/stores/organization.store';

type SearchResult = searchApi.SearchResult;

const SCOPE_LABELS: Record<string, string> = {
  message: 'Сообщения',
  file: 'Файлы',
  task: 'Задачи',
  member: 'Люди',
};

const TYPE_MARKS: Record<string, string> = {
  message: 'MSG',
  file: 'FILE',
  task: 'TASK',
};

function ResultItem({ result }: { result: SearchResult }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (result.type === 'message' && result.metadata.chatId) {
      navigate(`/chats/${result.metadata.chatId as string}`);
    } else if (result.type === 'task') {
      navigate('/tasks');
    } else if (result.type === 'file') {
      navigate('/files');
    } else if (result.type === 'member') {
      navigate('/organization/members');
    }
  };

  return (
    <button className="list-card" style={styles.resultItem} onClick={handleClick} type="button">
      <span style={styles.resultIcon}>
        {result.type === 'member' ? <Avatar name={result.title} size="sm" /> : TYPE_MARKS[result.type]}
      </span>
      <span className="list-card__body">
        <span className="list-card__title" style={styles.resultTitle}>{result.title}</span>
        {result.snippet && (
          <span className="list-card__subtitle" style={styles.resultSnippet}>
            {result.snippet}
          </span>
        )}
      </span>
      <span className="list-card__meta" style={styles.resultTime}>
        {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true, locale: ru })}
      </span>
    </button>
  );
}

function ResultGroup({ type, results }: { type: string; results: SearchResult[] }) {
  return (
    <section className="lux-panel" style={styles.group}>
      <div style={styles.groupHeader}>
        <span>{SCOPE_LABELS[type] ?? type}</span>
        <span className="lux-pill">{results.length}</span>
      </div>
      <div className="collection-list">
        {results.map((result) => (
          <ResultItem key={result.id} result={result} />
        ))}
      </div>
    </section>
  );
}

export function SearchPage() {
  const { currentOrg } = useOrganizationStore();
  const [results, setResults] = useState<searchApi.SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');

  const handleSearch = async (q: string, scope: string) => {
    if (!q.trim() || !currentOrg) return;

    setQuery(q);
    setLoading(true);
    setError('');
    try {
      const res = await searchApi.search({
        q,
        scope: scope.toLowerCase() as searchApi.SearchParams['scope'],
        orgId: currentOrg.id,
      });
      setResults(res);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Не удалось выполнить поиск');
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const grouped = results
    ? results.results.reduce<Record<string, SearchResult[]>>((acc, result) => {
        if (!acc[result.type]) acc[result.type] = [];
        acc[result.type].push(result);
        return acc;
      }, {})
    : {};

  const groupOrder: SearchResult['type'][] = ['member', 'message', 'task', 'file'];

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Навигация</div>
            <h1 className="page-hero__title">Поиск, который не заставляет искать.</h1>
            <p className="page-hero__description">
              Найдите людей, сообщения, задачи и файлы в одном месте. Фильтры помогают быстро сузить выдачу до нужного контекста.
            </p>
          </div>
        </section>

        <section className="lux-panel" style={styles.searchPanel}>
          <SearchBar onSearch={handleSearch} placeholder="Поиск..." />
        </section>

        {error && <div className="lux-alert">{error}</div>}

        {loading && (
          <div className="lux-panel" style={styles.centered}>
            <LoadingSpinner />
          </div>
        )}

        {!loading && results && (
          <>
            <div style={styles.summary}>
              <span className="lux-pill">Запрос: {query}</span>
              <span className="lux-pill">Найдено: {results.total}</span>
            </div>

            {results.total === 0 ? (
              <section className="lux-panel">
                <EmptyState
                  title="Ничего не найдено"
                  description="Попробуйте другое слово, фамилию или более широкий фильтр."
                />
              </section>
            ) : (
              groupOrder
                .filter((type) => (grouped[type]?.length ?? 0) > 0)
                .map((type) => <ResultGroup key={type} type={type} results={grouped[type]} />)
            )}
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  searchPanel: {
    padding: 18,
  },
  centered: {
    display: 'flex',
    justifyContent: 'center',
    padding: 32,
  },
  summary: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  group: {
    padding: 16,
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  },
  resultItem: {
    alignItems: 'flex-start',
    cursor: 'pointer',
  },
  resultIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 42,
    height: 42,
    flex: '0 0 42px',
    borderRadius: 15,
    border: '1px solid rgba(212, 177, 106, 0.25)',
    background: 'linear-gradient(135deg, rgba(212, 177, 106, 0.2), rgba(255, 255, 255, 0.72))',
    color: '#7a5a16',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.08em',
  },
  resultTitle: {
    display: 'block',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultSnippet: {
    display: 'block',
    marginTop: 4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  resultTime: {
    marginTop: 2,
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, CSSProperties>;
