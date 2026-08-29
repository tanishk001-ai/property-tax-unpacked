import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17231e",
        pine: "#0d5946",
        mint: "#e5f3ec",
        paper: "#f6f4ef",
        coral: "#bf4e36"
      }
    },
  },
  plugins: [],
} satisfies Config;
