import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1f2328", soft: "#57606a", faint: "#8c959f" },
        paper: "#fbfaf7",
        accent: { DEFAULT: "#3b6ea8", soft: "#e8f0f9" },
      },
      fontFamily: {
        sans: ["Pretendard", "Noto Sans KR", "system-ui", "sans-serif"],
        serif: ["var(--paper-font)", "KoPubWorldBatang", "Noto Serif KR", "serif"],
      },
    },
  },
  plugins: [],
};
export default config;
