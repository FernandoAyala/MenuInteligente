/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Colores similares a WhatsApp
        'chat-bg': '#0b141a',
        'chat-panel': '#202c33',
        'message-incoming': '#202c33',
        'message-outgoing': '#005c4b',
        'input-bg': '#2a3942',
        'text-primary': '#e9edef',
        'text-secondary': '#8696a0',
        'accent-green': '#00a884',
        'accent-blue': '#53bdeb',
      },
      animation: {
        'typing': 'typing 1.5s ease-in-out infinite',
        'bounce-subtle': 'bounce 2s infinite',
      },
      keyframes: {
        typing: {
          '0%, 60%, 100%': { transform: 'translateY(0)' },
          '30%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}