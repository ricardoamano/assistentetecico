/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial dos cards (manifest.cor_card)
        'verde-escuro': '#05342E',
        verde: '#018063',
        lima: '#BCD62B',
        branco: '#F9FFFF',
        'fundo-topo': '#0B3134',
        'fundo-base': '#072525',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '20px',
      },
    },
  },
  plugins: [],
};
