/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // MiloFX Sand-Based Color Palette
        sand: {
          50: '#FEFCF7',    // Pearl White
          100: '#F5F2E8',   // Cream
          200: '#EBE8D8',   // Lighter Sand
          300: '#E7E3D4',   // Sand Background
          400: '#E0DCC7',   // Light Taupe
          500: '#D1CDB8',   // Warm Gray
          600: '#A39C89',   // Volume Bars
          700: '#6B6456',   // Warm Slate
          800: '#2D2A24',   // Charcoal
        },
        forest: {
          50: '#F0F4F0',
          100: '#E1E9E1',
          200: '#C3D3C3',
          300: '#A5BDA5',
          400: '#87A787',
          500: '#2F5233',   // Forest Green Primary
          600: '#5A7C5F',   // Sage Green Success
          700: '#1F3A22',
          800: '#142816',
        },
        rust: {
          50: '#FDF6F0',
          100: '#FBEDE1',
          200: '#F7DBC3',
          300: '#F3C9A5',
          400: '#EFB787',
          500: '#B8663A',   // Rust Orange
          600: '#A55A33',
          700: '#8B4A2B',
          800: '#713A23',
        },
        burgundy: {
          50: '#FDF2F2',
          100: '#FBE5E5',
          200: '#F7CBCB',
          300: '#F3B1B1',
          400: '#EF9797',
          500: '#8B3A3A',   // Deep Burgundy Error/Loss
          600: '#7A3333',
          700: '#692C2C',
          800: '#582525',
        },
        // Legacy support - map to new colors
        primary: {
          50: '#F0F4F0',
          100: '#E1E9E1',
          200: '#C3D3C3',
          300: '#A5BDA5',
          400: '#87A787',
          500: '#2F5233',   // Forest Green
          600: '#5A7C5F',   // Sage Green
          700: '#1F3A22',
          800: '#142816',
        },
        dark: {
          50: '#FEFCF7',    // Pearl White
          100: '#F5F2E8',   // Cream
          200: '#EBE8D8',   // Lighter Sand
          300: '#E7E3D4',   // Sand Background
          400: '#E0DCC7',   // Light Taupe
          500: '#D1CDB8',   // Warm Gray
          600: '#A39C89',   // Volume Bars
          700: '#6B6456',   // Warm Slate
          800: '#2D2A24',   // Charcoal
          900: '#1A1814',   // Darker Charcoal
        }
      },
      fontFamily: {
        'outfit': ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
        'inter': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'milo': '0 4px 6px -1px rgba(45, 42, 36, 0.08), 0 2px 4px -1px rgba(45, 42, 36, 0.06)',
        'milo-lg': '0 10px 15px -3px rgba(45, 42, 36, 0.08), 0 4px 6px -2px rgba(45, 42, 36, 0.06)',
      },
      borderRadius: {
        'milo': '16px',
      },
      spacing: {
        'milo': '32px',
        'milo-sm': '24px',
        'milo-xs': '20px',
        'milo-xxs': '12px',
      }
    },
  },
  plugins: [],
} 