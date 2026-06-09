import type { ExportRecordTableColumn, ExportRecordTableRow } from './types'

const TABLE_WIDTH = 770

// Calcula anchos compactos para que las columnas queden mas cercanas en el PDF.
export function getPdfRecordTableLayout(columns: ExportRecordTableColumn[]) {
  const baseColumns = [
    { id: 'record', label: 'ID', width: 30 },
    { id: 'date', label: 'Fecha', width: 48 },
    { id: 'time', label: 'Hora', width: 36 },
    { id: 'group', label: 'Grupo / Origen', width: 92 },
  ]
  const baseWidth = baseColumns.reduce((total, column) => total + column.width, 0)
  const errorColumn = columns.find((column) => column.id === 'error')
  const sensorColumns = columns.filter((column) => column.id !== 'error')
  const errorWidth = errorColumn ? 220 : 0
  const sensorWidth = sensorColumns.length > 0 ? (TABLE_WIDTH - baseWidth - errorWidth) / sensorColumns.length : 0
  let x = 36
  let dynamicX = 36 + baseWidth
  const dynamicColumns = sensorColumns.map((column) => {
    const layoutColumn = { ...column, width: sensorWidth, x: dynamicX }
    dynamicX += sensorWidth
    return layoutColumn
  })

  if (errorColumn) dynamicColumns.push({ ...errorColumn, width: errorWidth, x: dynamicX })

  return [
    ...baseColumns.map((column) => {
      const layoutColumn = { ...column, x }
      x += column.width
      return layoutColumn
    }),
    ...dynamicColumns,
  ].map((column) => ({
    ...column,
    fontSize: columns.length > 8 && !baseColumns.some((item) => item.id === column.id) ? 6.4 : 7,
    maxChars: Math.max(4, Math.floor(column.width / (column.id === 'error' ? 3.1 : 4.6))),
  }))
}

export function getPdfRecordTableCellValue(row: ExportRecordTableRow, columnId: string) {
  if (columnId === 'record') return row.record
  if (columnId === 'date') return row.date
  if (columnId === 'time') return row.time
  if (columnId === 'group') return row.group

  return row.values[columnId] ?? ''
}

// PDF no tiene text-align; calculamos una X aproximada para centrar cada valor.
export function getPdfCenteredTextX(
  column: ReturnType<typeof getPdfRecordTableLayout>[number],
  value: string | number,
) {
  const text = String(value)
  const estimatedTextWidth = text.length * column.fontSize * 0.48
  const centeredX = column.x + (column.width - estimatedTextWidth) / 2

  return Math.max(column.x + 2, centeredX)
}
