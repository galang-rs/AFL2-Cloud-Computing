/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{svelte,js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic Canvas & Surface Tokens (OKLCH based)
        surface: {
          canvas: 'var(--color-surface-canvas)',
          subtle: 'var(--color-surface-subtle)',
          panel: 'var(--color-surface-panel)',
          elevated: 'var(--color-surface-elevated)',
        },
        content: {
          primary: 'var(--color-content-primary)',
          secondary: 'var(--color-content-secondary)',
          muted: 'var(--color-content-muted)',
          inverse: 'var(--color-content-inverse)',
        },
        // Custom OKLCH Sticky Notes Color Ramps
        note: {
          amber: {
            bg: 'var(--color-note-amber-bg)',
            border: 'var(--color-note-amber-border)',
            text: 'var(--color-note-amber-text)',
            accent: 'var(--color-note-amber-accent)',
          },
          yellow: {
            bg: 'var(--color-note-yellow-bg)',
            border: 'var(--color-note-yellow-border)',
            text: 'var(--color-note-yellow-text)',
            accent: 'var(--color-note-yellow-accent)',
          },
          emerald: {
            bg: 'var(--color-note-emerald-bg)',
            border: 'var(--color-note-emerald-border)',
            text: 'var(--color-note-emerald-text)',
            accent: 'var(--color-note-emerald-accent)',
          },
          sky: {
            bg: 'var(--color-note-sky-bg)',
            border: 'var(--color-note-sky-border)',
            text: 'var(--color-note-sky-text)',
            accent: 'var(--color-note-sky-accent)',
          },
          rose: {
            bg: 'var(--color-note-rose-bg)',
            border: 'var(--color-note-rose-border)',
            text: 'var(--color-note-rose-text)',
            accent: 'var(--color-note-rose-accent)',
          },
          slate: {
            bg: 'var(--color-note-slate-bg)',
            border: 'var(--color-note-slate-border)',
            text: 'var(--color-note-slate-text)',
            accent: 'var(--color-note-slate-accent)',
          },
        },
      },
      fontFamily: {
        sans: [
          'Outfit',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          '"JetBrains Mono"',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      boxShadow: {
        'sticky': '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        'sticky-lifted': '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
