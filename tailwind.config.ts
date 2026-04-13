import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Pastel Periwinkle)
        primary: {
          50: '#f6f5ff',
          100: '#eeecff',
          200: '#e0dcff',
          300: '#c9c2ff',
          400: '#ae9fff',
          500: '#9b8fff',
          600: '#7c6fe0',
          700: '#6355bd',
          800: '#4c3d9a',
          900: '#362b74',
          950: '#1e1842',
        },
        // Secondary (Pastel Rose)
        secondary: {
          50: '#fff5f8',
          100: '#ffe8f0',
          200: '#ffd0e2',
          300: '#ffadc9',
          400: '#ff7fac',
          500: '#ff5b91',
          600: '#e83d73',
          700: '#c42a5c',
          800: '#9e2049',
          900: '#7a1838',
          950: '#460d21',
        },
        // Success (Pastel Mint)
        success: {
          50: '#f0fdf9',
          100: '#e0faf2',
          200: '#bbf4e3',
          300: '#87e8cf',
          400: '#4dd4b0',
          500: '#2abf96',
          600: '#1a9b78',
          700: '#167a60',
          800: '#14604d',
          900: '#124e3e',
          950: '#082e25',
        },
        // Error (Pastel Coral)
        error: {
          50: '#fff5f5',
          100: '#ffe8e8',
          200: '#ffd1d1',
          300: '#ffb0b0',
          400: '#ff8585',
          500: '#ff5c5c',
          600: '#e83a3a',
          700: '#c42525',
          800: '#9e1a1a',
          900: '#7a1414',
          950: '#450a0a',
        },
        // Warning (Pastel Peach)
        warning: {
          50: '#fff9f5',
          100: '#fff1e6',
          200: '#ffe3cc',
          300: '#ffcc99',
          400: '#ffb066',
          500: '#ff9444',
          600: '#e8722a',
          700: '#c45418',
          800: '#9e3f10',
          900: '#7a2f0c',
          950: '#451905',
        },
        // Neutral (Warm Gray — 살짝 따뜻한 톤)
        neutral: {
          0: '#ffffff',
          50: '#faf9f8',
          100: '#f4f2f0',
          200: '#e8e4e0',
          300: '#d4cfc9',
          400: '#a89f97',
          500: '#7a7068',
          600: '#5c5450',
          700: '#433e3a',
          800: '#2d2a27',
          900: '#1a1815',
          950: '#0d0c0a',
        },
      },
      fontFamily: {
        sans: ['system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl':  '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
        '4xl': '2.5rem',
      },
      boxShadow: {
        'soft':  '0 2px 16px 0 rgba(155, 143, 255, 0.10)',
        'soft-md': '0 4px 24px 0 rgba(155, 143, 255, 0.15)',
        'soft-lg': '0 8px 40px 0 rgba(155, 143, 255, 0.18)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
}
export default config
