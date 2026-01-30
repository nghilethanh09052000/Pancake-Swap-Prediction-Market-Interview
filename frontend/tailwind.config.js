/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fef3e2',
          100: '#fde4b8',
          200: '#fbcb7e',
          300: '#f9a842',
          400: '#f78b1c',
          500: '#f77316',
          600: '#e85a0c',
          700: '#c1440c',
          800: '#9a3611',
          900: '#7c2f11',
        },
        bull: '#1fc7d4',
        bear: '#ed4b9e',
      },
    },
  },
  plugins: [],
}

