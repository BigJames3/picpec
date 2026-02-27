/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        picpec: {
          primary: '#E85D04',
          secondary: '#DC2F02',
          accent: '#F48C06',
          dark: '#1A1A2E',
          light: '#F8F9FA',
        },
      },
    },
  },
  plugins: [],
};
