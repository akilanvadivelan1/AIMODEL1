/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#030304",
          900: "#08080b",
          800: "#0e0d14",
          700: "#16141f",
          600: "#221f30",
        },
        accent: {
          DEFAULT: "#9b7bea", // lavender
          deep: "#6b48d6",
          soft: "#b79df2",
        },
        sunrise: {
          DEFAULT: "#ff9a4d",
          deep: "#f2702a",
        },
        haze: "#8b949e",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      },
    },
  },
  plugins: [],
};
