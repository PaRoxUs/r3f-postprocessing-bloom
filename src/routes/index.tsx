import { ClientOnly } from '@tanstack/react-router'
import { createFileRoute, Link } from '@tanstack/react-router'
import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import BloomDomGlow from '../components/BloomDomGlow'
import BloomThemeSwitcher from '../components/BloomThemeSwitcher'
import CanvasPlaceholder from '../components/CanvasPlaceholder'

const BloomScene = lazy(() => import('../components/BloomScene'))

export const Route = createFileRoute('/')({
  component: BloomPage,
})

function BloomPage() {
  const [isDark, setIsDark] = useState(false)
  const domGlowRef = useRef<HTMLDivElement>(null)
  const onThemeChange = useCallback((theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark')
  }, [])

  return (
    <main className="demo-page demo-page-wide px-4 pb-10 pt-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="island-kicker mb-2">React Three Fiber</p>
          <h1 className="demo-title">Postprocessing bloom</h1>
          <p className="demo-muted mt-3 max-w-xl text-sm sm:text-base">
            Selective bloom on hover with a CSS glow on the panel behind the
            active box. Tune the effect in Leva.
          </p>
        </div>
        <BloomThemeSwitcher onThemeChange={onThemeChange} />
      </div>

      <section
        className="demo-panel overflow-hidden bg-white p-0 dark:border-teal-900/40 dark:bg-slate-950/40"
        aria-label="Bloom canvas"
      >
        <div className="relative isolate h-[min(70vh,520px)] w-full">
          <BloomDomGlow ref={domGlowRef} isDark={isDark} />
          <div className="absolute inset-0 z-[1]">
            <ClientOnly fallback={<CanvasPlaceholder isDark={isDark} />}>
              <Suspense fallback={<CanvasPlaceholder isDark={isDark} />}>
                <BloomScene isDark={isDark} domGlowRef={domGlowRef} />
              </Suspense>
            </ClientOnly>
          </div>
        </div>
      </section>

      <p className="demo-muted mt-4 text-center text-xs sm:text-sm">
        Drag to orbit ·{' '}
        <Link to="/bloom-webgl" className="font-semibold no-underline">
          WebGL-only version
        </Link>
      </p>
    </main>
  )
}
