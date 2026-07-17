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
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'vite-runtime'
          if (!id.includes('/node_modules/')) return undefined
          if (id.includes('/@xyflow/')) return 'vendor-flow'
          if (id.includes('/katex/')) return 'vendor-katex'
          if (
            id.includes('/@react-three/')
            || id.includes('/three/')
            || id.includes('/three-stdlib/')
            || id.includes('/maath/')
            || id.includes('/troika-')
          ) return 'vendor-three'
          if (
            id.includes('/react/')
            || id.includes('/react-dom/')
            || id.includes('/scheduler/')
          ) return 'vendor-react'
          if (id.includes('/zustand/')) return 'vendor-state'
          return undefined
        },
      },
    },
  },
})
