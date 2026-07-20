import type { Config } from 'tailwindcss';

/**
 * MovePilot Tailwind theme — the blueprint tokens (§2) exposed as utilities.
 * Colors map to CSS custom properties defined in src/styles/index.css so every
 * utility is theme-aware (light "Ivory" :root / dark "Cockpit" [data-theme=dark]).
 * Dark mode is driven by the data-theme attribute, NOT the media query, because the
 * header toggle writes data-theme on <html> and must win over OS preference.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['selector', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        // Core brand identity (theme-independent, except navy which brightens on dark)
        navy: {
          DEFAULT: 'var(--navy)',
          600: 'var(--navy-600)',
          900: 'var(--navy-900)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          bright: 'var(--accent-bright)',
          ink: 'var(--accent-ink)',
        },
        copper: {
          DEFAULT: 'var(--copper)',
          tint: 'var(--copper-tint)',
        },
        // Themed surfaces + text
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          raised: 'var(--surface-raised)',
          sunk: 'var(--surface-sunk)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        text: {
          DEFAULT: 'var(--text)',
          muted: 'var(--text-muted)',
          faint: 'var(--text-faint)',
        },
        success: 'var(--success)',
        warn: 'var(--warn)',
        danger: 'var(--danger)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', '"SF Mono"', 'monospace'],
      },
      fontSize: {
        // Blueprint type scale (§2.2). [size, { lineHeight, letterSpacing }]
        display: ['clamp(2.75rem, 6vw, 4.5rem)', { lineHeight: '1.02', letterSpacing: '-0.02em' }],
        h1: ['3.052rem', { lineHeight: '1.08', letterSpacing: '-0.015em' }],
        h2: ['2.441rem', { lineHeight: '1.12', letterSpacing: '-0.01em' }],
        h3: ['1.953rem', { lineHeight: '1.20', letterSpacing: '-0.005em' }],
        h4: ['1.563rem', { lineHeight: '1.30', letterSpacing: '0' }],
        h5: ['1.25rem', { lineHeight: '1.40', letterSpacing: '0' }],
        overline: ['0.875rem', { lineHeight: '1.40', letterSpacing: '0.08em' }],
        'body-lg': ['1.125rem', { lineHeight: '1.60', letterSpacing: '0' }],
        body: ['1rem', { lineHeight: '1.60', letterSpacing: '0' }],
        'body-sm': ['0.875rem', { lineHeight: '1.50', letterSpacing: '0' }],
        caption: ['0.75rem', { lineHeight: '1.40', letterSpacing: '0.01em' }],
        'data-hero': ['clamp(2.5rem, 4vw, 3.5rem)', { lineHeight: '1.00', letterSpacing: '-0.01em' }],
        'data-raw': ['0.9375rem', { lineHeight: '1.40', letterSpacing: '0' }],
      },
      spacing: {
        // 4px base scale (§2.3)
        '0.5': '2px',
        '13': '52px', // primary CTA height
        '18': '72px',
        '30': '120px',
        '128': '128px',
      },
      maxWidth: {
        content: '1200px',
        prose: '68ch',
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        '2xl': '32px',
        pill: '999px',
      },
      boxShadow: {
        e1: '0 1px 2px rgba(11,42,74,.06), 0 1px 3px rgba(11,42,74,.08)',
        e2: '0 4px 12px rgba(11,42,74,.08), 0 2px 4px rgba(11,42,74,.06)',
        e3: '0 12px 32px rgba(11,42,74,.12), 0 4px 8px rgba(11,42,74,.06)',
        e4: '0 24px 64px rgba(6,24,38,.18)',
        'glow-accent': '0 0 0 1px rgba(20,184,166,.4), 0 0 24px rgba(63,224,207,.25)',
      },
      transitionTimingFunction: {
        'out-quart': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'out-expo': 'cubic-bezier(0.16, 1, 0.30, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
        'out-back': 'cubic-bezier(0.34, 1.4, 0.64, 1)',
        standard: 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      transitionDuration: {
        micro: '120ms',
        fast: '180ms',
        base: '280ms',
        mid: '420ms',
        slow: '680ms',
        xslow: '900ms',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' },
        },
        ping2: {
          '75%, 100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
      animation: {
        shimmer: 'shimmer 1400ms ease-in-out infinite',
        ping2: 'ping2 1600ms cubic-bezier(0,0,0.2,1) infinite',
      },
    },
  },
  plugins: [],
};

export default config;
