import { getPdfCenteredTextX, getPdfRecordTableCellValue, getPdfRecordTableLayout } from './pdfTableLayout'
import { truncatePdfText } from './text'
import type { PdfWriter } from './pdfWriter'
import type { ExportRecordTableColumn, ExportRecordTableRow } from './types'

// Dibuja la tabla principal con columnas dinamicas segun los sensores detectados.
export function addRecordTablePages(
  writer: PdfWriter,
  columns: ExportRecordTableColumn[],
  rows: ExportRecordTableRow[],
  logCount: number,
  readingRowCount: number,
) {
  nextTablePage(writer, columns, logCount, readingRowCount)

  rows.forEach((row, index) => {
    if (writer.getY() < 45) nextTablePage(writer, columns, logCount, readingRowCount)

    const y = writer.getY()
    if (index % 2 === 0) writer.currentPage().push(`0.97 0.98 0.99 rg 36 ${y - 5} 770 18 re f`)

    // El layout se recalcula por pagina/fila para mantener columnas proporcionales al numero de sensores.
    getPdfRecordTableLayout(columns).forEach((column) => {
      const value = getPdfRecordTableCellValue(row, column.id)
      const text = truncatePdfText(value, column.maxChars)
      writer.addText(getPdfCenteredTextX(column, text), y, text, column.fontSize)
    })

    writer.addLine(36, y - 7, 806, y - 7, '0.91 0.92 0.94')
    writer.setY(y - 20)
  })
}

function nextTablePage(
  writer: PdfWriter,
  columns: ExportRecordTableColumn[],
  logCount: number,
  readingRowCount: number,
) {
  writer.newPage()
  writer.addProcessHeader(true)
  writer.addText(36, 485, 'TODOS LOS REGISTROS', 15, 'F2')
  writer.addText(36, 468, `${logCount} registros - ${readingRowCount} lecturas exportadas`, 8)

  writer.currentPage().push('0.05 0.19 0.46 rg 36 438 770 24 re f')
  getPdfRecordTableLayout(columns).forEach((column) => {
    const text = truncatePdfText(column.label, column.maxChars)
    writer.addText(getPdfCenteredTextX(column, text), 446, text, column.fontSize, 'F2', '1 1 1')
  })

  writer.setY(420)
}
