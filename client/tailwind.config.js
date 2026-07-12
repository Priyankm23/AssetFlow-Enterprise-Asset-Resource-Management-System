/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Deep slate/graphite base
        ink: {
          50: '#E8EBF0',
          100: '#D3D9E2',
          200: '#A7B2C4',
          300: '#7C8BA6',
          400: '#566789',
          500: '#3A4A66',
          600: '#2B3850',
          700: '#22304A',
          800: '#1B2430',
          900: '#131A24',
          950: '#0C1118',
        },
        // Warm off-white working surface
        canvas: {
          50: '#FFFFFF',
          100: '#FBFAF8',
          200: '#F7F6F3',
          300: '#F1EFEA',
          400: '#E7E4DD',
          500: '#D8D4CB',
        },
        // Deep amber/copper accent
        accent: {
          50: '#FDF5EC',
          100: '#FAE8D3',
          200: '#F4CFA3',
          300: '#EDB572',
          400: '#E09A52',
          500: '#C97A3D',
          600: '#B36835',
          700: '#94552C',
          800: '#744425',
          900: '#5A351E',
        },
        // Functional status colors
        status: {
          available: '#4B7A5A', // muted green
          availableSoft: '#DCE9E0',
          allocated: '#4A5F8B', // slate blue
          allocatedSoft: '#DDE3EF',
          reserved: '#C08A3E', // amber
          reservedSoft: '#F4E6CC',
          maintenance: '#7A6BA0', // muted purple-gray for "under maintenance"
          maintenanceSoft: '#E6E1EE',
          lost: '#B85A4E', // red
          lostSoft: '#F2DCD8',
          retired: '#7A7A7A', // gray
          retiredSoft: '#E0E0E0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'tag': ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0.04em' }],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(27,36,48,0.04), 0 1px 3px 0 rgba(27,36,48,0.06)',
        elevated: '0 4px 12px -2px rgba(27,36,48,0.08), 0 2px 6px -1px rgba(27,36,48,0.05)',
        focus: '0 0 0 3px rgba(201,122,61,0.25)',
      },
      borderRadius: {
        'xl2': '14px',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { opacity: '0', transform: 'translateY(4px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { '0%': { opacity: '0', transform: 'scale(0.98)' }, '100%': { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        fadeIn: 'fadeIn 150ms ease-out',
        slideUp: 'slideUp 180ms ease-out',
        scaleIn: 'scaleIn 140ms ease-out',
      },
    },
  },
  plugins: [],
};
