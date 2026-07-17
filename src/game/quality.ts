export type WorldQualityTier = 'low' | 'balanced' | 'high'

export interface WorldRenderConfig {
  tier: WorldQualityTier
  maxDpr: number
  antialias: boolean
  shadows: boolean
  shadowMapSize: number
  sparkles: number
  cloudBankStride: number
  underClouds: number
  islandTrees: number
  islandRocks: number
  districts: number
  oceanCurrents: number
}

const PRESETS: Record<WorldQualityTier, WorldRenderConfig> = {
  low: {
    tier: 'low',
    maxDpr: 1,
    antialias: false,
    shadows: false,
    shadowMapSize: 512,
    sparkles: 34,
    cloudBankStride: 2,
    underClouds: 2,
    islandTrees: 8,
    islandRocks: 10,
    districts: 4,
    oceanCurrents: 0,
  },
  balanced: {
    tier: 'balanced',
    maxDpr: 1.3,
    antialias: true,
    shadows: true,
    shadowMapSize: 1024,
    sparkles: 68,
    cloudBankStride: 1,
    underClouds: 3,
    islandTrees: 12,
    islandRocks: 14,
    districts: 5,
    oceanCurrents: 10,
  },
  high: {
    tier: 'high',
    maxDpr: 1.65,
    antialias: true,
    shadows: true,
    shadowMapSize: 1536,
    sparkles: 110,
    cloudBankStride: 1,
    underClouds: 4,
    islandTrees: 15,
    islandRocks: 18,
    districts: 6,
    oceanCurrents: 13,
  },
}

function forcedTier(): WorldQualityTier | null {
  if (typeof window === 'undefined') return null
  const value = new URLSearchParams(window.location.search).get('quality')
  return value === 'low' || value === 'balanced' || value === 'high' ? value : null
}

function automaticTier(): WorldQualityTier {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'balanced'
  const hints = navigator as Navigator & { deviceMemory?: number }
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false
  const narrowViewport = window.innerWidth <= 820
  const constrainedMemory = (hints.deviceMemory ?? 8) <= 4
  const constrainedCpu = (navigator.hardwareConcurrency ?? 8) <= 4
  return coarsePointer || narrowViewport || constrainedMemory || constrainedCpu ? 'low' : 'balanced'
}

export const WORLD_RENDER_CONFIG = PRESETS[forcedTier() ?? automaticTier()]
