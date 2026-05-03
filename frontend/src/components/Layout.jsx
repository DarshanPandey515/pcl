import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const NAV = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <rect x="1" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8.5" y="1" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="1" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
        <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
      </svg>
    ),
  },
  {
    to: '/leaderboard',
    label: 'Leaderboard',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <path d="M7.5 1L9.18 5.45H14L10.41 8.05L11.96 12.5L7.5 9.5L3.04 12.5L4.59 8.05L1 5.45H5.82L7.5 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/settings',
    label: 'Settings',
    icon: (
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
        <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
        <path d="M7.5 1v1.5M7.5 12.5V14M14 7.5h-1.5M2.5 7.5H1M12.04 2.96l-1.06 1.06M4.02 10.98l-1.06 1.06M12.04 12.04l-1.06-1.06M4.02 4.02L2.96 2.96" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      </svg>
    ),
  },
];

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const profile  = user?.profile || {};

  const handleLogout = () => { logout(); navigate('/login'); };

  const scoreColor = profile.momentum_score >= 70
    ? 'var(--success)'
    : profile.momentum_score >= 40
    ? 'var(--accent)'
    : 'var(--danger)';

  return (
    <div className="flex" style={{ background: 'var(--bg)', height: '100vh', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: 220,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg2)',
          borderRight: '1px solid var(--border)',
          height: '100vh',
          position: 'sticky',
          top: 0,
          overflowY: 'auto',
        }}
      >
        {/* Logo */}
        <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            {/* Logo mark */}
            <div style={{
              width: 24, height: 24, borderRadius: 6,
              background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1L11 10H1L6 1Z" fill="#0a0a0b" fillOpacity="0.9"/>
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              GitVisualizer
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 10px' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 10px',
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--ink)' : 'var(--ink3)',
                background: isActive ? 'var(--bg4)' : 'transparent',
                letterSpacing: '-0.01em',
              })}
              onMouseEnter={(e) => {
                if (!e.currentTarget.style.background.includes('bg4')) {
                  e.currentTarget.style.background = 'var(--bg3)';
                  e.currentTarget.style.color = 'var(--ink2)';
                }
              }}
              onMouseLeave={(e) => {
                const isActive = e.currentTarget.getAttribute('aria-current') === 'page';
                e.currentTarget.style.background = isActive ? 'var(--bg4)' : 'transparent';
                e.currentTarget.style.color = isActive ? 'var(--ink)' : 'var(--ink3)';
              }}
            >
              {icon}
              {label}
            </NavLink>
          ))}
        </nav>

                {/* User card */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border2)', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--success), var(--accent))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--bg)',
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name || user?.username}
              </p>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
                @{profile.github_username || user?.username}
              </p>
            </div>
          </div>

          {/* Momentum score row */}
          {profile.momentum_score > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg3)',
              borderRadius: 8,
              padding: '7px 10px',
              border: '1px solid var(--border)',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Momentum
              </span>
              <span style={{ fontSize: 14, fontWeight: 700, color: scoreColor, letterSpacing: '-0.02em' }}>
                {Number(profile.momentum_score).toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Sign out */}
        <div style={{ padding: '10px 10px 18px' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: '7px 10px',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              color: 'var(--ink3)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
              letterSpacing: '-0.01em',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--danger-muted)'; e.currentTarget.style.color = 'var(--danger)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--ink3)'; }}
          >
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
              <path d="M5.5 1H2a1 1 0 00-1 1v11a1 1 0 001 1h3.5M10 10.5L13.5 7.5L10 4.5M13.5 7.5H5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflow: 'auto', background: 'var(--bg)', width: 0, minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
