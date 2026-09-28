import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#efeae1",
        ink: "#161815",
        moss: "#1c6b4a",
        lime: "#d7f26a",
        line: "#d9d2c6"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"]
      },
      boxShadow: {
        card: "0 1px 0 rgba(22,24,21,0.06)"
      }
    }
  },
  plugins: []
};

export default config;
