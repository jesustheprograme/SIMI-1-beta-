export type FakeSensor = {
  group: string
  id: string
  max: string
  min: string
  name: string
  status: 'Activo' | 'Revision'
  unit: string
  value: string
}

const temperatureValues = ['24.5', '6.8', '21.2', '23.1', '19.8', '17.6', '22.4', '27.3', '25.1', '20.7']
const humidityValues = ['48', '62', '41', '55', '59', '46', '53', '38', '64', '50']
const co2Values = ['420', '510', '390', '455', '470', '430', '520', '580', '445', '405']
const etilenoValues = ['12', '18', '9', '21', '16', '14', '25', '31', '19', '11']

function buildSensors(
  prefix: string,
  label: string,
  values: string[],
  unit: string,
  revisionIndexes: number[],
  range: { max: string; min: string },
): FakeSensor[] {
  return values.map((value, index) => {
    const sensorNumber = index + 1

    return {
      id: `${prefix}-${String(sensorNumber).padStart(3, '0')}`,
      max: range.max,
      min: range.min,
      name: `${label} ${String(sensorNumber).padStart(3, '0')}`,
      group: '',
      value,
      unit,
      status: revisionIndexes.includes(sensorNumber) ? 'Revision' : 'Activo',
    }
  })
}

export const fakeSensorsByTitle: Record<string, FakeSensor[]> = {
  'Sensores Temperatura': buildSensors('TMP', 'Temperatura', temperatureValues, 'C', [3, 8], { max: '45', min: '-5' }),
  'Sensores Humedad': buildSensors('HUM', 'Humedad', humidityValues, '%', [3, 8], { max: '85', min: '25' }),
  'Sensores co2': buildSensors('CO2', 'CO2', co2Values, 'ppm', [3, 8], { max: '600', min: '300' }),
  'Sensores Etileno': buildSensors('ETN', 'Etileno', etilenoValues, 'ppm', [4, 9], { max: '100', min: '0' }),
  'PLC Jepkom': [],
}
