import React from 'react';

/**
 * Uppercase mono label — used as section/card headers.
 * Matches the .text-label utility class from index.css.
 */
const Label = ({ children, className = '' }) => (
  <p
    className={className}
    style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      color: 'var(--ink3)',
    }}
  >
    {children}
  </p>
);

export default Label;
