import { Color } from 'three'

export const DEFAULT_BLOOM_COLOR = '#facc15'

/** Leva color control may return a hex string or `{ r, g, b }`. */
export function normalizeBloomColor(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (value && typeof value === 'object' && 'r' in value && 'g' in value && 'b' in value) {
    const { r, g, b } = value as { r: number; g: number; b: number }
    const color = new Color()
    if (r > 1 || g > 1 || b > 1) {
      color.setRGB(r / 255, g / 255, b / 255)
    } else {
      color.setRGB(r, g, b)
    }
    return `#${color.getHexString()}`
  }
  return DEFAULT_BLOOM_COLOR
}

function colorToRgba(color: Color, alpha: number) {
  const r = Math.round(color.r * 255)
  const g = Math.round(color.g * 255)
  const b = Math.round(color.b * 255)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/** CSS radial gradient for BloomDomGlow, matched to canvas emissive / bloom. */
export function bloomColorToDomGradient(colorHex: string, isDark: boolean) {
  const base = new Color(colorHex)
  const bright = base.clone()
  const inner = base.clone().multiplyScalar(0.92)

  if (isDark) {
    return `radial-gradient(circle, ${colorToRgba(bright, 0.55)} 0%, ${colorToRgba(bright, 0.22)} 38%, transparent var(--glow-falloff, 72%))`
  }

  return `radial-gradient(circle, ${colorToRgba(inner, 0.92)} 0%, ${colorToRgba(bright, 0.5)} 32%, ${colorToRgba(bright, 0.18)} 55%, transparent var(--glow-falloff, 78%))`
}

/** Maps postprocessing bloom radius (0–1) to CSS glow size / blur on the panel. */
export function bloomRadiusToDomCss(
  radius: number,
  containerWidth: number,
  containerHeight: number,
  isDark: boolean,
) {
  const minDim = Math.min(containerWidth, containerHeight)
  const clamped = Math.min(1, Math.max(0, radius))
  const lightBoost = isDark ? 1 : 1.18

  const size = minDim * (0.1 + clamped * 0.42) * lightBoost
  const blur = minDim * (0.012 + clamped * 0.082) * lightBoost
  const falloff = (isDark ? 52 : 58) + clamped * 22

  return { size, blur, falloff }
}

/** Default Leva bloom intensity on WebGL routes (SelectiveBloom). */
export const BLOOM_INTENSITY_REFERENCE_WEBGL = 1.35

/** Default Leva bloom intensity on WebGPU routes (TSL BloomNode). */
export const BLOOM_INTENSITY_REFERENCE_WEBGPU = 0.135

export function bloomIntensityToDomOpacity(
  intensity: number,
  isDark: boolean,
  referenceIntensity = BLOOM_INTENSITY_REFERENCE_WEBGL,
) {
  const normalized = intensity / referenceIntensity
  return Math.min(1, normalized * (isDark ? 0.92 : 1.12))
}
