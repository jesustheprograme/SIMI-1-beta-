import type { CreatedProcess } from '../../types'
import { buildPdfPageStreams } from './pdfPages'
import type { ExportErrorRow, ExportRecordRow, PdfImage } from './types'

// Ensambla objetos PDF basicos: catalogo, paginas, streams, fuentes y logo opcional.
export function buildRecordsPdf(
  process: CreatedProcess,
  rows: ExportRecordRow[],
  errorRows: ExportErrorRow[],
  logCount: number,
  logo: PdfImage | null,
) {
  const pages = buildPdfPageStreams(process, rows, errorRows, logCount, logo)
  // Cada pagina usa dos objetos: pagina y stream; despues se registran las fuentes.
  const firstFontId = 3 + pages.length * 2
  const boldFontId = firstFontId + 1
  const logoObjectId = logo ? boldFontId + 1 : null

  const objects: string[] = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pages.length} >>`,
  ]

  pages.forEach((stream, index) => {
    const pageObjectId = 3 + index * 2
    const streamObjectId = pageObjectId + 1

    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 ${
        firstFontId
      } 0 R /F2 ${boldFontId} 0 R >>${
        logoObjectId ? ` /XObject << /Logo ${logoObjectId} 0 R >>` : ''
      } >> /Contents ${streamObjectId} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    )
  })

  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>')

  if (logo) {
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${
        logo.hex.length + 2
      } >>\nstream\n${logo.hex}>\nendstream`,
    )
  }

  return serializePdf(objects)
}

// Serializa objetos PDF y calcula offsets para la tabla xref.
function serializePdf(objects: string[]) {
  let pdf = '%PDF-1.4\n'
  const offsets = [0]

  objects.forEach((object, index) => {
    offsets.push(pdf.length)
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`
  })

  const xrefOffset = pdf.length
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  })

  return `${pdf}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
}
