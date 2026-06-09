import type { CreatedSensorGroup } from '../../../telemetria/types/groups'
import type { CreatedProcess, ProcessLogEntry } from '../../types'
import { formatProcessDateOnly, formatProcessTimeOnly } from '../../utils/processDate'
import { getRecordDetails } from '../processDetailHelpers'
import { createExportGroupResolver, UNASSOCIATED_GROUP } from './groupResolver'
import { getShortSensorCode } from './sensorCodes'
import type { ExportRecordRow, ExportRecordTableColumn, ExportRecordTableRow } from './types'

// Convierte cada registro del proceso en filas planas reutilizables por Excel, PDF y graficos.
export function getExportRecordRows(
  process: CreatedProcess,
  groups: CreatedSensorGroup[],
  logs: ProcessLogEntry[],
) {
  const resolveGroup = createExportGroupResolver(process, groups)

  return logs.flatMap((entry, entryIndex) => {
    const date = formatProcessDateOnly(entry.createdAt)
    const record = getExportRecordNumber(entry, entryIndex)
    const time = formatProcessTimeOnly(entry.createdAt)
    const sections = getRecordDetails(entry, process, groups)
    const usedReadingIds = new Set(sections.flatMap((section) => section.items.map((item) => item.id)))
    const extraReadings = entry.readings.filter((reading) => !usedReadingIds.has(reading.id))
    // Las secciones conservan el origen funcional de cada lectura: grupo, proceso o lectura no asociada.
    const rows = sections.flatMap((section) =>
      section.items.map((item) => ({
        date,
        group: section.title,
        hasReading: true,
        id: item.id,
        measure: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
        record,
        sourceIndex: entryIndex,
        sensor: item.sensorTitle,
        time,
        unit: item.unit,
        value: item.value,
        variable: item.name,
      })),
    )

    rows.push(...extraReadings.map((item) => ({
      date,
      group: resolveGroup(item),
      hasReading: true,
      id: item.id,
      measure: `${item.value}${item.unit ? ` ${item.unit}` : ''}`,
      record,
      sensor: item.sensorTitle,
      sourceIndex: entryIndex,
      time,
      unit: item.unit,
      value: item.value,
      variable: item.name,
    })))

    if (rows.length > 0) return rows

    return [{
      date,
      group: 'Sin lecturas asociadas',
      hasReading: false,
      id: '',
      measure: '-',
      record,
      sensor: '-',
      sourceIndex: entryIndex,
      time,
      unit: '',
      value: '-',
      variable: 'Sin lectura',
    }]
  })
}

function getExportRecordNumber(entry: ProcessLogEntry, fallbackIndex: number) {
  return Number(entry.recordNumber ?? fallbackIndex + 1)
}

// Orden estable del historial: ID ascendente, y luego posicion original si hay empates.
export function getOrderedExportRows(rows: ExportRecordRow[]) {
  return [...rows].sort(
    (left, right) =>
      left.record - right.record ||
      left.sourceIndex - right.sourceIndex ||
      left.variable.localeCompare(right.variable),
  )
}

// Pivotea lecturas: columnas = sensores/variables; filas = una sola medida por registro y grupo.
export function buildExportRecordTable(rows: ExportRecordRow[]) {
  const columns: ExportRecordTableColumn[] = []
  const columnsById = new Map<string, ExportRecordTableColumn>()
  const tableRows = new Map<string, ExportRecordTableRow>()

  getOrderedExportRows(rows).forEach((row) => {
    if (!row.hasReading) {
      // Se conserva una fila vacia para que el PDF indique que el registro existe aunque no tenga lecturas.
      const key = getRecordTableKey(row)
      if (!tableRows.has(key)) {
        tableRows.set(key, {
          date: row.date,
          group: row.group,
          record: row.record,
          sensor: row.sensor,
          sensorNames: [],
          sensorTypes: row.sensor === '-' ? [] : [row.sensor],
          sourceIndex: row.sourceIndex,
          time: row.time,
          values: {},
        })
      }

      return
    }

    // La unidad forma parte del identificador para no mezclar columnas con nombres iguales y unidades distintas.
    const columnId = `${row.variable}|${row.unit}`
    if (!columnsById.has(columnId)) {
      const column = { id: columnId, label: row.variable || `Sensor ${columns.length + 1}` }
      columnsById.set(columnId, column)
      columns.push(column)
    }

    const key = getRecordTableKey(row)
    const tableRow = tableRows.get(key) ?? {
      date: row.date,
      group: row.group,
      record: row.record,
      sensor: '',
      sensorNames: [],
      sensorTypes: [],
      sourceIndex: row.sourceIndex,
      time: row.time,
      values: {},
    }

    addSensorName(tableRow, row)
    addSensorType(tableRow, row.sensor)
    tableRow.values[columnId] = row.measure
    tableRows.set(key, tableRow)
  })

  const rowsWithSensorLabels = Array.from(tableRows.values()).map((row) => ({
    ...row,
    sensor: row.sensor || formatSensorNames(row.sensorNames ?? []) || formatSensorTypes(row.sensorTypes ?? []),
  }))

  return {
    columns,
    rows: rowsWithSensorLabels.sort(
      (left, right) =>
        left.record - right.record ||
        left.sourceIndex - right.sourceIndex ||
        left.group.localeCompare(right.group),
    ),
  }
}

function getRecordTableKey(row: ExportRecordRow) {
  const group = row.group === UNASSOCIATED_GROUP ? row.group : row.group.trim()
  return `${row.record}|${row.date}|${row.time}|${group}|${row.sourceIndex}`
}

function addSensorType(row: ExportRecordTableRow, sensor: string) {
  const type = sensor.replace(/^Sensores\s+/i, '').trim()
  if (!type || row.sensorTypes?.includes(type)) return

  row.sensorTypes = [...(row.sensorTypes ?? []), type]
}

function addSensorName(row: ExportRecordTableRow, reading: ExportRecordRow) {
  const sensorName = getShortSensorCode(reading) || reading.variable.trim()
  if (!sensorName || row.sensorNames?.includes(sensorName)) return

  row.sensorNames = [...(row.sensorNames ?? []), sensorName]
}

function formatSensorNames(sensorNames: string[]) {
  return sensorNames.length === 1 ? sensorNames[0] : sensorNames.join(', ')
}

function formatSensorTypes(sensorTypes: string[]) {
  return sensorTypes.length > 0 ? sensorTypes.join(', ') : '-'
}
