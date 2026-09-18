/** Maps postprocessing bloom radius (0–1) to CSS glow size / blur on the panel. */
export function bloomRadiusToDomCss(
  radius: number,
  containerWidth: number,
  containerHeight: number,
) {
  const minDim = Math.min(containerWidth, containerHeight)
  const clamped = Math.min(1, Math.max(0, radius))

  // Tuned so radius ≈ 0.85 matches the previous fixed ~280px spot + ~48px blur.
  const size = minDim * (0.1 + clamped * 0.42)
  const blur = minDim * (0.012 + clamped * 0.082)
  const falloff = 52 + clamped * 22

  return { size, blur, falloff }
}
