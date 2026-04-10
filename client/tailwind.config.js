/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vault: {
          bg: '#f5f5f7',
          panel: '#ffffff',
          panel2: '#f8f8fb',
          surface: '#f0f3f8',
          accent: '#0a84ff',
          accentStrong: '#0066cc',
          accentAlt: '#111827',
          danger: '#b42318',
          text: '#1d1d1f',
          muted: '#6e6e73',
          border: '#d9dde5'
        }
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'sans-serif'
        ]
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
        },
        floatSphere: {
          '0%, 100%': { transform: 'translateY(0px) rotateX(0deg)' },
          '50%': { transform: 'translateY(-4px) rotateX(4deg)' }
        }
      },
      animation: {
        pulseGrid: 'pulseGrid 3s ease-in-out infinite',
        scanline: 'scanline 2.8s linear infinite',
        fadeRise: 'fadeRise 250ms ease-out',
        floatSphere: 'floatSphere 4s ease-in-out infinite'
      },
      boxShadow: {
        vault: '0 20px 60px rgba(15, 23, 42, 0.08)',
        vaultSoft: '0 10px 30px rgba(15, 23, 42, 0.06)'
      }
    }
  },
  plugins: []
};
