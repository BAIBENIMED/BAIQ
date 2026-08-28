import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // En développement, `npm run server` lance server.js sur le port 8787
    // (relais sécurisé vers l'API Gemini). Ce proxy évite tout souci de CORS
    // et fait en sorte que le même chemin /api/gemini fonctionne en dev comme en prod.
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
