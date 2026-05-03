// src/pages/Analytics.jsx - Real data + Dark SaaS theme
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as R from 'recharts';
import { authAPI } from '../api/auth';

const C = {
  bg: '#080810', surface: '#0f0f1a', card: '#12121f', border: '#1e1e30',
  muted: '#2a2a40', text: '#e8e8f0', dim: '#6b6b8a',
  accent: '#6366f1', aLo: 'rgba(99,102,241,0.14)',
  teal: '#2dd4bf', amber: '#f59e0b', rose: '#f43f5e', green: '#22c55e',
};
const PAL = [C.accent, C.teal, C.amber, C.rose, C.green, '#a78bfa', '#38bdf8'];
const cs = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '22px 24px' };

const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#1c1c2e', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 14px', fontSize: 12 }}>
      {label && <p style={{ color: C.dim, marginBottom: 4 }}>{label}</p>}
      {payload.map((p, i) => <p key={i} style={{ color: p.color || C.text, fontWeight: 600 }}>{p.name}: {p.value}</p>)}
    </div>
  );
};

const Empty = () => (
  <div style={{ height: 240, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.dim, gap: 8 }}>
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3v18h18M7 16l4-4 4 4 4-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span style={{ fontSize: 13 }}>Sync GitHub to populate</span>
  </div>
);

const toMonthly = (trends = {}) =>
  Object.entries(trends).sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => ({ month: m.slice(5), contributions: v })).slice(-12);
const toLangs = (langs = {}) =>
  Object.entries(langs).sort(([, a], [, b]) => b - a).slice(0, 7).map(([name, value]) => ({ name, value }));
const toTypes = (types = {}) =>
  Object.entries(types).map(([name, value]) => ({ name: name.replace('Event', ''), value })).sort((a, b) => b.value - a.value);

export default function Analytics() {
  const { user } = useAuth();
  const [range, setRange] = useState('year');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { load(); }, [range]);

  const load = async () => {
    setLoading(true); setError('');
    try { setData(await authAPI.getAnalytics(range)); }
    catch (e) { setError(e.message || 'Failed to load analytics'); }
    finally { setLoading(false); }
  };

  const monthly = toMonthly(data?.trends), langs = toLangs(data?.languages),
    types = toTypes(data?.contribution_types), s = data?.summary ?? {}, recent = data?.recent_activity ?? [];

  const radar = [
    { subject: 'Pushes', A: data?.contribution_types?.PushEvent ?? 0 },
    { subject: 'PRs', A: data?.contribution_types?.PullRequestEvent ?? 0 },
    { subject: 'Issues', A: data?.contribution_types?.IssuesEvent ?? 0 },
    { subject: 'Comments', A: data?.contribution_types?.IssueCommentEvent ?? 0 },
    { subject: 'Reviews', A: data?.contribution_types?.PullRequestReviewEvent ?? 0 },
    { subject: 'Forks', A: data?.contribution_types?.ForkEvent ?? 0 },
  ];
  const rMax = Math.max(...radar.map(r => r.A), 1);

  if (loading) return (
    <div style={{ background: C.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 40, height: 40, border: `3px solid ${C.border}`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: '"DM Sans",system-ui,sans-serif', color: C.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.muted};border-radius:3px}a{text-decoration:none}.rb{cursor:pointer;border:none;font-family:inherit;transition:all .15s}.tr:hover td{background:${C.muted}!important}`}</style>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '44px 28px' }}>

        {/* header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.accent, display: 'block', boxShadow: `0 0 10px ${C.accent}` }} />
            <span style={{ color: C.dim, fontSize: 11, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>Analytics</span>
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1.1 }}>Contribution Intelligence</h1>
          {(data?.peak_time || data?.top_language) && (
            <p style={{ color: C.dim, fontSize: 13, marginTop: 8 }}>
              {data.top_language && <span style={{ color: C.teal, fontWeight: 600 }}>{data.top_language}</span>}
              {data.top_language && data.peak_time && <span style={{ margin: '0 8px' }}>·</span>}
              {data.peak_time && <span>Peak: {data.peak_time}</span>}
            </p>
          )}
        </div>

        {/* range */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 36, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, width: 'fit-content' }}>
          {['week', 'month', 'quarter', 'year'].map(r => (
            <button key={r} className="rb" onClick={() => setRange(r)} style={{ padding: '6px 20px', borderRadius: 7, fontSize: 13, fontWeight: 600, background: range === r ? C.accent : 'transparent', color: range === r ? '#fff' : C.dim, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>

        {error && <div style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.3)', borderRadius: 10, padding: '12px 18px', color: C.rose, marginBottom: 28, fontSize: 14 }}>&#9888; {error}</div>}

        {/* summary stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 14, marginBottom: 28 }}>
          {[{ label: 'Contributions', value: s.total_contributions?.toLocaleString() }, { label: 'Pull Requests', value: s.pull_requests?.toLocaleString() }, { label: 'Issues', value: s.issues?.toLocaleString() }, { label: 'Cur. Streak', value: s.current_streak != null ? `${s.current_streak}d` : null }, { label: 'Best Streak', value: s.longest_streak != null ? `${s.longest_streak}d` : null }, { label: 'Avg Response', value: s.avg_response_time }].map(({ label, value }) => (
            <div key={label} style={cs}>
              <p style={{ color: C.dim, fontSize: 10, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', marginBottom: 10 }}>{label}</p>
              <p style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', color: C.text }}>{value ?? '—'}</p>
            </div>
          ))}
        </div>

        {/* charts row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={cs}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Contribution Trend</p>
            {monthly.length === 0 ? <Empty /> : (
              <R.ResponsiveContainer width="100%" height={240}>
                <R.AreaChart data={monthly}>
                  <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.accent} stopOpacity={.4} /><stop offset="100%" stopColor={C.accent} stopOpacity={0} /></linearGradient></defs>
                  <R.CartesianGrid strokeDasharray="3 3" stroke={C.border} />
                  <R.XAxis dataKey="month" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <R.YAxis tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <R.Tooltip content={<Tip />} />
                  <R.Area type="monotone" dataKey="contributions" name="Contributions" stroke={C.accent} strokeWidth={2.5} fill="url(#ag)" />
                </R.AreaChart>
              </R.ResponsiveContainer>
            )}
          </div>
          <div style={cs}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Language Distribution</p>
            {langs.length === 0 ? <Empty /> : (
              <R.ResponsiveContainer width="100%" height={240}>
                <R.PieChart>
                  <R.Pie data={langs} cx="50%" cy="50%" innerRadius={55} outerRadius={95} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: C.dim }}>
                    {langs.map((_, i) => <R.Cell key={i} fill={PAL[i % PAL.length]} />)}
                  </R.Pie>
                  <R.Tooltip content={<Tip />} />
                </R.PieChart>
              </R.ResponsiveContainer>
            )}
          </div>
        </div>

        {/* charts row 2 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
          <div style={cs}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Event Breakdown</p>
            {types.length === 0 ? <Empty /> : (
              <R.ResponsiveContainer width="100%" height={240}>
                <R.BarChart data={types} layout="vertical">
                  <R.CartesianGrid strokeDasharray="3 3" stroke={C.border} horizontal={false} />
                  <R.XAxis type="number" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <R.YAxis type="category" dataKey="name" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} width={72} />
                  <R.Tooltip content={<Tip />} />
                  <R.Bar dataKey="value" name="Events" radius={[0, 5, 5, 0]}>
                    {types.map((_, i) => <R.Cell key={i} fill={PAL[i % PAL.length]} />)}
                  </R.Bar>
                </R.BarChart>
              </R.ResponsiveContainer>
            )}
          </div>
          <div style={cs}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Activity Radar</p>
            <R.ResponsiveContainer width="100%" height={240}>
              <R.RadarChart cx="50%" cy="50%" outerRadius="72%" data={radar}>
                <R.PolarGrid stroke={C.border} />
                <R.PolarAngleAxis dataKey="subject" tick={{ fill: C.dim, fontSize: 11 }} />
                <R.PolarRadiusAxis angle={30} domain={[0, rMax]} tick={false} axisLine={false} />
                <R.Radar name="Activity" dataKey="A" stroke={C.teal} fill={C.teal} fillOpacity={.2} />
                <R.Tooltip content={<Tip />} />
              </R.RadarChart>
            </R.ResponsiveContainer>
          </div>
        </div>

        {/* monthly bar */}
        <div style={{ ...cs, marginBottom: 18 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 18 }}>Monthly Volume</p>
          {monthly.length === 0 ? <Empty /> : (
            <R.ResponsiveContainer width="100%" height={200}>
              <R.BarChart data={monthly}>
                <R.CartesianGrid strokeDasharray="3 3" stroke={C.border} vertical={false} />
                <R.XAxis dataKey="month" tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <R.YAxis tick={{ fill: C.dim, fontSize: 11 }} axisLine={false} tickLine={false} />
                <R.Tooltip content={<Tip />} />
                <R.Bar dataKey="contributions" name="Contributions" radius={[4, 4, 0, 0]}>
                  {monthly.map((_, i) => <R.Cell key={i} fill={`rgba(99,102,241,${.35 + (i / monthly.length) * .65})`} />)}
                </R.Bar>
              </R.BarChart>
            </R.ResponsiveContainer>
          )}
        </div>

        {/* recent activity */}
        <div style={cs}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 20 }}>Recent Activity</p>
          {recent.length === 0 ? (
            <p style={{ color: C.dim, textAlign: 'center', padding: '32px 0', fontSize: 13 }}>No recent activity. Sync GitHub first.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>{['Repository', 'Type', 'Language', 'Stars'].map(h => (
                    <th key={h} style={{ color: C.dim, fontWeight: 700, textAlign: 'left', padding: '8px 14px', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {recent.map((repo, i) => (
                    <tr key={i} className="tr" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '13px 14px' }}><a href={repo.html_url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontWeight: 500, textDecoration: 'none' }}>{repo.name || repo.full_name}</a></td>
                      <td style={{ padding: '13px 14px' }}>{repo.contribution_type && <span style={{ background: C.aLo, color: C.accent, borderRadius: 5, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{repo.contribution_type.replace('Event', '')}</span>}</td>
                      <td style={{ padding: '13px 14px', color: C.dim }}>{repo.language || '—'}</td>
                      <td style={{ padding: '13px 14px', color: C.dim, fontFamily: '"DM Mono",monospace', fontSize: 12 }}>{repo.stargazers_count ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}