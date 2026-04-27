/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        brand: {
          dark:   '#333333',
          light:  '#F2F2F2',
          indigo: '#33289A',
          blue:   '#3E5D9D',
          orange: '#D65830',
          red:    '#992C26',
          violet: '#4554A1',
          green:  '#30693B',
          cream:  '#ECE8D2',
        },
      },
      animation: {
        'pip-pulse': 'pip-pulse 2s infinite',
        'bell-ring': 'bellRing 0.6s ease-in-out',
        'shimmer': 'shimmer 2s infinite',
        'fade-in': 'fadeIn 0.3s ease',
        'slide-up': 'slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        'act-in': 'actIn 0.25s cubic-bezier(0.34,1.56,0.64,1)',
      },
      keyframes: {
        'pip-pulse': {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(214,88,48,0.5)' },
          '50%': { boxShadow: '0 0 0 5px rgba(214,88,48,0)' },
        },
        'bellRing': {
          '0%,100%': { transform: 'rotate(0)' },
          '10%': { transform: 'rotate(14deg)' },
          '30%': { transform: 'rotate(-12deg)' },
          '50%': { transform: 'rotate(10deg)' },
          '70%': { transform: 'rotate(-8deg)' },
          '90%': { transform: 'rotate(5deg)' },
        },
        'shimmer': {
          'from': { left: '-50px' },
          'to': { left: '100%' },
        },
        'fadeIn': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slideUp': {
          'from': { opacity: '0', transform: 'translateY(14px)' },
          'to': { opacity: '1', transform: 'none' },
        },
        'actIn': {
          'from': { opacity: '0', transform: 'scale(0.97)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
