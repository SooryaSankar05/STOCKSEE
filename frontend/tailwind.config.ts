import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
        heading: ["Syne", "Inter", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["Syne", "Inter", "sans-serif"],
      },
      colors: {
        border: "#1E293B",
        input: "#1E293B",
        ring: "#2563FF",
        background: "#05070D",
        foreground: "#F8FAFC",
        surface: "#101826",
        "bg-secondary": "#0B1220",
        
        "blue-accent": "#2563FF",
        "purple-accent": "#7C3AED",
        "green-gain": "#10B981",
        "red-loss": "#EF4444",
        "gold-premium": "#F59E0B",
        
        primary: {
          DEFAULT: "#2563FF",
          foreground: "#F8FAFC",
        },
        secondary: {
          DEFAULT: "#0B1220",
          foreground: "#94A3B8",
        },
        destructive: {
          DEFAULT: "#EF4444",
          foreground: "#F8FAFC",
        },
        muted: {
          DEFAULT: "#1E293B",
          foreground: "#94A3B8",
        },
        accent: {
          DEFAULT: "#2563FF",
          foreground: "#F8FAFC",
          hover: "#3B82F6",
        },
        popover: {
          DEFAULT: "#101826",
          foreground: "#F8FAFC",
        },
        card: {
          DEFAULT: "#101826",
          foreground: "#F8FAFC",
        },
        sidebar: {
          DEFAULT: "#05070D",
          foreground: "#94A3B8",
          primary: "#2563FF",
          "primary-foreground": "#F8FAFC",
          accent: "#101826",
          "accent-foreground": "#F8FAFC",
          border: "#1E293B",
          ring: "#2563FF",
        },
      },
      borderRadius: {
        lg: "1.5rem", // 24px
        md: "1rem", // 16px
        sm: "0.5rem",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "ticker-scroll": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        "float-up": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.05)" },
        },
        "glow-ring": {
          "0%, 100%": { boxShadow: "0 0 12px 2px rgba(59,130,246,0.25)" },
          "50%": { boxShadow: "0 0 28px 6px rgba(59,130,246,0.5)" },
        },
        "slide-in-right": {
          from: { opacity: "0", transform: "translateX(40px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(24px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "ticker-scroll": "ticker-scroll 30s linear infinite",
        "float-up": "float-up 4s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2.5s ease-in-out infinite",
        "glow-ring": "glow-ring 2.5s ease-in-out infinite",
        "slide-in-right": "slide-in-right 0.6s ease-out forwards",
        "fade-in-up": "fade-in-up 0.7s ease-out forwards",
        "shimmer": "shimmer 2.5s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
        md: "8px",
        lg: "16px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
