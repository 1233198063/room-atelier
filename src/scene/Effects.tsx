import { EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { useEditor } from "../store/editorStore";

/**
 * Ambient occlusion, the soft darkening a real room has and flat shading
 * lacks: corners, the gap under a bed and the seams between pieces, so
 * furniture stands on the floor instead of hovering. Stronger in Preview.
 *
 * The composer turns the renderer's own tone mapping off and expects it as the
 * last effect, so the Neutral curve the canvas uses moves here.
 */
export function Effects() {
  const preview = useEditor((s) => s.mode === "preview");
  const plan = useEditor((s) => s.view === "top");
  return <EffectComposer multisampling={4}>
    {/* Radius in meters: wide enough to shade a corner, not so wide that whole walls go grey. */}
    <N8AO aoRadius={plan ? 0.3 : 0.6} distanceFalloff={1} intensity={plan ? 2.5 : preview ? 4.5 : 3.5} color="#2b1e12"
      quality="medium" halfRes depthAwareUpsampling />
    <ToneMapping mode={ToneMappingMode.NEUTRAL} />
  </EffectComposer>;
}
