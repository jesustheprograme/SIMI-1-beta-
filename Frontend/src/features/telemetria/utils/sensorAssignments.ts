import type { FakeSensor } from '../data/fakeSensors'
import type { CreatedSensorGroup } from '../types/groups'
import type { CreatedProcess } from '../../procesos/types'
import type { PlanoLocationZone } from '../../plano/types/plano'

export function getSensorReadingId(sensorTitle: string, sensorId: string) {
  return `${sensorTitle}::${sensorId}`
}

export function getSensorGroupNames(sensorTitle: string, sensor: Pick<FakeSensor, 'id' | 'name'>, groups: CreatedSensorGroup[]) {
  return groups
    .filter((group) => groupContainsSensor(group, sensorTitle, sensor))
    .map((group) => group.name)
    .filter(Boolean)
}

export function getSensorLocationNames(
  sensorTitle: string,
  sensor: Pick<FakeSensor, 'id' | 'name'>,
  groups: CreatedSensorGroup[],
  processes: CreatedProcess[],
  locationZones: PlanoLocationZone[],
) {
  const validLocationNames = new Set(locationZones.map((zone) => normalize(zone.name)).filter(Boolean))
  if (validLocationNames.size === 0) return []

  return dedupe(
    processes.flatMap((process) => {
      const location = process.location.trim()
      if (!location || !validLocationNames.has(normalize(location))) return []
      if (!processContainsSensor(process, sensorTitle, sensor, groups)) return []
      return [location]
    }),
  )
}

export function formatAssignment(names: string[], fallback: string) {
  return names.length > 0 ? names.join(', ') : fallback
}

export function groupContainsSensor(
  group: CreatedSensorGroup,
  sensorTitle: string,
  sensor: Pick<FakeSensor, 'id' | 'name'>,
) {
  const normalizedIds = new Set((group.variableIds ?? []).map(normalize))
  const readingId = getSensorReadingId(sensorTitle, sensor.id)

  if (normalizedIds.has(normalize(sensor.id)) || normalizedIds.has(normalize(readingId))) return true

  return group.variables.some((variableName) => normalize(variableName) === normalize(sensor.name))
}

function processContainsSensor(
  process: CreatedProcess,
  sensorTitle: string,
  sensor: Pick<FakeSensor, 'id' | 'name'>,
  groups: CreatedSensorGroup[],
) {
  const readingId = getSensorReadingId(sensorTitle, sensor.id)
  const hasDirectVariable = process.sensorVariables.some(
    (variable) =>
      normalize(variable.id) === normalize(readingId) ||
      normalize(variable.id) === normalize(sensor.id) ||
      (normalize(variable.name) === normalize(sensor.name) && normalize(variable.sensorTitle) === normalize(sensorTitle)),
  )

  if (hasDirectVariable) return true

  return process.groupIds.some((groupId) => {
    const group = groups.find((item) => item.id === groupId)
    return group ? groupContainsSensor(group, sensorTitle, sensor) : false
  })
}

function dedupe(values: string[]) {
  return Array.from(new Map(values.map((value) => [normalize(value), value])).values())
}

function normalize(value: string) {
  return value.trim().toLowerCase()
}
