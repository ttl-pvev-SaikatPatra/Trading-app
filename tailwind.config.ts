// File: tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}", // This line is crucial
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;
