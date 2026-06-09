import type {
  AlertRule,
  OperationalLocation,
  OperationalSensor,
  PlcTagMapping,
  ProductRule,
  SensorLimitProfile,
  SensorType,
} from './types/operational'

const temperatureLimits: SensorLimitProfile = {
  min: -5,
  warningMin: 0,
  warningMax: 40,
  max: 45,
  unit: 'C',
}

const humidityLimits: SensorLimitProfile = {
  min: 25,
  warningMin: 35,
  warningMax: 80,
  max: 85,
  unit: '%',
}

const co2Limits: SensorLimitProfile = {
  min: 300,
  warningMin: 330,
  warningMax: 560,
  max: 600,
  unit: 'ppm',
}

const etilenoLimits: SensorLimitProfile = {
  min: 0,
  warningMin: 5,
  warningMax: 80,
  max: 100,
  unit: 'ppm',
}

export const operationalLocations: OperationalLocation[] = [
  { id: 'loc-zona-produccion', kind: 'production-zone', name: 'Zona de produccion' },
  { id: 'loc-camara-fria', kind: 'cold-room', name: 'Camara fria' },
  { id: 'loc-almacen', kind: 'warehouse', name: 'Almacen' },
  { id: 'loc-laboratorio', kind: 'laboratory', name: 'Laboratorio' },
  { id: 'loc-empaque', kind: 'production-zone', name: 'Empaque' },
  { id: 'loc-recepcion', kind: 'warehouse', name: 'Recepcion' },
  { id: 'loc-despacho', kind: 'dispatch', name: 'Despacho' },
  { id: 'loc-cuarto-tecnico', kind: 'technical-room', name: 'Cuarto tecnico' },
  { id: 'loc-linea-secundaria', kind: 'production-zone', name: 'Linea secundaria' },
  { id: 'loc-calidad', kind: 'laboratory', name: 'Calidad' },
]

export const operationalSensors: OperationalSensor[] = [
  ...buildSensorSet('TMP', 'Sensores Temperatura', 'Temperatura', 'temperature', temperatureLimits),
  ...buildSensorSet('HUM', 'Sensores Humedad', 'Humedad', 'humidity', humidityLimits),
  ...buildSensorSet('CO2', 'Sensores co2', 'CO2', 'co2', co2Limits),
  ...buildSensorSet('ETN', 'Sensores Etileno', 'Etileno', 'etileno', etilenoLimits),
]

export const productRules: ProductRule[] = [
  {
    productId: 'platano',
    productName: 'Platano',
    baseShelfLifeDays: 8,
    temperature: { min: 12, warningMin: 13, warningMax: 18, max: 20, unit: 'C' },
    humidity: { min: 65, warningMin: 70, warningMax: 80, max: 85, unit: '%' },
    co2: { min: 350, warningMin: 380, warningMax: 540, max: 600, unit: 'ppm' },
    etileno: { min: 0, warningMin: 5, warningMax: 65, max: 90, unit: 'ppm' },
  },
  {
    productId: 'arandano',
    productName: 'Arandano',
    baseShelfLifeDays: 7,
    temperature: { min: 0, warningMin: 1, warningMax: 5, max: 7, unit: 'C' },
    humidity: { min: 85, warningMin: 88, warningMax: 95, max: 98, unit: '%' },
    co2: { min: 350, warningMin: 380, warningMax: 520, max: 580, unit: 'ppm' },
    etileno: { min: 0, warningMin: 4, warningMax: 55, max: 80, unit: 'ppm' },
  },
  {
    productId: 'palta',
    productName: 'Palta',
    baseShelfLifeDays: 18,
    temperature: { min: 4, warningMin: 5, warningMax: 12, max: 14, unit: 'C' },
    humidity: { min: 75, warningMin: 80, warningMax: 90, max: 95, unit: '%' },
    co2: { min: 350, warningMin: 380, warningMax: 540, max: 600, unit: 'ppm' },
    etileno: { min: 0, warningMin: 5, warningMax: 60, max: 85, unit: 'ppm' },
  },
  {
    productId: 'papa',
    productName: 'Papa',
    baseShelfLifeDays: 4,
    temperature: { min: 6, warningMin: 7, warningMax: 12, max: 15, unit: 'C' },
    humidity: { min: 80, warningMin: 84, warningMax: 92, max: 96, unit: '%' },
  },
]

export const alertRules: AlertRule[] = [
  {
    code: 'SENSOR_OUT_OF_RANGE',
    title: 'Sensor fuera de rango',
    metric: 'temperature',
    condition: 'value < min || value > max',
    severity: 'critical',
    action: 'Revisar equipo, validar lectura fisica y registrar accion correctiva.',
    recommendedOwner: 'Operador de camara',
  },
  {
    code: 'SENSOR_WARNING_RANGE',
    title: 'Sensor en zona de advertencia',
    metric: 'humidity',
    condition: 'value <= warningMin || value >= warningMax',
    severity: 'warning',
    action: 'Monitorear tendencia y ajustar set point si se mantiene por mas de 15 minutos.',
    recommendedOwner: 'Supervisor de proceso',
  },
  {
    code: 'SENSOR_STALE',
    title: 'Sensor sin lectura reciente',
    metric: 'availability',
    condition: 'minutesSinceLastReading > 10',
    severity: 'warning',
    action: 'Validar conexion PLC/MQTT y revisar alimentacion del sensor.',
    recommendedOwner: 'Mantenimiento',
  },
  {
    code: 'LOT_SHELF_LIFE_RISK',
    title: 'Vida util critica',
    metric: 'shelf-life',
    condition: 'remainingShelfLifePercent < 30',
    severity: 'critical',
    action: 'Priorizar despacho, revisar lote y confirmar calidad.',
    recommendedOwner: 'Calidad',
  },
]

export const plcTagMappings: PlcTagMapping[] = [
  {
    plcName: 'PLC_n1',
    protocol: 'modbus-tcp',
    sensorId: 'tmp-001',
    tag: 'TMP-001',
    type: 'temperature',
    unit: 'C',
    locationId: 'loc-zona-produccion',
  },
  {
    plcName: 'PLC_n1',
    protocol: 'modbus-tcp',
    sensorId: 'hum-001',
    tag: 'HUM-001',
    type: 'humidity',
    unit: '%',
    locationId: 'loc-zona-produccion',
  },
  {
    plcName: 'PLC_n1',
    protocol: 'modbus-tcp',
    sensorId: 'co2-001',
    tag: 'CO2-001',
    type: 'co2',
    unit: 'ppm',
    locationId: 'loc-zona-produccion',
  },
  {
    plcName: 'PLC_n1',
    protocol: 'modbus-tcp',
    sensorId: 'etn-001',
    tag: 'ETN-001',
    type: 'etileno',
    unit: 'ppm',
    locationId: 'loc-zona-produccion',
  },
  {
    plcName: 'PLC_SIEMENS_S7_1',
    protocol: 'siemens-s7',
    sensorId: 'tmp-s7-001',
    tag: 'temperatura',
    type: 'temperature',
    unit: 'C',
    locationId: 'loc-camara-fria',
  },
  {
    plcName: 'PLC_SIEMENS_S7_1',
    protocol: 'siemens-s7',
    sensorId: 'hum-s7-001',
    tag: 'humedad',
    type: 'humidity',
    unit: '%',
    locationId: 'loc-camara-fria',
  },
  {
    plcName: 'PLC_SIEMENS_S7_1',
    protocol: 'siemens-s7',
    sensorId: 'co2-s7-001',
    tag: 'co2',
    type: 'co2',
    unit: 'ppm',
    locationId: 'loc-camara-fria',
  },
  {
    plcName: 'PLC_SIEMENS_S7_1',
    protocol: 'siemens-s7',
    sensorId: 'etn-s7-001',
    tag: 'etileno',
    type: 'etileno',
    unit: 'ppm',
    locationId: 'loc-camara-fria',
  },
]

function buildSensorSet(
  prefix: string,
  sourceTitle: string,
  label: string,
  type: SensorType,
  limits: SensorLimitProfile,
): OperationalSensor[] {
  return operationalLocations.map((location, index) => {
    const number = index + 1
    const id = `${prefix}-${String(number).padStart(3, '0')}`.toLowerCase()

    return {
      ...limits,
      id,
      locationId: location.id,
      name: `${label} ${location.name}`,
      sourceTag: id.toUpperCase(),
      sourceTitle,
      type,
    }
  })
}
