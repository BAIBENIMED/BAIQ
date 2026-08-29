/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "#f5f5f1",
        surface: "#ffffff",
        "surface-subtle": "#faf9f5",
        "surface-hover": "#eeede6",
        primary: "#124f66",
        "primary-container": "#dceef2",
        "on-primary-container": "#0b3446",
        secondary: "#059669",
        "secondary-container": "#d1fae5",
        "on-secondary-container": "#065f46",
        tertiary: "#c08a2e",
        error: "#dc2626",
        "error-container": "#fee2e2",
        "on-error-container": "#991b1b",
        "on-surface": "#171d22",
        "on-surface-variant": "#5b6570",
        outline: "#d2d0c5",
        "outline-variant": "#e4e3dc"
      },
      borderRadius: {
        "DEFAULT": "0.25rem",
        "lg": "0.5rem",
        "xl": "0.75rem",
        "2xl": "1rem"
      },
      fontFamily: {
        "display": ["Space Grotesk", "sans-serif"],
        "headline-lg": ["Space Grotesk", "sans-serif"],
        "body-md": ["Inter", "sans-serif"],
        "data-lg": ["JetBrains Mono", "monospace"],
        "data-sm": ["JetBrains Mono", "monospace"],
        "label-caps": ["Inter", "sans-serif"]
      }
    },
  },
  plugins: [],
}
