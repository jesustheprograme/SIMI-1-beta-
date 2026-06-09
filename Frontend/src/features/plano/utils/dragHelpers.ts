import { getPlacedDragId, getPlacedProcessDragId } from './planoDrag'
import type { Point } from '../types/plano'
import { VARIABLE_CARD_SIZE, type PlanDragData, type ProcessDragData } from '../types'

export function getDragId(dragData: PlanDragData) {
  if (dragData.kind === 'placed-variable') return getPlacedDragId(dragData.variableId)
  if (dragData.kind === 'palette-variable') return getPaletteDragId(dragData.variableId)
  if (dragData.kind === 'placed-process') return getPlacedProcessDragId(dragData.processId)
  if (dragData.kind === 'palette-process') return getPaletteProcessDragId(dragData.processId)
  return ''
}

export function getPaletteDragId(variableId: string) {
  return `palette:${variableId}`
}

export function getPaletteProcessDragId(processId: string) {
  return `palette-process:${processId}`
}

export function toPlanDragData(value: unknown): PlanDragData | null {
  if (!value || typeof value !== 'object') return null

  const data = value as Record<string, unknown>
  if (isVariableDragPayload(data)) {
    return {
      groupName: data.groupName,
      kind: data.kind,
      variableId: data.variableId,
      variableName: data.variableName,
      x: typeof data.x === 'number' ? data.x : undefined,
      y: typeof data.y === 'number' ? data.y : undefined,
    }
  }

  if (isProcessDragPayload(data)) {
    return {
      kind: data.kind,
      processId: data.processId,
      processName: data.processName,
      x: typeof data.x === 'number' ? data.x : undefined,
      y: typeof data.y === 'number' ? data.y : undefined,
    }
  }

  return null
}

export function getDragItemSize(dragData: PlanDragData) {
  return isProcessDrag(dragData) ? { width: 224, height: 56 } : VARIABLE_CARD_SIZE
}

export function isProcessDrag(dragData: PlanDragData): dragData is ProcessDragData {
  return dragData.kind === 'palette-process' || dragData.kind === 'placed-process'
}

export function getDragTitle(dragData: PlanDragData) {
  return isProcessDrag(dragData) ? dragData.processName : dragData.variableName
}

export function getDragSubtitle(dragData: PlanDragData) {
  return isProcessDrag(dragData) ? 'Proceso' : dragData.groupName
}

export function getClientPoint(event: Event | null): Point | null {
  if (!event || !('clientX' in event) || !('clientY' in event)) return null
  return { x: Number(event.clientX), y: Number(event.clientY) }
}

function isVariableDragPayload(data: Record<string, unknown>): data is {
  groupName: string
  kind: 'palette-variable' | 'placed-variable'
  variableId: string
  variableName: string
  x?: unknown
  y?: unknown
} {
  return (
    (data.kind === 'palette-variable' || data.kind === 'placed-variable') &&
    typeof data.groupName === 'string' &&
    typeof data.variableId === 'string' &&
    typeof data.variableName === 'string'
  )
}

function isProcessDragPayload(data: Record<string, unknown>): data is {
  kind: 'palette-process' | 'placed-process'
  processId: string
  processName: string
  x?: unknown
  y?: unknown
} {
  return (
    (data.kind === 'palette-process' || data.kind === 'placed-process') &&
    typeof data.processId === 'string' &&
    typeof data.processName === 'string'
  )
}
