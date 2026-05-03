import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/ui/Spinner';

const GithubCallback = () => {
  const { handleGithubCallback } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const processed = useRef(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    if (processed.current) return;

    const params    = new URLSearchParams(location.search);
    const code      = params.get('code');
    const ghError   = params.get('error');
    const ghErrDesc = params.get('error_description');

    if (ghError) { setErr(ghErrDesc || ghError); return; }
    if (!code)   { setErr('No authorisation code returned by GitHub.'); return; }

    processed.current = true;
    handleGithubCallback(code)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((e) => {
        processed.current = false;
        setErr(e.message || 'Authentication failed');
      });
  }, [location.search]); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div
        className="w-full max-w-sm rounded-xl border p-8 text-center space-y-4"
        style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}
      >
        {!err ? (
          <>
            <div className="flex justify-center">
              <Spinner size="lg" />
            </div>
            <p className="font-serif italic font-light text-xl" style={{ color: 'var(--ink)' }}>
              Signing you in…
            </p>
            <p className="font-mono text-[11px] text-[var(--ink3)] leading-relaxed">
              Fetching your GitHub profile and
              <br />
              calculating your momentum score.
            </p>
          </>
        ) : (
          <>
            <p className="font-mono text-[10px] text-[var(--red)] tracking-widest uppercase">Error</p>
            <p className="font-serif italic font-light text-xl" style={{ color: 'var(--ink)' }}>
              Authentication failed
            </p>
            <p
              className="font-mono text-[11px] rounded-md px-3 py-2 border"
              style={{ color: 'var(--red)', borderColor: 'rgba(248,113,113,.3)', background: 'rgba(248,113,113,.06)' }}
            >
              {err}
            </p>
            <button
              onClick={() => navigate('/login')}
              className="font-mono text-[11px] px-4 py-2 rounded-lg border transition-colors"
              style={{ borderColor: 'var(--border2)', color: 'var(--ink2)', background: 'var(--bg3)' }}
            >
              Back to login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default GithubCallback;
