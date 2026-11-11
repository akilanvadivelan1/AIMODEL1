/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // The website palette: warm paper, dark ink, one vermilion accent, a highlighter yellow.
        paper: "#f4efe4",
        cream: "#fbf8f1",
        ink: "#16130e",
        muted: "#5f584d",
        line: "#dcd2bf",
        accent: "#d4430f",
        mark: "#ffd644",
      },
      fontFamily: {
        display: ['"Instrument Serif"', '"Iowan Old Style"', '"Palatino Linotype"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
};
