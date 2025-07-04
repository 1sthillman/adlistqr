/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./public/**/*.{html,js}"],
  theme: {
    extend: {
      colors: {
        'brand-primary': '#007BFF',
        'brand-secondary': '#6C757D',
        'brand-success': '#28A745',
        'brand-danger': '#DC3545',
        'brand-warning': '#FFC107',
      }
    },
  },
  plugins: [],
} 