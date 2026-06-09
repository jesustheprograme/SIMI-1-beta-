import { normalizePdfText, toPdfText, truncatePdfText } from './text'
import type { ExportRecordRow, PdfChartGroup } from './types'

// Dibuja un grafico lineal simple directamente en PDF, sin depender de librerias externas.
export function addPdfChart(
  group: PdfChartGroup,
  page: string[],
  chartX: number,
  chartY: number,
  chartWidth: number,
  chartHeight: number,
) {
  page.push(`0.98 0.98 0.99 rg 0.87 0.89 0.92 RG 0.7 w ${chartX} ${chartY} ${chartWidth} ${chartHeight} re B`)
  page.push(`0.05 0.09 0.16 rg BT /F2 10 Tf ${chartX + 12} ${chartY + chartHeight - 24} Td ${toPdfText(group.title)} Tj ET`)

  if (group.series.length === 0) {
    page.push(`0.30 0.35 0.42 rg BT /F1 9 Tf ${chartX + 12} ${chartY + 82} Td ${toPdfText('No hay lecturas suficientes para generar el grafico.')} Tj ET`)
    return
  }

  const plotLeft = chartX + 28
  const plotRight = chartX + chartWidth - 28
  const plotBottom = chartY + 42
  const plotTop = chartY + chartHeight - 48
  const colors = ['0.05 0.19 0.46', '0.92 0.34 0.05', '0.05 0.55 0.32', '0.45 0.22 0.72', '0.08 0.57 0.68', '0.72 0.11 0.28', '0.36 0.36 0.36', '0.94 0.65 0.05']

  for (let index = 0; index < 4; index += 1) {
    const gridY = plotBottom + ((plotTop - plotBottom) / 3) * index
    page.push(`0.88 0.89 0.91 RG 0.5 w ${plotLeft} ${gridY} m ${plotRight} ${gridY} l S`)
  }

  group.series.forEach((item, seriesIndex) => {
    const values = item.values.map(({ value }) => value)
    const min = Math.min(...values)
    const range = Math.max(Math.max(...values) - min, 1)
    const points = item.values.map(({ value }, index) => ({
      x: plotLeft + (index / Math.max(item.values.length - 1, 1)) * (plotRight - plotLeft),
      y: plotBottom + ((value - min) / range) * (plotTop - plotBottom),
    }))

    if (points.length > 0) {
      const color = colors[seriesIndex % colors.length]
      page.push(`${color} RG 1.5 w ${points.map((point, index) => `${point.x.toFixed(2)} ${point.y.toFixed(2)} ${index === 0 ? 'm' : 'l'}`).join(' ')} S`)
    }
  })

  group.series.slice(0, 8).forEach((item, seriesIndex) => {
    const legendColumn = seriesIndex % 4
    const legendRow = Math.floor(seriesIndex / 4)
    const legendX = chartX + 12 + legendColumn * 185
    const legendY = chartY + 16 + (1 - legendRow) * 13
    const color = colors[seriesIndex % colors.length]

    page.push(`${color} rg ${legendX} ${legendY} 8 8 re f`)
    page.push(`0.05 0.09 0.16 rg BT /F1 7 Tf ${legendX + 13} ${legendY + 1} Td ${toPdfText(truncatePdfText(item.label, 24))} Tj ET`)
  })

  if (group.series.length > 8) {
    page.push(`0.30 0.35 0.42 rg BT /F1 7 Tf ${chartX + 752} ${chartY + 17} Td ${toPdfText(`+${group.series.length - 8}`)} Tj ET`)
  }
}

// Agrupa series por tipo de sensor para que el PDF genere una grafica por familia de medida.
export function buildPdfChartGroups(rows: ExportRecordRow[]): PdfChartGroup[] {
  const byType = new Map<string, Map<string, Array<{ record: number; value: number }>>>()
  const titles = new Map<string, string>()

  rows.forEach((row) => {
    const value = Number(row.value)
    if (!Number.isFinite(value)) return

    const type = getPdfSensorType(row)
    const group = byType.get(type.key) ?? new Map<string, Array<{ record: number; value: number }>>()
    const key = `${row.variable} - ${row.sensor}${row.unit ? ` (${row.unit})` : ''}`
    const values = group.get(key) ?? []

    values.push({ record: row.record, value })
    group.set(key, values)
    byType.set(type.key, group)
    titles.set(type.key, type.title)
  })

  return Array.from(byType, ([key, seriesByVariable]) => ({
    title: titles.get(key) ?? key,
    series: Array.from(seriesByVariable, ([label, values]) => ({
      label,
      values: Array.from(new Map(values.map((item) => [item.record, item])).values()).sort(
        (left, right) => left.record - right.record,
      ),
    })).filter((series) => series.values.length > 0),
  })).filter((group) => group.series.length > 0)
}

function getPdfSensorType(row: ExportRecordRow) {
  const unit = row.unit.trim()
  const normalizedUnit = normalizePdfText(unit)
  const text = normalizePdfText(`${row.variable} ${row.sensor} ${row.group} ${unit}`)

  if (text.includes('temperatura') || text.includes('temperature') || normalizedUnit.includes('c')) return { key: 'temperatura', title: 'TEMPERATURAS' }
  if (text.includes('humedad') || text.includes('humidity') || text.includes('hum ')) return { key: 'humedad', title: 'HUMEDADES' }
  if (text.includes('presion') || text.includes('pressure') || ['bar', 'psi', 'pa', 'kpa'].includes(normalizedUnit)) return { key: 'presion', title: 'PRESIONES' }
  if (text.includes('co2')) return { key: 'co2', title: 'CO2' }
  if (text.includes('etileno')) return { key: 'etileno', title: 'ETILENO' }
  if (text.includes('velocidad') || text.includes('speed')) return { key: 'velocidad', title: 'VELOCIDADES' }

  const key = normalizedUnit || normalizePdfText(row.variable) || 'otros'
  const title = unit ? `LECTURAS EN ${unit.toUpperCase()}` : `LECTURAS DE ${row.variable.toUpperCase()}`

  return { key, title }
}
