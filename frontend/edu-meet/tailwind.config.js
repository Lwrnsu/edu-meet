/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "color-scheme-grays-black": "var(--color-scheme-grays-black)",
        "moodboard-1light-gray-ish-blue": "var(--moodboard-1light-gray-ish-blue)",
        "moodboard-2dull-blue": "var(--moodboard-2dull-blue)",
        "moodboard-2light-purple": "var(--moodboard-2light-purple)",
        "moodboard-2midnight-blue": "var(--moodboard-2midnight-blue)",
        "moodboard-2warm-white": "var(--moodboard-2warm-white)",
        "moodboard-3white": "var(--moodboard-3white)",
        "variable-collection-moodboard-2-pale-blue":
          "var(--variable-collection-moodboard-2-pale-blue)",
      },
      fontFamily: {
        "poppins-h1": ["var(--poppins-h1-font-family)", "sans-serif"],
        "poppins-h3": ["var(--poppins-h3-font-family)", "sans-serif"],
        h5: ["var(--h5-font-family)", "sans-serif"],
        "subtext": ["var(--subtext-font-family)", "sans-serif"],
        "subtext-semibold": ["var(--subtext-semibold-font-family)", "sans-serif"],
        "small-text": ["var(--small-text-font-family)", "sans-serif"],
      },
    },
  },
  plugins: [],
};
