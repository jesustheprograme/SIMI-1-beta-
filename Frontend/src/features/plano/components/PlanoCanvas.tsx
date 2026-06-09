import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Dispatch,
  type MouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { motion, AnimatePresence } from 'framer-motion'
import { HEIGHT, GRID_SIZE, WIDTH } from '../utils/planoUtils'
import { getPlacedDragId, getPlacedProcessDragId } from '../utils/planoDrag'
import { IconBox } from '../../../components/ui/IconBox'
import type {
  PlanoBackgroundImage,
  PlanoLine,
  PlanoLocationShape,
  PlanoLocationZone,
  PlanoProcessNode,
  PlanoProcessVariable,
  PlanoVariableNode,
} from '../types/plano'
import type { ProcessSensorReading } from '../../procesos/types'

const POPOVER_WIDTH = 300
const POPOVER_ESTIMATED_HEIGHT = 130
const POPOVER_MARGIN = 12
const POPOVER_GAP = 8

const PROCESS_CARD_WIDTH = 210 //izquierda para derecha
const PROCESS_CARD_HEIGHT = 40 //arriba para abajo
const PROCESS_PANEL_WIDTH = 290 //derecha para izquierda
const PROCESS_PANEL_MARGIN = 12 //distancia minima entre el proceso y el panel, tambien se usa para calcular el espacio disponible para el panel, por lo que no deberia ser menor a 8px para evitar problemas de espacio en pantallas pequeñas
const PROCESS_PANEL_GAP = 30
const CANVAS_CONTEXT_MENU_WIDTH = 190
const CANVAS_CONTEXT_MENU_HEIGHT = 94
const DESKTOP_TIME_MEDIA = '(min-width: 761px)'
const LOCATION_MIN_SIZE = 5
const BACKGROUND_IMAGE_MIN_SIZE = 24
const L_CUT_MIN = 0.02
const L_CUT_MAX = 0.98

type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right'
type ResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'
type LShapeHandle = 'l-corner' | 'l-horizontal' | 'l-right-elbow' | 'l-top-right' | 'l-vertical'
type LocationEditHandle = ResizeHandle | LShapeHandle

type LocationResizeState = {
  handle: LocationEditHandle
  startClientX: number
  startClientY: number
  zone: PlanoLocationZone
}

type LocationMoveState = {
  startClientX: number
  startClientY: number
  zone: PlanoLocationZone
}

type BackgroundResizeState = {
  handle: ResizeHandle
  image: PlanoBackgroundImage
  startClientX: number
  startClientY: number
}

type DragPreview = {
  type: 'variable'
  x: number
  y: number
  isValid: boolean
  message?: string
}

type CanvasContextMenuState = {
  left: number
  point: { x: number; y: number }
  top: number
}

type PlanoCanvasProps = {
  activeDragId?: string | null
  backgroundImage?: PlanoBackgroundImage | null
  canDragVariables: boolean
  canvasRef?: RefObject<HTMLDivElement | null>
  lines: PlanoLine[]
  currentLine: PlanoLine | null
  locationDraft?: PlanoLocationZone | null
  locationZones?: PlanoLocationZone[]
  processNodes: PlanoProcessNode[]
  processReadings?: Record<string, ProcessSensorReading[]>
  variableNodes: PlanoVariableNode[]
  variableReadings?: Record<string, ProcessSensorReading>
  onMouseDown: (event: MouseEvent<HTMLDivElement>) => void
  onMouseMove: (event: MouseEvent<HTMLDivElement>) => void
  onMouseUp: () => void
  onMouseLeave: () => void
  onActiveDragCancel?: () => void
  onBackgroundImageFrameChange?: (frame: Pick<
    PlanoBackgroundImage,
    'displayHeight' | 'displayWidth' | 'imageDisplayHeight' | 'imageDisplayWidth' | 'imageX' | 'imageY' | 'x' | 'y'
  >) => void
  onInspectVariable?: (id: string) => void
  onCreateLocationAtPoint?: (point: { x: number; y: number }) => void
  onCreateProcessAtPoint?: (point: { x: number; y: number }) => void
  onOpenProcess?: (processId: string) => void
  onProcessSelect?: (processId: string | null) => void
  onLocationPlacementCancel?: () => void
  onLocationPlacementCommit?: () => void
  onLocationPlacementMove?: (point: { x: number; y: number }) => void
  onLocationPlacementStart?: (point: { x: number; y: number }) => void
  onProcessPlacementCancel?: () => void
  onProcessPlacementCommit?: (point: { x: number; y: number }) => void
  onProcessPlacementMove?: (point: { x: number; y: number }) => void
  onLocationZoneChange?: (zone: PlanoLocationZone) => void
  onLocationZoneSave?: (zoneId: string) => void
  onLocationZoneSelect?: (zoneId: string | null) => void
  onLocationZoneShapeChange?: (zoneId: string, shape: PlanoLocationShape) => void
  selectedLocationZoneId?: string | null
  selectedProcessId?: string | null
  dragPreview?: DragPreview | null
  locationCreationDraft?: PlanoLocationZone | null
  locationPlacementPrompt?: { x: number; y: number } | null
  processPlacementDraft?: { x: number; y: number } | null
}

export function PlanoCanvas({
  activeDragId,
  backgroundImage,
  canDragVariables,
  canvasRef,
  lines,
  currentLine,
  locationDraft,
  locationZones = [],
  processNodes,
  processReadings = {},
  variableNodes,
  variableReadings = {},
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onActiveDragCancel,
  onBackgroundImageFrameChange,
  onInspectVariable,
  onCreateLocationAtPoint,
  onCreateProcessAtPoint,
  onOpenProcess,
  onProcessSelect,
  onLocationPlacementCancel,
  onLocationPlacementCommit,
  onLocationPlacementMove,
  onLocationPlacementStart,
  onProcessPlacementCancel,
  onProcessPlacementCommit,
  onProcessPlacementMove,
  onLocationZoneChange,
  onLocationZoneSave,
  onLocationZoneSelect,
  onLocationZoneShapeChange,
  selectedLocationZoneId: controlledSelectedLocationZoneId,
  selectedProcessId,
  dragPreview,
  locationCreationDraft,
  locationPlacementPrompt,
  processPlacementDraft,
}: PlanoCanvasProps) {
  const { setNodeRef: setCanvasDroppableRef } = useDroppable({ id: 'plano-canvas' })
  const canvasFrameRef = useRef<HTMLDivElement | null>(null)
  const [canvasWidth, setCanvasWidth] = useState(WIDTH)
  const [popoverState, setPopoverState] = useState<{
    left: number
    placement: PopoverPlacement
    top: number
    variableId: string | null
  }>({ left: 0, placement: 'top', top: 0, variableId: null })
  const [openProcessIds, setOpenProcessIds] = useState<Record<string, boolean>>({})
  const [canvasContextMenu, setCanvasContextMenu] = useState<CanvasContextMenuState | null>(null)
  const [uncontrolledSelectedLocationZoneId, setUncontrolledSelectedLocationZoneId] = useState<string | null>(null)
  const [locationMoveState, setLocationMoveState] = useState<LocationMoveState | null>(null)
  const [locationResizeState, setLocationResizeState] = useState<LocationResizeState | null>(null)
  const [isBackgroundImageSelected, setIsBackgroundImageSelected] = useState(false)
  const [backgroundResizeState, setBackgroundResizeState] = useState<BackgroundResizeState | null>(null)
  const selectedLocationZoneId =
    controlledSelectedLocationZoneId !== undefined
      ? controlledSelectedLocationZoneId
      : uncontrolledSelectedLocationZoneId

  const activePopoverVariable = popoverState.variableId
    ? variableNodes.find((variable) => variable.variableId === popoverState.variableId)
    : null
  const hasOpenProcessPanel = useMemo(
    () => Object.values(openProcessIds).some(Boolean),
    [openProcessIds],
  )

  const gridStyle = useMemo<CSSProperties>(
    () => ({
      width: canvasWidth,
      height: HEIGHT,
      backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      backgroundImage:
        'linear-gradient(to right, #d4d4d8 1px, transparent 1px), linear-gradient(to bottom, #d4d4d8 1px, transparent 1px)',
    }),
    [canvasWidth],
  )

  const isDraggingVariable = Boolean(activeDragId)

  const selectLocationZone = useCallback((zoneId: string | null) => {
    setUncontrolledSelectedLocationZoneId(zoneId)
    onLocationZoneSelect?.(zoneId)
  }, [onLocationZoneSelect])

  useLayoutEffect(() => {
    const frame = canvasFrameRef.current
    if (!frame) return
    const currentFrame = frame

    function syncCanvasWidth() {
      const styles = getComputedStyle(currentFrame)
      const horizontalPadding = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      const availableWidth = currentFrame.clientWidth - horizontalPadding
      const alignedWidth = Math.max(GRID_SIZE, Math.ceil(availableWidth / GRID_SIZE) * GRID_SIZE)
      setCanvasWidth((current) => (current === alignedWidth ? current : alignedWidth))
    }

    syncCanvasWidth()
    const observer = new ResizeObserver(syncCanvasWidth)
    observer.observe(currentFrame)

    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!locationMoveState) return
    const moveState = locationMoveState

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault()
      onLocationZoneChange?.({
        ...moveState.zone,
        x: clamp(
          moveState.zone.x + event.clientX - moveState.startClientX,
          0,
          Math.max(0, canvasWidth - moveState.zone.width),
        ),
        y: clamp(
          moveState.zone.y + event.clientY - moveState.startClientY,
          0,
          Math.max(0, HEIGHT - moveState.zone.height),
        ),
      })
    }

    function handlePointerUp() {
      setLocationMoveState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [canvasWidth, locationMoveState, onLocationZoneChange])

  useEffect(() => {
    if (!locationResizeState) return
    const resizeState = locationResizeState

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault()
      onLocationZoneChange?.(
        isLShapeHandle(resizeState.handle)
          ? adjustLShapeZone(resizeState.zone, resizeState.handle, {
              canvasHeight: HEIGHT,
              canvasWidth,
              deltaX: event.clientX - resizeState.startClientX,
              deltaY: event.clientY - resizeState.startClientY,
            })
          : resizeLocationZone(resizeState.zone, resizeState.handle, {
          canvasHeight: HEIGHT,
          canvasWidth,
          deltaX: event.clientX - resizeState.startClientX,
          deltaY: event.clientY - resizeState.startClientY,
            }),
      )
    }

    function handlePointerUp() {
      setLocationResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [canvasWidth, locationResizeState, onLocationZoneChange])

  useEffect(() => {
    if (!backgroundResizeState) return
    const resizeState = backgroundResizeState

    function handlePointerMove(event: PointerEvent) {
      event.preventDefault()
      onBackgroundImageFrameChange?.(
        resizeBackgroundImageFrame(resizeState.image, resizeState.handle, {
          canvasHeight: HEIGHT,
          canvasWidth,
          deltaX: event.clientX - resizeState.startClientX,
          deltaY: event.clientY - resizeState.startClientY,
        }),
      )
    }

    function handlePointerUp() {
      setBackgroundResizeState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [backgroundResizeState, canvasWidth, onBackgroundImageFrameChange])

  useEffect(() => {
    if (!canvasContextMenu && !locationPlacementPrompt && !locationCreationDraft && !processPlacementDraft) return

    function closeFloatingState(event: KeyboardEvent) {
      const isDeleteShortcut = event.key === 'Delete' || event.key === 'Backspace'
      const hasPlacementAction = Boolean(
        locationPlacementPrompt || locationCreationDraft || processPlacementDraft,
      )
      const shouldCancel =
        event.key === 'Escape' ||
        (isDeleteShortcut && hasPlacementAction)

      if (!shouldCancel) return
      event.preventDefault()
      setCanvasContextMenu(null)
      onLocationPlacementCancel?.()
      onProcessPlacementCancel?.()
    }

    window.addEventListener('keydown', closeFloatingState)
    return () => window.removeEventListener('keydown', closeFloatingState)
  }, [
    canvasContextMenu,
    locationCreationDraft,
    locationPlacementPrompt,
    onLocationPlacementCancel,
    onProcessPlacementCancel,
    processPlacementDraft,
  ])

  const visibleCanvasContextMenu =
    activeDragId || locationPlacementPrompt || locationCreationDraft || processPlacementDraft
      ? null
      : canvasContextMenu

  useEffect(() => {
    if (!visibleCanvasContextMenu) return

    function closeContextMenuOnOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[data-canvas-context-menu="true"]')
      ) {
        return
      }

      setCanvasContextMenu(null)
    }

    window.addEventListener('pointerdown', closeContextMenuOnOutsidePointerDown, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', closeContextMenuOnOutsidePointerDown, { capture: true })
    }
  }, [visibleCanvasContextMenu])

  useEffect(() => {
    if (!isBackgroundImageSelected) return

    function clearBackgroundSelectionOnOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[data-background-image="true"]')
      ) {
        return
      }

      setIsBackgroundImageSelected(false)
    }

    window.addEventListener('pointerdown', clearBackgroundSelectionOnOutsidePointerDown, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', clearBackgroundSelectionOnOutsidePointerDown, { capture: true })
    }
  }, [isBackgroundImageSelected])

  useEffect(() => {
    if (!selectedLocationZoneId) return

    function clearLocationSelectionOnOutsidePointerDown(event: PointerEvent) {
      if (
        event.target instanceof HTMLElement &&
        event.target.closest('[data-location-zone="true"]')
      ) {
        return
      }

      selectLocationZone(null)
    }

    window.addEventListener('pointerdown', clearLocationSelectionOnOutsidePointerDown, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', clearLocationSelectionOnOutsidePointerDown, { capture: true })
    }
  }, [selectedLocationZoneId, selectLocationZone])

  useEffect(() => {
    if (!hasOpenProcessPanel && !popoverState.variableId) return undefined

    function closeCanvasPopoversOnOutsidePointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest('[data-plan-process-info-button="true"]') ||
        target.closest('[data-plan-process-info-panel="true"]') ||
        target.closest('[data-plan-variable-info-button="true"]') ||
        target.closest('[data-plan-variable-info-popover="true"]')
      ) {
        return
      }

      if (hasOpenProcessPanel) {
        setOpenProcessIds({})
      }

      if (popoverState.variableId) {
        setPopoverState({ left: 0, placement: 'top', top: 0, variableId: null })
      }
    }

    window.addEventListener('pointerdown', closeCanvasPopoversOnOutsidePointerDown, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', closeCanvasPopoversOnOutsidePointerDown, { capture: true })
    }
  }, [hasOpenProcessPanel, popoverState.variableId])

  function getCanvasPoint(event: MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    }
  }

  function getCanvasPointFromClient(clientX: number, clientY: number) {
    const canvas = canvasRef?.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    return {
      x: clamp(clientX - rect.left, 0, rect.width),
      y: clamp(clientY - rect.top, 0, rect.height),
    }
  }

  function openCanvasContextMenu(event: MouseEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    if (activeDragId) onActiveDragCancel?.()
    if (locationPlacementPrompt || locationCreationDraft) onLocationPlacementCancel?.()
    if (processPlacementDraft) onProcessPlacementCancel?.()

    const rect = event.currentTarget.getBoundingClientRect()
    const point = getCanvasPoint(event)

    setPopoverState({ left: 0, placement: 'top', top: 0, variableId: null })
    selectLocationZone(null)
    setCanvasContextMenu({
      left: clamp(point.x, POPOVER_MARGIN, Math.max(POPOVER_MARGIN, rect.width - CANVAS_CONTEXT_MENU_WIDTH - POPOVER_MARGIN)),
      point,
      top: clamp(point.y, POPOVER_MARGIN, Math.max(POPOVER_MARGIN, rect.height - CANVAS_CONTEXT_MENU_HEIGHT - POPOVER_MARGIN)),
    })
  }

  return (
    <div
      ref={canvasFrameRef}
      className={`w-full rounded-xl bg-white p-2 shadow-sm ring-1 ring-zinc-200/80 ${
        isDraggingVariable ? 'relative z-[100] overflow-visible' : 'overflow-hidden'
      }`}
    >
      <div
        ref={(node) => {
          setCanvasDroppableRef(node)
          if (canvasRef) {
            canvasRef.current = node
          }
        }}
        className={`relative select-none rounded-lg border border-zinc-200 bg-white shadow-inner ${
          isDraggingVariable ? 'overflow-visible' : 'overflow-hidden'
        } ${processPlacementDraft || locationPlacementPrompt || locationCreationDraft ? 'cursor-copy' : ''}`}
        style={gridStyle}
        onMouseDownCapture={(event) => {
          if (processPlacementDraft && event.button === 0) {
            event.preventDefault()
            event.stopPropagation()
            onProcessPlacementCommit?.(getCanvasPoint(event))
          }
        }}
        onMouseDown={(event) => {
          if (visibleCanvasContextMenu && event.button === 0) {
            event.preventDefault()
            event.stopPropagation()
            setCanvasContextMenu(null)
            onProcessSelect?.(null)
            return
          }

          if (locationPlacementPrompt && event.button === 0) {
            event.preventDefault()
            event.stopPropagation()
            onLocationPlacementStart?.(getCanvasPoint(event))
            return
          }

          if (processPlacementDraft && event.button === 0) {
            event.preventDefault()
            event.stopPropagation()
            onProcessPlacementCommit?.(getCanvasPoint(event))
            return
          }

          onMouseDown(event)
          if (visibleCanvasContextMenu) {
            setCanvasContextMenu(null)
          }
          if (popoverState.variableId) {
            setPopoverState({ left: 0, placement: 'top', top: 0, variableId: null })
          }
          if (!(event.target as HTMLElement).closest('[data-type="process"]')) {
            onProcessSelect?.(null)
          }
          if (!(event.target as HTMLElement).closest('[data-location-zone="true"]')) {
            selectLocationZone(null)
          }
          if (!(event.target as HTMLElement).closest('[data-background-image="true"]')) {
            setIsBackgroundImageSelected(false)
          }
        }}
        onDoubleClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
        }}
        onMouseMove={(event) => {
          if (locationCreationDraft) {
            onLocationPlacementMove?.(getCanvasPoint(event))
            return
          }

          if (locationPlacementPrompt) {
            onLocationPlacementMove?.(getCanvasPoint(event))
            return
          }

          if (processPlacementDraft) {
            onProcessPlacementMove?.(getCanvasPoint(event))
            return
          }

          onMouseMove(event)
        }}
        onMouseUp={() => {
          if (locationCreationDraft) {
            onLocationPlacementCommit?.()
            return
          }

          onMouseUp()
        }}
        onMouseLeave={() => {
          if (locationCreationDraft) {
            onLocationPlacementCommit?.()
            return
          }

          onMouseLeave()
        }}
        onContextMenu={openCanvasContextMenu}
      >
        {backgroundImage && (
          <div
            className={`absolute overflow-visible ${
              processPlacementDraft || locationPlacementPrompt || locationCreationDraft
                ? 'pointer-events-none'
                : 'pointer-events-auto'
            } ${
              isBackgroundImageSelected ? 'z-10' : 'z-0'
            }`}
            data-background-image="true"
            onMouseDown={(event) => {
              event.stopPropagation()
              setIsBackgroundImageSelected(true)
              selectLocationZone(null)
            }}
            style={{
              height: backgroundImage.displayHeight,
              left: backgroundImage.x,
              top: backgroundImage.y,
              width: backgroundImage.displayWidth,
            }}
          >
            <div className="absolute inset-0 overflow-hidden opacity-95">
              <img
                alt=""
                className="pointer-events-none absolute max-w-none select-none"
                draggable={false}
                src={backgroundImage.src}
                style={{
                  height: backgroundImage.imageDisplayHeight ?? backgroundImage.displayHeight,
                  left: (backgroundImage.imageX ?? backgroundImage.x) - backgroundImage.x,
                  objectFit: 'fill',
                  top: (backgroundImage.imageY ?? backgroundImage.y) - backgroundImage.y,
                  width: backgroundImage.imageDisplayWidth ?? backgroundImage.displayWidth,
                }}
              />
            </div>
            {isBackgroundImageSelected && onBackgroundImageFrameChange ? (
              <>
                <div className="pointer-events-none absolute inset-0 rounded-sm border-2 border-blue-600 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]" />
                {LOCATION_RESIZE_HANDLES.map((handle) => (
                  <button
                    key={handle}
                    className={`absolute z-20 h-3.5 w-3.5 rounded-full border-2 border-white bg-blue-600 shadow transition hover:scale-125 ${getResizeHandlePositionClass(handle)}`}
                    onPointerDown={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      setBackgroundResizeState({
                        handle,
                        image: backgroundImage,
                        startClientX: event.clientX,
                        startClientY: event.clientY,
                      })
                    }}
                    style={{
                      cursor: getResizeHandleCursor(handle),
                      height: 14,
                      minHeight: 0,
                      minWidth: 0,
                      padding: 0,
                      width: 14,
                    }}
                    title="Ajustar tamano de la imagen"
                    type="button"
                    aria-label={`Ajustar imagen desde ${handle}`}
                  />
                ))}
              </>
            ) : null}
          </div>
        )}

        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          height={HEIGHT}
          width={canvasWidth}
        >
          {lines.map((line) => (
            <line
              key={line.id}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke="#000000"
              strokeWidth="5"
              strokeLinecap="round"
            />
          ))}

          {currentLine && (
            <line
              x1={currentLine.x1}
              y1={currentLine.y1}
              x2={currentLine.x2}
              y2={currentLine.y2}
              stroke="#2563eb"
              strokeWidth="4"
              strokeLinecap="round"
            />
          )}
        </svg>

        <AnimatePresence>
          {dragPreview && (
            <motion.div
              key="drag-preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className={`pointer-events-none absolute rounded-lg border-2 ${
                dragPreview.isValid
                  ? 'border-dashed border-emerald-500 bg-emerald-50'
                  : 'border-dashed border-emerald-400 bg-emerald-50/80'
              }`}
              style={{
                left: dragPreview.x,
                top: dragPreview.y,
                width: 160,
                height: 64,
              }}
            >
              {!dragPreview.isValid && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="rounded-full bg-white/85 px-2 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
                    {dragPreview.message || 'Ajusta dentro del plano'}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {locationZones.map((zone) => (
          <PlanoLocationZoneBox
            key={zone.id}
            isMoving={locationMoveState?.zone.id === zone.id}
            isSelected={selectedLocationZoneId === zone.id}
            onMoveStart={
              processPlacementDraft || locationPlacementPrompt || locationCreationDraft
                ? undefined
                : (event) => {
                    selectLocationZone(zone.id)
                    setLocationMoveState({
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      zone,
                    })
                  }
            }
            onSelect={() => selectLocationZone(zone.id)}
            onResizeStart={(handle, event) => {
              selectLocationZone(zone.id)
              setLocationResizeState({
                handle,
                startClientX: event.clientX,
                startClientY: event.clientY,
                zone,
              })
            }}
            onShapeChange={(shape) => onLocationZoneShapeChange?.(zone.id, shape)}
            onSave={() => onLocationZoneSave?.(zone.id)}
            zone={zone}
          />
        ))}

        {locationDraft ? <PlanoLocationZoneBox draft zone={locationDraft} /> : null}

        {locationCreationDraft ? <PlanoLocationZoneBox draft zone={locationCreationDraft} /> : null}

        {variableNodes.map((variable) => (
          <PlanoVariableCard
            key={variable.id}
            activeDragId={activeDragId}
            canDrag={canDragVariables}
            onInspectVariable={onInspectVariable}
            reading={variableReadings[variable.variableId]}
            setPopoverState={setPopoverState}
            variable={variable}
          />
        ))}

        {processNodes.map((process) => (
          <PlanoProcessCard
            key={process.id}
            activeDragId={activeDragId}
            canDrag={canDragVariables}
            isOpen={openProcessIds[process.processId] ?? false}
            onToggle={() =>
              setOpenProcessIds((current) => ({
                ...current,
                [process.processId]: !(current[process.processId] ?? false),
              }))
            }
            onOpen={() => onOpenProcess?.(process.processId)}
            onSelect={() => {
              onProcessSelect?.(process.processId)
              selectLocationZone(null)
            }}
            canvasWidth={canvasWidth}
            isSelected={selectedProcessId === process.processId}
            process={process}
            readings={processReadings[process.processId] ?? []}
          />
        ))}

        <AnimatePresence>
          {activePopoverVariable && (
            <VariableInfoPopover
              variable={activePopoverVariable}
              reading={variableReadings[activePopoverVariable.variableId]}
              left={popoverState.left}
              top={popoverState.top}
              onClose={() => setPopoverState({ left: 0, placement: 'top', top: 0, variableId: null })}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {processPlacementDraft && (
            <ProcessPlacementGhost point={processPlacementDraft} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {locationPlacementPrompt && !locationCreationDraft && (
            <LocationPlacementGhost point={locationPlacementPrompt} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {visibleCanvasContextMenu && (
            <CanvasContextMenu
              left={visibleCanvasContextMenu.left}
              top={visibleCanvasContextMenu.top}
              onCreateLocation={() => {
                onCreateLocationAtPoint?.(visibleCanvasContextMenu.point)
                setCanvasContextMenu(null)
              }}
              onCreateProcess={(event) => {
                const pointerPoint =
                  getCanvasPointFromClient(event.clientX, event.clientY) ??
                  visibleCanvasContextMenu.point
                onCreateProcessAtPoint?.(pointerPoint)
                onProcessSelect?.(null)
                setOpenProcessIds({})
                setCanvasContextMenu(null)
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function ProcessPlacementGhost({ point }: { point: { x: number; y: number } }) {
  return (
    <motion.div
      key="process-placement-ghost"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="pointer-events-none absolute z-[110] w-56 rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/90 px-3 py-2 text-zinc-950 shadow-2xl shadow-blue-950/20"
      style={{
        left: point.x,
        top: point.y,
        x: '-50%',
        y: '-50%',
      }}
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
        Nuevo proceso
      </span>
      <strong className="mt-0.5 block truncate text-sm font-bold">
        Click para colocar
      </strong>
    </motion.div>
  )
}

function LocationPlacementGhost({ point }: { point: { x: number; y: number } }) {
  return (
    <motion.div
      key="location-placement-ghost"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="pointer-events-none absolute z-[110] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-zinc-950 shadow-2xl shadow-emerald-950/15"
      style={{
        left: point.x,
        top: point.y,
        transform: 'translate(-50%, -50%)',
      }}
    >
      <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-700">
        Nueva ubicacion
      </span>
      <strong className="mt-0.5 block whitespace-nowrap text-sm font-bold">
        Arrastrar para ajustar
      </strong>
    </motion.div>
  )
}

function CanvasContextMenu({
  left,
  top,
  onCreateLocation,
  onCreateProcess,
}: {
  left: number
  top: number
  onCreateLocation: () => void
  onCreateProcess: (event: MouseEvent<HTMLButtonElement>) => void
}) {
  return (
    <motion.div
      key="canvas-context-menu"
      initial={{ opacity: 0, scale: 0.96, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: -3 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="absolute z-[120] w-[190px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 text-zinc-900 shadow-2xl shadow-zinc-950/20"
      style={{ left, top }}
      data-canvas-context-menu="true"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      role="menu"
    >
      <CanvasContextMenuButton label="Crear ubicacion" onClick={onCreateLocation} tone="location">
        <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5z" />
        <path d="M8 9h8M8 13h4" />
      </CanvasContextMenuButton>
      <CanvasContextMenuButton label="Crear proceso" onClick={onCreateProcess} tone="process">
        <path d="M12 5v14M5 12h14" />
      </CanvasContextMenuButton>
    </motion.div>
  )
}

function CanvasContextMenuButton({
  children,
  label,
  onClick,
  tone,
}: {
  children: ReactNode
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
  tone: 'location' | 'process'
}) {
  const interactionClass =
    tone === 'location'
      ? 'hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700'
      : 'hover:bg-blue-50 hover:text-blue-700 focus-visible:bg-blue-50 focus-visible:text-blue-700'

  return (
    <button
      className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-zinc-700 transition focus-visible:outline-none ${interactionClass}`}
      onClick={onClick}
      type="button"
      role="menuitem"
    >
      <svg
        aria-hidden="true"
        className="h-4 w-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      >
        {children}
      </svg>
      <span>{label}</span>
    </button>
  )
}

function PlanoProcessCard({
  activeDragId,
  canDrag,
  isSelected,
  isOpen,
  onOpen,
  onSelect,
  onToggle,
  canvasWidth,
  process,
  readings,
}: {
  activeDragId?: string | null
  canDrag: boolean
  isSelected: boolean
  isOpen: boolean
  onOpen?: () => void
  onSelect: () => void
  onToggle: () => void
  canvasWidth: number
  process: PlanoProcessNode
  readings: ProcessSensorReading[]
}) {
  const [now, setNow] = useState(() => Date.now())
  const [showDesktopTime, setShowDesktopTime] = useState(() => isDesktopTimeViewport())
  const draggableId = getPlacedProcessDragId(process.processId)
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: draggableId,
    disabled: !canDrag,
    data: {
      kind: 'placed-process',
      processId: process.processId,
      processName: process.processName,
      x: process.x,
      y: process.y,
    },
  })
  const isActive = activeDragId === draggableId
  const panelPosition = getProcessVariablesPanelPosition(process, canvasWidth)
  const remainingLabel = getProcessRemainingLabel(process.deadlineAt, now, showDesktopTime)

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_TIME_MEDIA)

    function handleViewportChange(event: MediaQueryListEvent | MediaQueryList) {
      setShowDesktopTime(event.matches)
      setNow(Date.now())
    }

    handleViewportChange(mediaQuery)
    mediaQuery.addEventListener('change', handleViewportChange)

    return () => mediaQuery.removeEventListener('change', handleViewportChange)
  }, [])

  useEffect(() => {
    if (!process.deadlineAt) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), showDesktopTime ? 1_000 : 60_000)
    return () => window.clearInterval(timer)
  }, [process.deadlineAt, showDesktopTime])

  return (
    <>
      <article
        ref={setNodeRef}
        key={process.id}
        data-plan-item="true"
        data-type="process"
        data-process-id={process.processId}
        {...attributes}
        {...listeners}
        style={{
          left: process.x,
          top: process.y,
        }}
        onContextMenu={(event) => {
          event.preventDefault()
          event.stopPropagation()
          onSelect()
        }}
        onPointerDownCapture={() => {
          onSelect()
        }}
        onClick={(event) => {
          event.stopPropagation()
          onSelect()
        }}
        className={`absolute z-50 w-56 select-none overflow-hidden rounded-xl border-2 bg-white text-zinc-900 shadow-lg shadow-zinc-950/10 transition ${
          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        } ${
          isActive
            ? 'pointer-events-none opacity-0'
            : isSelected
              ? 'border-blue-600 shadow-xl shadow-blue-950/20 ring-4 ring-blue-200/80'
              : 'border-blue-200 hover:border-blue-300 hover:shadow-xl'
        }`}
      >
        <div className="flex min-h-14 w-full items-center justify-between gap-3 bg-blue-50/70 px-3 py-2 text-left transition hover:bg-blue-50">
          <div className="min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                Proceso
              </span>
              {remainingLabel && (
                <span className="shrink-0 text-[10px] font-semibold tabular-nums tracking-normal text-blue-700/75">
                  {remainingLabel}
                </span>
              )}
            </div>
            <strong className="mt-0.5 block truncate text-sm font-bold text-zinc-950">
              {process.processName}
            </strong>
          </div>

          <div className="plan-process-actions">
            <button
              aria-expanded={isOpen}
              aria-label={`Ver informacion de ${process.processName}`}
              className="plan-process-action"
              data-plan-process-info-button="true"
              onClick={(event) => {
                event.stopPropagation()
                onToggle()
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title="Ver Variables"
              type="button"
            >
              <ProcessInfoIcon />
            </button>
            <button
              aria-label={`Abrir registros de ${process.processName}`}
              className="plan-process-action"
              onClick={(event) => {
                event.stopPropagation()
                onOpen?.()
              }}
              onPointerDown={(event) => event.stopPropagation()}
              title="Abrir grafico y registros"
              type="button"
            >
              <ProcessOpenIcon />
            </button>
          </div>
        </div>
    </article>

    <AnimatePresence initial={false}>
      {isOpen && !isActive && (
        <motion.div
          key={`process-panel-${process.processId}`}
          initial={{ opacity: 0, scale: 0.96, y: panelPosition.placement === 'top' ? 8 : -8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: panelPosition.placement === 'top' ? 6 : -6 }}
          transition={{ duration: 0.16, ease: 'easeOut' }}
          className="absolute z-[90] w-[300px] overflow-hidden rounded-xl border border-blue-100 bg-white text-zinc-900 shadow-2xl shadow-zinc-950/20"
          data-plan-process-info-panel="true"
          style={{
            left: panelPosition.left,
            top: panelPosition.top,
            transformOrigin: panelPosition.transformOrigin,
          }}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="space-y-2 p-2">
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2">
              <span className="block text-[10px] font-bold uppercase tracking-[0.14em] text-blue-700">
                Ubicado
              </span>
              <strong className="mt-0.5 block truncate text-xs font-bold text-zinc-950">
                {process.location || 'Sin ubicado asignado'}
              </strong>
            </div>
            {process.variables.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
                Sin variables vinculadas.
              </div>
            ) : (
              process.variables.map((variable) => {
                const reading = getProcessVariableReading(variable, readings)

                return (
                  <div
                    key={variable.id}
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <strong className="block truncate text-xs font-bold text-zinc-950">
                          {variable.name}
                        </strong>
                        <span className="mt-0.5 block truncate text-[11px] font-medium text-zinc-500">
                          {variable.groupName}
                        </span>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                          reading ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-400'
                        }`}
                      >
                        {formatReading(reading)}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}

function PlanoLocationZoneBox({
  draft = false,
  isMoving = false,
  isSelected = false,
  onMoveStart,
  onResizeStart,
  onSave,
  onSelect,
  onShapeChange,
  zone,
}: {
  draft?: boolean
  isMoving?: boolean
  isSelected?: boolean
  onMoveStart?: (event: ReactPointerEvent<HTMLDivElement>) => void
  onResizeStart?: (handle: LocationEditHandle, event: ReactPointerEvent<HTMLButtonElement>) => void
  onSave?: () => void
  onSelect?: () => void
  onShapeChange?: (shape: PlanoLocationShape) => void
  zone: PlanoLocationZone
}) {
  const shape = zone.shape ?? 'rectangle'
  const lCut = getLShapeCut(zone)
  const lastPointerSaveAtRef = useRef(0)
  const handleSaveLocation = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (Date.now() - lastPointerSaveAtRef.current < 250) return
    onSave?.()
  }
  const handleSaveLocationPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.stopPropagation()
    lastPointerSaveAtRef.current = Date.now()
    onSave?.()
  }

  return (
    <div
      className={`absolute z-30 ${
        draft
          ? 'pointer-events-none'
          : `pointer-events-auto ${
              onMoveStart ? (isMoving ? 'cursor-grabbing' : 'cursor-grab') : 'cursor-pointer'
            }`
      }`}
      data-location-zone="true"
      onMouseDown={(event) => {
        event.stopPropagation()
        onSelect?.()
      }}
      onPointerDown={(event) => {
        if (!onMoveStart || event.button !== 0) return
        if ((event.target as HTMLElement).closest('button')) return
        event.preventDefault()
        event.stopPropagation()
        onMoveStart?.(event)
      }}
      style={{
        height: zone.height,
        left: zone.x,
        top: zone.y,
        width: zone.width,
      }}
    >
      <LocationZoneSurface draft={draft} isSelected={isSelected} lCut={lCut} shape={shape} />
      <span className="absolute left-2 top-2 rounded-full bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
        {zone.name}
      </span>
      {isSelected && !draft && (onShapeChange || onSave) ? (
        <div
          className="absolute left-2 top-8 z-10 flex gap-2"
          onMouseDown={(event) => event.stopPropagation()}
        >
          <div className="flex gap-1 rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-zinc-200">
            {LOCATION_SHAPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={`grid h-7 w-7 place-items-center rounded-full transition ${
                  shape === option.value
                    ? 'bg-emerald-600 text-white'
                    : 'text-zinc-500 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
                onClick={(event) => {
                  event.stopPropagation()
                  onShapeChange?.(option.value)
                }}
                style={{ minHeight: 0, minWidth: 0, padding: 0 }}
                title={option.label}
                type="button"
                aria-label={`Cambiar a ${option.label}`}
              >
                <LocationShapeIcon shape={option.value} />
              </button>
            ))}
          </div>
          {onSave ? (
            <div className="rounded-full bg-white/95 p-1 shadow-lg ring-1 ring-zinc-200">
              <button
                className="grid h-8 w-8 place-items-center rounded-full text-zinc-500 transition hover:bg-emerald-50 hover:text-emerald-700 focus-visible:bg-emerald-50 focus-visible:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                data-location-zone-save="true"
                onClick={handleSaveLocation}
                onMouseDown={(event) => {
                  event.stopPropagation()
                }}
                onPointerDown={(event) => {
                  event.stopPropagation()
                }}
                onPointerUp={handleSaveLocationPointerUp}
                style={{ minHeight: 32, minWidth: 32, padding: 0 }}
                title="Guardar ubicado"
                type="button"
                aria-label="Guardar ubicado"
              >
                <SaveLocationIcon />
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
      {isSelected && !draft && onResizeStart ? (
        <>
          {shape === 'l-shape' ? (
            <>
              {L_SHAPE_HANDLES.map((handle) => (
                <button
                  key={handle}
                  className="absolute z-20 h-3 w-3 rounded-full border border-emerald-700 bg-white shadow-sm transition hover:scale-125"
                  onPointerDown={(event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onResizeStart(handle, event)
                  }}
                  style={{
                    ...getLShapeHandleStyle(handle, lCut),
                    cursor: getLShapeHandleCursor(handle),
                    height: 12,
                    minHeight: 0,
                    minWidth: 0,
                    padding: 0,
                    width: 12,
                  }}
                  title="Ajustar arista de la L"
                  type="button"
                  aria-label={`Ajustar L desde ${handle}`}
                />
              ))}
            </>
          ) : null}
          {getLocationResizeHandles(shape).map((handle) => (
            <button
              key={handle}
              className={`absolute z-20 h-3 w-3 rounded-full border border-emerald-700 bg-white shadow-sm transition hover:scale-125 ${
                shape === 'l-shape' ? '' : getResizeHandlePositionClass(handle)
              }`}
              onPointerDown={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onResizeStart(handle, event)
              }}
              style={{
                cursor: getResizeHandleCursor(handle),
                height: 12,
                ...(shape === 'l-shape' ? getLResizeHandleStyle(handle, lCut) : {}),
                minHeight: 0,
                minWidth: 0,
                padding: 0,
                width: 12,
              }}
              title="Ajustar tamano"
              type="button"
              aria-label={`Ajustar ubicado desde ${handle}`}
            />
          ))}
        </>
      ) : null}
    </div>
  )
}

const L_SHAPE_HANDLES: LShapeHandle[] = [
  'l-top-right',
  'l-vertical',
  'l-corner',
  'l-horizontal',
  'l-right-elbow',
]
const LOCATION_RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']
const L_SHAPE_RESIZE_HANDLES: ResizeHandle[] = ['nw', 'n', 'e', 'se', 's', 'sw', 'w']
const LOCATION_SHAPE_OPTIONS: { label: string; value: PlanoLocationShape }[] = [
  { label: 'Rectangulo', value: 'rectangle' },
  { label: 'L', value: 'l-shape' },
  { label: 'Ovalo', value: 'ellipse' },
  { label: 'Rombo', value: 'diamond' },
]

function LocationShapeIcon({ shape }: { shape: PlanoLocationShape }) {
  const commonProps = {
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 1.8,
  }

  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      {shape === 'ellipse' ? (
        <ellipse cx="12" cy="12" rx="8.5" ry="6.5" {...commonProps} />
      ) : shape === 'diamond' ? (
        <path d="M12 3.5 20.5 12 12 20.5 3.5 12 12 3.5Z" {...commonProps} />
      ) : shape === 'l-shape' ? (
        <path d="M5 4h8v7h6v9H5V4Z" {...commonProps} />
      ) : (
        <rect x="4" y="6" width="16" height="12" rx={shape === 'rounded' ? 3 : 1.5} {...commonProps} />
      )}
    </svg>
  )
}

function SaveLocationIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <path d="M5 4h11l3 3v13H5V4Z" />
      <path d="M8 4v6h8" />
      <path d="M8 20v-6h8v6" />
    </svg>
  )
}

function ProcessInfoIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function ProcessOpenIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <path
        d="M.75 12h22.5m-10.5 10.5L23.25 12L12.75 1.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  )
}

function LocationZoneSurface({
  draft,
  isSelected,
  lCut,
  shape,
}: {
  draft: boolean
  isSelected: boolean
  lCut: { x: number; y: number }
  shape: PlanoLocationShape
}) {
  const paint = getLocationZonePaint({ draft, isSelected })

  return (
    <svg
      className={`absolute inset-0 overflow-visible ${isSelected && !draft ? 'drop-shadow-md' : ''}`}
      height="100%"
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
      width="100%"
    >
      {renderLocationZoneShape(shape, lCut, paint)}
    </svg>
  )
}

function getLocationZonePaint({ draft, isSelected }: { draft: boolean; isSelected: boolean }) {
  return {
    fill: draft ? 'rgba(209, 250, 229, 0.22)' : isSelected ? 'rgba(209, 250, 229, 0.24)' : 'rgba(236, 253, 245, 0.34)',
    stroke: isSelected && !draft ? 'rgba(16, 185, 129, 0.92)' : 'rgba(167, 243, 208, 0.72)',
    strokeDasharray: draft ? '6 5' : undefined,
    strokeLinejoin: 'round' as const,
    strokeWidth: isSelected && !draft ? 1.8 : 1,
    vectorEffect: 'non-scaling-stroke' as const,
  }
}

function renderLocationZoneShape(
  shape: PlanoLocationShape,
  lCut: { x: number; y: number },
  paint: ReturnType<typeof getLocationZonePaint>,
) {
  if (shape === 'ellipse') {
    return <ellipse cx="50" cy="50" rx="49" ry="49" {...paint} />
  }

  if (shape === 'diamond') {
    return <polygon points="50,1 99,50 50,99 1,50" {...paint} />
  }

  if (shape === 'l-shape') {
    return <polygon points={getLShapePoints(lCut)} {...paint} />
  }

  return <rect x="1" y="1" width="98" height="98" rx={shape === 'rounded' ? 6 : 1.2} {...paint} />
}

function adjustLShapeZone(
  zone: PlanoLocationZone,
  handle: LShapeHandle,
  options: { canvasHeight: number; canvasWidth: number; deltaX: number; deltaY: number },
): PlanoLocationZone {
  const currentCut = getLShapeCut(zone)
  const deltaCutX = zone.width > 0 ? options.deltaX / zone.width : 0
  const deltaCutY = zone.height > 0 ? options.deltaY / zone.height : 0
  const nextZone =
    handle === 'l-top-right'
      ? resizeLocationZone(zone, 'n', options)
      : handle === 'l-right-elbow'
        ? resizeLocationZone(zone, 'e', options)
        : zone

  return {
    ...nextZone,
    lCutX:
      handle === 'l-horizontal' || handle === 'l-right-elbow'
        ? currentCut.x
        : clamp(Number((currentCut.x + deltaCutX).toFixed(3)), L_CUT_MIN, L_CUT_MAX),
    lCutY:
      handle === 'l-vertical' || handle === 'l-top-right'
        ? currentCut.y
        : clamp(Number((currentCut.y + deltaCutY).toFixed(3)), L_CUT_MIN, L_CUT_MAX),
  }
}

function getLShapeCut(zone: PlanoLocationZone) {
  return {
    x: clamp(zone.lCutX ?? 0.42, L_CUT_MIN, L_CUT_MAX),
    y: clamp(zone.lCutY ?? 0.58, L_CUT_MIN, L_CUT_MAX),
  }
}

function getLShapePoints(cut: { x: number; y: number }) {
  const x = Math.round(cut.x * 100)
  const y = Math.round(cut.y * 100)

  return `0,0 ${x},0 ${x},${y} 100,${y} 100,100 0,100`
}

function getLShapeHandleStyle(handle: LShapeHandle, cut: { x: number; y: number }): CSSProperties {
  const left =
    handle === 'l-horizontal'
      ? `${(cut.x + (1 - cut.x) / 2) * 100}%`
      : handle === 'l-right-elbow'
        ? '100%'
        : `${cut.x * 100}%`
  const top =
    handle === 'l-top-right'
      ? '0%'
      : handle === 'l-vertical'
        ? `${(cut.y / 2) * 100}%`
        : `${cut.y * 100}%`

  return {
    left,
    top,
    transform: 'translate(-50%, -50%)',
  }
}

function getLShapeHandleCursor(handle: LShapeHandle) {
  if (handle === 'l-vertical') return 'ew-resize'
  if (handle === 'l-horizontal') return 'ns-resize'
  if (handle === 'l-top-right' || handle === 'l-right-elbow') return 'nesw-resize'
  return 'nwse-resize'
}

function isLShapeHandle(handle: LocationEditHandle): handle is LShapeHandle {
  return (
    handle === 'l-corner' ||
    handle === 'l-horizontal' ||
    handle === 'l-right-elbow' ||
    handle === 'l-top-right' ||
    handle === 'l-vertical'
  )
}

function getLocationResizeHandles(shape: PlanoLocationShape) {
  return shape === 'l-shape' ? L_SHAPE_RESIZE_HANDLES : LOCATION_RESIZE_HANDLES
}

function getLResizeHandleStyle(handle: ResizeHandle, cut: { x: number; y: number }): CSSProperties {
  const positions: Record<ResizeHandle, { left: string; top: string }> = {
    e: { left: '100%', top: `${(cut.y + (1 - cut.y) / 2) * 100}%` },
    n: { left: `${(cut.x / 2) * 100}%`, top: '0%' },
    ne: { left: `${cut.x * 100}%`, top: '0%' },
    nw: { left: '0%', top: '0%' },
    s: { left: '50%', top: '100%' },
    se: { left: '100%', top: '100%' },
    sw: { left: '0%', top: '100%' },
    w: { left: '0%', top: '50%' },
  }

  return {
    ...positions[handle],
    transform: 'translate(-50%, -50%)',
  }
}

function resizeLocationZone(
  zone: PlanoLocationZone,
  handle: ResizeHandle,
  options: {
    canvasHeight: number
    canvasWidth: number
    deltaX: number
    deltaY: number
  },
): PlanoLocationZone {
  const right = zone.x + zone.width
  const bottom = zone.y + zone.height
  let nextX = zone.x
  let nextY = zone.y
  let nextWidth = zone.width
  let nextHeight = zone.height

  if (handle.includes('w')) {
    nextX = clamp(zone.x + options.deltaX, 0, right - LOCATION_MIN_SIZE)
    nextWidth = right - nextX
  }

  if (handle.includes('e')) {
    nextWidth = clamp(zone.width + options.deltaX, LOCATION_MIN_SIZE, options.canvasWidth - zone.x)
  }

  if (handle.includes('n')) {
    nextY = clamp(zone.y + options.deltaY, 0, bottom - LOCATION_MIN_SIZE)
    nextHeight = bottom - nextY
  }

  if (handle.includes('s')) {
    nextHeight = clamp(zone.height + options.deltaY, LOCATION_MIN_SIZE, options.canvasHeight - zone.y)
  }

  return {
    ...zone,
    height: Math.round(nextHeight),
    width: Math.round(nextWidth),
    x: Math.round(nextX),
    y: Math.round(nextY),
  }
}

function resizeBackgroundImageFrame(
  image: PlanoBackgroundImage,
  handle: ResizeHandle,
  options: {
    canvasHeight: number
    canvasWidth: number
    deltaX: number
    deltaY: number
  },
): Pick<
  PlanoBackgroundImage,
  'displayHeight' | 'displayWidth' | 'imageDisplayHeight' | 'imageDisplayWidth' | 'imageX' | 'imageY' | 'x' | 'y'
> {
  const right = image.x + image.displayWidth
  const bottom = image.y + image.displayHeight
  let nextX = image.x
  let nextY = image.y
  let nextWidth = image.displayWidth
  let nextHeight = image.displayHeight

  if (handle.includes('w')) {
    nextX = clamp(image.x + options.deltaX, 0, right - BACKGROUND_IMAGE_MIN_SIZE)
    nextWidth = right - nextX
  }

  if (handle.includes('e')) {
    nextWidth = clamp(image.displayWidth + options.deltaX, BACKGROUND_IMAGE_MIN_SIZE, options.canvasWidth - image.x)
  }

  if (handle.includes('n')) {
    nextY = clamp(image.y + options.deltaY, 0, bottom - BACKGROUND_IMAGE_MIN_SIZE)
    nextHeight = bottom - nextY
  }

  if (handle.includes('s')) {
    nextHeight = clamp(image.displayHeight + options.deltaY, BACKGROUND_IMAGE_MIN_SIZE, options.canvasHeight - image.y)
  }

  const displayWidth = Math.round(nextWidth)
  const displayHeight = Math.round(nextHeight)
  const x = Math.round(nextX)
  const y = Math.round(nextY)
  const scaleX = displayWidth / Math.max(1, image.displayWidth)
  const scaleY = displayHeight / Math.max(1, image.displayHeight)
  const imageOffsetX = (image.imageX ?? image.x) - image.x
  const imageOffsetY = (image.imageY ?? image.y) - image.y

  return {
    displayHeight,
    displayWidth,
    imageDisplayHeight: Math.max(1, Math.round((image.imageDisplayHeight ?? image.displayHeight) * scaleY)),
    imageDisplayWidth: Math.max(1, Math.round((image.imageDisplayWidth ?? image.displayWidth) * scaleX)),
    imageX: Math.round(x + imageOffsetX * scaleX),
    imageY: Math.round(y + imageOffsetY * scaleY),
    x,
    y,
  }
}

function getResizeHandlePositionClass(handle: ResizeHandle) {
  const classes: Record<ResizeHandle, string> = {
    e: '-right-1.5 top-1/2 -translate-y-1/2',
    n: '-top-1.5 left-1/2 -translate-x-1/2',
    ne: '-right-1.5 -top-1.5',
    nw: '-left-1.5 -top-1.5',
    s: '-bottom-1.5 left-1/2 -translate-x-1/2',
    se: '-bottom-1.5 -right-1.5',
    sw: '-bottom-1.5 -left-1.5',
    w: '-left-1.5 top-1/2 -translate-y-1/2',
  }

  return classes[handle]
}

function getResizeHandleCursor(handle: ResizeHandle) {
  if (handle === 'n' || handle === 's') return 'ns-resize'
  if (handle === 'e' || handle === 'w') return 'ew-resize'
  if (handle === 'ne' || handle === 'sw') return 'nesw-resize'
  return 'nwse-resize'
}

function getProcessVariablesPanelPosition(process: PlanoProcessNode, canvasWidth: number) {
  const estimatedHeight = process.variables.length === 0 ? 58 : process.variables.length * 58 + 16
  const space = {
    bottom: HEIGHT - (process.y + PROCESS_CARD_HEIGHT) - PROCESS_PANEL_MARGIN,
    left: process.x - PROCESS_PANEL_MARGIN,
    right: canvasWidth - (process.x + PROCESS_CARD_WIDTH) - PROCESS_PANEL_MARGIN,
    top: process.y - PROCESS_PANEL_MARGIN,
  }

  let placement: PopoverPlacement = 'bottom'
  if (space.right < PROCESS_PANEL_WIDTH + PROCESS_PANEL_GAP && space.left > space.right) {
    placement = 'left'
  } else if (space.left < PROCESS_PANEL_WIDTH + PROCESS_PANEL_GAP && space.right > space.left) {
    placement = 'right'
  } else if (space.bottom < estimatedHeight + PROCESS_PANEL_GAP && space.top > space.bottom) {
    placement = 'top'
  }

  if (placement === 'left') {
    const left = process.x - PROCESS_PANEL_WIDTH - PROCESS_PANEL_GAP
    const top = clamp(
      process.y + PROCESS_CARD_HEIGHT / 2 - estimatedHeight / 2,
      PROCESS_PANEL_MARGIN,
      Math.max(PROCESS_PANEL_MARGIN, HEIGHT - estimatedHeight - PROCESS_PANEL_MARGIN),
    )

    return { left, placement, top, transformOrigin: 'right center' }
  }

  if (placement === 'right') {
    const left = process.x + PROCESS_CARD_WIDTH + PROCESS_PANEL_GAP
    const top = clamp(
      process.y + PROCESS_CARD_HEIGHT / 2 - estimatedHeight / 2,
      PROCESS_PANEL_MARGIN,
      Math.max(PROCESS_PANEL_MARGIN, HEIGHT - estimatedHeight - PROCESS_PANEL_MARGIN),
    )

    return { left, placement, top, transformOrigin: 'left center' }
  }

  if (placement === 'top') {
    const left = clamp(
      process.x,
      PROCESS_PANEL_MARGIN,
      Math.max(PROCESS_PANEL_MARGIN, canvasWidth - PROCESS_PANEL_WIDTH - PROCESS_PANEL_MARGIN),
    )
    const top = process.y - estimatedHeight - PROCESS_PANEL_GAP

    return { left, placement, top, transformOrigin: 'bottom left' }
  }

  return {
    left: clamp(
      process.x,
      PROCESS_PANEL_MARGIN,
      Math.max(PROCESS_PANEL_MARGIN, canvasWidth - PROCESS_PANEL_WIDTH - PROCESS_PANEL_MARGIN),
    ),
    placement,
    top: process.y + PROCESS_CARD_HEIGHT + PROCESS_PANEL_GAP,
    transformOrigin: 'top left',
  }
}

function PlanoVariableCard({
  activeDragId,
  canDrag,
  onInspectVariable,
  reading,
  setPopoverState,
  variable,
}: {
  activeDragId?: string | null
  canDrag: boolean
  onInspectVariable?: (id: string) => void
  reading?: ProcessSensorReading
  setPopoverState: Dispatch<SetStateAction<{
    left: number
    placement: PopoverPlacement
    top: number
    variableId: string | null
  }>>
  variable: PlanoVariableNode
}) {
  const draggableId = getPlacedDragId(variable.variableId)
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: draggableId,
    disabled: !canDrag,
    data: {
      kind: 'placed-variable',
      groupName: variable.groupName,
      variableId: variable.variableId,
      variableName: variable.variableName,
      x: variable.x,
      y: variable.y,
    },
  })
  const isActive = activeDragId === draggableId
  const readingLabel = formatReading(reading)

  return (
    <div
      ref={setNodeRef}
      key={variable.id}
      data-plan-item="true"
      data-type="variable"
      data-variable-id={variable.variableId}
      {...attributes}
      {...listeners}
      style={{
        left: variable.x,
        top: variable.y,
      }}
      className={`absolute h-16 w-40 select-none overflow-hidden rounded-lg border-2 bg-white p-2 text-zinc-900 shadow-lg shadow-zinc-950/10 transition ${
        canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
      } ${
        isActive
          ? 'pointer-events-none opacity-0'
          : 'border-zinc-200 hover:border-zinc-300 hover:shadow-xl'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-xs font-bold leading-tight">
            {variable.variableName}
          </strong>
          <span className="mt-1 block truncate text-[11px] font-medium text-zinc-500">
            {variable.groupName}
          </span>
          <span
            className={`mt-0.5 block truncate text-[11px] font-bold leading-tight ${
              reading ? 'text-blue-700' : 'text-zinc-400'
            }`}
          >
            {readingLabel}
          </span>
        </div>

        <button
          className="shrink-0 transition hover:scale-110"
          data-plan-variable-info-button="true"
          onClick={(event) => {
            event.stopPropagation()
            onInspectVariable?.(variable.variableId)
            const node = event.currentTarget.closest('[data-plan-item="true"]')
            const canvas = node?.parentElement
            const position =
              node && canvas
                ? getVariablePopoverPosition(node, canvas)
                : null

            setPopoverState((current) => {
              if (current.variableId === variable.variableId) {
                return { left: 0, placement: 'top', top: 0, variableId: null }
              }

              if (!position) return current

              return { variableId: variable.variableId, ...position }
            })
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
          aria-label={`Ver informacion de ${variable.variableName}`}
        >
          <IconBox variant="data" size="sm">
            <svg
              aria-hidden="true"
              className="h-3 w-3"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </IconBox>
        </button>
      </div>
    </div>
  )
}

function getVariablePopoverPosition(node: Element, canvas: HTMLElement) {
  const canvasRect = canvas.getBoundingClientRect()
  const target = toCanvasRect(node.getBoundingClientRect(), canvasRect)
  const obstacles = Array.from(
    canvas.querySelectorAll('[data-plan-item="true"][data-type="variable"]'),
  )
    .filter((element) => element !== node)
    .map((element) => toCanvasRect(element.getBoundingClientRect(), canvasRect))

  const maxLeft = Math.max(POPOVER_MARGIN, canvasRect.width - POPOVER_WIDTH - POPOVER_MARGIN)
  const maxTop = Math.max(
    POPOVER_MARGIN,
    canvasRect.height - POPOVER_ESTIMATED_HEIGHT - POPOVER_MARGIN,
  )
  const centerLeft = target.left + target.width / 2 - POPOVER_WIDTH / 2
  const centerTop = target.top + target.height / 2 - POPOVER_ESTIMATED_HEIGHT / 2
  const topPlacement = Math.max(
    POPOVER_MARGIN,
    target.top - POPOVER_ESTIMATED_HEIGHT - POPOVER_GAP,
  )
  const bottomPlacement = Math.min(maxTop, target.bottom + POPOVER_GAP)
  const rightPlacement = Math.min(maxLeft, target.right + POPOVER_GAP)
  const leftPlacement = Math.max(POPOVER_MARGIN, target.left - POPOVER_WIDTH - POPOVER_GAP)

  const space = {
    bottom: canvasRect.height - target.bottom - POPOVER_MARGIN,
    left: target.left - POPOVER_MARGIN,
    right: canvasRect.width - target.right - POPOVER_MARGIN,
    top: target.top - POPOVER_MARGIN,
  }
  const candidateMap: Record<
    PopoverPlacement,
    { left: number; placement: PopoverPlacement; score: number; top: number }
  > = {
    top: {
      left: clamp(centerLeft, POPOVER_MARGIN, maxLeft),
      placement: 'top',
      score: space.top - POPOVER_ESTIMATED_HEIGHT,
      top: topPlacement,
    },
    bottom: {
      left: clamp(centerLeft, POPOVER_MARGIN, maxLeft),
      placement: 'bottom',
      score: space.bottom - POPOVER_ESTIMATED_HEIGHT,
      top: bottomPlacement,
    },
    right: {
      left: rightPlacement,
      placement: 'right',
      score: space.right - POPOVER_WIDTH,
      top: clamp(centerTop, POPOVER_MARGIN, maxTop),
    },
    left: {
      left: leftPlacement,
      placement: 'left',
      score: space.left - POPOVER_WIDTH,
      top: clamp(centerTop, POPOVER_MARGIN, maxTop),
    },
  }
  const preferredOrder = getPreferredPopoverOrder(space)
  const candidates = preferredOrder
    .map((placement) => candidateMap[placement])
    .sort((a, b) => {
      const aFits = a.score >= 0 ? 1 : 0
      const bFits = b.score >= 0 ? 1 : 0
      return bFits - aFits
    })

  const available = candidates.find((candidate) => {
    if (
      candidate.left < POPOVER_MARGIN ||
      candidate.top < POPOVER_MARGIN ||
      candidate.left + POPOVER_WIDTH > canvasRect.width - POPOVER_MARGIN ||
      candidate.top + POPOVER_ESTIMATED_HEIGHT > canvasRect.height - POPOVER_MARGIN
    ) {
      return false
    }

    const candidateRect = {
      bottom: candidate.top + POPOVER_ESTIMATED_HEIGHT,
      left: candidate.left,
      right: candidate.left + POPOVER_WIDTH,
      top: candidate.top,
    }

    return !obstacles.some((obstacle) => intersects(candidateRect, obstacle, POPOVER_MARGIN))
  })

  return (
    available ?? {
      left: clamp(centerLeft, POPOVER_MARGIN, maxLeft),
      placement: 'top',
      top: clamp(target.top - POPOVER_ESTIMATED_HEIGHT - POPOVER_GAP, POPOVER_MARGIN, maxTop),
    }
  )
}

function getPreferredPopoverOrder(space: Record<PopoverPlacement, number>): PopoverPlacement[] {
  const horizontal: PopoverPlacement[] =
    space.right < POPOVER_WIDTH + POPOVER_GAP && space.left > space.right
      ? ['left', 'top', 'bottom', 'right']
      : space.left < POPOVER_WIDTH + POPOVER_GAP && space.right > space.left
        ? ['right', 'top', 'bottom', 'left']
        : []

  if (horizontal.length) return horizontal

  if (space.top < POPOVER_ESTIMATED_HEIGHT + POPOVER_GAP && space.bottom > space.top) {
    return ['bottom', 'right', 'left', 'top']
  }

  if (space.bottom < POPOVER_ESTIMATED_HEIGHT + POPOVER_GAP && space.top > space.bottom) {
    return ['top', 'right', 'left', 'bottom']
  }

  return ['top', 'bottom', 'right', 'left']
}

function toCanvasRect(rect: DOMRect, canvasRect: DOMRect) {
  const left = rect.left - canvasRect.left
  const top = rect.top - canvasRect.top

  return {
    bottom: top + rect.height,
    height: rect.height,
    left,
    right: left + rect.width,
    top,
    width: rect.width,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function intersects(
  a: { bottom: number; left: number; right: number; top: number },
  b: { bottom: number; left: number; right: number; top: number },
  padding = 0,
) {
  return !(
    a.right + padding < b.left ||
    a.left - padding > b.right ||
    a.bottom + padding < b.top ||
    a.top - padding > b.bottom
  )
}

function VariableInfoPopover({
  variable,
  reading,
  left,
  top,
  onClose,
}: {
  variable: PlanoVariableNode
  reading?: ProcessSensorReading
  left: number
  top: number
  onClose: () => void
}) {
  return (
    <motion.div
      key={`popover-${variable.variableId}`}
      initial={{ opacity: 0, scale: 0.94, y: 10, filter: 'blur(6px)' }}
      animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
      exit={{ opacity: 0, scale: 0.96, y: 8, filter: 'blur(4px)' }}
      transition={{ type: 'spring', stiffness: 420, damping: 30 }}
      className="absolute z-50 max-h-[260px] w-[300px] overflow-hidden rounded-2xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-2xl shadow-zinc-950/15"
      data-plan-variable-info-popover="true"
      style={{ left, top }}
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        onClick={onClose}
        className="absolute right-3 top-3 grid h-7 w-7 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition hover:bg-zinc-200 hover:text-zinc-900"
        type="button"
        aria-label="Cerrar informacion de la variable"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3 pr-8">
        <IconBox variant="task" size="md">
          <svg
            aria-hidden="true"
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
          >
            <path d="M12 8h.008M12 16v-5" />
            <circle cx="12" cy="12" r="10" />
          </svg>
        </IconBox>
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
            Variable seleccionada
          </p>
          <h3 className="mt-1 truncate text-base font-semibold text-zinc-950">{variable.variableName}</h3>
          <p className="mt-1 text-sm font-normal text-zinc-600">{variable.groupName}</p>
          <p className="mt-1 text-sm font-normal text-zinc-500">{variable.sensorSummary}</p>
          <p className="mt-3 inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-bold text-blue-700">
            {formatReading(reading)}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function formatReading(reading?: ProcessSensorReading) {
  if (!reading) return 'Sin lectura'
  return `${reading.value}${reading.unit ? ` ${reading.unit}` : ''}`
}

function getProcessRemainingLabel(deadlineAt: string | undefined, now: number, includeSeconds = false) {
  if (!deadlineAt) return ''
  const deadline = new Date(deadlineAt).getTime()
  if (Number.isNaN(deadline)) return ''

  const remaining = deadline - now
  if (remaining <= 0) return 'Finalizado'

  if (includeSeconds) {
    const totalSeconds = Math.ceil(remaining / 1000)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor((totalSeconds % 3600) / 60)
    const seconds = totalSeconds % 60

    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`
  }

  const totalMinutes = Math.ceil(remaining / 60_000)
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function isDesktopTimeViewport() {
  return typeof window !== 'undefined' && window.matchMedia(DESKTOP_TIME_MEDIA).matches
}

function getProcessVariableReading(
  variable: PlanoProcessVariable,
  readings: ProcessSensorReading[],
) {
  return (
    readings.find((reading) => reading.id === variable.id) ??
    readings.find((reading) => reading.name === variable.name && reading.sensorTitle === variable.sensorTitle) ??
    readings.find((reading) => reading.name === variable.name)
  )
}
