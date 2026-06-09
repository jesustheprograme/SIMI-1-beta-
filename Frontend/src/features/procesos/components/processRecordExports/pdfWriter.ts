import { toPdfText, truncatePdfText } from './text'
import type { PdfImage } from './types'

// Wrapper minimo para escribir comandos PDF con coordenadas absolutas en paginas horizontales.
export type PdfWriter = {
  addField: (x: number, y: number, width: number, label: string, value: string | number) => void
  addLine: (x1: number, y1: number, x2: number, y2: number, color?: string) => void
  addProcessHeader: (compact?: boolean) => void
  addRect: (x: number, y: number, width: number, height: number, fill?: string, stroke?: string) => void
  addText: (x: number, y: number, text: string | number, size?: number, font?: string, color?: string) => void
  currentPage: () => string[]
  getY: () => number
  newPage: () => void
  pages: string[][]
  setY: (value: number) => void
}

// Mantiene el estado compartido de paginas y posicion vertical para las secciones del reporte.
export function createPdfWriter(logo: PdfImage | null): PdfWriter {
  const pages: string[][] = [[]]
  let y = 0

  function currentPage() {
    return pages[pages.length - 1]
  }

  // PDF usa instrucciones de texto crudas; toPdfText escapa caracteres especiales del stream.
  function addText(
    x: number,
    textY: number,
    text: string | number,
    size = 9,
    font = 'F1',
    color = '0.05 0.09 0.16',
  ) {
    currentPage().push(`${color} rg BT /${font} ${size} Tf ${x} ${textY} Td ${toPdfText(text)} Tj ET`)
  }

  function addLine(x1: number, y1: number, x2: number, y2: number, color = '0.86 0.88 0.9') {
    currentPage().push(`${color} RG 0.7 w ${x1} ${y1} m ${x2} ${y2} l S`)
  }

  function addRect(
    x: number,
    rectY: number,
    width: number,
    height: number,
    fill = '1 1 1',
    stroke = '0.86 0.88 0.9',
  ) {
    currentPage().push(`${fill} rg ${stroke} RG 0.7 w ${x} ${rectY} ${width} ${height} re B`)
  }

  // Encabezado comun para portada y paginas compactas; incluye logo si se pudo cargar.
  function addProcessHeader(compact = false) {
    if (logo) {
      const width = compact ? 150 : 205
      const height = width * (logo.height / logo.width)
      const top = compact ? 548 : 550
      currentPage().push(`q ${width} 0 0 ${height} 36 ${top - height} cm /Logo Do Q`)
    } else {
      addText(36, compact ? 530 : 520, 'JEPKOM S&P', compact ? 17 : 22, 'F2')
    }

    addText(610, compact ? 538 : 535, 'Servicios y proyectos en', compact ? 8 : 9, 'F1')
    addText(610, compact ? 525 : 520, 'Automatización y control industrial', compact ? 8 : 9, 'F2')
    addLine(36, compact ? 505 : 495, 806, compact ? 505 : 495, '0.05 0.19 0.46')
  }

  function addField(x: number, fieldY: number, width: number, label: string, value: string | number) {
    addText(x, fieldY, label.toUpperCase(), 7, 'F2')
    addText(x, fieldY - 15, truncatePdfText(value || 'Sin asignar', Math.max(20, Math.floor(width / 5.2))), 10)
  }

  return {
    addField,
    addLine,
    addProcessHeader,
    addRect,
    addText,
    currentPage,
    getY: () => y,
    newPage: () => pages.push([]),
    pages,
    setY: (value: number) => {
      y = value
    },
  }
}
