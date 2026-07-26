/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: 'var(--color-bg)',
        surface: 'var(--color-surface)',
        'surface-subtle': 'var(--color-surface-subtle)',
        'surface-card': 'var(--color-surface-card)',
        'on-surface': 'var(--color-on-surface)',
        'on-surface-muted': 'var(--color-on-surface-muted)',
        primary: 'var(--color-primary)',
        'on-primary': 'var(--color-on-primary)',
        'primary-container': 'var(--color-primary-container)',
        secondary: 'var(--color-secondary)',
        tertiary: 'var(--color-tertiary)',
        border: 'var(--color-border)',
        'border-strong': 'var(--color-border-strong)',
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: '0.25rem',
        DEFAULT: '0.5rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
      spacing: {
        base: '8px',
        gutter: '24px',
        'margin-desktop': '64px',
        'margin-mobile': '20px',
        'section-gap': '120px',
      },
      boxShadow: {
        'luxury': '0px 10px 40px rgba(26, 26, 26, 0.04)',
        'luxury-dark': '0px 10px 40px rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
