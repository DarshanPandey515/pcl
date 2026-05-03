import React, { useMemo } from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const LEVELS = [
  'var(--bg5)',
  'rgba(52,211,153,0.18)',
  'rgba(52,211,153,0.38)',
  'rgba(52,211,153,0.65)',
  '#34d399',
];

const getLevel = (count, max) => {
  if (!count || max === 0) return 0;
  const r = count / max;
  if (r > 0.75) return 4;
  if (r > 0.50) return 3;
  if (r > 0.25) return 2;
  return 1;
};

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const HeatmapCard = ({ daily = {} }) => {
  const { weeks, monthMarkers, max } = useMemo(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 364);

    // Align to Sunday
    start.setDate(start.getDate() - start.getDay());

    const mx   = Math.max(...Object.values(daily), 1);
    const wks  = [];
    const mMrk = []; // { weekIndex, label }
    let cur    = new Date(start);
    let wi     = 0;
    let prevM  = -1;

    while (cur <= today) {
      const week = [];
      for (let d = 0; d < 7; d++) {
        const key   = cur.toISOString().slice(0, 10);
        const month = cur.getMonth();
        if (d === 0 && month !== prevM) {
          mMrk.push({ weekIndex: wi, label: MONTH_LABELS[month] });
          prevM = month;
        }
        week.push({ date: key, count: daily[key] || 0 });
        cur.setDate(cur.getDate() + 1);
      }
      wks.push(week);
      wi++;
    }
    return { weeks: wks, monthMarkers: mMrk, max: mx };
  }, [daily]);

  return (
    <Card className="p-5">
      <Label className="mb-3">Contribution Heatmap — last 52 weeks</Label>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ minWidth: 620, position: 'relative' }}>
          {/* Month labels */}
          <div style={{ display: 'flex', marginBottom: 4, height: 14, position: 'relative' }}>
            {monthMarkers.map(({ weekIndex, label }) => (
              <span
                key={`${weekIndex}-${label}`}
                style={{
                  position: 'absolute',
                  left: weekIndex * 13,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  color: 'var(--ink3)',
                  letterSpacing: '0.04em',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </span>
            ))}
          </div>

          {/* Cell grid */}
          <div style={{ display: 'flex', gap: 2 }}>
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {week.map((day, di) => (
                  <div
                    key={di}
                    title={`${day.date}: ${day.count} contribution${day.count !== 1 ? 's' : ''}`}
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      background: LEVELS[getLevel(day.count, max)],
                      cursor: day.count > 0 ? 'default' : 'default',
                      transition: 'opacity 100ms',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.75')}
                    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10, justifyContent: 'flex-end' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink3)' }}>Less</span>
        {LEVELS.map((bg, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: bg }} />
        ))}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--ink3)' }}>More</span>
      </div>
    </Card>
  );
};

export default HeatmapCard;
