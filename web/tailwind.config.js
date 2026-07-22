/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0E1A17',
        porcelain: '#F2F4F3',
        kib: { DEFAULT: '#0F6B4F', deep: '#0A4C38', light: '#DCEBE4' },
        brass: '#C08A2E',
        rate: { e: '#1C7A58', n: '#C98A1B', b: '#B8323A' },
      },
      fontFamily: {
        display: ['"Space Grotesk Variable"', 'ui-sans-serif', 'system-ui'],
        body: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { xl: '14px', '2xl': '20px' },
      boxShadow: {
        card: '0 1px 2px rgba(14,26,23,.05), 0 8px 24px -12px rgba(14,26,23,.18)',
        lift: '0 10px 40px -12px rgba(14,26,23,.35)',
      },
    },
  },
  plugins: [],
};
