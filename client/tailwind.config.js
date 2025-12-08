const { THEME_COLORS } = require('./src/theme/colors.ts');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: THEME_COLORS,
      fontFamily: {
        quency: ['QuencyPixel-Regular', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
