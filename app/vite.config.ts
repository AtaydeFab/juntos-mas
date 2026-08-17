import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // La app se publica en https://<usuario>.github.io/juntos-mas/
  base: '/juntos-mas/',
  build: { outDir: '../docs', emptyOutDir: true },
})
