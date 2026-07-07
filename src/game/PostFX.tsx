import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

/**
 * Premium neon grade: bloom on the emissive route/crystals/stations, a soft vignette,
 * and ACES tone mapping. Renderer tone mapping is disabled (set on the Canvas) so the
 * ToneMapping effect owns the final grade — otherwise it double-applies.
 */
export function PostFX({ bloom = 0.98 }: { bloom?: number }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloom}
        luminanceThreshold={0.5}
        luminanceSmoothing={0.34}
        mipmapBlur
        radius={0.72}
      />
      <Vignette offset={0.26} darkness={0.58} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
