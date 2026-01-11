/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#000000', // True Black
          hover: '#18181b',   // Zinc 900
          active: '#27272a',  // Zinc 800
          subtle: '#f4f4f5',  // Zinc 100
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#fcfcfc',  // Ultra-light gray
          muted: '#f4f4f5',   // Zinc 100
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'premium': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.02), 0 12px 24px rgba(0,0,0,0.03)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 20px 40px rgba(0,0,0,0.06)',
        'glow': '0 0 20px -5px rgba(0,0,0,0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.96)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
