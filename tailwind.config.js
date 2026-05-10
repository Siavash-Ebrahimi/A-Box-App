/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#FFD700",
        silvertier: "#C0C0C0",
        bronze: "#CD7F32",
      },
    },
  },
  plugins: [],
};
