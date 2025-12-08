/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./public/**/*.html",
    "./src/**/*.{js,ts}",
  ],
  theme: {
    extend: {
      colors: {
        'sonpi16-orange': '#ff6000',
        'sonpi16-blue': '#0080ff',
        'sonpi16-black': '#0d0600',
        'sonpi16-gold': '#ffa500',
      },
      fontFamily: {
        quency: ['QuencyPixel-Regular', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
