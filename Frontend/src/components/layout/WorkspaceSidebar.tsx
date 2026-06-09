import type { User } from '../../features/auth/types'
import { SignOutIcon } from '../../features/workspace/icons'
import { historyNav, primaryNav, secondaryNav } from '../../features/workspace/navigation'
import { NavButton, SectionLabel } from '../ui'

type Props = {
  collapsed: boolean
  initials: string
  onLogout: () => void
  onNavigate: (path: string) => void
  pathname: string
  user: User
}

export function WorkspaceSidebar({ collapsed, initials, onLogout, onNavigate, pathname, user }: Props) {
  return (
    <aside className="app-sidebar" data-collapsed={collapsed}>
      <nav className="sidebar-nav" aria-label="Workspace navigation">
        <NavSection collapsed={collapsed} items={primaryNav} label="Espacio de trabajo" onNavigate={onNavigate} pathname={pathname} />
        <div className="sidebar-separator" />
        <NavSection collapsed={collapsed} items={historyNav} label="Historial" onNavigate={onNavigate} pathname={pathname} />
        <div className="sidebar-separator" />
        <NavSection collapsed={collapsed} items={secondaryNav} label="Cuenta" onNavigate={onNavigate} pathname={pathname} />
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-profile">
          <span className="sidebar-profile-avatar" aria-hidden="true">{initials}</span>
          <div><strong>{user.name}</strong><span>{user.email}</span></div>
        </div>
        <div className="sidebar-profile-separator" aria-hidden="true" />
        <button className="sidebar-link" onClick={onLogout} title="Cerrar sesion" type="button">
          <SignOutIcon className="sidebar-icon" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  )
}

function NavSection({
  collapsed,
  items,
  label,
  onNavigate,
  pathname,
}: {
  collapsed: boolean
  items: typeof primaryNav
  label: string
  onNavigate: (path: string) => void
  pathname: string
}) {
  return (
    <>
      <SectionLabel collapsed={collapsed} label={label} />
      <ul>
        {items.map((item) => (
          <NavButton key={item.to} collapsed={collapsed} item={item} onNavigate={onNavigate} pathname={pathname} />
        ))}
      </ul>
    </>
  )
}
