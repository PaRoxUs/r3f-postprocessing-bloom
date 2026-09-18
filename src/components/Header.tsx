import { Link } from '@tanstack/react-router'

export default function Header() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex items-center gap-6 py-3 text-sm font-semibold">
        <Link to="/" className="text-[var(--sea-ink)] no-underline">
          R3F Bloom
        </Link>
        <Link
          to="/"
          className="nav-link"
          activeOptions={{ exact: true }}
          activeProps={{ className: 'nav-link is-active' }}
        >
          Bloom + CSS
        </Link>
        <Link
          to="/bloom-webgl"
          className="nav-link"
          activeProps={{ className: 'nav-link is-active' }}
        >
          WebGL
        </Link>
      </nav>
    </header>
  )
}
