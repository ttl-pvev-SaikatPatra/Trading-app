// File: tailwind.config.ts

import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    // Ensure it scans all files in the src directory
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
export default config;