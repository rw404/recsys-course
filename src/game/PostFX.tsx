import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'

/**
 * Premium neon grade: bloom on the emissive route/crystals/stations, a soft vignette,
 * and ACES tone mapping. Renderer tone mapping is disabled (set on the Canvas) so the
 * ToneMapping effect owns the final grade — otherwise it double-applies.
 */
export function PostFX({ bloom = 0.85 }: { bloom?: number }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={bloom}
        luminanceThreshold={0.55}
        luminanceSmoothing={0.32}
        mipmapBlur
        radius={0.62}
      />
      <Vignette offset={0.28} darkness={0.62} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
