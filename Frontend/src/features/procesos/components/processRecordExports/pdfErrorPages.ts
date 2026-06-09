import { getPdfCenteredTextX, getPdfRecordTableCellValue, getPdfRecordTableLayout } from './pdfTableLayout'
import { buildExportErrorTable } from './errorTable'
import { truncatePdfText } from './text'
import type { PdfWriter } from './pdfWriter'
import type { ExportErrorRow } from './types'

export function addErrorPages(writer: PdfWriter, errorRows: ExportErrorRow[], logCount: number) {
  const errorTable = buildExportErrorTable(errorRows)

  nextErrorPage(writer, errorRows.length, logCount, errorTable.columns)

  if (errorRows.length === 0) {
    writer.addText(48, 405, 'No se detectaron registros con errores.', 9)
    return
  }

  errorTable.rows.forEach((row, index) => {
    if (writer.getY() < 45) nextErrorPage(writer, errorRows.length, logCount, errorTable.columns)

    const y = writer.getY()
    if (index % 2 === 0) writer.currentPage().push(`0.97 0.98 0.99 rg 36 ${y - 5} 770 18 re f`)

    getPdfRecordTableLayout(errorTable.columns).forEach((column) => {
      const value = getPdfRecordTableCellValue(row, column.id)
      const text = truncatePdfText(value, column.maxChars)
      writer.addText(getPdfCenteredTextX(column, text), y, text, column.fontSize)
    })

    writer.addLine(36, y - 7, 806, y - 7, '0.91 0.92 0.94')
    writer.setY(y - 20)
  })
}

function nextErrorPage(
  writer: PdfWriter,
  errorCount: number,
  logCount: number,
  columns: ReturnType<typeof buildExportErrorTable>['columns'],
) {
  writer.newPage()
  writer.addProcessHeader(true)
  writer.addText(36, 485, 'REGISTROS CON ERRORES:', 15, 'F2')
  writer.addText(36, 468, `${errorCount} errores detectados en ${logCount} registros`, 8)

  writer.currentPage().push('0.05 0.19 0.46 rg 36 438 770 24 re f')
  getPdfRecordTableLayout(columns).forEach((column) => {
    const text = truncatePdfText(column.label, column.maxChars)
    writer.addText(getPdfCenteredTextX(column, text), 446, text, column.fontSize, 'F2', '1 1 1')
  })
  writer.setY(420)
}
