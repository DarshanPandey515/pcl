import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const GitHubIcon = () => (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd"/>
  </svg>
);

const FEATURES = [
  { icon: '◈', text: 'Contribution heatmap & streak tracking' },
  { icon: '◉', text: 'Developer Momentum Score with sub-factors' },
  { icon: '◎', text: 'Burnout detection & narrative timeline' },
  { icon: '◇', text: 'Language dominance & repo health scoring' },
];

const Login = () => {
  const { githubLogin, isAuthenticated, loading, error } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, loading, navigate]);

  if (loading) return null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {/* Wordmark */}
        <div style={{ marginBottom: 40, textAlign: 'center' }}>
          {/* Logo */}
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, var(--accent-dim), var(--accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 0 20px rgba(245,158,11,0.3)',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M10 2L18 16H2L10 2Z" fill="#0a0a0b" fillOpacity="0.9"/>
            </svg>
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em',
            color: 'var(--ink)', marginBottom: 8, lineHeight: 1.1,
          }}>
            GitVisualizer
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink3)', lineHeight: 1.6, fontWeight: 400 }}>
            Transform your GitHub activity into
            <br />meaningful behavioral insights.
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--bg2)',
          border: '1px solid var(--border)',
          borderRadius: 16,
          padding: '24px',
          marginBottom: 16,
        }}>
          {error && (
            <div style={{
              background: 'var(--danger-muted)',
              border: '1px solid rgba(248,113,113,0.25)',
              borderRadius: 8,
              padding: '10px 14px',
              marginBottom: 16,
              fontSize: 13,
              color: 'var(--danger)',
            }}>
              {error}
            </div>
          )}

          {/* GitHub button */}
          <button
            onClick={githubLogin}
            style={{
              width: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '11px 20px',
              borderRadius: 10,
              fontSize: 14, fontWeight: 600,
              color: 'var(--ink)',
              background: 'var(--bg3)',
              border: '1px solid var(--border2)',
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              marginBottom: 20,
              transition: 'all 150ms',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--bg4)';
              e.currentTarget.style.borderColor = 'var(--border3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg3)';
              e.currentTarget.style.borderColor = 'var(--border2)';
            }}
          >
            <GitHubIcon />
            Continue with GitHub
          </button>

          {/* Feature list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {FEATURES.map((f) => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, color: 'var(--accent)', flexShrink: 0 }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.4 }}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink4)', lineHeight: 1.5 }}>
          Read-only access · Public GitHub data only · No email required
        </p>
      </div>
    </div>
  );
};

export default Login;
