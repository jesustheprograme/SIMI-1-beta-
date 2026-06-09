import type {
  ProcessChartPoint,
  ProcessChartRecord,
  ProcessChartSeries,
} from './types'

export const PROCESS_CHART_WIDTH = 1200
export const PROCESS_CHART_HEIGHT = 400
export const PROCESS_CHART_PADDING = {
  bottom: 40,
  left: 82,
  right: 28,
  top: 28,
}

export function getProcessChartData(
  records: ProcessChartRecord[],
  series: ProcessChartSeries[],
): ProcessChartPoint[] {
  return records.map((record) => {
    const point: ProcessChartPoint = {
      createdAt: record.entry.createdAt,
      recordId: record.recordId,
      valuesByVariable: record.valuesByVariable,
    }

    for (const { dataKey, variable } of series) {
      const reading = record.valuesByVariable.get(variable.id)
      const value = reading ? Number(reading.value) : Number.NaN

      if (Number.isFinite(value)) {
        point[dataKey] = value
      }
    }

    return point
  })
}

export function getProcessChartPlot(
  data: ProcessChartPoint[],
  series: ProcessChartSeries[],
  yAxisDomain: [number, number],
) {
  const plotLeft = PROCESS_CHART_PADDING.left
  const plotRight = PROCESS_CHART_WIDTH - PROCESS_CHART_PADDING.right
  const plotTop = PROCESS_CHART_PADDING.top
  const plotBottom = PROCESS_CHART_HEIGHT - PROCESS_CHART_PADDING.bottom
  const plotWidth = plotRight - plotLeft
  const plotHeight = plotBottom - plotTop
  const [minY, maxY] = yAxisDomain
  const yRange = Math.max(maxY - minY, 1)

  function getX(index: number) {
    if (data.length <= 1) return plotLeft
    return plotLeft + (index / (data.length - 1)) * plotWidth
  }

  function getY(value: number) {
    return plotBottom - ((value - minY) / yRange) * plotHeight
  }

  const points = data.map((point, index) => {
    const x = getX(index)
    const values = series.flatMap(({ dataKey, variable }) => {
      const value = point[dataKey]
      if (typeof value !== 'number' || !Number.isFinite(value)) return []

      return [{ value, variable, y: getY(value) }]
    })

    return {
      recordId: point.recordId,
      tooltipY: values.length > 0 ? Math.min(...values.map((value) => value.y)) : plotTop,
      values,
      x,
    }
  })

  const seriesPaths = series.flatMap(({ dataKey, variable }) => {
    const linePoints = data.flatMap((point, index) => {
      const value = point[dataKey]
      if (typeof value !== 'number' || !Number.isFinite(value)) return []

      return [{ x: getX(index), y: getY(value) }]
    })

    const d = getLinearSvgPath(linePoints)
    return d ? [{ d, variable }] : []
  })

  const yTicks = Array.from({ length: 4 }, (_, index) => {
    const value = minY + ((maxY - minY) / 3) * index
    return {
      value,
      y: getY(value),
    }
  }).reverse()

  const xTickStep = Math.max(1, Math.ceil(data.length / 12))
  const xTicks = data
    .map((point, index) => ({ recordId: point.recordId, x: getX(index) }))
    .filter((_, index) => index % xTickStep === 0 || index === data.length - 1)

  return { points, seriesPaths, xTicks, yTicks }
}

function getLinearSvgPath(points: { x: number; y: number }[]) {
  if (points.length === 0) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')
}
