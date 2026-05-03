import React from 'react';

/**
 * Card variants:
 *   default   — standard surface
 *   elevated  — slightly lighter bg, stronger shadow
 *   ghost     — transparent with border only
 *
 * accent: 'accent' | 'success' | 'danger' | 'info' | null
 *   Renders a 1px top gradient stripe.
 */
const ACCENT_GRADIENTS = {
  accent:  'linear-gradient(90deg, var(--accent) 0%, transparent 70%)',
  success: 'linear-gradient(90deg, var(--success) 0%, transparent 70%)',
  danger:  'linear-gradient(90deg, var(--danger) 0%, transparent 70%)',
  info:    'linear-gradient(90deg, var(--info) 0%, transparent 70%)',
};

const BG = {
  default:  'var(--bg2)',
  elevated: 'var(--bg3)',
  ghost:    'transparent',
};

const Card = ({
  children,
  className = '',
  accent = null,
  variant = 'default',
  interactive = false,
  style = {},
}) => (
  <div
    className={`relative overflow-hidden rounded-xl border ${interactive ? 'card-interactive cursor-pointer' : ''} ${className}`}
    style={{
      background: BG[variant] || BG.default,
      borderColor: 'var(--border)',
      ...style,
    }}
  >
    {accent && ACCENT_GRADIENTS[accent] && (
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: ACCENT_GRADIENTS[accent],
        }}
      />
    )}
    {children}
  </div>
);

export default Card;
