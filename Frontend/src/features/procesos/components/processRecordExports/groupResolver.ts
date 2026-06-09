import type { CreatedSensorGroup } from '../../../telemetria/types/groups'
import type { CreatedProcess } from '../../types'
import { getSensorVariableId } from '../../../../utils/sensorVariableId'
import { getSensorMatchKeys } from './sensorCodes'

type GroupMatchSource = {
  id?: string
  name?: string
  sensor?: string
  sensorTitle?: string
  variable?: string
}

export type ExportGroupResolver = (source: GroupMatchSource) => string

export const UNASSOCIATED_GROUP = 'Lecturas no asociadas'

// Centraliza la relacion lectura -> grupo para que registros y errores usen el mismo criterio.
export function createExportGroupResolver(
  process: CreatedProcess,
  groups: CreatedSensorGroup[],
): ExportGroupResolver {
  const groupByKey = new Map<string, string>()
  const processGroups = process.groupIds
    .map((groupId) => groups.find((group) => group.id === groupId))
    .filter((group): group is CreatedSensorGroup => Boolean(group))

  for (const group of processGroups) {
    addGroupKeys(groupByKey, group.name, group.variableIds ?? [])
    addGroupKeys(groupByKey, group.name, group.variables)
    addGroupKeys(groupByKey, group.name, group.variables.map((name) => getSensorVariableId(group.id, name)))
  }

  return (source) => {
    const keys = getSensorMatchKeys(source)
    const group = keys.map((key) => groupByKey.get(key)).find(Boolean)

    return group ?? UNASSOCIATED_GROUP
  }
}

function addGroupKeys(groupByKey: Map<string, string>, groupName: string, values: string[]) {
  for (const value of values) {
    for (const key of getSensorMatchKeys({ id: value, name: value, variable: value })) {
      if (!groupByKey.has(key)) groupByKey.set(key, groupName)
    }
  }
}
