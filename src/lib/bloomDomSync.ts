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

export function bloomIntensityToDomOpacity(intensity: number, isDark: boolean) {
  const normalized = intensity / 1.35
  return Math.min(1, normalized * (isDark ? 0.92 : 1.12))
}
