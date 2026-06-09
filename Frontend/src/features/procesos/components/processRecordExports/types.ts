export type ExportRecordRow = {
  date: string
  group: string
  hasReading: boolean
  id: string
  measure: string
  record: number
  sourceIndex: number
  sensor: string
  time: string
  unit: string
  value: string
  variable: string
}

export type ExportErrorRow = {
  date: string
  group: string
  id: string
  observation: string
  record: number
  sensor: string
  sourceIndex: number
  time: string
  unit: string
  value: string
  variable: string
}

export type ExportRecordTableColumn = {
  id: string
  label: string
}

export type ExportRecordTableRow = {
  date: string
  error?: string
  group: string
  record: number
  sensor: string
  sensorNames?: string[]
  sensorTypes?: string[]
  sourceIndex: number
  time: string
  values: Record<string, string>
}

export type PdfChartSeries = {
  label: string
  values: Array<{ record: number; value: number }>
}

export type PdfChartGroup = {
  title: string
  series: PdfChartSeries[]
}

export type PdfImage = {
  height: number
  hex: string
  width: number
}
