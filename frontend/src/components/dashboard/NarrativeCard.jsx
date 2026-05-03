import React from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const TYPE_META = {
  high_activity: { color: 'var(--success)',  bg: 'var(--success-muted)',  label: 'High activity' },
  low_activity:  { color: 'var(--danger)',   bg: 'var(--danger-muted)',   label: 'Low activity' },
  recovery:      { color: 'var(--accent)',   bg: 'var(--accent-muted)',   label: 'Recovery' },
  decline:       { color: 'var(--danger)',   bg: 'var(--danger-muted)',   label: 'Declining' },
  streak_peak:   { color: 'var(--success)',  bg: 'var(--success-muted)',  label: 'Peak streak' },
  stable:        { color: 'var(--info)',     bg: 'var(--info-muted)',     label: 'Stable' },
};

const DEFAULT_META = { color: 'var(--ink3)', bg: 'var(--bg4)', label: 'Phase' };

const NarrativeCard = ({ narrative = [] }) => {
  if (!narrative.length) {
    return (
      <Card className="p-5">
        <Label className="mb-3">Contribution Narrative</Label>
        <p style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 8 }}>
          Narrative builds after your first sync.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <Label className="mb-4">Contribution Narrative</Label>
      <div>
        {narrative.slice(0, 5).map((phase, i) => {
          const meta   = TYPE_META[phase.type] || DEFAULT_META;
          const isLast = i === Math.min(narrative.length, 5) - 1;
          return (
            <div key={i} style={{ display: 'flex', gap: 12 }}>
              {/* Spine */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 16, flexShrink: 0, paddingTop: 3 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                {!isLast && <div style={{ width: 1, flex: 1, background: 'var(--border)', marginTop: 4 }} />}
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: isLast ? 0 : 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 600,
                    padding: '2px 7px',
                    borderRadius: 999,
                    color: meta.color,
                    background: meta.bg,
                    letterSpacing: '0.02em',
                  }}>
                    {meta.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink3)' }}>
                    {phase.period}
                  </span>
                </div>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', letterSpacing: '-0.01em', marginBottom: 3 }}>
                  {phase.title}
                </p>
                <p style={{ fontSize: 12, color: 'var(--ink3)', lineHeight: 1.6 }}>
                  {phase.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default NarrativeCard;
