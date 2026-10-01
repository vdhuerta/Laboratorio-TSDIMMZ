/**
 * Sistema de diseño (paleta y espaciados tomados de Aula Portafolio):
 * lienzo cálido, paneles blancos con bordes finos, verde pizarra como color de marca y ámbar como acento.
 * Tipografía: se conserva Inter. Solo los títulos van en negrita: las utilidades de peso se aplanan a 400
 * y `font-title` (o h1–h6) es el único peso 700.
 */
const brand = { 50: '#EEF4F1', 100: '#DCE8E2', 200: '#B9D1C6', 300: '#8FB3A3', 400: '#4F7C69', 500: '#24473A', 600: '#1B352B', 700: '#142720', 800: '#0F1D18', 900: '#0A1310' };
const neutral = { 50: '#F7F6F1', 100: '#EBEAE2', 200: '#E4E2D8', 300: '#CFCDC0', 400: '#A3A398', 500: '#6E6F66', 600: '#585950', 700: '#3F4139', 800: '#2E312A', 900: '#23271F' };

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    fontWeight: { thin: '100', light: '300', normal: '400', medium: '400', semibold: '400', bold: '400', extrabold: '400', black: '400', title: '700' },
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: { brand, slate: neutral, chrome: { bg: '#F2F1EC', soft: '#EBEAE2', line: '#E4E2D8', ink: '#23271F', mut: '#6E6F66' }, accent: { DEFAULT: '#C98F2D', soft: '#F6ECD6' } },
      boxShadow: { xs: '0 1px 2px rgba(35,39,31,0.06)' },
    },
  },
  plugins: [],
};
