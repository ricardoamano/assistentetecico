import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        campanha: {
          "fundo-escuro": "#072525",
          "fundo-topo": "#0B3134",
          "card-escuro": "#05342E",
          verde: "#018063",
          lima: "#BCD62B",
          branco: "#F9FFFF",
        },
      },
    },
  },
  plugins: [],
};

export default config;
