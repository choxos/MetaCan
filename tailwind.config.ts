import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        mc: {
          DEFAULT: 'var(--mc)',
          light: 'var(--mc-light)',
          dark: 'var(--mc-dark)',
          accent: 'var(--mc-accent)',
        },
        teal: 'var(--teal)',
        'on-mc': 'var(--on-mc)',
        bg: 'var(--bg)',
        surface: { DEFAULT: 'var(--surface)', 2: 'var(--surface-2)', 3: 'var(--surface-3)' },
        border: { DEFAULT: 'var(--border)', strong: 'var(--border-strong)' },
        ink: { DEFAULT: 'var(--ink)', 2: 'var(--ink-2)', 3: 'var(--ink-3)', 4: 'var(--ink-4)', 5: 'var(--ink-5)' },
        // the map's semantics
        'in-scope': 'var(--in-scope)',
        contested: 'var(--contested)',
        out: 'var(--out)',
        // the four post-publication states OpenAlex's boolean cannot hold
        retraction: 'var(--retraction)',
        concern: 'var(--concern)',
        correction: 'var(--correction)',
        reinstatement: 'var(--reinstatement)',
      },
      borderRadius: { sm: 'var(--r-sm)', md: 'var(--r-md)', lg: 'var(--r-lg)', xl: 'var(--r-xl)' },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}
export default config
