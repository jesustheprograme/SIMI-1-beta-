import type { ProcessLogEntry, ProcessSensorReading } from '../types'

export type ProcessRecordVariable = {
  id: string
  name: string
}

export type ProcessChartRecord = {
  entry: ProcessLogEntry
  recordId: number
  valuesByVariable: Map<string, ProcessSensorReading>
}

export type ProcessChartPoint = {
  createdAt: string
  recordId: number
  valuesByVariable: Map<string, ProcessSensorReading>
} & Record<string, number | string | Map<string, ProcessSensorReading>>

export type ProcessChartSeries = {
  dataKey: string
  variable: ProcessRecordVariable
}

export type ProcessChartVariableCategory = {
  id: 'temperature' | 'humidity' | 'co2' | 'etileno'
  label: string
  variables: ProcessRecordVariable[]
}
