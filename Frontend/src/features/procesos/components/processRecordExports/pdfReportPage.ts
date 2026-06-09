import type { CreatedProcess } from '../../types'
import { formatProcessDateTime } from '../../utils/processDate'
import { truncatePdfText } from './text'
import type { PdfWriter } from './pdfWriter'

export function addReportPage(writer: PdfWriter, process: CreatedProcess) {
  writer.addProcessHeader()
  writer.addText(36, 470, 'INFORME DE PROCESO', 8, 'F2')
  writer.addText(36, 446, truncatePdfText(process.processName, 72), 20, 'F2')
  writer.addText(620, 448, `Generado: ${formatProcessDateTime(new Date().toISOString())}`, 8)

  writer.addRect(36, 398, 770, 34, '0.97 0.98 0.99')
  writer.addField(48, 420, 742, 'Cliente', process.clientName || 'Sin asignar')

  getReportFieldPairs(process).forEach((fields, index) => {
    const rowTop = 382 - index * 33
    if (index > 0) writer.addLine(48, rowTop + 9, 794, rowTop + 9)
    writer.addField(48, rowTop, 350, fields[0][0], fields[0][1])
    writer.addLine(421, rowTop + 8, 421, rowTop - 20)
    writer.addField(444, rowTop, 350, fields[1][0], fields[1][1])
  })

  writer.addLine(36, 188, 806, 188, '0.05 0.19 0.46')
  writer.addText(36, 172, 'COMENTARIO INICIAL', 7, 'F2')
  writer.addText(36, 156, truncatePdfText(process.initialComment || 'Sin comentario', 135), 9)
  writer.addText(620, 172, 'VÍNCULOS', 7, 'F2')
  writer.addText(620, 156, `${process.groupIds.length} grupos · ${process.sensorVariables.length} variables`, 9)
}

function getReportFieldPairs(process: CreatedProcess): Array<[[string, string | number], [string, string | number]]> {
  return [
    [
      ['Ubicación', process.location || 'Sin asignar'],
      ['Producto', process.product || 'Sin definir'],
    ],
    [
      ['Pallets', process.binCount || '0'],
      ['Envase', process.container || 'Sin definir'],
    ],
    [
      ['Ventilación', process.ventilation || 'Sin definir'],
      ['Operador inicial', process.initialOperator || 'Sin asignar'],
    ],
    [
      ['Inicio', formatProcessDateTime(process.createdAt)],
      ['Final', process.deadlineAt ? formatProcessDateTime(process.deadlineAt) : 'Sin definir'],
    ],
    [
      ['Duración', process.duration || 'Sin definir'],
      ['Intervalo de lectura', `${process.readingIntervalSeconds || 0} segundos`],
    ],
    [
      ['Origen', process.origin || 'Sin definir'],
      ['Destino', process.destination || 'Sin definir'],
    ],
  ]
}
