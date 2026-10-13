/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["class", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // === OLD-MONEY FINVERSE PALETTE ===
        brand: {
          // Primary accent: deep forest green (old-money, trust)
          forest:   "#1E4D35",
          emerald:  "#2E7D52",
          sage:     "#5D9B78",
          mint:     "#A8D5B5",
          // Secondary: warm antiqued gold
          gold:     "#B8860B",
          amber:    "#D4A017",
          champagne:"#F5E6C8",
          // Ivory backgrounds
          ivory:    "#FAF7F0",
          parchment:"#F2EDE0",
          linen:    "#EDE8D8",
          // Ink tones
          ink:      "#1A1A14",
          sepia:    "#4A3F2F",
          charcoal: "#2C2C24",
        },
        surface: {
          DEFAULT:  "#FAF7F0",
          soft:     "#F2EDE0",
          subtle:   "#EDE8D8",
          card:     "#FFFEFB",
          dark:     "#16201A",
          darksoft: "#1F2E24",
          darkcard: "#1A2820",
        },
        ink: {
          DEFAULT:   "#1A1A14",
          secondary: "#5D5A4E",
          muted:     "#8C8776",
          inverted:  "#FAF7F0",
        },
        border: {
          DEFAULT: "#D8CEBA",
          subtle:  "#E8E0CC",
          dark:    "#B8AA90",
          night:   "#2E3D34",
          nightsoft:"#3A4D40",
        },
        // Risk levels — warm, sophisticated tones (less alarming, more analytical)
        risk: {
          low: {
            DEFAULT: "#2E7D52",
            bg:      "#F0F9F3",
            border:  "#A8D5B5",
            text:    "#1E4D35",
          },
          medium: {
            DEFAULT: "#B8860B",
            bg:      "#FDF7E6",
            border:  "#E8CC7A",
            text:    "#7A5B08",
          },
          high: {
            DEFAULT: "#C2440A",
            bg:      "#FEF3EE",
            border:  "#F4B8A0",
            text:    "#8B3009",
          },
          critical: {
            DEFAULT: "#A8190F",
            bg:      "#FDF0EF",
            border:  "#F4A8A4",
            text:    "#7A1209",
          },
        },
      },
      fontFamily: {
        sans:    ["Onest", "Plus Jakarta Sans", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif:   ["Playfair Display", "Georgia", "Cambria", "Times New Roman", "serif"],
        mono:    ["JetBrains Mono", "SFMono-Regular", "Menlo", "Courier New", "monospace"],
      },
      boxShadow: {
        subtle:   "0 1px 3px 0 rgba(30, 77, 53, 0.05), 0 1px 2px -1px rgba(30, 77, 53, 0.03)",
        card:     "0 4px 12px -2px rgba(30, 77, 53, 0.07), 0 2px 6px -2px rgba(30, 77, 53, 0.04)",
        elevated: "0 10px 30px -5px rgba(30, 77, 53, 0.10), 0 6px 12px -6px rgba(30, 77, 53, 0.06)",
        modal:    "0 20px 45px -8px rgba(30, 77, 53, 0.18), 0 10px 20px -5px rgba(30, 77, 53, 0.08)",
        glow:     "0 0 0 3px rgba(46, 125, 82, 0.20)",
        "glow-gold": "0 0 0 3px rgba(184, 134, 11, 0.20)",
        "inner-soft": "inset 0 1px 3px rgba(30, 77, 53, 0.05)",
      },
      borderRadius: {
        xl:  "0.875rem",
        "2xl": "1.125rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      animation: {
        "pulse-subtle":  "pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in":       "fadeIn 0.25s ease-out forwards",
        "slide-up":      "slideUp 0.3s ease-out forwards",
        "slide-in-left": "slideInLeft 0.3s ease-out forwards",
        "scale-in":      "scaleIn 0.2s ease-out forwards",
        "shimmer":       "shimmer 1.8s ease-in-out infinite",
      },
      keyframes: {
        fadeIn:      { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp:     { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        slideInLeft: { "0%": { opacity: "0", transform: "translateX(-12px)" }, "100%": { opacity: "1", transform: "translateX(0)" } },
        scaleIn:     { "0%": { opacity: "0", transform: "scale(0.95)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        shimmer:     { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
      },
      backgroundImage: {
        "linen-texture": "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='4' height='4'%3E%3Crect width='4' height='4' fill='%23FAF7F0'/%3E%3Cpath d='M0 2h4M2 0v4' stroke='%23EDE8D8' stroke-width='0.5' opacity='0.5'/%3E%3C/svg%3E\")",
        "hero-gradient": "linear-gradient(135deg, #1E4D35 0%, #2E7D52 60%, #1A3D2A 100%)",
        "gold-gradient": "linear-gradient(135deg, #B8860B 0%, #D4A017 50%, #B8860B 100%)",
      },
    },
  },
  plugins: [],
}
