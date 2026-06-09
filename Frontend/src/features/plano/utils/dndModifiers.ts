import type { Modifier } from '@dnd-kit/core'
import type { RefObject } from 'react'
import type { Point } from '../types/plano'
import { getClientPoint, getDragItemSize } from './dragHelpers'
import { clamp } from './geometry'
import type { PlanDragData } from '../types'

export function createAlignModifier(activeDragRef: RefObject<PlanDragData | null>, dragStartPointerRef: RefObject<Point | null>): Modifier {
  return ({ activatorEvent, activeNodeRect, transform }) => {
    const dragData = activeDragRef.current
    const startPointer = getClientPoint(activatorEvent) ?? dragStartPointerRef.current
    if (!dragData || !startPointer || !activeNodeRect) return transform

    const itemSize = getDragItemSize(dragData)
    const grabOffset = dragData.kind.includes('palette')
      ? { x: itemSize.width / 2, y: itemSize.height / 2 }
      : { x: startPointer.x - activeNodeRect.left, y: startPointer.y - activeNodeRect.top }

    return {
      ...transform,
      x: transform.x + startPointer.x - activeNodeRect.left - grabOffset.x,
      y: transform.y + startPointer.y - activeNodeRect.top - grabOffset.y,
    }
  }
}

export function createBoundaryModifier(dragBoundaryRef: RefObject<HTMLDivElement | null>): Modifier {
  return ({ overlayNodeRect, transform }) => {
    const boundary = dragBoundaryRef.current?.getBoundingClientRect()
    if (!boundary || !overlayNodeRect) return transform

    return {
      ...transform,
      x: clamp(transform.x, boundary.left - overlayNodeRect.left, boundary.right - overlayNodeRect.right),
      y: clamp(transform.y, boundary.top - overlayNodeRect.top, boundary.bottom - overlayNodeRect.bottom),
    }
  }
}
