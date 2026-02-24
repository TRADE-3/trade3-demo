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
        t3: {
          dark: '#060430',
          violet: '#3B128D',
          orange: '#F75835',
          cream: '#FDF5EF',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        display: ['var(--font-raleway)', 'sans-serif'],
        body: ['var(--font-karla)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
