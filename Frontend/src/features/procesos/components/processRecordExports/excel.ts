import type { CreatedProcess } from '../../types'
import { buildExportRecordTable } from './rows'
import { downloadBlob } from './download'
import { escapeHtml, slugify } from './text'
import type { ExportRecordRow, ExportRecordTableColumn, ExportRecordTableRow } from './types'

// Excel consume HTML porque el navegador descarga el archivo como .xls compatible con hojas de calculo.
export function downloadRecordsExcel(process: CreatedProcess, rowsSource: ExportRecordRow[], logCount: number) {
  const { columns, rows } = buildExportRecordTable(rowsSource)
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, sans-serif; color: #111827; }
    h1 { margin: 0 0 4px; font-size: 22px; }
    p { margin: 0 0 16px; color: #4b5563; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #111827; color: #ffffff; font-weight: 700; }
    th, td { border: 1px solid #d1d5db; padding: 8px; font-size: 12px; text-align: center; }
    tbody tr:nth-child(even) { background: #f9fafb; }
  </style>
</head>
<body>
  <h1>${escapeHtml(process.processName)}</h1>
  <p>Cliente: ${escapeHtml(process.clientName || 'Cliente sin asignar')} - Ubicación: ${escapeHtml(
    process.location || 'Ubicación sin asignar',
  )} - ${logCount} registros</p>
  ${buildRecordsTableHtml(rows, columns)}
</body>
</html>`

  downloadBlob(
    new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }),
    `${slugify(process.processName)}-registros.xls`,
  )
}

// Replica la tabla pivoteada del PDF: ID/fecha/hora/origen y una columna por sensor.
function buildRecordsTableHtml(rows: ExportRecordTableRow[], columns: ExportRecordTableColumn[]) {
  if (rows.length === 0) return '<p>No hay lecturas registradas para exportar.</p>'

  return `<table>
    <thead>
      <tr>
        <th>ID</th>
        <th>Fecha</th>
        <th>Hora</th>
        <th>Grupo / Origen</th>
        ${columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (row) => `<tr>
            <td>${row.record}</td>
            <td>${escapeHtml(row.date)}</td>
            <td>${escapeHtml(row.time)}</td>
            <td>${escapeHtml(row.group)}</td>
            ${columns.map((column) => `<td>${escapeHtml(row.values[column.id] ?? '')}</td>`).join('')}
          </tr>`,
        )
        .join('')}
    </tbody>
  </table>`
}
