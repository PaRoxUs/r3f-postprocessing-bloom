import { ClientOnly, createFileRoute, Link } from '@tanstack/react-router'
import { lazy, Suspense, useCallback, useState } from 'react'
import BloomThemeSwitcher from '../components/BloomThemeSwitcher'
import CanvasPlaceholder from '../components/CanvasPlaceholder'

const BloomSceneWebGpu = lazy(() => import('../components/BloomSceneWebGpu'))

export const Route = createFileRoute('/bloom-webgpu-canvas')({
  component: BloomWebgpuCanvasPage,
})

function BloomWebgpuCanvasPage() {
  const [isDark, setIsDark] = useState(false)
  const onThemeChange = useCallback((theme: 'light' | 'dark') => {
    setIsDark(theme === 'dark')
  }, [])

  return (
    <main className="demo-page demo-page-wide px-4 pb-10 pt-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="island-kicker mb-2">WebGPU · TSL bloom</p>
          <h1 className="demo-title">WebGPU bloom only</h1>
          <p className="demo-muted mt-3 max-w-xl text-sm sm:text-base">
            Same WebGPU bloom pipeline without the CSS panel glow.
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
              <BloomSceneWebGpu isDark={isDark} />
            </Suspense>
          </ClientOnly>
        </div>
      </section>

      <p className="demo-muted mt-4 text-center text-xs sm:text-sm">
        Drag to orbit ·{' '}
        <Link to="/bloom-webgpu" className="font-semibold no-underline">
          Bloom with CSS glow
        </Link>
      </p>
    </main>
  )
}
