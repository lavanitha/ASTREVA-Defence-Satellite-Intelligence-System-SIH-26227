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
        // Muted Olive-Green & Desaturated Sage color ramp aliased to cyan & sky for global consistency
        cyan: {
          50: '#F5F8F4',
          100: '#E5ECE2',
          200: '#C7D7C1',
          300: '#A3BE9A',
          400: '#7E9F71',
          500: '#658459',
          600: '#4F6944',
          700: '#3E5336',
          800: '#2E3E28',
          900: '#202B1C',
          950: '#121A10',
        },
        sky: {
          50: '#F5F8F4',
          100: '#E5ECE2',
          200: '#C7D7C1',
          300: '#A3BE9A',
          400: '#7E9F71',
          500: '#658459',
          600: '#4F6944',
          700: '#3E5336',
          800: '#2E3E28',
          900: '#202B1C',
          950: '#121A10',
        },
        teal: {
          50: '#F5F8F4',
          100: '#E5ECE2',
          200: '#C7D7C1',
          300: '#A3BE9A',
          400: '#7E9F71',
          500: '#658459',
          600: '#4F6944',
          700: '#3E5336',
          800: '#2E3E28',
          900: '#202B1C',
          950: '#121A10',
        },
        sage: {
          light: '#A3BF99',
          DEFAULT: '#7E9F71',
          dark: '#556E4A',
        },
        olive: {
          light: '#7A9B63',
          DEFAULT: '#556E4A',
          dark: '#384C30',
          dim: '#24331F',
        },
        geoint: {
          bg: '#060A12',
          surface: '#0B1120',
          panel: '#0E172A',
          card: '#121F38',
          border: 'rgba(126, 159, 113, 0.20)',
          borderHover: 'rgba(126, 159, 113, 0.45)',
          accent: '#7E9F71',
          accentDim: '#556E4A',
          muted: '#94A3B8',
          text: '#F1F5F9',
        }
      },
      fontFamily: {
        sans: ['"Roboto Condensed"', 'sans-serif'],
        mono: ['"Roboto Mono"', 'monospace'],
        display: ['"Roboto Condensed"', 'sans-serif'],
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.6)',
        'panel-elevated': '0 8px 32px 0 rgba(0, 0, 0, 0.7)',
        'glow-sm': '0 0 8px -1px rgba(126, 159, 113, 0.25)',
      },
    },
  },
  plugins: [],
}
