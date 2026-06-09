import { addPdfChart, buildPdfChartGroups } from './pdfCharts'
import type { PdfWriter } from './pdfWriter'
import type { ExportRecordRow } from './types'

export function addChartPages(writer: PdfWriter, rows: ExportRecordRow[], readingRowCount: number) {
  const chartGroups = buildPdfChartGroups(rows)
  let chartSlot = 0

  chartGroups.forEach((group) => {
    if (chartSlot === 0) {
      writer.newPage()
      writer.addProcessHeader(true)
      writer.addText(36, 485, 'GRÁFICOS DE LECTURAS POR TIPO', 15, 'F2')
      writer.addText(36, 468, `${chartGroups.length} tipos detectados - ${readingRowCount} lecturas exportadas`, 8)
    }

    addPdfChart(group, writer.currentPage(), 36, chartSlot === 0 ? 250 : 45, 770, 190)
    chartSlot = chartSlot === 0 ? 1 : 0
  })
}
