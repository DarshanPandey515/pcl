import React, { useState } from 'react';
import Card from '../ui/Card';

const RISK_META = {
  low:    { color: 'var(--success)', bg: 'var(--success-muted)', label: 'Low risk',      icon: '●' },
  medium: { color: 'var(--accent)',  bg: 'var(--accent-muted)',  label: 'Moderate risk', icon: '▲' },
  high:   { color: 'var(--danger)',  bg: 'var(--danger-muted)',  label: 'High risk',     icon: '⚠' },
};

const BurnoutCard = ({ burnout = {} }) => {
  const [expanded, setExpanded] = useState(false);
  const risk    = burnout.risk || 'low';
  const signals = burnout.signals || [];
  const meta    = RISK_META[risk] || RISK_META.low;

  if (risk === 'low' && !signals.length) return null;

  const topSignal = signals.find((s) => s.severity === 'high') || signals[0];

  return (
    <Card className="p-5" accent={risk === 'high' ? 'danger' : risk === 'medium' ? 'accent' : null}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        {/* Icon badge */}
        <div style={{
          width: 34, height: 34, borderRadius: 8, flexShrink: 0,
          background: meta.bg, color: meta.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700,
        }}>
          {meta.icon}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em' }}>
              Burnout Analysis
            </span>
            <span style={{
              fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999,
              color: meta.color, background: meta.bg, letterSpacing: '0.02em',
            }}>
              {meta.label}
            </span>
          </div>

          {/* Top signal */}
          {topSignal && (
            <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6, marginBottom: signals.length > 1 ? 8 : 0 }}>
              {topSignal.description}
            </p>
          )}

          {/* Expand toggle */}
          {signals.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)',
                letterSpacing: '0.05em',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--ink3)')}
            >
              {expanded
                ? '↑ collapse'
                : `↓ ${signals.length - 1} more signal${signals.length > 2 ? 's' : ''}`}
            </button>
          )}

          {/* Additional signals */}
          {expanded && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {signals.slice(1).map((s, i) => (
                <div key={i} style={{
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 8, padding: '9px 11px',
                }}>
                  <p style={{
                    fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.08em',
                    textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 3,
                  }}>
                    {s.type.replace(/_/g, ' ')} · {s.severity}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{s.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

export default BurnoutCard;
