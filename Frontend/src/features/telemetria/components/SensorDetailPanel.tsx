import type { ReactNode } from 'react'
import type { FakeSensor } from '../data/fakeSensors'
import type { ProcessSensorReading } from '../../procesos/types'
import { SensorValueDisplay } from './SensorValueDisplay'

export function SensorDetailPanel({
  displayName,
  groupLabel = 'Sin grupo',
  liveReading,
  locationLabel = 'Sin ubicación',
  sensor,
}: {
  displayName: string
  groupLabel?: string
  liveReading?: ProcessSensorReading
  locationLabel?: string
  sensor: FakeSensor
}) {
  return (
    <section className="sensor-detail-panel" aria-label={`Detalle de ${displayName}`}>
      <SensorDetailItem label="Nombre de sistema" value={sensor.id} />
      <SensorDetailItem label="Nombre" value={displayName} />
      <SensorDetailItem label="Grupo" value={groupLabel} />
      <SensorDetailItem label="Ubicacion" value={locationLabel} />
      <SensorDetailItem
        label="Valor actual"
        value={
          <SensorValueDisplay
            sensorTitle={liveReading?.sensorTitle ?? sensor.name}
            unit={liveReading?.unit ?? sensor.unit}
            value={liveReading?.value ?? sensor.value}
          />
        }
      />
      <SensorDetailItem label="Estado" value={sensor.status} />
      <SensorDetailItem label="Unidad configurada" value={sensor.unit} />
      <SensorDetailItem label="Calibracion" value={sensor.status === 'Activo' ? 'Calibrado' : 'Pendiente'} />
      <SensorDetailItem label="Valor maximo" value={formatRangeValue(sensor.max, sensor.unit)} />
      <SensorDetailItem label="Valor minimo" value={formatRangeValue(sensor.min, sensor.unit)} />
    </section>
  )
}

function SensorDetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="sensor-detail-item">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
  )
}

function formatRangeValue(value: string, unit: string) {
  if (value === 'Sin definir') return value
  return unit ? `${value} ${unit}` : value
}
