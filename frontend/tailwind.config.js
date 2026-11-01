/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#FFD700',
          light: '#FFE44D',
          dark: '#B8960C',
        },
        casino: {
          black: '#0A0A0A',
          dark: '#111111',
          card: '#1A1A1A',
          border: '#2A2A2A',
          red: '#C0392B',
          'red-light': '#E74C3C',
          green: '#1A5C1A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Georgia', 'serif'],
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #FFD700 0%, #B8960C 100%)',
        'red-gradient': 'linear-gradient(135deg, #C0392B 0%, #922B21 100%)',
        'dark-gradient': 'linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%)',
      },
      boxShadow: {
        gold: '0 0 20px rgba(255, 215, 0, 0.3)',
        'gold-sm': '0 0 10px rgba(255, 215, 0, 0.2)',
        red: '0 0 20px rgba(192, 57, 43, 0.4)',
      },
      animation: {
        'pulse-gold': 'pulseGold 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 10px rgba(255,215,0,0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(255,215,0,0.5)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
