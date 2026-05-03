import React from 'react';
import Card from '../ui/Card';
import Label from '../ui/Label';

const LANG_COLORS = {
  TypeScript: '#3178c6', JavaScript: '#eab308', Python: '#3b82f6',
  Rust: '#ef4444', Go: '#06b6d4', 'C++': '#f97316', C: '#6b7280',
  Java: '#f59e0b', Ruby: '#dc2626', Swift: '#f97316', Kotlin: '#a78bfa',
  Shell: '#22c55e', HTML: '#f97316', CSS: '#8b5cf6', Vue: '#34d399',
  Dart: '#06b6d4', Scala: '#ef4444', Haskell: '#8b5cf6', Elixir: '#a78bfa',
};

const langColor = (name) => LANG_COLORS[name] || 'var(--ink3)';

const LanguageCard = ({ languageStats = {} }) => {
  const entries = Object.entries(languageStats)
    .map(([lang, stat]) => ({
      lang,
      pct: typeof stat === 'object' ? (stat.percentage || 0) : 0,
      bytes: typeof stat === 'object' ? (stat.bytes || 0) : stat,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8);

  if (!entries.length) {
    return (
      <Card className="p-5" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 180 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)' }}>No data yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <Label className="mb-4">Language Dominance</Label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        {entries.map(({ lang, pct }) => {
          const color = langColor(lang);
          return (
            <div key={lang}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--ink)', letterSpacing: '-0.01em' }}>{lang}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--ink3)', fontVariantNumeric: 'tabular-nums' }}>
                  {pct.toFixed(1)}%
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--bg5)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${pct}%`,
                  background: color,
                  borderRadius: 99,
                  transition: 'width 800ms cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default LanguageCard;
