import { fakeSensorsByTitle } from '../../data/fakeSensors'
import type { Variable } from './types'

function mapSensor(sensor: { id: string; name: string; unit: string; value: string }, category: Variable['category']) {
  return {
    category,
    code: sensor.id,
    id: sensor.id.toLowerCase(),
    name: sensor.name,
    unit: sensor.unit,
    value: sensor.value,
  }
}

export const variables: Variable[] = [
  ...fakeSensorsByTitle['Sensores Temperatura'].map((sensor) => mapSensor(sensor, 'Temperatura')),
  ...fakeSensorsByTitle['Sensores Humedad'].map((sensor) => mapSensor(sensor, 'Humedad')),
  ...fakeSensorsByTitle['Sensores co2'].map((sensor) => mapSensor(sensor, 'CO2')),
  ...fakeSensorsByTitle['Sensores Etileno'].map((sensor) => mapSensor(sensor, 'Etileno')),
]
