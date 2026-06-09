import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import { getSensorVariableId } from '../../../utils/sensorVariableId'
import { fakeSensorsByTitle } from '../../telemetria/data/fakeSensors'
import type { CreatedProcess, ProcessSensorReading } from '../types'
import { findMatchingReading, getReadingSensorId } from './readingMatcher'

type ReadingsById = Record<string, ProcessSensorReading>

export function getProcessReadings(
  process: CreatedProcess,
  groups: CreatedSensorGroup[],
  readingsById: ReadingsById,
) {
  if (process.finishedAt) return process.finalReadings ?? []

  const variables = new Map<string, ProcessSensorReading>()

  for (const variable of process.sensorVariables) {
    const reading =
      findMatchingReading(Object.values(readingsById), variable) ??
      getUnavailableReading(variable.id, variable.name, variable.sensorTitle)
    if (reading) variables.set(getReadingKey(reading), reading)
  }

  for (const groupId of process.groupIds) {
    const group = groups.find((item) => item.id === groupId)
    if (!group) continue

    if (group.variableIds?.length) {
      for (const [index, variableId] of group.variableIds.entries()) {
        const reading =
          findMatchingReading(Object.values(readingsById), {
            id: variableId,
            name: group.variables[index] ?? variableId,
            sensorTitle: group.sensorTitle,
          }) ??
          getUnavailableReading(variableId, group.variables[index])
        if (reading) variables.set(getReadingKey(reading), reading)
      }
      continue
    }

    for (const variableName of group.variables) {
      const variableId = getSensorVariableId(group.id, variableName)
      const reading =
        readingsById[variableId] ??
        findMatchingReading(Object.values(readingsById), {
          id: variableId,
          name: variableName,
          sensorTitle: group.sensorTitle,
        }) ??
        findMatchingReading(Object.values(readingsById), { id: variableId, name: variableName }) ??
        getUnavailableReading(variableId, variableName, group.sensorTitle)
      if (reading) variables.set(getReadingKey(reading), reading)
    }
  }

  return Array.from(variables.values())
}

function getUnavailableReading(variableId: string, variableName?: string, sensorTitle?: string) {
  const normalizedId = getReadingSensorId(variableId).toLowerCase()

  for (const [title, sensors] of Object.entries(fakeSensorsByTitle)) {
    const sensor = sensors.find((item) => item.id.toLowerCase() === normalizedId)
    if (!sensor) continue
    return {
      id: `${title}::${sensor.id}`,
      name: sensor.name,
      sensorTitle: title,
      unit: sensor.unit,
      value: '—',
    }
  }

  if (!variableName) return null
  return {
    id: variableId,
    name: variableName,
    sensorTitle: sensorTitle ?? 'Sensor',
    unit: '',
    value: '—',
  }
}

function getReadingKey(reading: ProcessSensorReading) {
  return getReadingSensorId(reading.id).toLowerCase()
}
