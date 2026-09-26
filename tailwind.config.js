/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        base: "#EDEFF2",
        surface: "#FFFFFF",
        ink: "#1B2430",
        inkmuted: "#5B6472",
        line: "#D8DCE2",
        accent: "#E8A33D",
        accentdark: "#C97F1D",
        blueprint: "#2D5DE0",
        danger: "#C6462B",
        success: "#3E8E5B",
      },
      fontFamily: {
        display: ["var(--font-space-grotesk)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "10px",
      },
    },
  },
  plugins: [],
};
