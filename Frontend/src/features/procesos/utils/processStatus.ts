import type { CreatedProcess } from '../types'
import type { ProcessCountdownState } from '../types/view'

export function getCountdown(process: CreatedProcess, now: number): ProcessCountdownState {
  if (!isProcessExecutable(process)) {
    return { detail: 'Proceso incompleto', label: 'Guardado', status: 'idle' }
  }
  if (!process.deadlineAt) {
    return { detail: 'Sin cronometro', label: 'Guardado', status: 'idle' }
  }
  const deadline = new Date(process.deadlineAt).getTime()
  if (Number.isNaN(deadline)) {
    return { detail: 'Hora no valida', label: 'Sin cronometro', status: 'idle' }
  }
  const remaining = deadline - now
  if (remaining <= 0) {
    return { detail: 'Tiempo agotado', label: 'Finalizado', status: 'danger' }
  }
  const totalSeconds = Math.ceil(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const label =
    hours > 0
      ? `${hours}h ${minutes.toString().padStart(2, '0')}m`
      : `${minutes}m ${seconds.toString().padStart(2, '0')}s`

  return {
    detail: 'Tiempo restante',
    label,
    status: remaining <= 30 * 60 * 1000 ? 'danger' : remaining <= 2 * 60 * 60 * 1000 ? 'warning' : 'safe',
  }
}

function isProcessExecutable(process: CreatedProcess) {
  return Boolean(
    process.processName.trim() &&
      process.location.trim() &&
      (process.groupIds.length > 0 || process.sensorVariables.length > 0),
  )
}
