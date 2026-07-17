/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        ink: "#08110e",
        mint: "#69e3ad",
        sage: "#b8c9c1",
      },
    },
  },
  plugins: [],
};
