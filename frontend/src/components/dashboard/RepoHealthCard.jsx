import React from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const HEALTH_META = {
  active:    { color: 'var(--success)', bg: 'var(--success-muted)' },
  stale:     { color: 'var(--accent)',  bg: 'var(--accent-muted)'  },
  idle:      { color: 'var(--danger)',  bg: 'var(--danger-muted)'  },
  abandoned: { color: 'var(--danger)',  bg: 'var(--danger-muted)'  },
  unknown:   { color: 'var(--ink3)',    bg: 'var(--bg4)'           },
};

const RepoHealthCard = ({ repos = [] }) => {
  const display = repos.slice(0, 5);

  if (!display.length) {
    return (
      <Card className="p-5">
        <Label className="mb-3">Repository Health</Label>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>No repositories synced yet.</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <Label className="mb-4">Repository Health</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {display.map((repo, i) => {
          const health = repo.health || 'unknown';
          const impact = repo.impact ?? null;
          const hMeta  = HEALTH_META[health] || HEALTH_META.unknown;
          const url    = repo.html_url || repo.url || '#';

          return (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                background: 'var(--bg3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                textDecoration: 'none',
                transition: 'border-color 150ms, box-shadow 150ms',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--border2)';
                e.currentTarget.style.boxShadow   = '0 2px 8px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow   = 'none';
              }}
            >
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--info)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: 8 }}>
                  {repo.name}
                </span>
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 999,
                  color: hMeta.color,
                  background: hMeta.bg,
                  flexShrink: 0,
                  letterSpacing: '0.02em',
                  textTransform: 'capitalize',
                }}>
                  {health}
                </span>
              </div>

              {/* Description */}
              {repo.description && (
                <p style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 7, lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {repo.description}
                </p>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {repo.language && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
                    {repo.language}
                  </span>
                )}
                {impact !== null && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
                    Impact{' '}
                    <span style={{ color: 'var(--ink2)', fontWeight: 600 }}>{Number(impact).toFixed(0)}</span>
                    <span style={{ color: 'var(--ink4)' }}>/100</span>
                  </span>
                )}
                {repo.stargazers_count > 0 && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
                    ★ <span style={{ color: 'var(--ink2)' }}>{repo.stargazers_count}</span>
                  </span>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </Card>
  );
};

export default RepoHealthCard;
