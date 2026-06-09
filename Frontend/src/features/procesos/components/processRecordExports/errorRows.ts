import type { CreatedSensorGroup } from '../../../telemetria/types/groups'
import type { CreatedProcess, ProcessLogEntry } from '../../types'
import { formatProcessDateOnly, formatProcessTimeOnly } from '../../utils/processDate'
import { createExportGroupResolver, UNASSOCIATED_GROUP } from './groupResolver'
import { getSensorMatchKeys } from './sensorCodes'
import type { ExportErrorRow, ExportRecordRow } from './types'

// Extrae las lecturas fuera de rango y les asigna el grupo/origen real del sensor.
export function getExportErrorRows(
  logs: ProcessLogEntry[],
  recordRows: ExportRecordRow[] = [],
  process?: CreatedProcess,
  groups: CreatedSensorGroup[] = [],
): ExportErrorRow[] {
  const resolveGroup = process ? createExportGroupResolver(process, groups) : undefined

  return logs.flatMap((entry, entryIndex) => {
    const date = formatProcessDateOnly(entry.createdAt)
    const record = Number(entry.recordNumber ?? entryIndex + 1)
    const time = formatProcessTimeOnly(entry.createdAt)

    return (entry.outliers ?? []).map((outlier) => ({
      date,
      group: getOutlierGroup(outlier.id, outlier.nombre, outlier.sensor, entryIndex, recordRows, resolveGroup),
      id: outlier.id,
      observation: outlier.observacion || 'Valor fuera de rango',
      record,
      sensor: outlier.sensor || '-',
      sourceIndex: entryIndex,
      time,
      unit: outlier.unidad || '',
      value: outlier.valor || '-',
      variable: outlier.nombre || outlier.id || 'Variable',
    }))
  })
}

// Los errores siguen el mismo orden visual que los registros: del ID mas antiguo al mas nuevo.
export function getOrderedErrorRows(rows: ExportErrorRow[]) {
  return [...rows].sort(
    (left, right) =>
      left.record - right.record ||
      left.sourceIndex - right.sourceIndex ||
      left.variable.localeCompare(right.variable),
  )
}

function getOutlierGroup(
  id: string,
  name: string,
  sensor: string,
  sourceIndex: number,
  recordRows: ExportRecordRow[],
  resolveGroup?: ReturnType<typeof createExportGroupResolver>,
) {
  const outlierKeys = getSensorMatchKeys({ id, name, sensor, variable: name })
  const recordItems = recordRows.filter((item) => item.sourceIndex === sourceIndex)
  const matchedRows = recordItems.filter((item) => {
    const rowKeys = getSensorMatchKeys(item)
    return outlierKeys.some((key) => rowKeys.includes(key))
  })
  const row = matchedRows.find((item) => item.group !== UNASSOCIATED_GROUP) ?? matchedRows[0]

  if (row?.group && row.group !== UNASSOCIATED_GROUP) return row.group

  const resolvedGroup = resolveGroup?.({ id, name, sensor, variable: name })
  if (resolvedGroup && resolvedGroup !== UNASSOCIATED_GROUP) return resolvedGroup

  const inferredGroup = getSingleRecordGroup(recordItems)
  return inferredGroup || row?.group || 'Sin grupo'
}

function getSingleRecordGroup(recordItems: ExportRecordRow[]) {
  const groups = Array.from(
    new Set(recordItems.map((item) => item.group).filter((group) => group && group !== UNASSOCIATED_GROUP)),
  )

  return groups.length === 1 ? groups[0] : ''
}
