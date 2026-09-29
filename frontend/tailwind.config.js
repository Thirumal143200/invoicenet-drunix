/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#090D16',
        surface: '#0F172A',
        surfaceBorder: '#1E293B',
        accentPrimary: '#06B6D4',
        accentEmerald: '#10B981',
        accentIndigo: '#6366F1',
        accentAmber: '#F59E0B',
        accentRose: '#F43F5E',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
