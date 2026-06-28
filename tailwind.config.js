/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1326FD',
          hover: '#0D1DBD',
          soft: '#EAF2FF',
        },
        surface: {
          dark: '#161618',
          page: '#F7F8FA',
        },
        success: {
          DEFAULT: '#008F5A',
          soft: '#E8F8F1',
        },
        accent: {
          lime: '#BFFF37',
        },
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
