/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          // Dark mode colors
          dark: '#0a0e27',
          darker: '#050712',
          // Light mode colors
          light: '#f8fafc',
          lighter: '#ffffff',
          // Accent colors (work in both modes)
          neon: {
            cyan: '#00ffff',
            blue: '#0080ff',
            purple: '#8000ff',
            pink: '#ff00ff',
            green: '#00ff80',
            yellow: '#ffff00',
            // Light mode variants
            cyanLight: '#0891b2',
            blueLight: '#2563eb',
            teal: '#14b8a6',
          },
          glow: {
            cyan: 'rgba(0, 255, 255, 0.5)',
            blue: 'rgba(0, 128, 255, 0.5)',
            purple: 'rgba(128, 0, 255, 0.5)',
            // Light mode glows
            cyanLight: 'rgba(8, 145, 178, 0.3)',
            blueLight: 'rgba(37, 99, 235, 0.3)',
          }
        },
        primary: {
          50: '#0a0e27',
          100: '#0f1629',
          200: '#141b2b',
          300: '#1a2130',
          400: '#1f2635',
          500: '#00ffff',
          600: '#00cccc',
          700: '#009999',
          800: '#006666',
          900: '#003333',
        },
        // Light mode grays
        light: {
          bg: '#f8fafc',
          surface: '#ffffff',
          border: '#e2e8f0',
          text: '#1e293b',
          textMuted: '#64748b',
        },
      },
      fontFamily: {
        cyber: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
        digital: ['Share Tech Mono', 'monospace'],
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'glow-cyber': 'glow-cyber 3s ease-in-out infinite',
        'scan-line': 'scan-line 3s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'rotate-3d': 'rotate-3d 20s linear infinite',
        'pulse-3d': 'pulse-3d 4s ease-in-out infinite',
        'hologram': 'hologram 3s ease-in-out infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 20px rgba(0, 255, 255, 0.5)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 30px rgba(0, 255, 255, 0.8)' },
        },
        'glow-cyber': {
          '0%, 100%': { 
            textShadow: '0 0 10px rgba(0, 255, 255, 0.8), 0 0 20px rgba(0, 255, 255, 0.5)',
            filter: 'brightness(1)',
          },
          '50%': { 
            textShadow: '0 0 20px rgba(0, 255, 255, 1), 0 0 30px rgba(0, 255, 255, 0.8)',
            filter: 'brightness(1.2)',
          },
        },
        'scan-line': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'rotate-3d': {
          '0%': { transform: 'rotateY(0deg) rotateX(0deg)' },
          '100%': { transform: 'rotateY(360deg) rotateX(360deg)' },
        },
        'pulse-3d': {
          '0%, 100%': { transform: 'scale(1) translateZ(0)', opacity: '0.6' },
          '50%': { transform: 'scale(1.1) translateZ(20px)', opacity: '0.8' },
        },
        'hologram': {
          '0%, 100%': { 
            opacity: '0.3',
            filter: 'hue-rotate(0deg) brightness(1)',
          },
          '50%': { 
            opacity: '0.5',
            filter: 'hue-rotate(90deg) brightness(1.2)',
          },
        },
      },
      backdropBlur: {
        cyber: '10px',
      },
    },
  },
  plugins: [],
}

