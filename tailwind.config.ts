import type { Config } from "tailwindcss";
import defaultTheme from "tailwindcss/defaultTheme";

/**
 * Tailwind configuration for the Rovr dashboard.
 *
 * Dark-mode-only per `.kiro/specs/rovr-frontend-polish/requirements.md`
 * Requirement 2.1. Extends the default palette with Material-3-style
 * semantic tokens the reference designs use (primary / secondary /
 * tertiary / surface-container-* ). The existing zinc-based components
 * keep working alongside these — tokens are additive.
 */
const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...defaultTheme.fontFamily.sans],
        mono: ["var(--font-mono)", ...defaultTheme.fontFamily.mono],
      },
      colors: {
        // Brand accents
        primary: "#adc6ff",
        "primary-container": "#4d8eff",
        "on-primary": "#002e6a",
        "on-primary-container": "#00285d",
        secondary: "#d0bcff",
        "secondary-container": "#571bc1",
        "on-secondary-container": "#c4abff",
        tertiary: "#ffb786",
        "tertiary-container": "#df7412",
        error: "#ffb4ab",
        "error-container": "#93000a",

        // Surfaces
        background: "#10131a",
        surface: "#10131a",
        "surface-dim": "#10131a",
        "surface-bright": "#363941",
        "surface-container-lowest": "#0b0e15",
        "surface-container-low": "#191b23",
        "surface-container": "#1d2027",
        "surface-container-high": "#272a31",
        "surface-container-highest": "#32353c",
        "surface-variant": "#32353c",

        // Content
        "on-surface": "#e1e2ec",
        "on-surface-variant": "#c2c6d6",
        "on-background": "#e1e2ec",

        // Lines
        outline: "#8c909f",
        "outline-variant": "#424754",
      },
      boxShadow: {
        "ai-glow":
          "inset 0 0 10px rgba(173, 198, 255, 0.12), 0 0 24px -12px rgba(173, 198, 255, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
