import type { ProcessLogEntry } from '../types'
import {
  formatReadingValue,
  getProcessChartColor,
} from './processChartHelpers'
import {
  getReadingObservation,
  getReadingOutlierState,
} from './processDetailHelpers'
import { formatProcessDateOnly, formatProcessTimeOnly } from '../utils/processDate'
import type { ProcessChartRecord, ProcessChartSeries } from './types'

export function ProcessRecordChartTooltip({
  chartColorMap,
  record,
  series,
}: {
  chartColorMap: Map<string, string>
  record: ProcessChartRecord
  series: ProcessChartSeries[]
}) {
  const outlierObservations = getLogOutlierObservations(record.entry)
  const observations = series.flatMap(({ variable }) => {
    const reading = record.valuesByVariable.get(variable.id)
    if (!reading) return []

    const observation = getReadingObservation(reading)
    return observation === 'Dentro del rango' ? [] : [`${variable.name}: ${observation}`]
  })
  const summaryObservation =
    outlierObservations.length > 0
      ? outlierObservations.join('; ')
      : observations.length > 0
      ? observations.join('; ')
      : 'Dentro del rango'

  return (
    <article className="process-record-chart-tooltip">
      <div className="process-record-chart-tooltip-label">ID {record.recordId}</div>
      <div className="process-record-chart-tooltip-list">
        <div className="process-record-chart-tooltip-meta">
          <span>Fecha</span>
          <strong>{formatProcessDateOnly(record.entry.createdAt)}</strong>
        </div>
        <div className="process-record-chart-tooltip-meta">
          <span>Hora</span>
          <strong>{formatProcessTimeOnly(record.entry.createdAt)}</strong>
        </div>
        {series.map(({ variable }) => {
          const color = getProcessChartColor(variable.id, series.map((entry) => entry.variable), chartColorMap)
          const reading = record.valuesByVariable.get(variable.id)
          const outlierState = reading ? getReadingOutlierState(reading, record.entry.outliers ?? []) : null

          return (
            <div className="process-record-chart-tooltip-row" key={variable.id}>
              <span
                className="process-record-chart-tooltip-dot"
                style={{ backgroundColor: color }}
                aria-hidden="true"
              />
              <span className="process-record-chart-tooltip-name">{variable.name}</span>
              <span
                className={
                  outlierState
                    ? 'process-record-chart-tooltip-value is-outlier'
                    : 'process-record-chart-tooltip-value'
                }
                title={outlierState?.label}
                style={outlierState ? undefined : { color }}
              >
                {reading ? formatReadingValue(reading) : 'Sin lectura'}
              </span>
            </div>
          )
        })}
        <div className="process-record-chart-tooltip-observation">
          <span>Observacion</span>
          <strong>{summaryObservation}</strong>
        </div>
      </div>
    </article>
  )
}

function getLogOutlierObservations(entry: ProcessLogEntry) {
  return (entry.outliers ?? []).map((outlier) => {
    const sensorName = outlier.nombre || outlier.sensor || outlier.id
    const value = `${outlier.valor}${outlier.unidad ? ` ${outlier.unidad}` : ''}`
    return `${sensorName}: ${outlier.observacion} (${value})`
  })
}
