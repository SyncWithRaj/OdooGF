/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        canvas: '#F8F9FA',
        card: '#FFFFFF',
        border: {
          subtle: '#EAECEF',
          muted: '#E2E8F0',
        },
        pastel: {
          aqua: '#E0F7F6',
          'aqua-text': '#0F766E',
          mint: '#E3F7EB',
          'mint-text': '#15803D',
          rose: '#FCE7F3',
          'rose-text': '#BE185D',
          butter: '#FEF9C3',
          'butter-text': '#A16207',
        },
        brand: {
          dark: '#0F172A',
          charcoal: '#18181B',
          muted: '#64748B',
          accent: '#F97316',
        },
        // Retain compatibility keys mapped to modern palette
        surface: {
          cream: '#F8F9FA',
          cement: '#E2E8F0',
          amber: '#FEF9C3',
        },
        highlight: {
          teal: '#0F766E',
          crimson: '#BE185D',
        },
      },
    },
  },
  plugins: [],
};
