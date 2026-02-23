/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './app/**/*.{js,jsx}',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: 'hsl(var(--card))',
        'card-foreground': 'hsl(var(--card-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        sidebar: {
          'active-bg': 'hsl(var(--sidebar-active-bg))',
          'active-accent': 'hsl(var(--sidebar-active-accent))',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.25rem',
      },
      transitionTimingFunction: {
        'sidebar': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: 0 },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: 0 },
        },
        'dialog-overlay-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'dialog-overlay-out': {
          from: { opacity: '1' },
          to: { opacity: '0' },
        },
        'dialog-content-in': {
          from: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.96)' },
          to: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
        },
        'dialog-content-out': {
          from: { opacity: '1', transform: 'translate(-50%, -50%) scale(1)' },
          to: { opacity: '0', transform: 'translate(-50%, -50%) scale(0.96)' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'dialog-overlay-in': 'dialog-overlay-in 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'dialog-overlay-out': 'dialog-overlay-out 0.15s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'dialog-content-in': 'dialog-content-in 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        'dialog-content-out': 'dialog-content-out 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};