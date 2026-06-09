import { useEffect, useRef, useState } from 'react'
import type { User } from '../../features/auth/types'
import {
  BellIcon,
  CalendarIcon,
  ChevronDownIcon,
  DownloadIcon,
  InboxIcon,
  SettingsIcon,
  SignOutIcon,
  SparkIcon,
  TeamIcon,
} from '../../features/workspace/icons'
import {
  HeaderDropdown,
  HeaderMenu,
  type HeaderMenuItem,
  type HeaderMenuName,
} from './HeaderDropdown'

export function HeaderActions({
  initials,
  onLogout,
  user,
}: {
  initials: string
  onLogout: () => void
  user: User
}) {
  const [openMenu, setOpenMenu] = useState<HeaderMenuName | null>(null)
  const actionsRef = useRef<HTMLDivElement>(null)
  const closeAndLogout = () => {
    setOpenMenu(null)
    onLogout()
  }
  const menus: Record<HeaderMenuName, HeaderMenuItem[]> = {
    team: [
      { label: 'Ver miembros', icon: TeamIcon },
      { label: 'Invitar usuario', icon: SparkIcon },
      { label: 'Roles y permisos', icon: SettingsIcon },
    ],
    notifications: [
      { label: 'Proceso actualizado', icon: CalendarIcon },
      { label: 'Sensor fuera de rango', icon: BellIcon },
      { label: 'Nuevo registro generado', icon: SparkIcon },
    ],
    inbox: [
      { label: 'Reporte de produccion listo', icon: DownloadIcon },
      { label: 'Solicitud de mantenimiento', icon: SettingsIcon },
      { label: 'Lecturas exportadas', icon: InboxIcon },
    ],
    profile: [
      { label: 'Mi perfil', icon: TeamIcon },
      { label: 'Configuracion', icon: SettingsIcon },
      { label: 'Preferencias', icon: SparkIcon },
      { label: 'Cerrar sesion', icon: SignOutIcon, danger: true, onClick: closeAndLogout },
    ],
  }

  useEffect(() => {
    const handleOutside = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [])

  function toggle(menu: HeaderMenuName) {
    setOpenMenu((current) => (current === menu ? null : menu))
  }

  return (
    <div className="dashboard-actions" ref={actionsRef}>
      <HeaderDropdown icon={TeamIcon} label="Equipo" menu="team" openMenu={openMenu} items={menus.team} onToggle={toggle} />
      <HeaderDropdown badge="danger" icon={BellIcon} label="Notificaciones" menu="notifications" openMenu={openMenu} items={menus.notifications} onToggle={toggle} />
      <HeaderDropdown badge="success" icon={InboxIcon} label="Bandeja" menu="inbox" openMenu={openMenu} items={menus.inbox} onToggle={toggle} />
      <div className="header-dropdown">
        <button aria-expanded={openMenu === 'profile'} className="profile-button" onClick={() => toggle('profile')} type="button">
          <span className="profile-avatar" aria-hidden="true">{initials}</span>
          <span className="profile-name">{user.name}</span>
          <ChevronDownIcon />
        </button>
        <HeaderMenu items={menus.profile} label="Perfil" open={openMenu === 'profile'} />
      </div>
    </div>
  )
}
