/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Brand: dorado premium (estilo NBA / FPL / premium fantasy).
        // Sirve para CTAs primarios, capitán, destaques sutiles.
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // Surface: neutros premium (basado en zinc, más maduro que gray).
        // Base de fondos, cards, bordes en light y dark.
        surface: {
          50:  '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
          950: '#09090b',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Escala tipográfica un poco más comprimida y consistente
        'display-2xl': ['4.5rem',  { lineHeight: '1.05', letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-xl':  ['3.75rem', { lineHeight: '1.1',  letterSpacing: '-0.025em', fontWeight: '800' }],
        'display-lg':  ['3rem',    { lineHeight: '1.15', letterSpacing: '-0.02em',  fontWeight: '700' }],
        'display-md':  ['2.25rem', { lineHeight: '1.2',  letterSpacing: '-0.015em', fontWeight: '700' }],
      },
      boxShadow: {
        // Sombras sutiles, sin shadow-2xl exagerado
        'soft-sm': '0 1px 2px 0 rgb(0 0 0 / 0.04)',
        'soft':    '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.06)',
        'soft-md': '0 4px 8px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06)',
        'soft-lg': '0 10px 20px -5px rgb(0 0 0 / 0.10), 0 4px 8px -4px rgb(0 0 0 / 0.06)',
      },
      borderRadius: {
        'xl':  '0.75rem',
        '2xl': '1rem',
      },
      transitionDuration: {
        '250': '250ms',
      },
    },
  },
  plugins: [],
}
