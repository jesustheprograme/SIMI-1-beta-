import { DndContext, DragOverlay, pointerWithin } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { FloatingVariableCard } from './FloatingVariableCard'
import { getDragSubtitle, getDragTitle, isProcessDrag } from '../utils/dragHelpers'
import type { PlanDragData } from '../types'

type PlanoDndShellProps = {
  activeDrag: PlanDragData | null
  alignOverlayToPointer: NonNullable<unknown>
  children: ReactNode
  handleDragCancel: () => void
  handleDragEnd: NonNullable<unknown>
  handleDragMove: NonNullable<unknown>
  handleDragStart: NonNullable<unknown>
  restrictOverlayToDragBoundary: NonNullable<unknown>
  sensors: NonNullable<unknown>
}

export function PlanoDndShell({
  activeDrag,
  alignOverlayToPointer,
  children,
  handleDragCancel,
  handleDragEnd,
  handleDragMove,
  handleDragStart,
  restrictOverlayToDragBoundary,
  sensors,
}: PlanoDndShellProps) {
  return (
    <DndContext
      collisionDetection={pointerWithin}
      sensors={sensors as never}
      onDragCancel={handleDragCancel}
      onDragEnd={handleDragEnd as never}
      onDragMove={handleDragMove as never}
      onDragStart={handleDragStart as never}
    >
      {children}
      <DragOverlay
        adjustScale={false}
        dropAnimation={null}
        modifiers={[alignOverlayToPointer as never, restrictOverlayToDragBoundary as never]}
      >
        {activeDrag ? (
          <FloatingVariableCard
            subtitle={getDragSubtitle(activeDrag)}
            title={getDragTitle(activeDrag)}
            wide={isProcessDrag(activeDrag)}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
