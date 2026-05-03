import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const C = {
  bg: '#080810', card: '#12121f', border: '#1e1e30', muted: '#2a2a40',
  text: '#e8e8f0', dim: '#6b6b8a', accent: '#6366f1', aLo: 'rgba(99,102,241,0.14)',
  teal: '#2dd4bf', amber: '#f59e0b', rose: '#f43f5e', green: '#22c55e',
};

const Navbar = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.user-menu')) setIsOpen(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        .nav-link {
          font-family: 'Inter', system-ui, sans-serif;
          position: relative;
          transition: color 0.15s ease;
        }
        .nav-link::after {
          content: ''; position: absolute; bottom: -2px; left: 50%;
          transform: translateX(-50%); width: 0; height: 2px;
          background: ${C.accent}; transition: width 0.2s ease;
          border-radius: 2px; box-shadow: 0 0 8px ${C.accent};
        }
        .nav-link:hover::after, .nav-link.active::after { width: 20px; }
        .nav-link.active { color: ${C.text} !important; }
        .user-menu-item {
          transition: all 0.15s ease; font-family: 'Inter', system-ui, sans-serif;
        }
        .user-menu-item:hover { background: ${C.aLo} !important; color: ${C.accent} !important; }
        .avatar-glow { transition: box-shadow 0.2s ease; }
        .avatar-glow:hover { box-shadow: 0 0 0 2px ${C.accent}, 0 0 20px rgba(99,102,241,0.3); }
      `}</style>

      <nav style={{ background: C.bg, borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(8px)', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 28px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', height: 70 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 48 }}>
              <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', background: `linear-gradient(135deg, ${C.text} 0%, ${C.accent} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  GitStats
                </span>
              </Link>

              {isAuthenticated && (
                <div style={{ display: 'flex', gap: 32 }}>
                  {['/dashboard', '/contributors/search', '/analytics'].map((path, i) => (
                    <Link key={i} to={path} className="nav-link" style={{ fontSize: 14, fontWeight: 500, color: C.dim, textDecoration: 'none', padding: '4px 0' }}>
                      {['Dashboard', 'Find Contributors', 'Analytics'][i]}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isAuthenticated ? (
                <div className="user-menu" style={{ position: 'relative' }}>
                  <button onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 40, transition: 'background 0.15s ease', backgroundColor: isOpen ? C.aLo : 'transparent' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={user?.profile?.avatar_url || `https://avatars.githubusercontent.com/${user?.username}`} alt={user?.username} className="avatar-glow" style={{ width: 36, height: 36, borderRadius: '50%', border: `2px solid ${C.border}`, transition: 'border-color 0.15s ease' }} onError={(e) => { e.target.src = `https://ui-avatars.com/api/?name=${user?.username}&background=1e1e30&color=6366f1&bold=true`; }} />
                      <span style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, backgroundColor: C.green, borderRadius: '50%', border: `2px solid ${C.bg}`, boxShadow: `0 0 10px ${C.green}` }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 400, color: C.text, fontFamily: 'JetBrains Mono, monospace' }}>@{user?.username}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.dim} strokeWidth="2" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }}>
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>

                  {isOpen && (
                    <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '6px', boxShadow: `0 20px 30px -10px rgba(0,0,0,0.5), 0 0 0 1px ${C.border}`, zIndex: 50 }}>
                      <div style={{ padding: '12px 12px 8px', borderBottom: `1px solid ${C.border}`, marginBottom: 6 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 2 }}>{user?.profile?.name || user?.username}</p>
                        <p style={{ fontSize: 11, color: C.dim, fontFamily: 'JetBrains Mono, monospace' }}>{user?.email || `@${user?.username}`}</p>
                      </div>
                      {[{ to: '/profile', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8', label: 'Your Profile' },
                        { to: '/settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z', label: 'Settings' }
                      ].map(({ to, icon, label }) => (
                        <Link key={to} to={to} className="user-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8, color: C.dim, textDecoration: 'none', fontSize: 13, fontWeight: 500 }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d={icon} /></svg>
                          {label}
                        </Link>
                      ))}
                      <div style={{ borderTop: `1px solid ${C.border}`, margin: '6px 0 4px' }} />
                      <button onClick={handleLogout} className="user-menu-item" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 8, color: C.rose, background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, textAlign: 'left' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" /></svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 12 }}>
                  <Link to="/login" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 500, color: C.dim, textDecoration: 'none', borderRadius: 40, transition: 'all 0.15s ease' }}>Log in</Link>
                  <Link to="/register" style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, color: '#fff', background: C.accent, textDecoration: 'none', borderRadius: 40, transition: 'all 0.15s ease', boxShadow: `0 4px 12px ${C.aLo}` }}
                    onMouseEnter={(e) => { e.target.style.background = '#4f52e0'; e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = `0 8px 20px ${C.aLo}`; }}
                    onMouseLeave={(e) => { e.target.style.background = C.accent; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = `0 4px 12px ${C.aLo}`; }}
                  >Sign up</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;