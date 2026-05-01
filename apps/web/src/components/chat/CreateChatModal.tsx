import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { useOrganizationStore } from '@/stores/organization.store';
import { useChatStore } from '@/stores/chat.store';
import { createChat } from '@/api/chats.api';
import { searchUsers, UserSearchResult } from '@/api/users.api';

interface CreateChatModalProps {
  onClose: () => void;
}

export function CreateChatModal({ onClose }: CreateChatModalProps) {
  const navigate = useNavigate();
  const currentOrg = useOrganizationStore((state) => state.currentOrg);
  const addChat = useChatStore((state) => state.addChat);

  const [type, setType] = useState<'PERSONAL' | 'GROUP'>('PERSONAL');
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query.trim() || !currentOrg) {
      setResults([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const foundUsers = await searchUsers(query, currentOrg.id);
        const selectedIds = new Set(selectedUsers.map((user) => user.id));
        setResults(foundUsers.filter((user) => !selectedIds.has(user.id)));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => clearTimeout(timerRef.current);
  }, [currentOrg, query, selectedUsers]);

  const selectUser = (user: UserSearchResult) => {
    if (type === 'PERSONAL') {
      setSelectedUsers([user]);
    } else {
      setSelectedUsers((previous) => (previous.some((item) => item.id === user.id) ? previous : [...previous, user]));
    }
    setQuery('');
    setResults([]);
  };

  const handleCreate = async () => {
    if (!currentOrg || selectedUsers.length === 0) return;

    setCreating(true);
    setError('');

    try {
      const chat = await createChat({
        type,
        organizationId: currentOrg.id,
        memberIds: selectedUsers.map((user) => user.id),
        name: type === 'GROUP' ? name : undefined,
      });
      addChat(chat as any);
      navigate(`/chats/${chat.id}`);
      onClose();
    } catch (value: any) {
      setError(value.response?.data?.error?.message || 'Не удалось создать чат');
    } finally {
      setCreating(false);
    }
  };

  const canCreate = selectedUsers.length > 0 && (type === 'PERSONAL' || name.trim().length > 0);

  return (
    <Modal open title="Новый чат" onClose={onClose}>
      <div className="inline-form">
        <div style={{ display: 'flex', gap: 10 }}>
          <button className={clsx('lux-chip', type === 'PERSONAL' && 'is-active')} onClick={() => { setType('PERSONAL'); setSelectedUsers((prev) => prev.slice(0, 1)); }}>
            Личный
          </button>
          <button className={clsx('lux-chip', type === 'GROUP' && 'is-active')} onClick={() => setType('GROUP')}>
            Группа
          </button>
        </div>

        {type === 'GROUP' && (
          <div className="field-group">
            <label className="field-group__label">Название группы</label>
            <input className="lux-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Совет руководителей" />
          </div>
        )}

        {selectedUsers.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {selectedUsers.map((user) => (
              <button
                key={user.id}
                className="lux-chip is-active"
                onClick={() => setSelectedUsers((previous) => previous.filter((item) => item.id !== user.id))}
              >
                {user.firstName} {user.lastName} ×
              </button>
            ))}
          </div>
        )}

        <div className="field-group">
          <label className="field-group__label">Добавить участников</label>
          <input
            className="lux-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Поиск по имени или email"
            autoFocus
          />
        </div>

        <div className="lux-panel" style={{ padding: 8, minHeight: 120 }}>
          {searching && <div className="list-card__subtitle" style={{ padding: 12 }}>Ищем сотрудников...</div>}
          {!searching && query && results.length === 0 && <div className="list-card__subtitle" style={{ padding: 12 }}>Ничего не найдено</div>}
          {!searching && !query && selectedUsers.length === 0 && (
            <div className="list-card__subtitle" style={{ padding: 12 }}>Начните вводить имя, чтобы собрать чат.</div>
          )}
          <div className="collection-list">
            {results.map((user) => (
              <button key={user.id} className="list-card" onClick={() => selectUser(user)}>
                <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
                <div className="list-card__body">
                  <div className="list-card__title">{user.firstName} {user.lastName}</div>
                  <div className="list-card__subtitle">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="lux-alert">{error}</div>}

        <div className="form-actions">
          <button className="lux-button-secondary" onClick={onClose}>
            Отмена
          </button>
          <button className="lux-button" onClick={handleCreate} disabled={!canCreate || creating}>
            {creating ? 'Открываем чат...' : 'Создать чат'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
