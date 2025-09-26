// tailwind.config.js
// Tailwind CSS configuration for Clarity app using brand colors

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Clarity brand colors from branding guidelines
        primary: {
          blue: '#1C4E80',    // Primary Blue
          teal: '#2EA4D8',    // Accent Teal/Cyan
          green: '#64B62D',   // Accent Green
        },
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#2EA4D8',
          600: '#0284c7',
          700: '#0369a1',
          800: '#1C4E80',
          900: '#0c4a6e',
        },
        accent: {
          green: '#64B62D',
          teal: '#2EA4D8'
        }
      },
      fontFamily: {
        'heading': ['Montserrat', 'system-ui', 'sans-serif'],
        'body': ['Lato', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-subtle': 'bounce 1s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}