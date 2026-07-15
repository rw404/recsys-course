/// <reference types="vite/client" />

interface Window {
  __recsysPerformance?: import('./game/World').WorldPerformanceSnapshot
}
