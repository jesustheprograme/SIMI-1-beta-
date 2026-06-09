export type SensorType = 'temperature' | 'humidity' | 'co2' | 'etileno' | 'pressure'

export type SensorQuality = 'GOOD' | 'BAD' | 'STALE' | 'UNKNOWN'

export type ProcessStatus = 'planned' | 'active' | 'paused' | 'finished' | 'at-risk'

export type LocationKind = 'cold-room' | 'production-zone' | 'warehouse' | 'laboratory' | 'dispatch' | 'technical-room'

export type SensorLimitProfile = {
  max: number
  min: number
  unit: string
  warningMax: number
  warningMin: number
}

export type OperationalLocation = {
  id: string
  kind: LocationKind
  name: string
  planoZoneId?: string
}

export type OperationalSensor = {
  id: string
  locationId: string
  max: number
  min: number
  name: string
  sourceTag?: string
  sourceTitle: string
  type: SensorType
  unit: string
  warningMax: number
  warningMin: number
}

export type SensorReadingRecord = {
  locationId: string
  quality: SensorQuality
  sensorId: string
  timestamp: string
  value: number
}

export type ProductRule = {
  baseShelfLifeDays: number
  co2?: SensorLimitProfile
  etileno?: SensorLimitProfile
  humidity?: SensorLimitProfile
  productId: string
  productName: string
  temperature: SensorLimitProfile
}

export type ProcessLot = {
  baseShelfLifeDays: number
  estimatedEndAt?: string
  id: string
  locationId: string
  productId: string
  productName: string
  processId?: string
  startedAt: string
  status: ProcessStatus
}

export type ProcessSensorLink = {
  linkType: 'location' | 'direct-variable' | 'group'
  processId: string
  sensorId: string
}

export type AlertSeverity = 'info' | 'warning' | 'critical'

export type AlertRule = {
  action: string
  code: string
  condition: string
  metric: SensorType | 'availability' | 'shelf-life'
  recommendedOwner: string
  severity: AlertSeverity
  title: string
}

export type PlcTagMapping = {
  locationId: string
  plcName: string
  protocol: 'modbus-tcp' | 'siemens-s7' | 'codesys-opcua' | 'profinet-opcua-gateway'
  sensorId: string
  tag: string
  type: SensorType
  unit: string
}
