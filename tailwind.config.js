/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // High contrast colors for shopping app
        primary: "#FF385C", // Airbnb-like red
        secondary: "#00A699",
        accent: "#FC642D",
        background: "#F7F7F7",
        text: "#222222",
        "text-muted": "#717171",
      },
    },
  },
  plugins: [],
}
