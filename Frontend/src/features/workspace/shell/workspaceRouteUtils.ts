import type { CreatedProcess } from '../../procesos'

export function getSelectedProcess(pathname: string, processes: CreatedProcess[]) {
  const prefix = pathname.startsWith('/historial/procesos/') ? '/historial/procesos/' : '/procesos/'
  const id = pathname.startsWith(prefix) ? decodeURIComponent(pathname.replace(prefix, '')) : ''
  return processes.find((process) => process.id === id)
}
