/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        rajdhani: ['Rajdhani', 'sans-serif'],
      },
      colors: {
        command: {
          bg: '#030611',
          card: '#080c1e',
          accent: '#00f0ff',
          low: '#00ff66',
          moderate: '#ffcc00',
          high: '#ff7700',
          critical: '#ff0055'
        },
        cyber: {
          bg: '#030611',
          card: '#080c1e',
          accent: '#00f0ff',
          dim: '#008ba3',
          border: '#111936',
          green: '#00ff66',
          yellow: '#ffcc00',
          orange: '#ff7700',
          red: '#ff0055',
          purple: '#b026ff',
          text: '#94a3b8'
        }
      }
    },
  },
  plugins: [],
}
