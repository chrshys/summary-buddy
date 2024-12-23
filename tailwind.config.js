import forms from '@tailwindcss/forms';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: {
          dark: {
            bg: '#171717', // neutral-900
            surface: '#262626', // neutral-800
            border: '#404040', // neutral-700
            text: {
              primary: '#ffffff',
              secondary: '#a3a3a3', // neutral-400
              tertiary: '#737373', // neutral-500
            },
          },
          light: {
            bg: '#ffffff',
            surface: '#f9fafb', // gray-50
            border: '#e5e7eb', // gray-200
            text: {
              primary: '#171717', // neutral-900
              secondary: '#525252', // neutral-600
              tertiary: '#737373', // neutral-500
            },
          },
        },
      },
      keyframes: {
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slide-down': 'slide-down 0.3s ease-out forwards',
      },
    },
  },
  plugins: [forms],
};
