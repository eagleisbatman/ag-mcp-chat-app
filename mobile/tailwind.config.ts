import type { Config } from 'tailwindcss';

export default {
  content: [
    './App.{js,jsx,ts,tsx}',
    './app/**/*.{js,jsx,ts,tsx}',
    './mobile/**/*.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Map theme tokens to Tailwind — usage: className="bg-accent text-muted"
        accent: {
          DEFAULT: '#1B8A2E', // light
          dark: '#30D158',    // dark mode
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
