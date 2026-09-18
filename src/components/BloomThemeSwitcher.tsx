import { useEffect, useState } from 'react'

type PageTheme = 'light' | 'dark'

function readPageTheme(): PageTheme {
  if (typeof document === 'undefined') {
    return 'light'
  }

  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

function applyPageTheme(theme: PageTheme) {
  document.documentElement.classList.remove('light', 'dark')
  document.documentElement.classList.add(theme)
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.style.colorScheme = theme
  window.localStorage.setItem('theme', theme)
}

export default function BloomThemeSwitcher({
  onThemeChange,
}: {
  onThemeChange: (theme: PageTheme) => void
}) {
  const [theme, setTheme] = useState<PageTheme>('light')

  useEffect(() => {
    const initial = readPageTheme()
    setTheme(initial)
    onThemeChange(initial)
  }, [onThemeChange])

  function selectTheme(next: PageTheme) {
    setTheme(next)
    applyPageTheme(next)
    onThemeChange(next)
  }

  return (
    <div
      className="inline-flex rounded-full border border-slate-300/80 bg-white/70 p-1 shadow-sm backdrop-blur-sm dark:border-teal-900/50 dark:bg-slate-900/70"
      role="group"
      aria-label="Page theme"
    >
      {(['light', 'dark'] as const).map((mode) => {
        const active = theme === mode
        return (
          <button
            key={mode}
            type="button"
            onClick={() => selectTheme(mode)}
            aria-pressed={active}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize transition ${
              active
                ? 'bg-teal-500 text-white shadow-sm dark:bg-teal-400 dark:text-slate-950'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
            }`}
          >
            {mode}
          </button>
        )
      })}
    </div>
  )
}
