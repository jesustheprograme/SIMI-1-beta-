type SensorValueDisplayProps = {
  sensorTitle?: string
  unit?: string
  value: number | string | null
}

export function SensorValueDisplay({ sensorTitle = '', unit = '', value }: SensorValueDisplayProps) {
  if (value === null || value === '') return <>—</>

  const contextLabel = getSensorContextLabel(value, unit, sensorTitle)

  return (
    <span className="sensor-value-inline">
      <span>{String(value)}</span>
      {unit ? <small>{unit}</small> : null}
      {contextLabel ? <span className="sensor-value-context">{contextLabel}</span> : null}
    </span>
  )
}

function getSensorContextLabel(value: number | string, unit: string, sensorTitle: string) {
  if (unit !== 'ppm') return ''
  if (!sensorTitle.trim().toLowerCase().includes('etileno')) return ''

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return ''

  return `(${Math.round(clamp(numericValue, 0, 100))}%)`
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
