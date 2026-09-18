import { Link } from '@tanstack/react-router'

const links = [
  { to: '/', label: 'Bloom + CSS', exact: true },
  { to: '/bloom-webgl', label: 'WebGL' },
  { to: '/bloom-webgpu', label: 'WebGPU + CSS' },
  { to: '/bloom-webgpu-canvas', label: 'WebGPU' },
] as const

export default function Header() {
  return (
    <header className="border-b border-[var(--line)] bg-[var(--header-bg)] px-4 backdrop-blur-lg">
      <nav className="page-wrap flex flex-wrap items-center gap-x-5 gap-y-2 py-3 text-sm font-semibold">
        <Link to="/" className="text-[var(--sea-ink)] no-underline">
          R3F Bloom
        </Link>
        {links.map(({ to, label, ...rest }) => (
          <Link
            key={to}
            to={to}
            className="nav-link"
            activeOptions={'exact' in rest ? { exact: true } : undefined}
            activeProps={{ className: 'nav-link is-active' }}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
