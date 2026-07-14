import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import { buildTheoryContent, THEORY_SOURCE_ROOT } from './scripts/build-theory-content.mjs'

function theoryContentPlugin(): Plugin {
  let rebuildTimer: ReturnType<typeof setTimeout> | null = null
  return {
    name: 'recsys-theory-content',
    buildStart() {
      buildTheoryContent()
    },
    configureServer(server) {
      server.watcher.add(THEORY_SOURCE_ROOT)
      const rebuild = (_event: string, filename: string) => {
        if (!filename.startsWith(THEORY_SOURCE_ROOT)) return
        if (rebuildTimer) clearTimeout(rebuildTimer)
        rebuildTimer = setTimeout(() => {
          buildTheoryContent()
          server.ws.send({ type: 'full-reload' })
        }, 90)
      }
      server.watcher.on('all', rebuild)
      return () => {
        if (rebuildTimer) clearTimeout(rebuildTimer)
        server.watcher.off('all', rebuild)
      }
    },
  }
}

export default defineConfig({
  plugins: [theoryContentPlugin(), react()],
  server: { host: true, port: 5173 },
  preview: { host: true, port: 4173 },
})
