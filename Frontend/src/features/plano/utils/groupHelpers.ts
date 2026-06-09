import { getPlanoVariableId } from '../hooks/usePlanEditor'
import { getInferredCategories } from '../../../utils/categoryUtils'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type { PlanoVariableNode } from '../types/plano'

export function hasProcessLinks(process: CreatedProcess) {
  return process.groupIds.length > 0 || process.sensorVariables.length > 0
}

export function getAvailableVariables(group: CreatedSensorGroup, placedVariableIds: Set<string>) {
  return group.variables.filter((variable) => !placedVariableIds.has(getPlanoVariableId(group.id, variable)))
}

export function getSensorSummary(group: CreatedSensorGroup) {
  const categories = group.categories?.length ? group.categories : getInferredCategories(group.sensorTitle)
  return `Sensores ${categories.join(', ')}`
}

export function getVariableReading(
  variable: PlanoVariableNode,
  readingsById: Record<string, ProcessSensorReading>,
) {
  const exactReading = readingsById[variable.variableId]
  if (exactReading) return exactReading

  const readings = Object.values(readingsById)
  const sameSensorReading = readings.find(
    (reading) => reading.name === variable.variableName && reading.sensorTitle === variable.sensorTitle,
  )
  if (sameSensorReading) return { ...sameSensorReading, id: variable.variableId }

  const sameNameReading = readings.find((reading) => reading.name === variable.variableName)
  return sameNameReading ? { ...sameNameReading, id: variable.variableId } : null
}

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  return tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target.isContentEditable
}

export function isUndoShortcut(event: KeyboardEvent) {
  const isModifierPressed = event.ctrlKey || event.metaKey
  const isZKey = event.key.toLowerCase() === 'z' || event.code === 'KeyZ'
  return isModifierPressed && isZKey && !event.shiftKey && !event.altKey
}
