import React from 'react';

const SIZES = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 32,
};

const Spinner = ({ size = 'md' }) => {
  const px = SIZES[size] || SIZES.md;
  return (
    <div
      style={{
        width: px,
        height: px,
        borderRadius: '50%',
        border: `1.5px solid var(--border3)`,
        borderTopColor: 'var(--accent)',
        animation: 'spin 0.7s linear infinite',
        flexShrink: 0,
      }}
    />
  );
};

// Inject keyframes once
if (typeof document !== 'undefined' && !document.getElementById('gv-spin')) {
  const style = document.createElement('style');
  style.id = 'gv-spin';
  style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

export default Spinner;
