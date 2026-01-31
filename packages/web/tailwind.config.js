/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // === NEURAL NETWORK AESTHETIC ===

        // Core Neural Colors
        neural: {
          // Primary: Warm amber - represents synaptic activity, energy, urgency
          fire: {
            DEFAULT: '#F59E0B',
            50: '#FFFBEB',
            100: '#FEF3C7',
            200: '#FDE68A',
            300: '#FCD34D',
            400: '#FBBF24',
            500: '#F59E0B',
            600: '#D97706',
            700: '#B45309',
            800: '#92400E',
            900: '#78350F',
          },
          // Secondary: Electric cyan - represents connections, flow, data
          pulse: {
            DEFAULT: '#06B6D4',
            50: '#ECFEFF',
            100: '#CFFAFE',
            200: '#A5F3FC',
            300: '#67E8F9',
            400: '#22D3EE',
            500: '#06B6D4',
            600: '#0891B2',
            700: '#0E7490',
            800: '#155E75',
            900: '#164E63',
          },
          // Tertiary: Soft violet - represents memory, storage, depth
          memory: {
            DEFAULT: '#8B5CF6',
            50: '#F5F3FF',
            100: '#EDE9FE',
            200: '#DDD6FE',
            300: '#C4B5FD',
            400: '#A78BFA',
            500: '#8B5CF6',
            600: '#7C3AED',
            700: '#6D28D9',
            800: '#5B21B6',
            900: '#4C1D95',
          },
        },

        // Entity Type Colors (distinct, accessible, memorable)
        entity: {
          task: {
            DEFAULT: '#F59E0B', // Amber - action, urgency
            subtle: '#FEF3C7',
            glow: 'rgba(245, 158, 11, 0.4)',
          },
          project: {
            DEFAULT: '#06B6D4', // Cyan - structure, connections
            subtle: '#CFFAFE',
            glow: 'rgba(6, 182, 212, 0.4)',
          },
          idea: {
            DEFAULT: '#8B5CF6', // Violet - creativity, potential
            subtle: '#EDE9FE',
            glow: 'rgba(139, 92, 246, 0.4)',
          },
          person: {
            DEFAULT: '#EC4899', // Rose - warmth, relationships
            subtle: '#FCE7F3',
            glow: 'rgba(236, 72, 153, 0.4)',
          },
        },

        // Deep Space Backgrounds
        void: {
          DEFAULT: '#0B1120', // Deepest background
          50: '#1E293B',      // Elevated surfaces
          100: '#172033',     // Cards, modals
          200: '#0F172A',     // Main background
          300: '#0B1120',     // Deepest void
          border: 'rgba(148, 163, 184, 0.1)', // Subtle borders
          glow: 'rgba(139, 92, 246, 0.15)',   // Ambient glow
        },

        // Semantic Colors
        success: {
          DEFAULT: '#10B981',
          subtle: '#D1FAE5',
          glow: 'rgba(16, 185, 129, 0.4)',
        },
        warning: {
          DEFAULT: '#F59E0B',
          subtle: '#FEF3C7',
          glow: 'rgba(245, 158, 11, 0.4)',
        },
        error: {
          DEFAULT: '#EF4444',
          subtle: '#FEE2E2',
          glow: 'rgba(239, 68, 68, 0.4)',
        },

        // Legacy support (gradual migration)
        primary: {
          DEFAULT: '#000000',
          hover: '#18181b',
          active: '#27272a',
          subtle: '#f4f4f5',
        },
        surface: {
          DEFAULT: '#ffffff',
          subtle: '#fcfcfc',
          muted: '#f4f4f5',
        },
      },

      fontFamily: {
        // Body text: Quicksand - modern, friendly, rounded
        sans: ['Quicksand', 'system-ui', 'sans-serif'],
        // Display headers: Staatliches - bold, distinctive, industrial
        display: ['Staatliches', 'system-ui', 'sans-serif'],
        // Hero text: Outfit - humanistic, warm, inviting
        hero: ['Outfit', 'system-ui', 'sans-serif'],
      },

      fontSize: {
        // Neural scale - slightly larger for better presence
        'hero-xl': ['4rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'hero-lg': ['3rem', { lineHeight: '1.15', letterSpacing: '-0.01em' }],
        'hero-md': ['2rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
      },

      boxShadow: {
        // Existing shadows
        'subtle': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'premium': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'card': '0 0 0 1px rgba(0,0,0,0.03), 0 2px 4px rgba(0,0,0,0.02), 0 12px 24px rgba(0,0,0,0.03)',
        'card-hover': '0 0 0 1px rgba(0,0,0,0.04), 0 4px 8px rgba(0,0,0,0.04), 0 20px 40px rgba(0,0,0,0.06)',
        'glow': '0 0 20px -5px rgba(0,0,0,0.1)',

        // Neural glow effects
        'neural-sm': '0 0 10px -2px var(--tw-shadow-color, rgba(139, 92, 246, 0.3))',
        'neural-md': '0 0 20px -4px var(--tw-shadow-color, rgba(139, 92, 246, 0.4))',
        'neural-lg': '0 0 40px -8px var(--tw-shadow-color, rgba(139, 92, 246, 0.5))',
        'neural-xl': '0 0 60px -12px var(--tw-shadow-color, rgba(139, 92, 246, 0.6))',

        // Entity-specific glows
        'glow-task': '0 0 20px -4px rgba(245, 158, 11, 0.4)',
        'glow-project': '0 0 20px -4px rgba(6, 182, 212, 0.4)',
        'glow-idea': '0 0 20px -4px rgba(139, 92, 246, 0.4)',
        'glow-person': '0 0 20px -4px rgba(236, 72, 153, 0.4)',

        // Synapse pulse (for buttons, interactive elements)
        'synapse': '0 0 0 2px rgba(139, 92, 246, 0.2), 0 0 20px -4px rgba(139, 92, 246, 0.4)',
        'synapse-active': '0 0 0 3px rgba(139, 92, 246, 0.3), 0 0 30px -4px rgba(139, 92, 246, 0.5)',
      },

      backgroundImage: {
        // Neural gradients
        'neural-radial': 'radial-gradient(ellipse at center, var(--tw-gradient-stops))',
        'neural-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',

        // Void gradients (for backgrounds)
        'void-radial': 'radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)',
        'void-mesh': `
          radial-gradient(at 40% 20%, rgba(139, 92, 246, 0.1) 0px, transparent 50%),
          radial-gradient(at 80% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
          radial-gradient(at 0% 50%, rgba(245, 158, 11, 0.05) 0px, transparent 50%),
          radial-gradient(at 80% 50%, rgba(139, 92, 246, 0.08) 0px, transparent 50%),
          radial-gradient(at 0% 100%, rgba(6, 182, 212, 0.1) 0px, transparent 50%)
        `,

        // Connection line gradients
        'synapse-line': 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
        'synapse-vertical': 'linear-gradient(180deg, transparent, rgba(139, 92, 246, 0.5), transparent)',
      },

      animation: {
        // Existing animations
        'fade-in': 'fadeIn 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 400ms cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'aurora': 'aurora 60s linear infinite',
        'spotlight': 'spotlight 2s ease .75s 1 forwards',

        // Neural animations
        'neural-pulse': 'neuralPulse 2s ease-in-out infinite',
        'neural-glow': 'neuralGlow 3s ease-in-out infinite',
        'synapse-fire': 'synapseFire 0.6s ease-out',
        'node-appear': 'nodeAppear 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'connection-draw': 'connectionDraw 0.8s ease-out forwards',
        'float': 'float 6s ease-in-out infinite',
        'drift': 'drift 20s ease-in-out infinite',

        // Micro-interactions
        'bounce-subtle': 'bounceSubtle 0.4s ease-out',
        'shake-subtle': 'shakeSubtle 0.5s ease-out',
      },

      keyframes: {
        // Existing keyframes
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
        aurora: {
          from: { backgroundPosition: '50% 50%, 50% 50%' },
          to: { backgroundPosition: '350% 50%, 350% 50%' },
        },
        spotlight: {
          '0%': { opacity: '0', transform: 'translate(-72%, -62%) scale(0.5)' },
          '100%': { opacity: '1', transform: 'translate(-50%, -40%) scale(1)' },
        },

        // Neural keyframes
        neuralPulse: {
          '0%, 100%': {
            opacity: '0.6',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.05)',
          },
        },
        neuralGlow: {
          '0%, 100%': {
            boxShadow: '0 0 20px -4px rgba(139, 92, 246, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 30px -4px rgba(139, 92, 246, 0.5)',
          },
        },
        synapseFire: {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '0',
          },
          '50%': {
            transform: 'scale(1.1)',
            opacity: '1',
          },
          '100%': {
            transform: 'scale(1)',
            opacity: '1',
          },
        },
        nodeAppear: {
          '0%': {
            transform: 'scale(0) rotate(-180deg)',
            opacity: '0',
          },
          '100%': {
            transform: 'scale(1) rotate(0deg)',
            opacity: '1',
          },
        },
        connectionDraw: {
          '0%': {
            strokeDashoffset: '100%',
            opacity: '0',
          },
          '100%': {
            strokeDashoffset: '0%',
            opacity: '1',
          },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        drift: {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(10px, -10px)' },
          '50%': { transform: 'translate(-5px, 5px)' },
          '75%': { transform: 'translate(-10px, -5px)' },
        },
        bounceSubtle: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.95)' },
          '100%': { transform: 'scale(1)' },
        },
        shakeSubtle: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-2px)' },
          '75%': { transform: 'translateX(2px)' },
        },
      },

      transitionTimingFunction: {
        'neural': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'synapse': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },

      transitionDuration: {
        'neural': '400ms',
      },

      borderRadius: {
        'neural': '1rem',
      },
    },
  },
  plugins: [],
};
