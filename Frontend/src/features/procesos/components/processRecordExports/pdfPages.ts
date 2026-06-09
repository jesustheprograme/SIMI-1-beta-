import type { CreatedProcess } from '../../types'
import { buildExportRecordTable } from './rows'
import { addChartPages } from './pdfChartPages'
import { addErrorPages } from './pdfErrorPages'
import { addRecordTablePages } from './pdfRecordTablePages'
import { addReportPage } from './pdfReportPage'
import { createPdfWriter } from './pdfWriter'
import { toPdfText } from './text'
import type { ExportErrorRow, ExportRecordRow, PdfImage } from './types'

// Orquesta el orden del reporte completo sin conocer detalles internos de cada seccion.
export function buildPdfPageStreams(
  process: CreatedProcess,
  rows: ExportRecordRow[],
  errorRows: ExportErrorRow[],
  logCount: number,
  logo: PdfImage | null,
) {
  const writer = createPdfWriter(logo)
  const readingRowCount = rows.filter((row) => row.hasReading).length
  const recordTable = buildExportRecordTable(rows)

  addReportPage(writer, process)

  if (rows.length > 0) {
    addChartPages(writer, rows, readingRowCount)
    addErrorPages(writer, errorRows, logCount)
    addRecordTablePages(writer, recordTable.columns, recordTable.rows, logCount, readingRowCount)
  }

  return writer.pages.map((page, index) => {
    page.push(`0.45 0.50 0.58 rg BT /F1 7 Tf 36 20 Td ${toPdfText(`JEPKOM S&P - Pagina ${index + 1} de ${writer.pages.length}`)} Tj ET`)
    return page.join('\n')
  })
}
