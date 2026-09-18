export default function CanvasPlaceholder({ isDark }: { isDark: boolean }) {
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
