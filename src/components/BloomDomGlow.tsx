import { forwardRef } from 'react'
import { bloomColorToDomGradient, DEFAULT_BLOOM_COLOR } from '../lib/bloomDomSync'

type BloomDomGlowProps = {
  isDark: boolean
}

const BloomDomGlow = forwardRef<HTMLDivElement, BloomDomGlowProps>(function BloomDomGlow(
  { isDark },
  ref,
) {
  const fallbackGradient = bloomColorToDomGradient(DEFAULT_BLOOM_COLOR, isDark)

  return (
    <div
      ref={ref}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 ease-out"
    >
      <div
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full will-change-[left,top,opacity,filter,width,height]"
        style={
          {
            left: 'var(--glow-x, 50%)',
            top: 'var(--glow-y, 50%)',
            width: 'var(--glow-size, 280px)',
            height: 'var(--glow-size, 280px)',
            filter: 'blur(var(--glow-blur, 48px))',
            background: 'var(--glow-gradient)',
            ['--glow-gradient']: fallbackGradient,
          } as React.CSSProperties
        }
      />
    </div>
  )
})

export default BloomDomGlow
