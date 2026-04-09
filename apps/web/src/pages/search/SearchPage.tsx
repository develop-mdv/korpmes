import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import * as searchApi from '@/api/search.api';
import { SearchBar } from '@/components/common/SearchBar';
import { Avatar } from '@/components/common/Avatar';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useOrganizationStore } from '@/stores/organization.store';

type SearchResult = searchApi.SearchResult;

const labels: Record<string, string> = {
  message: 'Сообщения',
  file: 'Файлы',
  task: 'Задачи',
  member: 'Люди',
};

function SearchItem({ result }: { result: SearchResult }) {
  const navigate = useNavigate();

  const openResult = () => {
    if (result.type === 'message' && result.metadata.chatId) {
      navigate(`/chats/${result.metadata.chatId as string}`);
    } else if (result.type === 'task') {
      navigate('/tasks');
    }
  };

  return (
    <button className="list-card" onClick={openResult}>
      {result.type === 'member' ? (
        <Avatar name={result.title} size="md" />
      ) : (
        <div className="brand-mark" style={{ width: 44, height: 44, fontSize: 18 }}>
          {labels[result.type]?.charAt(0) || 'Р'}
        </div>
      )}
      <div className="list-card__body">
        <div className="list-card__title">{result.title}</div>
        {result.snippet && <div className="list-card__subtitle" style={{ marginTop: 6 }}>{result.snippet}</div>}
      </div>
      <div className="list-card__actions">
        <span className="lux-pill">{labels[result.type] || result.type}</span>
        <span className="list-card__subtitle">
          {formatDistanceToNow(new Date(result.createdAt), { addSuffix: true, locale: ru })}
        </span>
      </div>
    </button>
  );
}

export function SearchPage() {
  const { currentOrg } = useOrganizationStore();
  const [results, setResults] = useState<searchApi.SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const handleSearch = async (value: string, scope: string) => {
    if (!value.trim() || !currentOrg) return;

    setQuery(value);
    setLoading(true);
    try {
      const response = await searchApi.search({
        q: value,
        scope: scope.toLowerCase() as searchApi.SearchParams['scope'],
        orgId: currentOrg.id,
      });
      setResults(response);
    } finally {
      setLoading(false);
    }
  };

  const grouped = results
    ? results.results.reduce<Record<string, SearchResult[]>>((accumulator, result) => {
        if (!accumulator[result.type]) accumulator[result.type] = [];
        accumulator[result.type].push(result);
        return accumulator;
      }, {})
    : {};

  const order: SearchResult['type'][] = ['member', 'message', 'task', 'file'];

  return (
    <div className="page-shell">
      <div className="page-shell__inner">
        <section className="lux-panel page-hero">
          <div className="page-hero__copy">
            <div className="page-hero__kicker">Поиск</div>
            <h1 className="page-hero__title">Ищите по всему продукту без визуального шума.</h1>
            <p className="page-hero__description">
              Сообщения, люди, задачи и файлы находятся из одной светлой и аккуратной панели.
            </p>
          </div>
        </section>

        <section className="lux-panel" style={{ padding: 22 }}>
          <SearchBar onSearch={handleSearch} />
        </section>

        {loading && (
          <section className="lux-panel" style={{ padding: 28 }}>
            <LoadingSpinner />
          </section>
        )}

        {!loading && results && (
          <section className="page-grid">
            <div className="lux-panel" style={{ padding: 20 }}>
              <div className="list-card__subtitle">
                {results.total} результат{results.total === 1 ? '' : results.total < 5 ? 'а' : 'ов'} по запросу «{query}»
              </div>
            </div>

            {results.total === 0 && (
              <section className="lux-panel" style={{ minHeight: 300 }}>
                <div className="lux-empty">
                  <h3 className="lux-empty__title">Ничего не найдено</h3>
                  <p className="lux-empty__description">Попробуйте другие слова, фильтр или более точный запрос.</p>
                </div>
              </section>
            )}

            {order
              .filter((type) => (grouped[type]?.length ?? 0) > 0)
              .map((type) => (
                <section key={type} className="lux-panel" style={{ padding: 18 }}>
                  <div className="page-hero__kicker" style={{ marginBottom: 14 }}>{labels[type]}</div>
                  <div className="collection-list">
                    {grouped[type].map((result) => (
                      <SearchItem key={result.id} result={result} />
                    ))}
                  </div>
                </section>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}
