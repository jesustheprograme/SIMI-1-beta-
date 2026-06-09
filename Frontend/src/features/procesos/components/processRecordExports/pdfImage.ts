import type { PdfImage } from './types'

// Convierte el banner a JPEG hexadecimal para insertarlo como XObject dentro del PDF.
export async function loadPdfLogo(): Promise<PdfImage> {
  const image = new Image()
  image.src = '/jepkom-banner.png'
  await image.decode()

  const width = 900
  const height = Math.round(width * (image.naturalHeight / image.naturalWidth))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) throw new Error('No se pudo preparar el logo para el PDF.')

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const binary = atob(canvas.toDataURL('image/jpeg', 0.9).split(',')[1])
  let hex = ''

  for (let index = 0; index < binary.length; index += 1) {
    hex += binary.charCodeAt(index).toString(16).padStart(2, '0').toUpperCase()
  }

  return { height, hex, width }
}
