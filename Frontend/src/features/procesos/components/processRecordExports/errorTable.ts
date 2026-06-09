import { getOrderedErrorRows } from './errorRows'
import { getShortSensorCode } from './sensorCodes'
import type { ExportErrorRow, ExportRecordTableColumn, ExportRecordTableRow } from './types'

// Pivotea errores: columnas = sensores con error; la columna Error describe el limite superado.
export function buildExportErrorTable(rows: ExportErrorRow[]) {
  const columns: ExportRecordTableColumn[] = []
  const columnsById = new Map<string, ExportRecordTableColumn>()
  const tableRows = new Map<string, ExportRecordTableRow>()

  getOrderedErrorRows(rows).forEach((row) => {
    const columnId = `${row.variable}|${row.unit}`
    if (!columnsById.has(columnId)) {
      const column = { id: columnId, label: row.variable || `Sensor ${columns.length + 1}` }
      columnsById.set(columnId, column)
      columns.push(column)
    }

    const key = `${row.record}|${row.date}|${row.time}|${row.group}|${row.sourceIndex}`
    const tableRow = tableRows.get(key) ?? {
      date: row.date,
      group: row.group,
      record: row.record,
      sensor: '',
      sensorNames: [],
      sourceIndex: row.sourceIndex,
      time: row.time,
      values: {},
    }
    const value = `${row.value}${row.unit ? ` ${row.unit}` : ''}`
    const error = formatErrorObservation(row.observation)

    tableRow.values[columnId] = value
    addSensorName(tableRow, row)
    tableRow.error = appendUnique(tableRow.error, error)
    tableRow.values.error = tableRow.error
    tableRows.set(key, tableRow)
  })

  const rowsWithSensorLabels = Array.from(tableRows.values()).map((row) => ({
    ...row,
    sensor: row.sensor || formatSensorNames(row.sensorNames ?? []),
  }))

  return {
    columns: [...columns, { id: 'error', label: 'Error' }],
    rows: rowsWithSensorLabels.sort(
      (left, right) => left.record - right.record || left.sourceIndex - right.sourceIndex,
    ),
  }
}

function formatErrorObservation(observation: string) {
  const normalized = observation
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized.includes('min')) return 'Supero limite minimo'
  if (normalized.includes('max')) return 'Supero limite maximo'

  return observation || 'Fuera de rango'
}

function appendUnique(current: string | undefined, next: string) {
  const values = current ? current.split('; ') : []
  return values.includes(next) ? values.join('; ') : [...values, next].join('; ')
}

function addSensorName(row: ExportRecordTableRow, error: ExportErrorRow) {
  const sensorName = getShortSensorCode(error) || error.variable.trim()
  if (!sensorName || row.sensorNames?.includes(sensorName)) return

  row.sensorNames = [...(row.sensorNames ?? []), sensorName]
}

function formatSensorNames(sensorNames: string[]) {
  return sensorNames.length === 1 ? sensorNames[0] : sensorNames.join(', ')
}
