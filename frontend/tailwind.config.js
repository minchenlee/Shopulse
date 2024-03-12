/** @type {import('tailwindcss').Config} */
export default {
  important: true,
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    fontFamily: {
      russoOne: ['Russo\\ One'],
      nunito: ['Nunito']
    },
    fontSize: {
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.5rem',
      '2xl': '2rem',
      '3xl': '2.5rem',
    },
    extend: {
      colors: {
        'primary': '#343434',
        'secondary': '#EBE2D4',
        'white': '#F7F7F7',
        'light-silver': '#E8E8E8',
        'silver': '#D9D9D9',
        'grey': '#B0B0B0',
        'dark-grey': '#727272',
        'turkey-blue': '#388697'
      },
      backgroundImage: {
        'login-background': "url('/src/assets/login-background.png')",
      },
      boxShadow: {
        'short-cut-button': '0px 3px 21px 5px rgba(0,0,0,0.1);',
      },
    },
  },
  plugins: [],
}

