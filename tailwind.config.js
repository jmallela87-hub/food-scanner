/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0B0F14',
        darkcard: '#141A21',
        neon: '#7CFF5B',
        neonhover: '#6ae849',
        neonbg: 'rgba(124, 255, 91, 0.1)',
      },
      animation: {
        'scanner-sweep': 'scannerSweep 2.5s infinite linear',
      },
      keyframes: {
        scannerSweep: {
          '0%': { top: '0%', opacity: '0.8' },
          '50%': { top: '100%', opacity: '0.8' },
          '100%': { top: '0%', opacity: '0.8' },
        }
      }
    },
  },
  plugins: [],
}
