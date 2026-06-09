import type { User } from '../../features/auth/types'
import type { CreatedSensorGroup } from '../../features/telemetria'
import type { PlanoLocationZone } from '../../features/plano'
import type { CreatedProcess } from '../../features/procesos'
import { MenuIcon } from '../../features/workspace/icons'
import { GlobalSearch } from '../../features/workspace/search/GlobalSearch'
import { HeaderActions } from './HeaderActions'

type Props = {
  collapsed: boolean
  groups: CreatedSensorGroup[]
  initials: string
  onLogout: () => void
  onNavigate: (path: string) => void
  onToggleSidebar: () => void
  processes: CreatedProcess[]
  user: User
  zones: PlanoLocationZone[]
}

export function DashboardHeader({
  collapsed,
  groups,
  initials,
  onLogout,
  onNavigate,
  onToggleSidebar,
  processes,
  user,
  zones,
}: Props) {
  return (
    <header className="dashboard-header">
      <button
        aria-label={collapsed ? 'Mostrar menu lateral' : 'Ocultar menu lateral'}
        className="menu-button"
        onClick={onToggleSidebar}
        type="button"
      >
        <MenuIcon />
      </button>
      <button
        aria-label="Ir al dashboard"
        className="dashboard-header-brand"
        onClick={() => onNavigate('/dashboard')}
        type="button"
      >
        <img src="/logo-img.png" alt="INKACROPS" className="dashboard-brand-logo" />
      </button>
      <GlobalSearch groups={groups} onNavigate={onNavigate} processes={processes} zones={zones} />
      <HeaderActions initials={initials} onLogout={onLogout} user={user} />
    </header>
  )
}
