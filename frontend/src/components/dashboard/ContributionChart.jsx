import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
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
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em' }}>
        {payload[0].value}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--ink3)', marginLeft: 4 }}>contributions</span>
      </p>
    </div>
  );
};

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '4px 12px',
      borderRadius: 6,
      fontSize: 12,
      fontWeight: 500,
      color: active ? 'var(--ink)' : 'var(--ink3)',
      background: active ? 'var(--bg4)' : 'transparent',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 150ms',
      letterSpacing: '-0.01em',
    }}
  >
    {children}
  </button>
);

const ContributionChart = ({ monthly = {}, weekly = {} }) => {
  const [tab, setTab] = useState('monthly');

  const raw  = tab === 'monthly' ? monthly : weekly;
  const max  = Math.max(...Object.values(raw), 1);
  const data = Object.entries(raw)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({
      name: tab === 'monthly'
        ? new Date(key + '-01').toLocaleDateString('en', { month: 'short' })
        : key.replace(/\d{4}-/, ''),
      value,
    }));

  return (
    <Card className="p-5">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Label>Contribution Timeline</Label>
        <div style={{
          display: 'flex',
          gap: 2,
          background: 'var(--bg3)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: 3,
        }}>
          <TabBtn active={tab === 'monthly'} onClick={() => setTab('monthly')}>Monthly</TabBtn>
          <TabBtn active={tab === 'weekly'}  onClick={() => setTab('weekly')}>Weekly</TabBtn>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={190}>
        <BarChart data={data} barCategoryGap="30%">
          <XAxis
            dataKey="name"
            tick={{ fill: 'var(--ink3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'var(--ink3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={30}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)', borderRadius: 4 }} />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell
                key={i}
                fill={entry.value === max
                  ? 'var(--success)'
                  : 'rgba(52,211,153,0.2)'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default ContributionChart;
