import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        'dm-sans': ['"DM Sans"', 'sans-serif'],
        'jetbrains': ['"JetBrains Mono"', 'monospace'],
      },
      keyframes: {
        'pulse-ring': {
          '0%':   { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'dash-flow': {
          '0%':   { strokeDashoffset: '24' },
          '100%': { strokeDashoffset: '0' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.2s cubic-bezier(0.4,0,0.6,1) infinite',
        'dash-flow':  'dash-flow 0.5s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
