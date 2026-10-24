/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pune basalt architecture (deep volcanic dark stone & graphite)
        basalt: {
          50: '#F4F5F7',
          100: '#E6E9EE',
          200: '#D0D5DF',
          300: '#A4ADC0',
          400: '#758097',
          500: '#535D72',
          600: '#3D4556',
          700: '#2C3240',
          800: '#1F242E', // Primary deep basalt ink
          900: '#151820', // Near black basalt
          950: '#0C0E13',
        },
        // Sahyadri mountain forest & monsoon sage
        sahyadri: {
          50: '#F2F7F4',
          100: '#E1EFE6',
          200: '#C2DEC9',
          300: '#9BC6A6',
          400: '#6FA87F',
          500: '#4A8A5C', // Lush Sahyadri green
          600: '#366E46',
          700: '#2A5537', // Deep hill forest
          800: '#20412B',
          900: '#172D1E',
        },
        // Muted Maharashtra saffron / Shivrai ochre
        saffron: {
          50: '#FDF8F0',
          100: '#FBF0DE',
          200: '#F6DCB8',
          300: '#EFC289',
          400: '#E4A256',
          500: '#D3832B', // Warm muted saffron
          600: '#B8651B', // Deep heritage saffron
          700: '#924A15',
          800: '#753A16',
          900: '#5F3015',
        },
        // Monsoon rain slate & Mutha-Mula river stone neutrals
        monsoon: {
          50: '#F8F9FA',  // Clean neutral background
          100: '#F1F3F5', // Card and panel backgrounds
          200: '#E5E8EB', // Subtle borders
          300: '#D3D7DC', // Structural architectural borders
          400: '#A8AFB9',
          500: '#7E8794',
          600: '#5F6876',
          700: '#464E5A',
          800: '#303640',
          900: '#1E2229',
        },
        // Backward-compatible aliases mapped to the Pune palette
        terracotta: {
          50: '#FDF8F0',
          100: '#FBF0DE',
          200: '#F6DCB8',
          300: '#EFC289',
          400: '#E4A256',
          500: '#D3832B',
          600: '#B8651B',
          700: '#924A15',
          800: '#753A16',
          900: '#5F3015',
        },
        rose: {
          50: '#FDF7F5',
          100: '#F9EDE8',
          200: '#F2D7CC',
          300: '#E5B9A6',
          400: '#D2957E',
          500: '#BC7359',
          600: '#A1553D',
          700: '#83422E',
          800: '#693526',
          900: '#542C21',
        },
        sand: {
          50: '#F8F9FA',
          100: '#F1F3F5',
          200: '#E5E8EB',
          300: '#D3D7DC',
          400: '#A8AFB9',
          500: '#7E8794',
          600: '#5F6876',
          700: '#464E5A',
          800: '#303640',
          900: '#1E2229',
        },
        charcoal: {
          50: '#F4F5F7',
          100: '#E6E9EE',
          200: '#D0D5DF',
          300: '#A4ADC0',
          400: '#758097',
          500: '#535D72',
          600: '#3D4556',
          700: '#2C3240',
          800: '#1F242E',
          900: '#151820',
          950: '#0C0E13',
        },
        sage: {
          50: '#F2F7F4',
          100: '#E1EFE6',
          200: '#C2DEC9',
          300: '#9BC6A6',
          400: '#6FA87F',
          500: '#4A8A5C',
          600: '#366E46',
          700: '#2A5537',
          800: '#20412B',
          900: '#172D1E',
        },
        ochre: {
          50: '#FEF9EE',
          100: '#FDF2D5',
          200: '#F9E2A0',
          300: '#F3CB62',
          400: '#E4AB28',
          500: '#C68813',
          600: '#A36B0B',
          700: '#7F500A',
          800: '#613C0B',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        architectural: ['"Cinzel"', 'Georgia', 'serif'],
      },
      boxShadow: {
        'civic': '0 1px 3px 0 rgba(21, 24, 32, 0.06), 0 1px 2px -1px rgba(21, 24, 32, 0.04)',
        'civic-md': '0 4px 6px -1px rgba(21, 24, 32, 0.08), 0 2px 4px -2px rgba(21, 24, 32, 0.04)',
        'civic-lg': '0 10px 15px -3px rgba(21, 24, 32, 0.08), 0 4px 6px -4px rgba(21, 24, 32, 0.04)',
      }
    },
  },
  plugins: [],
}
