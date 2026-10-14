import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#eef1f4",
        ink: "#0b1210",
        moss: "#0f7a56",
        lime: "#c8f04a",
        cyan: "#1aa6a0",
        line: "#cfd6de"
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia"]
      },
      boxShadow: {
        card: "0 1px 0 rgba(11,18,16,0.06)",
        lift: "0 18px 40px -28px rgba(11, 18, 16, 0.45)"
      },
      borderRadius: {
        card: "1rem"
      }
    }
  },
  plugins: []
};

export default config;
