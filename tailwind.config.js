/** @type {import('tailwindcss').Config} */
const colorMix = (base, mix, ratio) => `color-mix(in srgb, ${base} ${ratio}%, ${mix} ${100 - ratio}%)`;

const blueprint = 'var(--color-primary-blueprint-blue)';
const blueprintTint = 'var(--color-primary-light-tint)';
const accent = 'var(--color-accent-safety-orange)';
const background = 'var(--color-background-gray)';
const surface = 'var(--color-surface-white)';
const ink = 'var(--color-text-ink-black)';
const slate = 'var(--color-text-slate-gray)';
const border = 'var(--color-border-gray)';
const success = 'var(--color-success-green)';
const warning = 'var(--color-warning-amber)';
const info = 'var(--color-info-indigo)';
const prospect = 'var(--color-prospect-teal)';
const danger = 'var(--color-danger-red)';
const dangerTint = 'var(--color-danger-light-tint)';

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
        brand: {
          primary: blueprint,
          accent,
          contrast: surface,
        },
        primary: {
          DEFAULT: blueprint,
          tint: blueprintTint,
          contrast: surface,
        },
        accent: {
          DEFAULT: accent,
          contrast: surface,
        },
        neutral: {
          background,
          surface,
          border,
          ink,
          slate,
        },
        text: {
          DEFAULT: ink,
          primary: ink,
          secondary: slate,
          inverse: surface,
        },
        status: {
          success,
          warning,
          info,
          prospect,
          danger,
        },
        blue: {
          50: blueprintTint,
          100: blueprintTint,
          200: colorMix(blueprint, surface, 30),
          300: colorMix(blueprint, surface, 45),
          400: colorMix(blueprint, surface, 65),
          500: colorMix(blueprint, surface, 80),
          600: blueprint,
          700: colorMix(blueprint, ink, 92),
          800: colorMix(blueprint, ink, 96),
          900: colorMix(blueprint, ink, 98),
        },
        gray: {
          50: surface,
          100: background,
          200: border,
          300: colorMix(border, surface, 75),
          400: slate,
          500: colorMix(slate, ink, 80),
          600: colorMix(ink, slate, 92),
          700: colorMix(ink, slate, 96),
          800: colorMix(ink, slate, 98),
          900: ink,
        },
        slate: {
          400: slate,
          500: slate,
          600: colorMix(slate, ink, 85),
          700: colorMix(slate, ink, 92),
        },
        orange: {
          50: colorMix(accent, surface, 15),
          100: colorMix(accent, surface, 25),
          200: colorMix(accent, surface, 40),
          500: accent,
          600: colorMix(accent, ink, 92),
          700: colorMix(accent, ink, 96),
        },
        yellow: {
          100: colorMix(warning, surface, 18),
          200: colorMix(warning, surface, 32),
          500: warning,
        },
        green: {
          100: colorMix(success, surface, 18),
          200: colorMix(success, surface, 32),
          500: success,
          600: colorMix(success, ink, 92),
        },
        red: {
          100: dangerTint,
          200: colorMix(danger, surface, 30),
          500: danger,
          600: colorMix(danger, ink, 92),
        },
        emerald: {
          500: success,
        },
        cyan: {
          50: colorMix(info, surface, 12),
          100: colorMix(info, surface, 22),
          200: colorMix(info, surface, 36),
          300: colorMix(info, surface, 52),
          400: colorMix(info, surface, 68),
          500: info,
          600: colorMix(info, ink, 92),
          700: colorMix(info, ink, 96),
          800: colorMix(info, ink, 98),
          900: colorMix(info, ink, 99),
        },
        rose: {
          100: dangerTint,
          500: danger,
        },
      },
      boxShadow: {
        'soft': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'medium': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'strong': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
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