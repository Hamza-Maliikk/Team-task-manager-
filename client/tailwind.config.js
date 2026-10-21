export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Manrope', 'system-ui', 'sans-serif'] },
      colors: {
        ink: '#16222E',
        paper: '#F2F4F6',
        brand: { DEFAULT: '#0F766E', dark: '#115E59', soft: '#CCFBF1' },
      },
    },
  },
  plugins: [],
};
