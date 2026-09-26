/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      // Los colores salen de variables CSS definidas en globals.css.
      // El formato "rgb(var(--x) / <alpha-value>)" es el que permite seguir
      // usando modificadores de opacidad tipo bg-danger/10 o bg-overlay/40.
      colors: {
        base: "rgb(var(--c-base) / <alpha-value>)",
        surface: "rgb(var(--c-surface) / <alpha-value>)",
        ink: "rgb(var(--c-ink) / <alpha-value>)",
        inkmuted: "rgb(var(--c-inkmuted) / <alpha-value>)",
        line: "rgb(var(--c-line) / <alpha-value>)",
        accent: "rgb(var(--c-accent) / <alpha-value>)",
        accentdark: "rgb(var(--c-accentdark) / <alpha-value>)",
        blueprint: "rgb(var(--c-blueprint) / <alpha-value>)",
        danger: "rgb(var(--c-danger) / <alpha-value>)",
        success: "rgb(var(--c-success) / <alpha-value>)",
        overlay: "rgb(var(--c-overlay) / <alpha-value>)",
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
