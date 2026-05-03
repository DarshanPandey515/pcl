import React from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const Factor = ({ name, value, color }) => (
  <div style={{
    background: 'var(--bg3)',
    borderRadius: 8,
    padding: '9px 11px',
    border: '1px solid var(--border)',
  }}>
    <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
      {name}
    </p>
    <p style={{ fontSize: 14, fontWeight: 600, color, letterSpacing: '-0.01em' }}>{value}</p>
  </div>
);

const MomentumCard = ({ momentum = {} }) => {
  const score       = Number(momentum.score       || 0).toFixed(1);
  const consistency = Number(momentum.consistency || 0).toFixed(1);
  const recency     = Number(momentum.recency     || 0).toFixed(1);
  const depth       = Number(momentum.depth       || 0).toFixed(1);
  const decay       = Number(momentum.decay       || 1).toFixed(2);
  const pct         = Math.min(Number(momentum.score || 0), 100);

  const col = (v) => +v >= 70 ? 'var(--success)' : +v >= 45 ? 'var(--accent)' : 'var(--danger)';

  return (
    <Card accent="accent" className="p-5">
      <Label className="mb-4">Momentum Score</Label>

      {/* Big number */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 10 }}>
        <span style={{
          fontSize: 64,
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-0.05em',
          color: 'var(--accent)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {score}
        </span>
        <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--ink3)', paddingBottom: 6 }}>/ 100</span>
      </div>

      {/* Progress track */}
      <div style={{ height: 3, background: 'var(--bg5)', borderRadius: 99, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: `linear-gradient(90deg, var(--accent-dim), var(--accent))`,
          borderRadius: 99,
          transition: 'width 1.2s cubic-bezier(0.16,1,0.3,1)',
        }} />
      </div>

      {/* Factor grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        <Factor name="Consistency"  value={`${consistency}`} color={col(consistency)} />
        <Factor name="Recency"      value={`${recency}`}     color={col(recency)} />
        <Factor name="Depth"        value={`${depth}`}       color={col(depth)} />
        <Factor name="Decay"        value={`×${decay}`}      color={+decay < 0.8 ? 'var(--danger)' : 'var(--ink2)'} />
      </div>
    </Card>
  );
};

export default MomentumCard;
