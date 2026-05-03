import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';
import Label from '../components/ui/Label';

const PERSONALITY_COLORS = {
  explorer: 'var(--blue)', specialist: 'var(--purple)',
  maintainer: 'var(--green)', sprinter: 'var(--amber)', unknown: 'var(--ink3)',
};

const Leaderboard = () => {
  const { user }      = useAuth();
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [q, setQ]             = useState('');

  useEffect(() => {
    authAPI.getLeaderboard(100)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = data.filter((p) =>
    !q || p.username.toLowerCase().includes(q.toLowerCase())
  );

  const me = user?.username;

  return (
    <div className="px-6 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-bold text-3xl text-[var(--ink)]">
          Developer Leaderboard
        </h1>
        <p className="font-mono text-[11px] text-[var(--ink3)] mt-1">
          Ranked by momentum score — discipline over vanity metrics.
        </p>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="search by username…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full font-mono text-[12px] px-3 py-2.5 rounded-lg border outline-none transition-colors"
          style={{
            background: 'var(--bg2)', borderColor: 'var(--border)',
            color: 'var(--ink)', caretColor: 'var(--amber)',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--border2)')}
          onBlur={(e)  => (e.target.style.borderColor = 'var(--border)')}
        />
      </div>

      {loading && (
        <div className="flex justify-center py-12"><Spinner size="lg" /></div>
      )}
      {error && (
        <p className="font-mono text-[11px] text-[var(--red)] text-center py-8">{error}</p>
      )}

      {!loading && !error && (
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'var(--border)', background: 'var(--bg2)' }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[40px_1fr_80px_120px_80px] gap-3 px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--border)' }}
          >
            {['#', 'developer', 'momentum', 'personality', 'streak'].map((h) => (
              <span key={h} className="font-mono text-[9px] text-[var(--ink3)] uppercase tracking-wider">{h}</span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((p, i) => {
            const isMe = p.username === me;
            const pColor = PERSONALITY_COLORS[p.personality_type] || 'var(--ink3)';
            return (
              <Link
                key={p.username}
                to={`/u/${p.username}`}
                className="grid grid-cols-[40px_1fr_80px_120px_80px] gap-3 px-4 py-3 border-b items-center transition-colors group"
                style={{
                  borderColor: 'var(--border)',
                  background: isMe ? 'rgba(245,166,35,.04)' : 'transparent',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = isMe ? 'rgba(245,166,35,.08)' : 'rgba(255,255,255,.02)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = isMe ? 'rgba(245,166,35,.04)' : 'transparent')}
              >
                {/* Rank */}
                <span
                  className="font-mono text-[12px] text-right"
                  style={{ color: isMe ? 'var(--amber)' : 'var(--ink3)' }}
                >
                  {p.rank || i + 1}
                </span>

                {/* Developer */}
                <div className="flex items-center gap-2.5 min-w-0">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="w-6 h-6 rounded-full shrink-0" />
                  ) : (
                    <div
                      className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold"
                      style={{ background: 'var(--bg4)', color: 'var(--ink3)' }}
                    >
                      {p.username[0].toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p
                      className="font-mono text-[12px] truncate group-hover:underline"
                      style={{ color: isMe ? 'var(--amber)' : 'var(--ink)' }}
                    >
                      @{p.username}
                      {isMe && <span className="text-[var(--ink3)] ml-1">(you)</span>}
                    </p>
                  </div>
                </div>

                {/* Momentum */}
                <div>
                  <p
                    className="font-mono text-[13px]"
                    style={{ color: isMe ? 'var(--amber)' : 'var(--ink)' }}
                  >
                    {Number(p.momentum_score).toFixed(1)}
                  </p>
                  <div className="h-px mt-1 rounded" style={{ background: 'var(--bg4)' }}>
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${p.momentum_score}%`,
                        background: isMe ? 'var(--amber)' : 'var(--ink3)',
                      }}
                    />
                  </div>
                </div>

                {/* Personality */}
                <span
                  className="font-mono text-[10px] uppercase tracking-wider"
                  style={{ color: pColor }}
                >
                  {p.personality_type || '—'}
                </span>

                {/* Streak */}
                <span className="font-mono text-[12px] text-[var(--ink2)]">
                  {p.current_streak > 0 ? `${p.current_streak}d` : '—'}
                </span>
              </Link>
            );
          })}

          {!filtered.length && !loading && (
            <p className="font-mono text-[11px] text-[var(--ink3)] text-center py-8">
              No results for "{q}"
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
