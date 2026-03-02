/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#0a0a0a',
          panel: '#101316',
          panel2: '#151a1f',
          accent: '#00d4ff',
          accentAlt: '#00ff88',
          danger: '#ff3b3b',
          text: '#ecf8ff',
          muted: '#7f9cab'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      keyframes: {
        pulseGrid: {
          '0%, 100%': { opacity: 0.08 },
          '50%': { opacity: 0.2 }
        },
        scanline: {
          '0%': { transform: 'translateY(-120%)' },
          '100%': { transform: 'translateY(220%)' }
        },
        fadeRise: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      animation: {
        pulseGrid: 'pulseGrid 3s ease-in-out infinite',
        scanline: 'scanline 2.8s linear infinite',
        fadeRise: 'fadeRise 250ms ease-out'
      }
    }
  },
  plugins: []
};
