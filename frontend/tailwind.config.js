/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#0a0a0b',
          2: '#111113',
          3: '#18181b',
          4: '#1e1e22',
          5: '#27272c',
        },
        border: {
          DEFAULT: '#27272c',
          2: '#323237',
          3: '#3f3f46',
        },
        ink: {
          DEFAULT: '#fafafa',
          2: '#a1a1aa',
          3: '#71717a',
          4: '#3f3f46',
        },
        accent: {
          DEFAULT: '#f59e0b',
          dim: '#b45309',
          muted: 'rgba(245,158,11,0.12)',
        },
        success: {
          DEFAULT: '#34d399',
          muted: 'rgba(52,211,153,0.12)',
        },
        danger: {
          DEFAULT: '#f87171',
          muted: 'rgba(248,113,113,0.10)',
        },
        info: {
          DEFAULT: '#60a5fa',
          muted: 'rgba(96,165,250,0.12)',
        },
        purple: {
          DEFAULT: '#a78bfa',
          muted: 'rgba(167,139,250,0.12)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '0.02em' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['13px', { lineHeight: '20px' }],
        'base':['14px', { lineHeight: '22px' }],
        'md':  ['15px', { lineHeight: '24px' }],
        'lg':  ['17px', { lineHeight: '26px' }],
        'xl':  ['20px', { lineHeight: '28px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '38px' }],
        '4xl': ['36px', { lineHeight: '44px' }],
      },
      borderRadius: {
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '16px',
      },
      boxShadow: {
        card: '0 0 0 1px rgba(255,255,255,0.04), 0 2px 8px rgba(0,0,0,0.3)',
        'card-hover': '0 0 0 1px rgba(255,255,255,0.07), 0 4px 16px rgba(0,0,0,0.4)',
        glow: '0 0 20px rgba(245,158,11,0.15)',
      },
    },
  },
  plugins: [],
};
