import type { ProcessLogEntry, ProcessSensorReading } from '../types'
import { getRecordReadingsByVariable } from './processDetailHelpers'
import type {
  ProcessChartRecord,
  ProcessChartVariableCategory,
  ProcessRecordVariable,
} from './types'

const PROCESS_RECORD_CHART_COLOR_PALETTES: Record<ProcessChartVariableCategory['id'], string[]> = {
  temperature: ['#D32F2F', '#F57C00', '#FBC02D'],
  humidity: ['#1976D2', '#0288D1', '#00BCD4'],
  co2: ['#7B1FA2', '#9C27B0', '#BA68C8'],
  etileno: ['#C2410C', '#EA580C', '#FB923C'],
}
const PROCESS_RECORD_CHART_FALLBACK_COLORS = ['#455A64', '#607D8B', '#78909C']
const PROCESS_RECORD_CHART_FILTERS_STORAGE_KEY = 'simi.processRecordChartFilters'

export function getProcessChartRecords(
  records: ProcessLogEntry[],
  sourceLogs: ProcessLogEntry[],
  variables: ProcessRecordVariable[],
): ProcessChartRecord[] {
  return records.map((entry) => {
    return {
      entry,
      recordId: entry.recordNumber ?? sourceLogs.length - sourceLogs.findIndex((item) => item.id === entry.id),
      valuesByVariable: getRecordReadingsByVariable(entry, variables),
    }
  })
}

type ProcessChartFilters = {
  expandedCategoryIds: ProcessChartVariableCategory['id'][]
  selectedVariableIds: string[]
}

export function loadProcessChartFilters(processId: string): ProcessChartFilters {
  try {
    const stored = localStorage.getItem(PROCESS_RECORD_CHART_FILTERS_STORAGE_KEY)
    const filtersByProcess = stored ? JSON.parse(stored) : {}
    const filters = filtersByProcess[processId]

    return {
      expandedCategoryIds: Array.isArray(filters?.expandedCategoryIds)
        ? filters.expandedCategoryIds.filter(isProcessChartCategoryId)
        : [],
      selectedVariableIds: Array.isArray(filters?.selectedVariableIds)
        ? filters.selectedVariableIds.filter((id: unknown): id is string => typeof id === 'string')
        : [],
    }
  } catch {
    return {
      expandedCategoryIds: [],
      selectedVariableIds: [],
    }
  }
}

export function persistProcessChartFilters(processId: string, filters: ProcessChartFilters) {
  try {
    const stored = localStorage.getItem(PROCESS_RECORD_CHART_FILTERS_STORAGE_KEY)
    const filtersByProcess = stored ? JSON.parse(stored) : {}

    localStorage.setItem(
      PROCESS_RECORD_CHART_FILTERS_STORAGE_KEY,
      JSON.stringify({
        ...filtersByProcess,
        [processId]: filters,
      }),
    )
  } catch {
    // Si localStorage no esta disponible, el grafico sigue funcionando sin persistencia.
  }
}

function isProcessChartCategoryId(value: unknown): value is ProcessChartVariableCategory['id'] {
  return value === 'temperature' || value === 'humidity' || value === 'co2' || value === 'etileno'
}

export function getProcessVariableCategories(
  variables: ProcessRecordVariable[],
  records: ProcessChartRecord[],
): ProcessChartVariableCategory[] {
  const categories: ProcessChartVariableCategory[] = [
    { id: 'temperature', label: 'Temperaturas', variables: [] },
    { id: 'humidity', label: 'Humedad', variables: [] },
    { id: 'co2', label: 'CO2', variables: [] },
    { id: 'etileno', label: 'Etileno', variables: [] },
  ]

  for (const variable of variables) {
    const unit = getProcessChartUnit(records, variable.id).toLowerCase()
    const name = variable.name.toLowerCase()

    if (unit === 'c' || name.includes('temp')) {
      categories[0].variables.push(variable)
      continue
    }

    if (unit === '%' || name.includes('humed') || name.includes('humedad')) {
      categories[1].variables.push(variable)
      continue
    }

    if (name.includes('etileno')) {
      categories[3].variables.push(variable)
      continue
    }

    if (unit === 'ppm' || name.includes('co2') || name.includes('carbon')) {
      categories[2].variables.push(variable)
    }
  }

  return categories.filter((category) => category.variables.length > 0)
}

export function getProcessChartColor(
  variableId: string,
  variables: ProcessRecordVariable[],
  chartColorMap?: Map<string, string>,
) {
  const mappedColor = chartColorMap?.get(variableId)
  if (mappedColor) return mappedColor

  const index = Math.max(0, variables.findIndex((variable) => variable.id === variableId))
  return PROCESS_RECORD_CHART_FALLBACK_COLORS[index % PROCESS_RECORD_CHART_FALLBACK_COLORS.length]
}

export function getProcessChartColorMap(categories: ProcessChartVariableCategory[]) {
  const colorMap = new Map<string, string>()

  for (const category of categories) {
    const palette = PROCESS_RECORD_CHART_COLOR_PALETTES[category.id]

    category.variables.forEach((variable, index) => {
      colorMap.set(variable.id, palette[index % palette.length])
    })
  }

  return colorMap
}

export function getProcessChartUnit(records: ProcessChartRecord[], activeVariableId: 'all' | string) {
  if (activeVariableId === 'all') return ''

  for (const record of records) {
    const unit = record.valuesByVariable.get(activeVariableId)?.unit.trim()
    if (unit) return unit
  }

  return ''
}

export function formatProcessAxisTick(value: number, unit: string) {
  const formattedValue = value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
  })

  return unit ? `${formattedValue}\u00A0${unit}` : formattedValue
}

export function getProcessChartSummary(
  records: ProcessChartRecord[],
  variables: ProcessRecordVariable[],
  activeVariableId: 'all' | string,
) {
  const latestRecord = getLatestProcessChartRecord(records)

  if (!latestRecord) {
    return {
      description: 'Esperando registros para construir el grafico',
      kicker: 'Sin datos',
      title: 'Registros de sensores',
      trendClass: 'is-neutral',
      trendLabel: 'Sin tendencia',
      value: '--',
    }
  }

  if (activeVariableId === 'all') {
    return {
      description: 'Pasa el cursor sobre el grafico para ver el registro completo',
      kicker: 'Variables activas',
      title: `${variables.length} variables seleccionadas`,
      trendClass: 'is-neutral',
      trendLabel: `${records.length} registros guardados`,
      value: String(variables.length),
    }
  }

  const activeVariable = variables.find((variable) => variable.id === activeVariableId)
  const latestReading = activeVariable ? latestRecord.valuesByVariable.get(activeVariable.id) : undefined
  const latestValue = latestReading ? formatReadingValue(latestReading) : 'Sin lectura'
  const latestNumericValue = latestReading ? Number(latestReading.value) : Number.NaN
  const previousRecord = records
    .filter((record) => record.entry.id !== latestRecord.entry.id)
    .sort((first, second) => new Date(second.entry.createdAt).getTime() - new Date(first.entry.createdAt).getTime())
    .find((record) => {
      if (!activeVariable) return false

      const reading = record.valuesByVariable.get(activeVariable.id)
      if (!reading) return false

      return Number.isFinite(Number(reading.value))
    })
  const previousReading = activeVariable ? previousRecord?.valuesByVariable.get(activeVariable.id) : undefined
  const previousNumericValue = previousReading ? Number(previousReading.value) : Number.NaN
  const difference =
    Number.isFinite(latestNumericValue) && Number.isFinite(previousNumericValue)
      ? latestNumericValue - previousNumericValue
      : 0
  const trendLabel =
    difference === 0
      ? 'Sin cambio'
      : `${difference > 0 ? '+' : ''}${difference.toFixed(1)}${latestReading?.unit ? ` ${latestReading.unit}` : ''}`

  return {
    description: 'Mostrando una variable para revisar su evolucion por ID',
    kicker: 'Ultimo valor',
    title: activeVariable?.name ?? 'Variable seleccionada',
    trendClass: difference > 0 ? 'is-up' : difference < 0 ? 'is-down' : 'is-neutral',
    trendLabel,
    value: latestValue,
  }
}

export function getLatestProcessChartRecord(records: ProcessChartRecord[]) {
  if (records.length === 0) return null

  return records.reduce((latest, record) => {
    const latestTime = new Date(latest.entry.createdAt).getTime()
    const recordTime = new Date(record.entry.createdAt).getTime()

    return recordTime > latestTime ? record : latest
  }, records[0])
}

export function formatReadingValue(reading: ProcessSensorReading) {
  return `${reading.value}${reading.unit ? ` ${reading.unit}` : ''}`
}
