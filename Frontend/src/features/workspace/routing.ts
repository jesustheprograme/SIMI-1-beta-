import { workspaceNav } from './navigation'

export function currentWorkspacePath() {
  if (window.location.pathname === '/procesos') {
    window.history.replaceState(null, '', '/procesos/procesos-almacenado')
    return '/procesos/procesos-almacenado'
  }

  const validPaths = workspaceNav.flatMap((item) => [
    item.to,
    ...(item.children?.map((child) => child.to) ?? []),
  ])
  if (
    window.location.pathname.startsWith('/procesos/') ||
    window.location.pathname.startsWith('/historial/procesos/')
  ) {
    return window.location.pathname
  }

  return validPaths.includes(window.location.pathname) ? window.location.pathname : '/dashboard'
}
