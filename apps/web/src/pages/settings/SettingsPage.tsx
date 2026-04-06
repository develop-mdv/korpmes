import React, { useState, useCallback } from 'react';
import { Avatar } from '@/components/common/Avatar';
import { Modal } from '@/components/common/Modal';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import * as usersApi from '@/api/users.api';
import * as authApi from '@/api/auth.api';

// ─── Profile Edit ─────────────────────────────────────────────────────────────

function ProfileEditForm({
  user,
  onSaved,
  onCancel,
}: {
  user: NonNullable<ReturnType<typeof useAuthStore.getState>['user']>;
  onSaved: (updated: usersApi.UserSearchResult) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    firstName: user.firstName,
    lastName: user.lastName,
    position: (user as any).position ?? '',
    timezone: (user as any).timezone ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First and last name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await usersApi.updateMe({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        position: form.position.trim() || undefined,
        timezone: form.timezone.trim() || undefined,
      });
      onSaved(updated);
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.editForm}>
      {(['firstName', 'lastName', 'position', 'timezone'] as const).map((key) => (
        <label key={key} style={styles.formLabel}>
          {key === 'firstName' ? 'First name' : key === 'lastName' ? 'Last name' : key === 'position' ? 'Position / title' : 'Timezone (e.g. Europe/Moscow)'}
          <input
            style={styles.formInput}
            value={form[key]}
            onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
          />
        </label>
      ))}
      {error && <p style={styles.formError}>{error}</p>}
      <div style={styles.formActions}>
        <button style={styles.cancelBtn} onClick={onCancel}>Cancel</button>
        <button style={styles.primaryBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}

// ─── 2FA Modal ────────────────────────────────────────────────────────────────

function TwoFAModal({
  isEnabled,
  onClose,
  onToggled,
}: {
  isEnabled: boolean;
  onClose: () => void;
  onToggled: (enabled: boolean) => void;
}) {
  const [step, setStep] = useState<'landing' | 'scan' | 'disable'>(
    isEnabled ? 'disable' : 'landing',
  );
  const [qrUrl, setQrUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const startSetup = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await authApi.setup2FA();
      setQrUrl(res.qrCodeUrl);
      setSecret(res.secret);
      setStep('scan');
    } catch {
      setError('Failed to start 2FA setup. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length < 6) { setError('Enter the 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.verify2FA(code);
      onToggled(true);
      onClose();
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    if (code.length < 6) { setError('Enter your current 6-digit code'); return; }
    setLoading(true);
    setError('');
    try {
      await authApi.disable2FA(code);
      onToggled(false);
      onClose();
    } catch {
      setError('Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.twoFAForm}>
      {step === 'landing' && (
        <>
          <p style={styles.helperText}>
            Two-factor authentication adds an extra layer of security. You will need an authenticator app like Google Authenticator or Authy.
          </p>
          {error && <p style={styles.formError}>{error}</p>}
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={styles.primaryBtn} onClick={startSetup} disabled={loading}>
              {loading ? 'Loading…' : 'Set up 2FA'}
            </button>
          </div>
        </>
      )}

      {step === 'scan' && (
        <>
          <p style={styles.helperText}>Scan this QR code with your authenticator app:</p>
          {qrUrl && <img src={qrUrl} alt="2FA QR Code" style={styles.qrCode} />}
          <p style={styles.helperText}>
            Or enter this key manually: <code style={styles.secretCode}>{secret}</code>
          </p>
          <label style={styles.formLabel}>
            Enter the 6-digit code from your app:
            <input
              style={styles.formInput}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoFocus
            />
          </label>
          {error && <p style={styles.formError}>{error}</p>}
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={styles.primaryBtn} onClick={handleVerify} disabled={loading}>
              {loading ? 'Verifying…' : 'Enable 2FA'}
            </button>
          </div>
        </>
      )}

      {step === 'disable' && (
        <>
          <p style={styles.helperText}>
            Enter the current 6-digit code from your authenticator app to disable 2FA.
          </p>
          <label style={styles.formLabel}>
            Verification code:
            <input
              style={styles.formInput}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              autoFocus
            />
          </label>
          {error && <p style={styles.formError}>{error}</p>}
          <div style={styles.formActions}>
            <button style={styles.cancelBtn} onClick={onClose}>Cancel</button>
            <button style={{ ...styles.primaryBtn, background: 'var(--color-error, #EF4444)' }} onClick={handleDisable} disabled={loading}>
              {loading ? 'Disabling…' : 'Disable 2FA'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const authStore = useAuthStore();
  const user = authStore.user;
  const { theme, setTheme } = useUIStore();
  const [editingProfile, setEditingProfile] = useState(false);
  const [twoFAOpen, setTwoFAOpen] = useState(false);
  const [twoFAEnabled, setTwoFAEnabled] = useState((user as any)?.twoFactorEnabled ?? false);

  const handleProfileSaved = useCallback(
    (updated: usersApi.UserSearchResult) => {
      (authStore as any).setUser?.({ ...user, ...updated });
      setEditingProfile(false);
    },
    [user, authStore],
  );

  if (!user) return null;

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Settings</h1>

      {/* Profile */}
      <section style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>Profile</h2>
          {!editingProfile && (
            <button style={styles.ghostBtn} onClick={() => setEditingProfile(true)}>Edit</button>
          )}
        </div>

        {editingProfile ? (
          <ProfileEditForm
            user={user}
            onSaved={handleProfileSaved}
            onCancel={() => setEditingProfile(false)}
          />
        ) : (
          <div style={styles.profileCard}>
            <Avatar name={`${user.firstName} ${user.lastName}`} size="lg" />
            <div style={styles.profileInfo}>
              <p style={styles.profileName}>{user.firstName} {user.lastName}</p>
              <p style={styles.profileSub}>{user.email}</p>
              {(user as any).position && <p style={styles.profileSub}>{(user as any).position}</p>}
            </div>
          </div>
        )}
      </section>

      {/* Appearance */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Appearance</h2>
        <div style={styles.themeRow}>
          {(['light', 'dark'] as const).map((t) => (
            <button
              key={t}
              style={{ ...styles.themeBtn, ...(theme === t ? styles.themeBtnActive : {}) }}
              onClick={() => setTheme(t)}
            >
              {t === 'light' ? '☀️ Light' : '🌙 Dark'}
            </button>
          ))}
        </div>
      </section>

      {/* Security */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Security</h2>
        <div style={styles.securityRow}>
          <div>
            <div style={styles.securityLabel}>Two-Factor Authentication</div>
            <div style={styles.securityDesc}>
              {twoFAEnabled ? '2FA is enabled — your account is protected.' : 'Protect your account with a second factor.'}
            </div>
          </div>
          <button
            style={{ ...styles.primaryBtn, ...(twoFAEnabled ? styles.dangerBtn : {}) }}
            onClick={() => setTwoFAOpen(true)}
          >
            {twoFAEnabled ? 'Disable 2FA' : 'Enable 2FA'}
          </button>
        </div>
      </section>

      <Modal
        open={twoFAOpen}
        onClose={() => setTwoFAOpen(false)}
        title={twoFAEnabled ? 'Disable Two-Factor Authentication' : 'Set Up Two-Factor Authentication'}
      >
        <TwoFAModal
          isEnabled={twoFAEnabled}
          onClose={() => setTwoFAOpen(false)}
          onToggled={(v) => setTwoFAEnabled(v)}
        />
      </Modal>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: { padding: 24, maxWidth: 640, margin: '0 auto' },
  title: { fontSize: 24, fontWeight: 700, marginBottom: 24, color: 'var(--color-text)' },
  section: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: 20, marginBottom: 16 },
  sectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: 600, margin: 0, color: 'var(--color-text)' },
  ghostBtn: { padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  profileCard: { display: 'flex', alignItems: 'center', gap: 16 },
  profileInfo: { flex: 1 },
  profileName: { fontWeight: 600, fontSize: 15, margin: 0, color: 'var(--color-text)' },
  profileSub: { fontSize: 13, color: 'var(--color-text-secondary)', margin: '2px 0 0' },
  themeRow: { display: 'flex', gap: 8 },
  themeBtn: { padding: '8px 20px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 14 },
  themeBtnActive: { background: 'var(--color-primary)', color: '#fff', borderColor: 'var(--color-primary)' },
  securityRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  securityLabel: { fontSize: 14, fontWeight: 600, color: 'var(--color-text)', marginBottom: 2 },
  securityDesc: { fontSize: 13, color: 'var(--color-text-secondary)' },
  // Forms
  editForm: { display: 'flex', flexDirection: 'column', gap: 12 },
  formLabel: { display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 500, color: 'var(--color-text)' },
  formInput: { padding: '8px 12px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: 14, outline: 'none', background: 'var(--color-bg)', color: 'var(--color-text)' },
  formError: { color: 'var(--color-error, #EF4444)', fontSize: 13, margin: 0 },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
  cancelBtn: { padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', background: 'transparent', cursor: 'pointer', fontSize: 13 },
  primaryBtn: { padding: '8px 16px', borderRadius: 'var(--radius-sm)', border: 'none', background: 'var(--color-primary)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  dangerBtn: { background: 'var(--color-error, #EF4444)' },
  // 2FA
  twoFAForm: { display: 'flex', flexDirection: 'column', gap: 14 },
  helperText: { fontSize: 14, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 },
  qrCode: { width: 180, height: 180, display: 'block', margin: '0 auto', borderRadius: 8 },
  secretCode: { fontFamily: 'monospace', background: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: 4, fontSize: 12 },
};
