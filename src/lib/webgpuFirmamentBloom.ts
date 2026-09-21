import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { ACESFilmicToneMapping, Color, SRGBColorSpace, type Scene } from 'three'
import {
  add,
  float,
  lessThan,
  luminance,
  max,
  mix,
  mul,
  renderOutput,
  smoothstep,
  vec4,
} from 'three/tsl'

/** Linear depth at the far plane (cleared pixels with no solid coverage). */
const BACKDROP_CLEAR_DEPTH = float(1)
/** After ACES — dark backdrop (starfield / dark page). */
const VOID_BLACK_LUMA_DARK = float(0.14)
const VOID_GLOW_LUMA_DARK = float(0.48)
/** Light page chrome: higher floor — dim ACES tail must not read as a gray veil. */
const VOID_BLACK_LUMA_LIGHT = float(0.24)
const VOID_GLOW_LUMA_LIGHT = float(0.52)

const OPAQUE_PLATE_CLEAR = new Color(0, 0, 0)

export type WebGpuBloomParams = {
  intensity: number
  radius: number
  luminanceThreshold: number
  luminanceSmoothing: number
}

type ScenePassNode = {
  getTextureNode: (name?: string) => unknown
  getLinearDepthNode: (name?: string) => unknown
}

type RenderPipelineNode = {
  outputNode: unknown
  needsUpdate: boolean
  outputColorTransform: boolean
}

type RendererWithClear = {
  setClearColor: (color: Color | number, alpha: number) => void
  domElement: HTMLCanvasElement
}

/** Opaque black HDR plate on WebGPU; alpha-0 clear on WebGL fallback (page under). */
export function applyWebGpuChartClear(
  renderer: RendererWithClear,
  scene: Scene,
  isLegacy: boolean,
  domElement: HTMLCanvasElement = renderer.domElement,
) {
  scene.background = null
  domElement.style.background = 'transparent'
  if (isLegacy) {
    renderer.setClearColor(OPAQUE_PLATE_CLEAR, 0)
  } else {
    renderer.setClearColor(OPAQUE_PLATE_CLEAR, 1)
  }
}

function createBloomPass(bloomSource: unknown, settings: WebGpuBloomParams) {
  const bloomPass = bloom(
    bloomSource as never,
    settings.intensity,
    settings.radius,
    settings.luminanceThreshold,
  )
  bloomPass.smoothWidth.value = settings.luminanceSmoothing
  return bloomPass
}

/**
 * Firmament overlay: bloom on an opaque HDR plate, then make black transparent.
 * Solid coverage stays opaque. Void near-black is alpha 0. Bright halo is
 * premultiplied so it composites over the backdrop without a dark veil.
 */
export function applyFirmamentOverlayOutput(
  renderPipeline: RenderPipelineNode,
  scenePass: ScenePassNode,
  bloomEnabled: boolean,
  strictTransparentVoid: boolean,
  bloomSettings: WebGpuBloomParams,
  lightBackdrop = false,
) {
  const sceneTexture = scenePass.getTextureNode('output') as {
    rgb: never
  }
  const coverage = float(
    lessThan(scenePass.getLinearDepthNode('depth') as never, BACKDROP_CLEAR_DEPTH) as never,
  )

  renderPipeline.outputColorTransform = false

  const bloomSource = bloomEnabled ? (scenePass.getTextureNode('emissive') as unknown) : null
  const bloomPass =
    bloomEnabled && bloomSource ? createBloomPass(bloomSource, bloomSettings) : null
  const plateRgb = bloomPass
    ? (
        add(sceneTexture as never, bloomPass as never) as unknown as {
          rgb: never
        }
      ).rgb
    : sceneTexture.rgb

  const plate = renderOutput(
    vec4(plateRgb, float(1)),
    ACESFilmicToneMapping,
    SRGBColorSpace,
  ) as unknown as { rgb: never }

  const voidBlack = lightBackdrop ? VOID_BLACK_LUMA_LIGHT : VOID_BLACK_LUMA_DARK
  const voidGlow = lightBackdrop ? VOID_GLOW_LUMA_LIGHT : VOID_GLOW_LUMA_DARK
  const plateLuma = luminance(plate.rgb as never)
  const glowAlphaLinear = smoothstep(voidBlack, voidGlow, plateLuma)
  // Void on light backdrops: square alpha so dim premultiplied tails do not darken the page.
  const glowAlphaVoid = lightBackdrop
    ? mul(glowAlphaLinear, glowAlphaLinear)
    : glowAlphaLinear
  const glowAlpha = mix(glowAlphaVoid, glowAlphaLinear, coverage)
  const alpha = strictTransparentVoid
    ? mul(coverage, max(float(1), glowAlpha))
    : max(coverage, glowAlpha)
  const rgbScale = strictTransparentVoid ? coverage : mix(glowAlpha, float(1), coverage)
  renderPipeline.outputNode = vec4(mul(plate.rgb as never, rgbScale as never) as never, alpha)
}

export function applyWebGpuBloomOutput(
  renderPipeline: RenderPipelineNode,
  scenePass: ScenePassNode,
  bloomEnabled: boolean,
  transparentBackdrop: boolean,
  strictTransparentVoid: boolean,
  bloomSettings: WebGpuBloomParams,
  lightBackdrop = false,
) {
  if (transparentBackdrop) {
    applyFirmamentOverlayOutput(
      renderPipeline,
      scenePass,
      bloomEnabled,
      strictTransparentVoid,
      bloomSettings,
      lightBackdrop,
    )
    renderPipeline.needsUpdate = true
    return
  }

  renderPipeline.outputColorTransform = true
  const sceneTexture = scenePass.getTextureNode('output')
  if (bloomEnabled) {
    const bloomSource = scenePass.getTextureNode('emissive')
    const bloomPass = createBloomPass(bloomSource, bloomSettings)
    renderPipeline.outputNode = add(sceneTexture as never, bloomPass as never)
  } else {
    renderPipeline.outputNode = sceneTexture
  }
  renderPipeline.needsUpdate = true
}
