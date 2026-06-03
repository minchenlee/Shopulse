/** @type {import('tailwindcss').Config} */
export default {
  important: true,
  content: [
    './index.html',
    './src/**/*.{js,svelte}',
  ],
  // R8 / L6.2 — dynamic Tailwind class safelist. The React build leaked these via its
  // JS-glob scan, but Svelte's interpolated `class` strings are NOT seen by the
  // Tailwind content scanner, so without this safelist the utilities would not be
  // emitted and the elements would render unstyled.
  //
  //  - scale-[…]: CategoryCard's brand-logo `scale-[{scale}]` (GUI.json brand scales
  //    2 / 1.7 / 1 / 0.5). The hardcoded invisible divs cover 2/1.7/0.5, but scale-[1]
  //    is ONLY reachable dynamically (Hisense=1) → must be listed explicitly.
  //  - mb-0 / mb-20: gui/ProductCard's `mb-${bottomMargin}` (0 for similar products,
  //    20 otherwise). Used in the Gui result grid AND GuiProductDetail's SimilarProducts.
  safelist: [
    'scale-[2]',
    'scale-[1.7]',
    'scale-[1]',
    'scale-[0.5]',
    'mb-0',
    'mb-20',
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
      boxShadow: {
        'short-cut-button': '0px 3px 21px 5px rgba(0,0,0,0.1);',
      },
      animation: {
        'breathe-scale': 'breathe-scale 4s infinite',
      },
      keyframes: {
        'breathe-scale': {
          '0%, 100%': { opacity: 2 },
          '50%': { opacity: 0.5 },
        },
      },
    },
  },
  plugins: [],
}
