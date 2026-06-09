import { getSensorVariableId as getPlanoVariableId } from '../../../utils/sensorVariableId'
import { fakeSensorsByTitle } from '../../telemetria/data/fakeSensors'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type {
  CreatedProcess,
  ProcessLogEntry,
  ProcessSensorOutlier,
  ProcessSensorReading,
} from '../types'
import { findMatchingReading } from '../utils/readingMatcher'
import { formatProcessDateTime } from '../utils/processDate'
import type { ProcessRecordVariable } from './types'

export function getProcessDetailStatus(process: CreatedProcess, now: number) {
  if (!isProcessExecutable(process)) {
    return {
      label: 'Guardado',
      status: 'idle',
    }
  }

  if (!process.deadlineAt) {
    return {
      label: 'Sin contador',
      status: 'idle',
    }
  }

  const deadline = new Date(process.deadlineAt).getTime()
  if (Number.isNaN(deadline)) {
    return {
      label: 'Sin contador',
      status: 'idle',
    }
  }

  if (deadline <= now) {
    return {
      label: 'Finalizado',
      status: 'danger',
    }
  }

  return {
    label: 'Activo',
    status: 'safe',
  }
}

function isProcessExecutable(process: CreatedProcess) {
  return Boolean(
    process.processName.trim() &&
      process.location.trim() &&
      (process.groupIds.length > 0 || process.sensorVariables.length > 0),
  )
}

export function getProcessInfoItems(process: CreatedProcess) {
  return [
    { label: 'Cliente', value: process.clientName || 'Sin asignar' },
    { label: 'Ubicado', value: process.location || 'Sin asignar' },
    { label: 'Producto', value: process.product || 'Sin definir' },
    { label: 'Pallets', value: process.binCount || '0' },
    { label: 'Peso total', value: process.totalWeight ? `${process.totalWeight} ${formatWeightUnit(process.totalWeightUnit)}` : 'Sin definir' },
    { label: 'Origen', value: process.origin || 'Sin definir' },
    { label: 'Destino', value: process.destination || 'Sin definir' },
    { label: 'Inicio', value: formatProcessDate(process.createdAt) },
    { label: 'Final', value: process.deadlineAt ? formatProcessDate(process.deadlineAt) : 'Sin final' },
    { label: 'Duracion', value: process.duration || getProcessDurationLabel(process.createdAt, process.deadlineAt) },
    { label: 'Intervalo de lectura', value: `${process.readingIntervalSeconds || 5}s` },
    { label: 'Operador inicial', value: process.initialOperator || 'Sin asignar' },
    { label: 'Operador final', value: process.finalOperator || 'Sin asignar' },
    { label: 'Observacion final', value: process.finalObservation || 'Sin observacion', wide: true },
  ]
}

function formatProcessDate(value?: string) {
  return formatProcessDateTime(value)
}

function getProcessDurationLabel(startAt?: string, endAt?: string) {
  if (!startAt || !endAt) return 'Sin final'

  const startTime = new Date(startAt).getTime()
  const endTime = new Date(endAt).getTime()

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 'Sin final'

  const totalMinutes = Math.max(0, Math.round((endTime - startTime) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h ${minutes.toString().padStart(2, '0')}m`
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  return `${minutes}m`
}

function formatWeightUnit(unit: CreatedProcess['totalWeightUnit']) {
  return unit === 't' ? 'Tm' : 'kg'
}

export function getRecordDisplayId(entry: ProcessLogEntry, logs: ProcessLogEntry[], knownIndex = logs.findIndex((item) => item.id === entry.id)) {
  return String(entry.recordNumber ?? logs.length - knownIndex)
}

export function getRecordSortableId(entry: ProcessLogEntry, logs: ProcessLogEntry[]) {
  const recordId = Number(getRecordDisplayId(entry, logs))
  return Number.isFinite(recordId) ? recordId : 0
}

export function getRecordReadingsByVariable(entry: ProcessLogEntry, variables: ProcessRecordVariable[]) {
  return new Map(
    variables.flatMap((variable) => {
      const reading = findMatchingReading(entry.readings, variable)

      return reading ? [[variable.id, reading]] : []
    }),
  )
}

export function getAllVariables(process: CreatedProcess, groups: CreatedSensorGroup[]) {
  const variablesMap = new Map<string, { id: string; name: string }>()

  for (const groupId of process.groupIds) {
    const group = groups.find((item) => item.id === groupId)

    if (!group) continue

    for (const [index, variableName] of group.variables.entries()) {
      const id = group.variableIds?.[index] ?? getPlanoVariableId(group.id, variableName)

      if (!variablesMap.has(id)) {
        variablesMap.set(id, {
          id,
          name: `${variableName}`,
        })
      }
    }
  }

  for (const variable of process.sensorVariables) {
    if (!variablesMap.has(variable.id)) {
      variablesMap.set(variable.id, {
        id: variable.id,
        name: variable.name,
      })
    }
  }

  return Array.from(variablesMap.values())
}

export function getRecordDetails(
  entry: ProcessLogEntry,
  process: CreatedProcess,
  groups: CreatedSensorGroup[],
) {
  const sections: {
    id: string
    items: ProcessSensorReading[]
    title: string
  }[] = []

  for (const groupId of process.groupIds) {
    const group = groups.find((item) => item.id === groupId)

    if (!group) continue

    sections.push({
      id: group.id,
      title: group.name,
      items: group.variables
        .map((variableName, index) => {
          const variableId = group.variableIds?.[index] ?? getPlanoVariableId(group.id, variableName)

          return findMatchingReading(entry.readings, { id: variableId, name: variableName, sensorTitle: group.sensorTitle })
        })
        .filter((reading): reading is ProcessSensorReading => Boolean(reading)),
    })
  }

  if (process.sensorVariables.length > 0) {
    sections.push({
      id: 'individual-variables',
      title: 'Variables individuales',
      items: process.sensorVariables
        .map((variable) =>
          findMatchingReading(entry.readings, variable),
        )
        .filter((reading): reading is ProcessSensorReading => Boolean(reading)),
    })
  }

  return sections.filter((section) => section.items.length > 0)
}


export function getReadingObservation(reading: ProcessSensorReading) {
  const value = Number(reading.value)

  if (!Number.isFinite(value)) return 'Dentro del rango'

  const range = getReadingRange(reading)

  if (!range) return 'Dentro del rango'

  if (value < range.min) return 'Superó el valor mínimo'
  if (value > range.max) return 'Superó el valor máximo'

  const span = range.max - range.min
  const edgeZone = span * 0.14

  if (value <= range.min + edgeZone) {
    return 'Cerca de superar el valor mínimo'
  }

  if (value >= range.max - edgeZone) {
    return 'Cerca de superar el valor máximo'
  }

  return 'Dentro del rango'
}

type ReadingOutlierState = {
  direction: 'high' | 'low'
  label: string
}

const ETILENO_RANGE = { min: 0, max: 100 }

export function getReadingOutlierState(
  reading: ProcessSensorReading,
  outliers: ProcessSensorOutlier[],
): ReadingOutlierState | null {
  const matchedOutlier = outliers.find((outlier) => isOutlierForReading(outlier, reading))

  if (matchedOutlier) {
    const direction = getOutlierDirection(
      matchedOutlier.valor,
      matchedOutlier.valor_minimo,
      matchedOutlier.valor_maximo,
      matchedOutlier.observacion,
    )

    if (direction) {
      return {
        direction,
        label: matchedOutlier.observacion || getOutlierLabel(direction),
      }
    }
  }

  const value = Number(reading.value)
  const range = getReadingRange(reading)

  if (!range || !Number.isFinite(value)) return null
  if (value < range.min) return { direction: 'low', label: 'Superó el valor mínimo' }
  if (value > range.max) return { direction: 'high', label: 'Superó el valor máximo' }

  return null
}

function isOutlierForReading(outlier: ProcessSensorOutlier, reading: ProcessSensorReading) {
  // El tipo de sensor (ej. "Sensores Temperatura") agrupa varias columnas; no debe marcar todas.
  const candidates = [outlier.id, outlier.nombre].map(normalizeOutlierMatchValue)
  const readingValues = [reading.id, reading.name].map(normalizeOutlierMatchValue)

  return candidates.some((candidate) => candidate && readingValues.includes(candidate))
}

function getOutlierDirection(
  rawValue: string,
  min: number | null,
  max: number | null,
  observation: string,
): ReadingOutlierState['direction'] | null {
  const value = Number(rawValue)

  if (Number.isFinite(value)) {
    if (typeof min === 'number' && value < min) return 'low'
    if (typeof max === 'number' && value > max) return 'high'
  }

  const normalizedObservation = normalizeOutlierMatchValue(observation)
  if (normalizedObservation.includes('min')) return 'low'
  if (normalizedObservation.includes('max')) return 'high'

  return null
}

function getOutlierLabel(direction: ReadingOutlierState['direction']) {
  return direction === 'low' ? 'Superó el valor mínimo' : 'Superó el valor máximo'
}

function normalizeOutlierMatchValue(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function getReadingRange(reading: ProcessSensorReading) {
  const sensorType = getSensorTypeFromReading(reading)
  const baseSensor = getBaseSensorForReading(reading)
  if (baseSensor) {
    const min = Number(baseSensor.min)
    const max = Number(baseSensor.max)
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max }
  }

  if (sensorType === 'etileno') return ETILENO_RANGE
  if (sensorType === 'co2') return { min: 300, max: 600 }
  if (reading.unit === '%') return { min: 25, max: 85 }
  if (reading.unit === 'C') return { min: -5, max: 45 }

  return null
}

function getBaseSensorForReading(reading: ProcessSensorReading) {
  const sensors = fakeSensorsByTitle[reading.sensorTitle] ?? []
  const sensorId = getSensorId(reading.id)

  return sensors.find((sensor) => sensor.id.toLowerCase() === sensorId.toLowerCase()) ?? null
}

function getSensorId(value: string) {
  return value.split('::').at(-1)?.trim() ?? value.trim()
}

function getSensorTypeFromReading(reading: Pick<ProcessSensorReading, 'name' | 'sensorTitle'>) {
  const normalizedText = `${reading.sensorTitle} ${reading.name}`.trim().toLowerCase()
  if (normalizedText.includes('etileno') || normalizedText.includes('etn')) {
    return 'etileno'
  }
  if (normalizedText.includes('co2')) return 'co2'
  if (normalizedText.includes('humedad')) return 'humidity'
  return 'temperature'
}

// ------------------------------------------------------------
// Iconos SVG
// ------------------------------------------------------------
