import {
  AnalyticsIcon,
  CalendarIcon,
  DashboardIcon,
  ProjectsIcon,
  SettingsIcon,
  SupportIcon,
  TeamIcon,
} from './icons'
import type { NavItem } from './types'

export const primaryNav: NavItem[] = [
  { title: 'Dashboard', to: '/dashboard', icon: DashboardIcon },
  { title: 'Procesos', 
    to: '/procesos', 
    icon: AnalyticsIcon,
    children: [
      { title: 'Procesos Almacenado', to: '/procesos/procesos-almacenado' },
      { title: 'Procesos  Maduracion', to: '/procesos/procesos-maduracion' },
      { title: 'Proceso 3', to: '/procesos/proceso-3' },
    ],
  
  
  },
  {
    title: 'Controladores',
    to: '/controladores',
    icon: ProjectsIcon,
    children: [
      { title: 'Sensores Temperatura', to: '/controladores/sensores-temperatura' },
      { title: 'Sensores Humedad', to: '/controladores/sensores-humedad' },
      { title: 'Sensores co2', to: '/controladores/sensores-co2' },
      { title: 'Sensores Etileno', to: '/controladores/sensores-etileno' },
      { title: 'PLC Jepkom', to: '/controladores/plc-jepkom' },
      { title: 'Lecturas Siemens-s7', to: '/controladores/lecturas-siemens' },
      { title: 'Grupos', to: '/controladores/grupos' },
    ],
  },
  { title: 'Equipo', to: '/equipo', icon: TeamIcon },
  { title: 'Plano', to: '/plano', icon: AnalyticsIcon },
]

export const secondaryNav: NavItem[] = [
  { title: 'Ajustes', to: '/ajustes', icon: SettingsIcon },
  { title: 'Soporte', to: '/soporte', icon: SupportIcon },
]

export const historyNav: NavItem[] = [
  { title: 'Historial de Procesos', to: '/historial/procesos', icon: CalendarIcon },
]

export const workspaceNav = [...primaryNav, ...historyNav, ...secondaryNav]
