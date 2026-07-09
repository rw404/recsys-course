import { Suspense } from 'react'
import { MeshyProp } from './MeshyProp'

/**
 * DecorScatter — scatters a few detailed decorative GLB clusters (flowers, rocks, foliage) at hand-
 * placed spots, replacing dense fields of low-poly procedural "blobs" (icosahedron flowers, faceted
 * dodecahedron rocks) that the art audit flagged as the game-jam tell. A cluster GLB already packs
 * many blossoms/boulders, so ~12-16 placements read as a rich field at a modest draw-call cost.
 * Behind Suspense so the primitive scene never blanks while the GLB streams in.
 */
export interface ScatterItem {
  pos: [number, number, number]
  h: number
  rot: number
  tint?: string
}

export function DecorScatter({ url, items, emissiveBoost = 0.25 }: { url: string; items: ScatterItem[]; emissiveBoost?: number }) {
  return (
    <Suspense fallback={null}>
      {items.map((it, i) => (
        <MeshyProp
          key={i}
          url={url}
          position={it.pos}
          targetHeight={it.h}
          rotationY={it.rot}
          tint={it.tint}
          tintAmount={it.tint ? 0.4 : 0}
          emissiveBoost={emissiveBoost}
        />
      ))}
    </Suspense>
  )
}

/** deterministic scatter of N items across a rectangle, for a natural-looking field */
export function scatterGrid(
  x0: number,
  z0: number,
  w: number,
  d: number,
  n: number,
  hRange: [number, number],
  seed = 91,
): ScatterItem[] {
  let s = seed
  const rnd = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  const out: ScatterItem[] = []
  for (let i = 0; i < n; i++) {
    out.push({
      pos: [x0 + rnd() * w, 0, z0 + rnd() * d],
      h: hRange[0] + rnd() * (hRange[1] - hRange[0]),
      rot: rnd() * Math.PI * 2,
    })
  }
  return out
}
