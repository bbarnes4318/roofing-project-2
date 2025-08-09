/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1536px',
      },
      colors: {
        // Brand colors from UpFront logo
        brand: {
          primary: '#D02327',  // Primary red from logo
          accent: '#1e3a8a',   // Steel blue accent
          500: '#0066CC',      // Keep existing for compatibility
        },
        // UI colors for the login page
        text: {
          light: '#F5F5F7',    // Clean near-white
        },
        ui: {
          dark: '#111827',     // Dark charcoal background
          gray: '#6B7280',     // Neutral gray
        },
        // Keep existing accent colors for compatibility
        accent: {
          500: '#DC2626',
          600: '#D02327',      // Match brand primary
        },
        // Keep existing cyan colors
        cyan: {
          50: '#ECFEFF',
          100: '#CFFAFE',
          200: '#A5F3FC',
          300: '#67E8F9',
          400: '#22D3EE',
          500: '#06B6D4',
          600: '#0891B2',
          700: '#0E7490',
          800: '#155E75',
          900: '#164E63',
        },
        // Keep existing neutral colors
        neutral: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
        'strong': '0 10px 40px -10px rgba(0, 0, 0, 0.25), 0 2px 10px -2px rgba(0, 0, 0, 0.1)',
      },
      backgroundImage: {
        // Blueprint grid pattern
        'blueprint-grid': "linear-gradient(rgba(59, 130, 246, 0.08) 1px, transparent 1px), linear-gradient(to right, rgba(59, 130, 246, 0.08) 1px, transparent 1px)",
      },
      backgroundSize: {
        'blueprint-grid': '60px 60px',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 4s ease-in-out infinite',
        'grid-move': 'gridMove 30s linear infinite',
        'shimmer': 'shimmer 3s infinite',
        'scan': 'scan 8s linear infinite',
        'float': 'float 20s infinite',
        'border-glow': 'borderGlow 3s ease-in-out infinite',
        'shake': 'shake 0.5s',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.3' },
          '50%': { transform: 'scale(1.05)', opacity: '0.6' },
        },
        gridMove: {
          '0%': { transform: 'translate(0, 0)' },
          '100%': { transform: 'translate(60px, 60px)' },
        },
        shimmer: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        scan: {
          '0%': { left: '-100px', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { left: '100%', opacity: '0' },
        },
        float: {
          '0%, 100%': { opacity: '0', transform: 'translateY(100vh) translateX(0) rotate(0deg)' },
          '10%': { opacity: '0.4', transform: 'translateY(90vh) translateX(10px) rotate(90deg)' },
          '90%': { opacity: '0.4', transform: 'translateY(10vh) translateX(-10px) rotate(450deg)' },
        },
        borderGlow: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '0.3' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
      },
    },
  },
  plugins: [],
}