import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12100e',
        paper: '#faf8f5',
      },
    },
  },
  plugins: [],
} satisfies Config;
