import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart } from 'recharts';
import Card from '../ui/Card';
import Label from '../ui/Label';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border2)',
      borderRadius: 8,
      padding: '8px 12px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)', marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent)', letterSpacing: '-0.03em' }}>
        {Number(payload[0].value).toFixed(1)}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink3)', marginLeft: 4 }}>/ 100</span>
      </p>
    </div>
  );
};

const MomentumHistoryChart = ({ history = [] }) => {
  if (!history.length) return null;

  const data = [...history]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((h) => ({
      date: new Date(h.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
      score: parseFloat(Number(h.score).toFixed(2)),
    }));

  const avg   = data.reduce((s, d) => s + d.score, 0) / data.length;
  const every = Math.ceil(data.length / 7);

  return (
    <Card className="p-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Label>Momentum History — 90 days</Label>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--ink3)' }}>
          avg <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{avg.toFixed(1)}</span>
        </span>
      </div>

      <ResponsiveContainer width="100%" height={150}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="var(--accent)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--ink3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            interval={every}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: 'var(--ink3)', fontSize: 9, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={26}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={avg} stroke="var(--border2)" strokeDasharray="3 3" />
          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--accent)"
            strokeWidth={2}
            fill="url(#scoreGrad)"
            dot={false}
            activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--bg)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default MomentumHistoryChart;
