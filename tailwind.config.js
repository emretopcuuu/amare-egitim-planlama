/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        amare: {
          purple: '#6B46C1',
          blue: '#3182CE',
          light: '#9F7AEA',
          dark: '#553C9A',
        }
      }
    },
  },
  plugins: [],
}
