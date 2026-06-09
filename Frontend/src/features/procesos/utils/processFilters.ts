import type { CreatedProcess } from '../types'

export function filterProcesses(processes: CreatedProcess[], query: string) {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return processes
  return processes.filter((process) =>
    [
      process.clientName,
      process.processName,
      process.location,
      ...process.sensorVariables.map((variable) => variable.name),
    ].some((value) => value.toLowerCase().includes(normalized)),
  )
}

export function formatWeightUnit(unit: CreatedProcess['totalWeightUnit']) {
  return unit === 't' ? 'Tm' : 'kg'
}
