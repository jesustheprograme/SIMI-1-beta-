import {
  operationalLocations,
  operationalSensors,
  productRules,
} from '../operationalCatalog'
import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type {
  OperationalSensor,
  ProcessLot,
  ProcessSensorLink,
  SensorQuality,
  SensorReadingRecord,
} from '../types/operational'

export function getOperationalSensor(sensorId: string) {
  return operationalSensors.find((sensor) => sensor.id === normalizeSensorId(sensorId)) ?? null
}

export function getOperationalLocation(locationId: string) {
  return operationalLocations.find((location) => location.id === locationId) ?? null
}

export function getOperationalLocationByName(locationName: string) {
  const normalized = normalizeText(locationName)
  return operationalLocations.find((location) => normalizeText(location.name) === normalized) ?? null
}

export function getProductRule(productName: string) {
  const normalized = normalizeText(productName)
  return (
    productRules.find((rule) => normalizeText(rule.productName) === normalized || normalizeText(rule.productId) === normalized) ??
    null
  )
}

export function dedupeSensorsById<T extends { id: string }>(sensors: T[]) {
  return Array.from(new Map(sensors.map((sensor) => [normalizeSensorId(sensor.id), sensor])).values())
}

export function buildReadingRecord(
  reading: ProcessSensorReading,
  options: { quality?: SensorQuality; timestamp?: string } = {},
): SensorReadingRecord | null {
  const sensor = resolveSensorFromReading(reading)
  const value = Number(reading.value)
  if (!sensor || !Number.isFinite(value)) return null

  return {
    locationId: sensor.locationId,
    quality: options.quality ?? getReadingQuality(value, sensor),
    sensorId: sensor.id,
    timestamp: options.timestamp ?? new Date().toISOString(),
    value,
  }
}

export function resolveSensorFromReading(reading: ProcessSensorReading) {
  const byExactId = getOperationalSensor(reading.id)
  if (byExactId) return byExactId

  const normalizedName = normalizeText(reading.name)
  const normalizedTitle = normalizeText(reading.sensorTitle)

  return (
    operationalSensors.find(
      (sensor) =>
        normalizeText(sensor.name) === normalizedName &&
        normalizeText(sensor.sourceTitle) === normalizedTitle,
    ) ?? null
  )
}

export function getReadingQuality(value: number, sensor: OperationalSensor): SensorQuality {
  if (value < sensor.min || value > sensor.max) return 'BAD'
  if (value <= sensor.warningMin || value >= sensor.warningMax) return 'UNKNOWN'
  return 'GOOD'
}

export function buildProcessLot(process: CreatedProcess): ProcessLot {
  const productRule = getProductRule(process.product)
  const location = getOperationalLocationByName(process.location)

  return {
    baseShelfLifeDays: productRule?.baseShelfLifeDays ?? 0,
    estimatedEndAt: process.deadlineAt,
    id: `lot-${process.id}`,
    locationId: location?.id ?? '',
    productId: productRule?.productId ?? normalizeText(process.product),
    productName: process.product || 'Producto sin definir',
    processId: process.id,
    startedAt: process.createdAt,
    status: getProcessLotStatus(process),
  }
}

export function buildProcessSensorLinks(process: CreatedProcess): ProcessSensorLink[] {
  const location = getOperationalLocationByName(process.location)
  const locationLinks = location
    ? operationalSensors
        .filter((sensor) => sensor.locationId === location.id)
        .map((sensor) => ({
          linkType: 'location' as const,
          processId: process.id,
          sensorId: sensor.id,
        }))
    : []

  const directLinks = process.sensorVariables.flatMap((variable) => {
    const sensor = getOperationalSensor(variable.id)
    return sensor
      ? [
          {
            linkType: 'direct-variable' as const,
            processId: process.id,
            sensorId: sensor.id,
          },
        ]
      : []
  })

  return dedupeSensorLinks([...locationLinks, ...directLinks])
}

function dedupeSensorLinks(links: ProcessSensorLink[]) {
  const entries = links.map((link) => [`${link.processId}::${link.sensorId}`, link] as const)
  return Array.from(new Map(entries).values())
}

function getProcessLotStatus(process: CreatedProcess): ProcessLot['status'] {
  if (process.deadlineAt && new Date(process.deadlineAt).getTime() <= Date.now()) return 'finished'
  if (!process.processName.trim() || !process.location.trim()) return 'planned'
  return 'active'
}

function normalizeSensorId(value: string) {
  return value.trim().toLowerCase()
}

function normalizeText(value: string) {
  return value.trim().toLowerCase()
}
