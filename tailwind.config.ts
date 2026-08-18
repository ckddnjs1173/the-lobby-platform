import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: "#24180f",
          gold: "#98642f",
          light: "#fbf8f3",
          ivory: "#f8f3eb",
          cream: "#f2e9dc",
          bronze: "#815326",
          espresso: "#24180f",
          ink: "#2f2924",
          muted: "#7f756b",
          line: "#e6ddd2",
          success: "#66805b",
          warning: "#b77a3d",
          danger: "#b65445",
        },
      },
      boxShadow: {
        soft: "0 18px 50px rgba(84, 55, 31, 0.08)",
        card: "0 8px 26px rgba(84, 55, 31, 0.06)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      letterSpacing: {
        editorial: "0.16em",
      },
    },
  },
  plugins: [],
};

export default config;