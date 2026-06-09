export type ProcessType = 'almacenado' | 'maduracion' | 'proceso-3'

export type ProcessSensorVariable = {
  id: string
  name: string
  sensorTitle: string
}

export type ProcessSensorReading = {
  id: string
  name: string
  sensorTitle: string
  unit: string
  value: string
}

export type ProcessSensorOutlier = {
  id: string
  nombre: string
  observacion: string
  sensor: string
  unidad: string
  valor: string
  valor_maximo: number | null
  valor_minimo: number | null
}

export type ProcessLogEntry = {
  id: string
  createdAt: string
  outliers?: ProcessSensorOutlier[]
  recordNumber?: number
  readings: ProcessSensorReading[]
}

export type CreatedProcess = {
  binCount: string
  clientName: string
  createdAt: string
  deadlineAt?: string
  destination: string
  duration: string
  finalObservation: string
  finalOperator: string
  finalComment?: string
  finalReadings?: ProcessSensorReading[]
  finishedAt?: string
  container: string
  groupIds: string[]
  id: string
  initialComment?: string
  location: string
  origin: string
  processName: string
  processType?: ProcessType
  product: string
  readingIntervalSeconds: number
  sensorVariables: ProcessSensorVariable[]
  setPoint: string
  initialOperator: string
  totalWeight: string
  totalWeightUnit: 'kg' | 't'
  ventilation: string
}
