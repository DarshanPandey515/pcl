import React from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const PERSONALITY_COLORS = {
  explorer:   'var(--info)',
  specialist: 'var(--purple)',
  maintainer: 'var(--success)',
  sprinter:   'var(--accent)',
  unknown:    'var(--ink3)',
};

const PERSONALITY_BG = {
  explorer:   'var(--info-muted)',
  specialist: 'var(--purple-muted)',
  maintainer: 'var(--success-muted)',
  sprinter:   'var(--accent-muted)',
  unknown:    'var(--bg4)',
};

const Stat = ({ value, label, highlight }) => (
  <div style={{
    background: 'var(--bg3)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    padding: '10px 12px',
  }}>
    <p style={{
      fontSize: 20,
      fontWeight: 700,
      letterSpacing: '-0.03em',
      lineHeight: 1,
      color: highlight || 'var(--ink)',
      fontVariantNumeric: 'tabular-nums',
      marginBottom: 4,
    }}>
      {value}
    </p>
    <p style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 9,
      color: 'var(--ink3)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
    }}>
      {label}
    </p>
  </div>
);

const ProfileCard = ({ user = {}, analytics = {} }) => {
  const profile     = user.profile || {};
  const personality = profile.personality_type || 'unknown';
  const pColor      = PERSONALITY_COLORS[personality];
  const pBg         = PERSONALITY_BG[personality];
  const summary     = analytics.summary || {};

  return (
    <Card className="p-5">
      {/* Avatar + name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt=""
            style={{ width: 44, height: 44, borderRadius: '50%', border: '2px solid var(--border2)', flexShrink: 0 }}
          />
        ) : (
          <div style={{
            width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--success), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, fontWeight: 700, color: 'var(--bg)',
          }}>
            {(user.full_name || user.username || '?')[0].toUpperCase()}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {user.full_name || user.username}
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', marginTop: 1 }}>
            @{profile.github_username || user.username}
            {profile.location ? ` · ${profile.location}` : ''}
          </p>
        </div>
      </div>

      {/* Personality chip */}
      <div style={{ marginBottom: 14 }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.02em',
          color: pColor,
          background: pBg,
          border: `1px solid ${pColor}30`,
          textTransform: 'capitalize',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: pColor, flexShrink: 0 }} />
          {personality}
          {profile.personality_confidence > 0 && (
            <span style={{ fontWeight: 400, color: pColor, opacity: 0.7 }}>
              · {Math.round(profile.personality_confidence * 100)}%
            </span>
          )}
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
        <Stat
          value={(summary.total_contributions || 0).toLocaleString()}
          label="Contributions"
          highlight="var(--success)"
        />
        <Stat value={profile.own_repos?.length || 0} label="Repositories" />
        <Stat
          value={`${profile.current_streak || 0}d`}
          label="Streak"
          highlight={profile.current_streak >= 7 ? 'var(--success)' : undefined}
        />
        <Stat value={summary.total_pull_requests || 0} label="Pull Requests" />
        <Stat value={summary.total_issues || 0}        label="Issues" />
        <Stat value={summary.total_reviews || 0}       label="Reviews" />
      </div>
    </Card>
  );
};

export default ProfileCard;
