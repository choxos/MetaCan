import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        metacan: {
          DEFAULT: 'var(--metacan)',
          light: 'var(--metacan-light)',
          dark: 'var(--metacan-dark)',
          // Hardcoded fallbacks for places that can't use var() (e.g. chart libs)
          primary: '#0E7490',
          'primary-light': '#22A5BF',
          'primary-dark': '#0A5566',
        },

        // Semantic: the screening tiers, plus the coverage gap.
        //
        // These literals are the *chart* values: saturated, tuned for fills and
        // strokes where a 1–3px mark needs to read at a glance. The CSS tokens in
        // globals.css are the *text* values, and `--t3` is darkened there so chip
        // text on its pale tint clears WCAG AA. Same split the tracker uses for
        // `concern` (#D97706 chart / #B45309 text). Do not "reconcile" them.
        t1: {
          DEFAULT: '#0E7490',
          soft: 'color-mix(in oklab, #0E7490 8%, var(--surface))',
        },
        t2: {
          DEFAULT: '#7C3AED',
          soft: 'color-mix(in oklab, #7C3AED 8%, var(--surface))',
        },
        t3: {
          DEFAULT: '#64748B',
          soft: 'color-mix(in oklab, #64748B 8%, var(--surface))',
        },
        // The thesis colour: what the pipeline missed.
        gap: {
          DEFAULT: '#B45309',
          soft: 'color-mix(in oklab, #B45309 8%, var(--surface))',
        },

        // Cool-paper neutrals, bound to CSS variables so dark mode swaps cleanly
        bg: 'var(--bg)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        border: {
          DEFAULT: 'var(--border)',
          strong: 'var(--border-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
          4: 'var(--ink-4)',
          5: 'var(--ink-5)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Iowan Old Style', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
      },
      fontSize: {
        display: ['64px', { lineHeight: '1.02', letterSpacing: '-0.025em', fontWeight: '400' }],
        section: ['32px', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '400' }],
        eyebrow: ['11px', { lineHeight: '1.2', letterSpacing: '0.06em' }],
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '10px',
        xl: '16px',
      },
      spacing: {
        // Card padding tokens
        pad: 'var(--pad)',
        'pad-sm': 'var(--pad-sm)',
        'row-h': 'var(--row-h)',
      },
      maxWidth: {
        shell: '1320px',
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.2, 0.7, 0.2, 1)',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}

export default config
