import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import {
  formatProcessAxisTick,
  getLatestProcessChartRecord,
  getProcessChartColor,
} from './processChartHelpers'
import {
  PROCESS_CHART_HEIGHT,
  PROCESS_CHART_PADDING,
  PROCESS_CHART_WIDTH,
  getProcessChartPlot,
} from './processChartGeometry'
import { ProcessRecordChartTooltip } from './ProcessRecordChartTooltip'
import type {
  ProcessChartPoint,
  ProcessChartRecord,
  ProcessChartSeries,
  ProcessRecordVariable,
} from './types'

export function ProcessRecordSvgChart({
  allVariables,
  chartColorMap,
  data,
  emptyMessage,
  records,
  series,
  yAxisUnit,
}: {
  allVariables: ProcessRecordVariable[]
  chartColorMap: Map<string, string>
  data: ProcessChartPoint[]
  emptyMessage?: string
  records: ProcessChartRecord[]
  series: ProcessChartSeries[]
  yAxisUnit: string
}) {
  const [hoveredRecordId, setHoveredRecordId] = useState<number | null>(null)
  const [isChartUpdating, setIsChartUpdating] = useState(false)
  const previousRecordCountRef = useRef(records.length)
  const numericValues = useMemo(
    () =>
      data.flatMap((point) =>
        series.flatMap(({ dataKey }) => {
          const value = point[dataKey]
          return typeof value === 'number' && Number.isFinite(value) ? [value] : []
        }),
      ),
    [data, series],
  )
  const yAxisDomain = useMemo<[number, number]>(() => {
    if (numericValues.length === 0) return [0, 1]

    const minValue = Math.min(...numericValues)
    const maxValue = Math.max(...numericValues)
    const padding = Math.max((maxValue - minValue) * 0.1, Math.abs(maxValue || 1) * 0.04, 1)

    const minDomain = minValue < 0 ? minValue - padding : Math.max(0, minValue - padding)

    return [minDomain, maxValue + padding]
  }, [numericValues])
  const plot = useMemo(
    () => getProcessChartPlot(data, series, yAxisDomain),
    [data, series, yAxisDomain],
  )
  const hoveredPoint = hoveredRecordId
    ? plot.points.find((point) => point.recordId === hoveredRecordId) ?? null
    : null
  const hoveredRecord = hoveredRecordId
    ? records.find((record) => record.recordId === hoveredRecordId) ?? null
    : null
  const latestRecord = getLatestProcessChartRecord(records)
  const latestPoint = latestRecord
    ? plot.points.find((point) => point.recordId === latestRecord.recordId) ?? null
    : null

  useEffect(() => {
    if (previousRecordCountRef.current === records.length) return

    previousRecordCountRef.current = records.length
    setIsChartUpdating(true)

    const timeoutId = window.setTimeout(() => setIsChartUpdating(false), 520)
    return () => window.clearTimeout(timeoutId)
  }, [records.length])

  function handlePointerMove(event: MouseEvent<SVGSVGElement>) {
    if (emptyMessage) return
    if (plot.points.length === 0) return

    const rect = event.currentTarget.getBoundingClientRect()
    const chartX = ((event.clientX - rect.left) / rect.width) * PROCESS_CHART_WIDTH
    const closestPoint = plot.points.reduce((closest, point) =>
      Math.abs(point.x - chartX) < Math.abs(closest.x - chartX) ? point : closest,
    )

    setHoveredRecordId(closestPoint.recordId)
  }

  return (
    <div className={`process-record-chart-svg-wrap${isChartUpdating ? ' is-chart-updating' : ''}`}>
      {emptyMessage ? (
        <div className="process-record-chart-empty">
          {emptyMessage}
        </div>
      ) : null}

      <svg
        aria-label="Historico de lecturas del proceso"
        className={emptyMessage ? 'process-record-chart-svg is-empty' : 'process-record-chart-svg'}
        onMouseLeave={() => setHoveredRecordId(null)}
        onMouseMove={handlePointerMove}
        role="img"
        viewBox={`0 0 ${PROCESS_CHART_WIDTH} ${PROCESS_CHART_HEIGHT}`}
      >
        {!emptyMessage ? (
          <>
            <g className="process-record-chart-grid">
              {plot.yTicks.map((tick) => (
                <g key={`y-${tick.value}`}>
                  <line
                    x1={PROCESS_CHART_PADDING.left}
                    x2={PROCESS_CHART_WIDTH - PROCESS_CHART_PADDING.right}
                    y1={tick.y}
                    y2={tick.y}
                  />
                  <text x={PROCESS_CHART_PADDING.left - 10} y={tick.y + 4} textAnchor="end">
                    {formatProcessAxisTick(tick.value, yAxisUnit)}
                  </text>
                </g>
              ))}
              {plot.xTicks.map((tick) => (
                <g key={`x-${tick.recordId}`}>
                  <line
                    x1={tick.x}
                    x2={tick.x}
                    y1={PROCESS_CHART_PADDING.top}
                    y2={PROCESS_CHART_HEIGHT - PROCESS_CHART_PADDING.bottom}
                  />
                  <text x={tick.x} y={PROCESS_CHART_HEIGHT - 12} textAnchor="middle">
                    {tick.recordId}
                  </text>
                </g>
              ))}
            </g>

            {plot.seriesPaths.map((path) => (
              <path
                className="process-record-chart-line"
                d={path.d}
                fill="none"
                key={path.variable.id}
                stroke={getProcessChartColor(path.variable.id, allVariables, chartColorMap)}
              />
            ))}
          </>
        ) : null}

        {!emptyMessage && isChartUpdating && latestPoint ? (
          <g className="process-record-chart-new-point">
            {latestPoint.values.map((value) => (
              <circle
                cx={latestPoint.x}
                cy={value.y}
                fill={getProcessChartColor(value.variable.id, allVariables, chartColorMap)}
                key={value.variable.id}
                r="4"
              />
            ))}
          </g>
        ) : null}

        {!emptyMessage && hoveredPoint ? (
          <g className="process-record-chart-hover">
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={PROCESS_CHART_PADDING.top}
              y2={PROCESS_CHART_HEIGHT - PROCESS_CHART_PADDING.bottom}
            />
            {hoveredPoint.values.map((value) => (
              <circle
                cx={hoveredPoint.x}
                cy={value.y}
                fill={getProcessChartColor(value.variable.id, allVariables, chartColorMap)}
                key={value.variable.id}
                r="4"
              />
            ))}
          </g>
        ) : null}
      </svg>

      {hoveredRecord && hoveredPoint ? (
        <div
          className="process-record-chart-tooltip-floating"
          style={{
            left: `${Math.min(Math.max((hoveredPoint.x / PROCESS_CHART_WIDTH) * 100, 8), 78)}%`,
            top: `${Math.min(Math.max((hoveredPoint.tooltipY / PROCESS_CHART_HEIGHT) * 100, 8), 58)}%`,
          }}
        >
          <ProcessRecordChartTooltip chartColorMap={chartColorMap} record={hoveredRecord} series={series} />
        </div>
      ) : null}
    </div>
  )
}
