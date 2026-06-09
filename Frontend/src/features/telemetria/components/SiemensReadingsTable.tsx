export type SiemensReading = {
  plc?: string
  tag?: string
  value?: unknown
  index?: string | number | null
  type?: string | null
  quality?: string
  timestamp?: string
  error?: string
}

type MetricCardProps = {
  badge: string
  badgeTone?: string
  label: string
  meta: string
  value: string | number
}

function formatSiemensDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}

function formatSiemensValue(value: unknown) {
  if (value === null || typeof value === 'undefined') return '-'
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}

export function MetricCard(props: MetricCardProps) {
  return (
    <article className="metric-card">
      <div className="metric-header">
        <span>{props.label}</span>
        <em className={`metric-badge ${props.badgeTone ?? 'positive'}`}>{props.badge}</em>
      </div>
      <strong>{props.value}</strong>
      <p>{props.meta}</p>
    </article>
  )
}

export function SiemensReadingsTable({ readings }: { readings: SiemensReading[] }) {
  return (
    <div className="details-table-wrap">
      <table className="details-table sensor-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Direccion</th>
            <th>Tipo</th>
            <th>Valor</th>
            <th>Calidad</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {readings.map((reading) => (
            <tr key={`${reading.plc}-${reading.tag}-${reading.index}`}>
              <td>{reading.tag ?? 'Variable'}</td>
              <td>{reading.index ?? '-'}</td>
              <td>{reading.type ?? '-'}</td>
              <td>{formatSiemensValue(reading.value)}</td>
              <td>
                <span className={`status ${reading.quality === 'GOOD' ? 'online' : 'offline'}`}>
                  {reading.quality ?? 'BAD'}
                </span>
              </td>
              <td>{formatSiemensDate(reading.timestamp)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
