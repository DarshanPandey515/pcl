import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/auth';
import Card from '../components/ui/Card';
import Label from '../components/ui/Label';
import Spinner from '../components/ui/Spinner';

const Section = ({ title, children }) => (
  <Card className="p-5">
    <Label className="mb-4">{title}</Label>
    {children}
  </Card>
);

const Field = ({ label, children }) => (
  <div className="space-y-1.5">
    <p className="font-mono text-[10px] text-[var(--ink3)] uppercase tracking-wider">{label}</p>
    {children}
  </div>
);

const Input = ({ value, onChange, placeholder, type = 'text', readOnly }) => (
  <input
    type={type}
    value={value}
    onChange={onChange}
    placeholder={placeholder}
    readOnly={readOnly}
    className="w-full font-mono text-[12px] px-3 py-2 rounded-lg border outline-none transition-colors"
    style={{
      background: readOnly ? 'var(--bg4)' : 'var(--bg3)',
      borderColor: 'var(--border)',
      color: readOnly ? 'var(--ink3)' : 'var(--ink)',
      caretColor: 'var(--amber)',
    }}
    onFocus={(e) => { if (!readOnly) e.target.style.borderColor = 'var(--border2)'; }}
    onBlur={(e)  => { e.target.style.borderColor = 'var(--border)'; }}
  />
);

const Toggle = ({ checked, onChange, label, description }) => (
  <div className="flex items-start justify-between gap-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
    <div>
      <p className="font-mono text-[12px] text-[var(--ink)]">{label}</p>
      {description && <p className="font-mono text-[10px] text-[var(--ink3)] mt-0.5">{description}</p>}
    </div>
    <button
      onClick={() => onChange(!checked)}
      className="relative shrink-0 w-9 h-5 rounded-full transition-colors"
      style={{ background: checked ? 'var(--amber)' : 'var(--bg4)' }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
        style={{
          background: 'var(--bg)',
          left: checked ? '1.125rem' : '0.125rem',
        }}
      />
    </button>
  </div>
);

const Settings = () => {
  const { user, updateProfile, logout } = useAuth();
  const profile = user?.profile || {};

  const [form, setForm] = useState({
    first_name:     user?.first_name || '',
    last_name:      user?.last_name  || '',
    bio:            profile.bio      || '',
    location:       profile.location || '',
    website:        profile.website  || '',
    twitter_handle: profile.twitter_handle || '',
    linkedin_url:   profile.linkedin_url   || '',
  });
  const [privacy, setPrivacy] = useState({
    profile_public: profile.profile_public ?? true,
  });

  const [saving,        setSaving]        = useState(false);
  const [syncing,       setSyncing]       = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast,         setToast]         = useState(null);
  const [error,         setError]         = useState(null);

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSaveProfile = async () => {
    try {
      setSaving(true);
      setError(null);
      await updateProfile({ ...form, profile_public: privacy.profile_public });
      showToast('Profile saved');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSyncGithub = async () => {
    try {
      setSyncing(true);
      await authAPI.syncGithub();
      showToast('GitHub data synced');
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Disconnect GitHub? Your data will be preserved but syncing will stop.')) return;
    try {
      setDisconnecting(true);
      await authAPI.disconnectGithub();
      showToast('GitHub disconnected');
    } catch (err) {
      setError(err.message);
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <Label className="mb-2">account</Label>
        <h1 className="text-2xl font-semibold text-[var(--ink)] tracking-tight">Settings</h1>
      </div>

      {/* Toast */}
      {toast && (
        <div
          className="fixed top-4 right-4 font-mono text-[11px] px-4 py-2.5 rounded-lg border z-50"
          style={{
            background: 'var(--bg2)',
            borderColor: toast.type === 'ok' ? 'var(--green)' : 'var(--red)',
            color: toast.type === 'ok' ? 'var(--green)' : 'var(--red)',
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Global error */}
      {error && (
        <div
          className="rounded-lg border px-4 py-3 font-mono text-[11px] mb-4"
          style={{ borderColor: 'rgba(248,113,113,.3)', background: 'rgba(248,113,113,.06)', color: 'var(--danger)' }}
        >
          {error}
        </div>
      )}

      {/* ── Bento grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>

        {/* Profile info — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Section title="profile information">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First name">
                  <Input value={form.first_name} onChange={set('first_name')} placeholder="First name" />
                </Field>
                <Field label="Last name">
                  <Input value={form.last_name} onChange={set('last_name')} placeholder="Last name" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Username (GitHub)">
                  <Input value={profile.github_username || user?.username || ''} readOnly />
                </Field>
                <Field label="Email">
                  <Input value={user?.email || ''} readOnly />
                </Field>
              </div>
              <Field label="Bio">
                <textarea
                  value={form.bio}
                  onChange={set('bio')}
                  rows={3}
                  placeholder="A short bio…"
                  className="w-full font-mono text-[12px] px-3 py-2 rounded-lg border outline-none transition-colors resize-none"
                  style={{ background: 'var(--bg3)', borderColor: 'var(--border)', color: 'var(--ink)', caretColor: 'var(--accent)' }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
                  onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location">
                  <Input value={form.location} onChange={set('location')} placeholder="City, Country" />
                </Field>
                <Field label="Website">
                  <Input value={form.website} onChange={set('website')} placeholder="https://…" type="url" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Twitter / X">
                  <Input value={form.twitter_handle} onChange={set('twitter_handle')} placeholder="@handle" />
                </Field>
                <Field label="LinkedIn URL">
                  <Input value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" type="url" />
                </Field>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 font-mono text-[12px] px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50"
                style={{ background: 'var(--accent)', color: 'var(--bg)' }}
              >
                {saving && <Spinner size="sm" />}
                {saving ? 'saving…' : 'save profile'}
              </button>
            </div>
          </Section>
        </div>

        {/* Privacy */}
        <Section title="privacy">
          <Toggle
            checked={privacy.profile_public}
            onChange={(v) => setPrivacy({ profile_public: v })}
            label="Public profile"
            description="Allow other users to view your profile and contribution data on the leaderboard."
          />
        </Section>

        {/* Session */}
        <Section title="session">
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="font-mono text-[12px] text-[var(--ink)]">Sign out</p>
              <p className="font-mono text-[10px] text-[var(--ink3)] mt-0.5">Clear session tokens from this browser.</p>
            </div>
            <button
              onClick={logout}
              className="font-mono text-[11px] px-3 py-2 rounded-lg border transition-colors"
              style={{ borderColor: 'rgba(248,113,113,.3)', color: 'var(--danger)', background: 'var(--bg3)' }}
            >
              sign out
            </button>
          </div>
        </Section>

        {/* GitHub integration — full width */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Section title="github integration">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-mono text-[12px] text-[var(--ink)]">Connection status</p>
                    <p className="font-mono text-[10px] text-[var(--ink3)] mt-0.5">
                      {profile.is_github_connected ? `Connected as @${profile.github_username}` : 'Not connected'}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full" style={{ background: profile.is_github_connected ? 'var(--success)' : 'var(--danger)' }} />
                </div>
                {profile.last_github_sync && (
                  <div className="flex items-center justify-between py-2 border-t" style={{ borderColor: 'var(--border)' }}>
                    <div>
                      <p className="font-mono text-[12px] text-[var(--ink)]">Last synced</p>
                      <p className="font-mono text-[10px] text-[var(--ink3)] mt-0.5">{new Date(profile.last_github_sync).toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 justify-center">
                {profile.is_github_connected && (
                  <button
                    onClick={handleSyncGithub}
                    disabled={syncing}
                    className="flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded-lg border transition-colors disabled:opacity-50"
                    style={{ borderColor: 'var(--border)', color: 'var(--accent)', background: 'var(--bg3)' }}
                  >
                    {syncing && <Spinner size="sm" />}
                    {syncing ? 'syncing…' : '↻ sync now'}
                  </button>
                )}
                {profile.is_github_connected && (
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                    className="flex items-center gap-2 font-mono text-[11px] px-3 py-2 rounded-lg border transition-colors disabled:opacity-50"
                    style={{ borderColor: 'rgba(248,113,113,.3)', color: 'var(--danger)', background: 'var(--bg3)' }}
                  >
                    {disconnecting ? 'disconnecting…' : 'disconnect github'}
                  </button>
                )}
              </div>
            </div>
          </Section>
        </div>

        {/* Momentum score — full width, bento stat tiles */}
        <div style={{ gridColumn: '1 / -1' }}>
          <Section title="momentum score breakdown">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 12 }}>
              {[
                { label: 'Score',       value: Number(profile.momentum_score || 0).toFixed(2),       color: 'var(--accent)' },
                { label: 'Consistency', value: Number(profile.momentum_consistency || 0).toFixed(2), color: 'var(--success)' },
                { label: 'Recency',     value: Number(profile.momentum_recency || 0).toFixed(2),     color: 'var(--success)' },
                { label: 'Depth',       value: Number(profile.momentum_depth || 0).toFixed(2),       color: 'var(--info)' },
                { label: 'Decay',       value: `×${Number(profile.momentum_decay || 1).toFixed(4)}`, color: profile.momentum_decay < 0.8 ? 'var(--danger)' : 'var(--ink2)' },
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-lg p-3 text-center" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                  <p className="font-mono text-[17px] font-semibold" style={{ color }}>{value}</p>
                  <p className="font-mono text-[9px] text-[var(--ink3)] uppercase tracking-wider mt-1">{label}</p>
                </div>
              ))}
            </div>
            <p className="font-mono text-[10px] text-[var(--ink3)] leading-relaxed">
              Score = (consistency × 40%) + (recency × 35%) + (depth × 25%) × decay. Decay starts after 3 inactive days and floors at ×0.30.
            </p>
          </Section>
        </div>

      </div>
    </div>
  );
};

export default Settings;
