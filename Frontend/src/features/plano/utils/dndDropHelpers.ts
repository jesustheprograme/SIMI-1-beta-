import type { DragEndEvent } from '@dnd-kit/core'
import type { RefObject } from 'react'
import type { Point } from '../types/plano'
import { getDragItemSize } from './dragHelpers'
import { clampPointToCanvas, expandRect, rectContainsRect } from './geometry'
import { CANVAS_DROPPABLE_ID, GROUPS_DROPPABLE_ID, RETURN_ZONE_MARGIN, type PlanDragData } from '../types'

export type DndDropActions = {
  canvasRef: RefObject<HTMLDivElement | null>
  placeProcessAtPoint: (processId: string, point: Point) => void
  placeVariableAtPoint: (variableId: string, point: Point) => void
  returnProcessToPalette: (processId: string) => void
  returnVariableToPalette: (variableId: string) => void
}

export function commitDragEnd(event: DragEndEvent, dragData: PlanDragData, actions: DndDropActions, start: Point | null, current: Point | null) {
  if (dragData.kind.includes('placed')) return commitPlacedDrag(event, dragData, actions)
  if (event.over?.id !== CANVAS_DROPPABLE_ID) return

  const point = getPaletteItemDropPoint(actions.canvasRef.current, event, getDragItemSize(dragData), start, current)
  if (!point) return
  if (dragData.kind === 'palette-process') actions.placeProcessAtPoint(dragData.processId, point)
  if (dragData.kind === 'palette-variable') actions.placeVariableAtPoint(dragData.variableId, point)
}

export function isPlacedItemOutsideCanvas(canvas: HTMLDivElement | null, dragData: PlanDragData, delta: Point) {
  if (!canvas || typeof dragData.x !== 'number' || typeof dragData.y !== 'number') return false

  const canvasRect = canvas.getBoundingClientRect()
  const itemSize = getDragItemSize(dragData)
  const itemRect = {
    bottom: canvasRect.top + dragData.y + delta.y + itemSize.height,
    left: canvasRect.left + dragData.x + delta.x,
    right: canvasRect.left + dragData.x + delta.x + itemSize.width,
    top: canvasRect.top + dragData.y + delta.y,
  }

  return !rectContainsRect(expandRect(canvasRect, RETURN_ZONE_MARGIN), itemRect)
}

function commitPlacedDrag(event: DragEndEvent, dragData: PlanDragData, actions: DndDropActions) {
  const shouldReturn = event.over?.id === GROUPS_DROPPABLE_ID || isPlacedItemOutsideCanvas(actions.canvasRef.current, dragData, event.delta)

  if (dragData.kind === 'placed-variable') {
    if (shouldReturn) return actions.returnVariableToPalette(dragData.variableId)
    const point = getPlacedItemDropPoint(actions.canvasRef.current, dragData, event.delta)
    if (point) actions.placeVariableAtPoint(dragData.variableId, point)
  }

  if (dragData.kind === 'placed-process') {
    if (shouldReturn) return actions.returnProcessToPalette(dragData.processId)
    const point = getPlacedItemDropPoint(actions.canvasRef.current, dragData, event.delta)
    if (point) actions.placeProcessAtPoint(dragData.processId, point)
  }
}

function getPlacedItemDropPoint(canvas: HTMLDivElement | null, dragData: PlanDragData, delta: Point) {
  if (!canvas || typeof dragData.x !== 'number' || typeof dragData.y !== 'number') return null
  return clampPointToCanvas({ x: dragData.x + delta.x, y: dragData.y + delta.y }, getCanvasContentRect(canvas), getDragItemSize(dragData))
}

function getPaletteItemDropPoint(
  canvas: HTMLDivElement | null,
  event: DragEndEvent,
  itemSize: { height: number; width: number },
  startPointer: Point | null,
  currentPointer: Point | null,
) {
  if (!canvas) return null
  const canvasRect = canvas.getBoundingClientRect()
  const contentRect = getCanvasContentRect(canvas)
  const borderWidth = Number.parseFloat(getComputedStyle(canvas).borderWidth) || 0
  const dropPointer = currentPointer ?? (startPointer ? { x: startPointer.x + event.delta.x, y: startPointer.y + event.delta.y } : null)
  if (!dropPointer) return null

  return clampPointToCanvas(
    {
      x: dropPointer.x - canvasRect.left - borderWidth - itemSize.width / 2,
      y: dropPointer.y - canvasRect.top - borderWidth - itemSize.height / 2,
    },
    contentRect,
    itemSize,
  )
}

function getCanvasContentRect(canvas: HTMLDivElement) {
  const rect = canvas.getBoundingClientRect()
  const borderWidth = Number.parseFloat(getComputedStyle(canvas).borderWidth) || 0
  return { ...rect, height: rect.height - 2 * borderWidth, width: rect.width - 2 * borderWidth } as DOMRect
}
