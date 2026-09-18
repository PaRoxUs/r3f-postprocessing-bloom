import { ClientOnly } from '@tanstack/react-router'
import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useCallback, useState } from 'react'
import BloomThemeSwitcher from '../components/BloomThemeSwitcher'

const BloomScene = lazy(() => import('../components/BloomScene'))

export const Route = createFileRoute('/bloom-webgl')({
  component: BloomWebglPage,
})

function BloomWebglPage() {
  const [isDark, setIsDark] = useState(false)
  const onThemeChange = useCallback((theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark')
  }, [])

  return (
    <main className="demo-page demo-page-wide px-4 pb-10 pt-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="island-kicker mb-2">React Three Fiber</p>
          <h1 className="demo-title">WebGL bloom only</h1>
          <p className="demo-muted mt-3 max-w-xl text-sm sm:text-base">
            Same selective postprocessing bloom demo without the CSS panel glow.
            Hover the boxes and tune the effect in Leva.
          </p>
        </div>
        <BloomThemeSwitcher onThemeChange={onThemeChange} />
      </div>

      <section
        className="demo-panel overflow-hidden p-0 dark:border-teal-900/40 dark:bg-slate-950/40"
        aria-label="Bloom canvas"
      >
        <div className="h-[min(70vh,520px)] w-full">
          <ClientOnly fallback={<CanvasPlaceholder isDark={isDark} />}>
            <Suspense fallback={<CanvasPlaceholder isDark={isDark} />}>
              <BloomScene isDark={isDark} />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      <p className="demo-muted mt-4 text-center text-xs sm:text-sm">
        Drag to orbit ·{' '}
        <a href="/bloom" className="font-semibold no-underline">
          Compare with CSS glow version
        </a>
      </p>
    </main>
  )
}

function CanvasPlaceholder({ isDark }: { isDark: boolean }) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center bg-transparent text-sm font-medium ${
        isDark ? 'text-slate-400' : 'text-slate-600'
      }`}
    >
      Loading canvas…
    </div>
  )
}
