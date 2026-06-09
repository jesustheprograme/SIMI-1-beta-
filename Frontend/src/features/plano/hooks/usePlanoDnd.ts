import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent, type DragStartEvent, type Modifier } from '@dnd-kit/core'
import type { Point } from '../types/plano'
import type { PlanDragData } from '../types'
import { getClientPoint, toPlanDragData } from '../utils/dragHelpers'
import { commitDragEnd, isPlacedItemOutsideCanvas } from '../utils/dndDropHelpers'
import { createAlignModifier, createBoundaryModifier } from '../utils/dndModifiers'

type UsePlanoDndParams = {
  canvasRef: RefObject<HTMLDivElement | null>
  dragBoundaryRef: RefObject<HTMLDivElement | null>
  placeProcessAtPoint: (processId: string, point: Point) => void
  placeVariableAtPoint: (variableId: string, point: Point) => void
  returnProcessToPalette: (processId: string) => void
  returnVariableToPalette: (variableId: string) => void
}

type UsePlanoDndResult = {
  activeDrag: PlanDragData | null
  alignOverlayToPointer: Modifier
  handleDragCancel: () => void
  handleDragEnd: (event: DragEndEvent) => void
  handleDragMove: (event: DragMoveEvent) => void
  handleDragStart: (event: DragStartEvent) => void
  isReturningVariable: boolean
  restrictOverlayToDragBoundary: Modifier
  sensors: ReturnType<typeof useSensors>
}

export function usePlanoDnd(params: UsePlanoDndParams): UsePlanoDndResult {
  const [activeDrag, setActiveDrag] = useState<PlanDragData | null>(null)
  const [isReturningVariable, setIsReturningVariable] = useState(false)
  const activeDragRef = useRef<PlanDragData | null>(null)
  const dragStartPointerRef = useRef<Point | null>(null)
  const dragCurrentPointerRef = useRef<Point | null>(null)
  const suppressNextDragEndRef = useRef(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const alignOverlayToPointer = useMemo<Modifier>(() => createAlignModifier(activeDragRef, dragStartPointerRef), [])
  const restrictOverlayToDragBoundary = useMemo<Modifier>(() => createBoundaryModifier(params.dragBoundaryRef), [params.dragBoundaryRef])

  useEffect(() => {
    if (!activeDrag) return undefined
    function syncPointer(event: PointerEvent) {
      dragCurrentPointerRef.current = { x: event.clientX, y: event.clientY }
    }
    window.addEventListener('pointermove', syncPointer, { passive: true })
    return () => window.removeEventListener('pointermove', syncPointer)
  }, [activeDrag])

  useEffect(() => {
    if (!activeDrag) return undefined

    function handleActiveDragKeyDown(event: KeyboardEvent) {
      const dragData = activeDragRef.current
      if (!dragData) return

      if (event.key === 'Escape') {
        event.preventDefault()
        suppressNextDragEndRef.current = true
        resetDragState()
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return

      if (dragData.kind === 'placed-process') {
        event.preventDefault()
        suppressNextDragEndRef.current = true
        params.returnProcessToPalette(dragData.processId)
        resetDragState()
      }
    }

    window.addEventListener('keydown', handleActiveDragKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleActiveDragKeyDown, { capture: true })
  }, [activeDrag, params])

  function handleDragStart(event: DragStartEvent) {
    const dragData = toPlanDragData(event.active.data.current)
    if (!dragData) return
    dragStartPointerRef.current = getClientPoint(event.activatorEvent)
    dragCurrentPointerRef.current = dragStartPointerRef.current
    activeDragRef.current = dragData
    setActiveDrag(dragData)
    setIsReturningVariable(false)
  }

  function handleDragMove(event: DragMoveEvent) {
    const dragData = toPlanDragData(event.active.data.current)
    if (dragData?.kind !== 'placed-variable' && dragData?.kind !== 'placed-process') return
    const shouldReturn = isPlacedItemOutsideCanvas(params.canvasRef.current, dragData, event.delta)
    setIsReturningVariable((current) => (current === shouldReturn ? current : shouldReturn))
  }

  function handleDragEnd(event: DragEndEvent) {
    if (suppressNextDragEndRef.current) {
      suppressNextDragEndRef.current = false
      resetDragState()
      return
    }

    const dragData = toPlanDragData(event.active.data.current)
    if (!dragData) return resetDragState()
    commitDragEnd(event, dragData, params, dragStartPointerRef.current, dragCurrentPointerRef.current)
    resetDragState()
  }

  function resetDragState() {
    activeDragRef.current = null
    setActiveDrag(null)
    setIsReturningVariable(false)
    dragStartPointerRef.current = null
    dragCurrentPointerRef.current = null
  }

  return {
    activeDrag,
    alignOverlayToPointer,
    handleDragCancel: resetDragState,
    handleDragEnd,
    handleDragMove,
    handleDragStart,
    isReturningVariable,
    restrictOverlayToDragBoundary,
    sensors,
  }
}
