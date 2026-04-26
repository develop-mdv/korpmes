import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { useOrganizationStore } from '@/stores/organization.store';
import { useAuthStore } from '@/stores/auth.store';
import * as orgsApi from '@/api/organizations.api';

interface Member {
  id: string;
  userId: string;
  user: { firstName: string; lastName: string; email: string; avatarUrl?: string };
  role: string;
  joinedAt: string;
}

const ROLES = ['OWNER', 'ADMIN', 'MANAGER', 'EMPLOYEE', 'GUEST'];

export function MembersPage() {
  const { currentOrg } = useOrganizationStore();
  const currentUser = useAuthStore((s) => s.user);
  const [members, setMembers] = useState<Member[]>([]);
  const [search, setSearch] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('EMPLOYEE');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteMsg, setInviteMsg] = useState('');
  const [inviteLink, setInviteLink] = useState<orgsApi.InviteLinkInfo | null>(null);
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const myMembership = currentUser
    ? members.find((m) => m.userId === currentUser.id)
    : undefined;
  const canManageInvites = !!myMembership && ['OWNER', 'ADMIN'].includes(myMembership.role);

  useEffect(() => {
    if (!currentOrg) return;
    orgsApi.getMembers(currentOrg.id).then((res) => {
      const list = (res as any).data || (res as any).members || [];
      setMembers(list as Member[]);
    });
    orgsApi.getInviteLink(currentOrg.id).then(setInviteLink).catch(() => setInviteLink(null));
    orgsApi
      .listJoinRequests(currentOrg.id)
      .then((reqs) => setPendingCount(reqs.length))
      .catch(() => setPendingCount(0));
  }, [currentOrg]);

  const filtered = members.filter((m) => {
    if (!m.user) return false;
    const name = `${m.user.firstName} ${m.user.lastName} ${m.user.email}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  const handleRoleChange = async (memberId: string, userId: string, role: string) => {
    if (!currentOrg) return;
    try {
      await orgsApi.changeRole(currentOrg.id, userId, role);
      setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role } : m)));
    } catch {
      // ignore
    }
  };

  const handleCreateLink = async () => {
    if (!currentOrg) return;
    setLinkBusy(true);
    try {
      const info = await orgsApi.createInviteLink(currentOrg.id);
      setInviteLink(info);
    } finally {
      setLinkBusy(false);
    }
  };

  const handleRevokeLink = async () => {
    if (!currentOrg) return;
    setLinkBusy(true);
    try {
      await orgsApi.revokeInviteLink(currentOrg.id);
      setInviteLink(null);
    } finally {
      setLinkBusy(false);
    }
  };

  const handleRotateLink = async () => {
    if (!currentOrg) return;
    setLinkBusy(true);
    try {
      await orgsApi.revokeInviteLink(currentOrg.id);
      const info = await orgsApi.createInviteLink(currentOrg.id);
      setInviteLink(info);
    } finally {
      setLinkBusy(false);
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink.url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleInvite = async () => {
    if (!currentOrg || !inviteEmail.trim()) return;
    setInviteLoading(true);
    setInviteMsg('');
    try {
      await orgsApi.inviteMember(currentOrg.id, { email: inviteEmail, role: inviteRole as any });
      setInviteMsg('Invitation sent!');
      setInviteEmail('');
    } catch (err: any) {
      setInviteMsg(err.response?.data?.error?.message || 'Failed to send invitation');
    } finally {
      setInviteLoading(false);
    }
  };

  if (!currentOrg) {
    return <div style={{ padding: 24, color: 'var(--color-text-secondary)' }}>Select an organization first</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Участники ({members.length})</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          {canManageInvites && (
            <Link to="/organization/requests" style={styles.requestsLink}>
              Заявки{pendingCount > 0 ? ` (${pendingCount})` : ''}
            </Link>
          )}
          <button style={styles.inviteBtn} onClick={() => setShowInvite(true)}>
            Пригласить
          </button>
        </div>
      </div>

      {canManageInvites && (
        <div style={styles.linkBlock}>
          <div style={styles.linkLabel}>Ссылка-приглашение</div>
          {inviteLink ? (
            <div style={styles.linkRow}>
              <input style={styles.linkInput} value={inviteLink.url} readOnly />
              <button style={styles.linkBtn} onClick={handleCopyLink} disabled={linkBusy}>
                {linkCopied ? 'Скопировано!' : 'Копировать'}
              </button>
              <button style={styles.linkBtn} onClick={handleRotateLink} disabled={linkBusy}>
                Перевыпустить
              </button>
              <button style={{ ...styles.linkBtn, ...styles.linkBtnDanger }} onClick={handleRevokeLink} disabled={linkBusy}>
                Отозвать
              </button>
            </div>
          ) : (
            <div style={styles.linkRow}>
              <span style={styles.linkHint}>Ссылка не создана. Поделитесь ей, чтобы коллеги могли вступить без подтверждения.</span>
              <button style={styles.inviteBtn} onClick={handleCreateLink} disabled={linkBusy}>
                Создать ссылку
              </button>
            </div>
          )}
        </div>
      )}

      <input style={styles.search} placeholder="Поиск участников..." value={search} onChange={(e) => setSearch(e.target.value)} />

      <div style={styles.table}>
        <div style={{ ...styles.tableRow, ...styles.tableHeader }}>
          <span style={styles.colName}>Member</span>
          <span style={styles.colRole}>Role</span>
          <span style={styles.colDate}>Joined</span>
          <span style={styles.colActions}>Actions</span>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
            {search ? 'No members found' : 'No members yet'}
          </div>
        )}
        {filtered.map((m) => (
          <div key={m.id} style={styles.tableRow}>
            <div style={{ ...styles.colName, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Avatar name={`${m.user.firstName} ${m.user.lastName}`} src={m.user.avatarUrl} size="sm" />
              <div>
                <div style={styles.memberName}>{m.user.firstName} {m.user.lastName}</div>
                <div style={styles.memberEmail}>{m.user.email}</div>
              </div>
            </div>
            <div style={styles.colRole}>
              <select
                style={styles.roleSelect}
                value={m.role}
                onChange={(e) => handleRoleChange(m.id, m.userId, e.target.value)}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div style={styles.colDate}>{new Date(m.joinedAt).toLocaleDateString()}</div>
            <div style={styles.colActions}>
              <button style={styles.removeBtn} onClick={async () => {
                if (!currentOrg) return;
                await orgsApi.removeMember(currentOrg.id, m.userId);
                setMembers((prev) => prev.filter((x) => x.id !== m.id));
              }}>Remove</button>
            </div>
          </div>
        ))}
      </div>

      {showInvite && (
        <Modal open={true} title="Invite Member" onClose={() => { setShowInvite(false); setInviteMsg(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ fontSize: 14, fontWeight: 500 }}>Email</label>
            <input
              style={styles.search}
              placeholder="user@company.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              autoFocus
            />
            <label style={{ fontSize: 14, fontWeight: 500 }}>Role</label>
            <select style={styles.roleSelect} value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
              {ROLES.filter((r) => r !== 'OWNER').map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {inviteMsg && (
              <div style={{ padding: '8px 12px', borderRadius: 6, background: inviteMsg.includes('sent') ? '#D1FAE5' : '#FEE2E2', color: inviteMsg.includes('sent') ? '#065F46' : '#DC2626', fontSize: 13 }}>
                {inviteMsg}
              </div>
            )}
            <button style={styles.inviteBtn} onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()}>
              {inviteLoading ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 900, margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 700, margin: 0 },
  inviteBtn: { padding: '10px 20px', borderRadius: 'var(--radius-md)', border: 'none', background: 'var(--color-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  search: { width: '100%', padding: '10px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 14, marginBottom: 16, boxSizing: 'border-box' as const },
  table: { border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' },
  tableRow: { display: 'grid', gridTemplateColumns: '1fr 140px 120px 100px', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--color-border)' },
  tableHeader: { background: 'var(--color-bg-tertiary)', fontWeight: 600, fontSize: 13, color: 'var(--color-text-secondary)' },
  colName: { minWidth: 0 },
  colRole: {},
  colDate: { fontSize: 13, color: 'var(--color-text-secondary)' },
  colActions: {},
  memberName: { fontWeight: 500, fontSize: 14 },
  memberEmail: { fontSize: 12, color: 'var(--color-text-secondary)' },
  roleSelect: { padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 13, width: '100%' },
  removeBtn: { padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid #EF4444', background: 'transparent', color: '#EF4444', fontSize: 12, cursor: 'pointer' },
  requestsLink: { display: 'inline-flex', alignItems: 'center', padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 14, fontWeight: 500, textDecoration: 'none' },
  linkBlock: { background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '12px 16px', marginBottom: 16 },
  linkLabel: { fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 },
  linkRow: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  linkInput: { flex: '1 1 240px', minWidth: 200, padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: 13, background: 'var(--color-surface)', color: 'var(--color-text)' },
  linkBtn: { padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text)', fontSize: 13, cursor: 'pointer' },
  linkBtnDanger: { color: '#DC2626', borderColor: '#FCA5A5' },
  linkHint: { flex: 1, fontSize: 13, color: 'var(--color-text-secondary)' },
};
