import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['var(--font-serif)', 'Instrument Serif', 'Playfair Display', 'Georgia', 'serif'],
        sans: ['var(--font-sans)', 'Plus Jakarta Sans', 'Inter', 'sans-serif'],
        display: ['var(--font-display)', 'Outfit', 'Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
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
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        // Warm luxury palette inspired by reference image
        havenly: {
          espresso: '#23120B',
          darkMocha: '#190B06',
          chocolate: '#381C11',
          terracotta: '#D97736',
          caramel: '#C26330',
          honey: '#E5A93C',
          sand: '#FAF6F0',
          linen: '#F5EFEB',
          warmGray: '#8D7B73',
          borderWarm: 'rgba(217, 119, 54, 0.2)',
        },
        scout: {
          gold: '#D4AF37',
          brass: '#E5A93C',
          terracotta: '#D97736',
          navy: '#0F1E36',
          crimson: '#8B1E2B',
          silver: '#9CA3AF',
          emerald: '#10B981',
        },
      },
      borderRadius: {
        '3xl': '1.5rem',
        '4xl': '2rem',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'warm-glow': '0 10px 30px -10px rgba(217, 119, 54, 0.35)',
        'glass-warm': '0 8px 32px 0 rgba(28, 13, 8, 0.37)',
      },
      keyframes: {
        soundwave: {
          '0%, 100%': { height: '6px' },
          '50%': { height: '24px' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
        'float-note': {
          '0%': { transform: 'translateY(0px) rotate(0deg)', opacity: '0' },
          '20%': { opacity: '0.7' },
          '80%': { opacity: '0.7' },
          '100%': { transform: 'translateY(-60px) rotate(15deg)', opacity: '0' },
        },
        'rhythm-bar': {
          '0%, 100%': { transform: 'scaleY(0.3)' },
          '50%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'soundwave-1': 'soundwave 1.2s ease-in-out infinite',
        'soundwave-2': 'soundwave 1.2s ease-in-out 0.2s infinite',
        'soundwave-3': 'soundwave 1.2s ease-in-out 0.4s infinite',
        'soundwave-4': 'soundwave 1.2s ease-in-out 0.1s infinite',
        'pulse-glow': 'pulse-glow 2.5s ease-in-out infinite',
        'float-1': 'float-note 4s ease-in-out infinite',
        'float-2': 'float-note 5s ease-in-out 1.5s infinite',
        'float-3': 'float-note 4.5s ease-in-out 3s infinite',
        'rhythm-fast': 'rhythm-bar 0.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
