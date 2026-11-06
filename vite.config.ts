import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// The build is served from /table/ on the WordPress host (see README, Deploy);
// preview matches it, and dev stays at /. Vercel (VERCEL=1 in its builds)
// serves from / until the kiosk moves over: drop that check with the project.
const BUILD_BASE = process.env.VERCEL ? '/' : '/table/'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' || isPreview ? BUILD_BASE : '/',
}))
