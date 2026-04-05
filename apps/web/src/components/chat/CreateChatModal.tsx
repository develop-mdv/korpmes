import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from '@/components/common/Modal';
import { Avatar } from '@/components/common/Avatar';
import { useOrganizationStore } from '@/stores/organization.store';
import { useChatStore } from '@/stores/chat.store';
import { searchUsers, UserSearchResult } from '@/api/users.api';
import { createChat } from '@/api/chats.api';

interface CreateChatModalProps {
  onClose: () => void;
}

export function CreateChatModal({ onClose }: CreateChatModalProps) {
  const navigate = useNavigate();
  const currentOrg = useOrganizationStore((s) => s.currentOrg);
  const addChat = useChatStore((s) => s.addChat);

  const [type, setType] = useState<'PERSONAL' | 'GROUP'>('PERSONAL');
  const [name, setName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!searchQuery.trim() || !currentOrg) {
      setSearchResults([]);
      return;
    }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const results = await searchUsers(searchQuery, currentOrg.id);
        const selectedIds = new Set(selectedUsers.map((u) => u.id));
        setSearchResults(results.filter((r) => !selectedIds.has(r.id)));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timerRef.current);
  }, [searchQuery, currentOrg, selectedUsers]);

  const selectUser = (user: UserSearchResult) => {
    if (type === 'PERSONAL') {
      setSelectedUsers([user]);
    } else {
      setSelectedUsers((prev) =>
        prev.some((u) => u.id === user.id) ? prev : [...prev, user],
      );
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeUser = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleCreate = async () => {
    if (!currentOrg || selectedUsers.length === 0) return;
    setError('');
    setCreating(true);

    try {
      const chat = await createChat({
        type,
        organizationId: currentOrg.id,
        memberIds: selectedUsers.map((u) => u.id),
        name: type === 'GROUP' ? name : undefined,
      });
      addChat(chat as any);
      navigate(`/chats/${chat.id}`);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to create chat');
    } finally {
      setCreating(false);
    }
  };

  const canCreate =
    selectedUsers.length > 0 && (type === 'PERSONAL' || name.trim().length > 0);

  return (
    <Modal open={true} title="New Chat" onClose={onClose}>
      <div style={styles.form}>
        <div style={styles.typeSelector}>
          <button
            style={{ ...styles.typeBtn, ...(type === 'PERSONAL' ? styles.typeBtnActive : {}) }}
            onClick={() => { setType('PERSONAL'); setSelectedUsers(prev => prev.slice(0, 1)); }}
          >
            Personal
          </button>
          <button
            style={{ ...styles.typeBtn, ...(type === 'GROUP' ? styles.typeBtnActive : {}) }}
            onClick={() => setType('GROUP')}
          >
            Group
          </button>
        </div>

        {type === 'GROUP' && (
          <input
            style={styles.input}
            placeholder="Group name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        )}

        {selectedUsers.length > 0 && (
          <div style={styles.chips}>
            {selectedUsers.map((u) => (
              <span key={u.id} style={styles.chip}>
                {u.firstName} {u.lastName}
                <button style={styles.chipRemove} onClick={() => removeUser(u.id)}>&times;</button>
              </span>
            ))}
          </div>
        )}

        <input
          style={styles.input}
          placeholder="Search users..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          autoFocus
        />

        <div style={styles.resultsList}>
          {searching && <p style={styles.hint}>Searching...</p>}
          {!searching && searchQuery && searchResults.length === 0 && (
            <p style={styles.hint}>No users found</p>
          )}
          {searchResults.map((user) => (
            <div key={user.id} style={styles.resultItem} onClick={() => selectUser(user)}>
              <Avatar name={`${user.firstName} ${user.lastName}`} size="sm" />
              <div style={styles.resultInfo}>
                <div style={styles.resultName}>{user.firstName} {user.lastName}</div>
                <div style={styles.resultEmail}>{user.email}</div>
              </div>
            </div>
          ))}
          {!searchQuery && !searching && selectedUsers.length === 0 && (
            <p style={styles.hint}>Type a name or email to search</p>
          )}
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          style={{ ...styles.createBtn, opacity: canCreate ? 1 : 0.5 }}
          onClick={handleCreate}
          disabled={!canCreate || creating}
        >
          {creating ? 'Creating...' : 'Create Chat'}
        </button>
      </div>
    </Modal>
  );
}

const styles: Record<string, React.CSSProperties> = {
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  typeSelector: { display: 'flex', gap: 8 },
  typeBtn: { flex: 1, padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 14, color: 'var(--color-text)' },
  typeBtnActive: { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' },
  input: { padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 14, outline: 'none', color: 'var(--color-text)', background: 'var(--color-bg-secondary)' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  chip: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 'var(--radius-full)', background: 'var(--color-primary)', color: '#fff', fontSize: 13, fontWeight: 500 },
  chipRemove: { background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, marginLeft: 2 },
  resultsList: { minHeight: 80, maxHeight: 200, overflowY: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', padding: 4 },
  resultItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 'var(--radius-sm)', cursor: 'pointer' },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 14, fontWeight: 500, color: 'var(--color-text)' },
  resultEmail: { fontSize: 12, color: 'var(--color-text-secondary)' },
  hint: { fontSize: 13, color: 'var(--color-text-tertiary)', margin: '12px 8px', textAlign: 'center' },
  error: { background: '#FEE2E2', color: '#DC2626', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: 13 },
  createBtn: { padding: 12, borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
};
