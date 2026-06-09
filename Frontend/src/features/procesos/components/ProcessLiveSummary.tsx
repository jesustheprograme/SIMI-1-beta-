import type { ProcessSensorReading } from '../types'
import { SensorValueDisplay } from '../../telemetria/components/SensorValueDisplay'

export function ProcessLiveSummary({ readings }: { readings: ProcessSensorReading[] }) {
  if (!readings.length) return null
  return (
    <span className="process-live-summary">
      {readings.map((reading) => (
        <span key={`${reading.sensorTitle}-${reading.id}`}>
          <strong>
            <SensorValueDisplay sensorTitle={reading.sensorTitle} unit={reading.unit} value={reading.value} />
          </strong>
        </span>
      ))}
    </span>
  )
}
