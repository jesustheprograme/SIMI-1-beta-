import type { ProcessSensorReading } from '../../procesos/types'

type SensorSummaryTableProps = {
  readings: ProcessSensorReading[]
}

export function SensorSummaryTable({ readings }: SensorSummaryTableProps) {
  return (
    <table className="details-table">
      <thead>
        <tr>
          <th>Sensor</th>
          <th>Variable</th>
          <th>Valor</th>
          <th>Unidad</th>
          <th>Estado</th>
        </tr>
      </thead>

      <tbody>
        {readings.slice(0, 4).map((reading) => {
          const value = Number(reading.value)
          const isNormal = Number.isFinite(value)

          return (
            <tr key={reading.id}>
              <td>{reading.sensorTitle}</td>
              <td>{reading.name}</td>
              <td>{reading.value}</td>
              <td>{reading.unit || '—'}</td>
              <td>
                <span className={isNormal ? 'status online' : 'status offline'}>
                  {isNormal ? 'Activo' : 'Sin lectura'}
                </span>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}