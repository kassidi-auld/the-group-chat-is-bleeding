import type { Config } from "tailwindcss";
export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#101014",
        acid: "#dcff68",
        hot: "#ff517d",
        violet: "#a58aff",
      },
    },
  },
  plugins: [],
} satisfies Config;
