import React from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const Row = ({ label, value, highlight }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderTop: '1px solid var(--border)',
  }}>
    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      {label}
    </span>
    <span style={{ fontSize: 13, fontWeight: 600, color: highlight || 'var(--ink)', letterSpacing: '-0.01em' }}>
      {value}
    </span>
  </div>
);

const StreakCard = ({ summary = {}, profile = {} }) => {
  const current = profile.current_streak || summary.current_streak || 0;
  const longest = profile.longest_streak || summary.longest_streak || 0;

  const lastBreak = summary.last_streak_break
    ? new Date(summary.last_streak_break).toLocaleDateString('en', { month: 'short', day: 'numeric' })
    : 'None';

  const weeklyVals = Object.values(profile.weekly_contributions || {});
  const lastWeek   = weeklyVals[weeklyVals.length - 1] || 0;

  const streakColor = current >= 14
    ? 'var(--success)'
    : current >= 7
    ? 'var(--accent)'
    : 'var(--ink)';

  return (
    <Card className="p-5">
      <Label className="mb-4">Streak Tracker</Label>

      {/* Big number */}
      <div style={{ textAlign: 'center', padding: '12px 0 16px' }}>
        <p style={{
          fontSize: 60,
          fontWeight: 800,
          lineHeight: 1,
          letterSpacing: '-0.06em',
          color: streakColor,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {current}
        </p>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink3)', marginTop: 6, letterSpacing: '0.02em' }}>
          day current streak
        </p>
      </div>

      <div>
        <Row
          label="Longest ever"
          value={`${longest} days`}
          highlight={longest >= 30 ? 'var(--success)' : undefined}
        />
        <Row label="Last break"   value={lastBreak} />
        <Row label="Last 7 days"  value={`${lastWeek} contributions`} />
        <Row label="Peak time"    value={summary.peak_contribution_time || 'N/A'} />
      </div>
    </Card>
  );
};

export default StreakCard;
