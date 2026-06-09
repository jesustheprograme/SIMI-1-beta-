import {
  DndContext,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from '@dnd-kit/core'
import { useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import { TrashIcon } from '../../telemetria/components/sensorGroupModal/icons'
import type { CreatedProcess } from '../types'
import type { ProcessSection } from '../types/processSections'
import {
  DEFAULT_PROCESS_SECTION_ID,
  moveProcessToSection,
  processSectionsEqual,
  swapProcessPositions,
} from '../utils/processSections'

type DropData = { processId?: string; sectionId: string; targetIndex?: number }

const collisionDetection: CollisionDetection = (args) => {
  const activeTargetId = `process-target:${String(args.active.id)}`
  const filteredArgs = {
    ...args,
    droppableContainers: args.droppableContainers.filter(
      ({ id }) => String(id) !== activeTargetId,
    ),
  }
  const sectionCollision = (
    pointerWithin(filteredArgs).find(({ id }) => String(id).startsWith('process-section:'))
    ?? rectIntersection(filteredArgs).find(({ id }) => String(id).startsWith('process-section:'))
  )
  if (!sectionCollision) return []

  const sectionContainer = args.droppableContainers.find(
    ({ id }) => id === sectionCollision.id,
  )
  const sectionId = sectionContainer?.data.current?.sectionId as string | undefined
  if (!sectionContainer || !sectionId) return [sectionCollision]

  const itemContainers = args.droppableContainers
    .filter(({ data, id }) => (
      String(id).startsWith('process-target:')
      && String(id) !== activeTargetId
      && data.current?.sectionId === sectionId
    ))
    .flatMap((container) => {
      const rect = args.droppableRects.get(container.id)
      return rect ? [{ container, rect }] : []
    })
    .sort((left, right) => (
      Math.abs(left.rect.top - right.rect.top) > 8
        ? left.rect.top - right.rect.top
        : left.rect.left - right.rect.left
    ))

  const pointer = args.pointerCoordinates ?? {
    x: args.collisionRect.left + args.collisionRect.width / 2,
    y: args.collisionRect.top + args.collisionRect.height / 2,
  }
  const activeSectionId = args.active.data.current?.sectionId as string | undefined
  const swapTarget = activeSectionId === sectionId
    ? itemContainers.find(({ rect }) => {
        const insetX = Math.min(28, rect.width * 0.2)
        const insetY = Math.min(22, rect.height * 0.2)
        return (
          pointer.x >= rect.left + insetX
          && pointer.x <= rect.right - insetX
          && pointer.y >= rect.top + insetY
          && pointer.y <= rect.bottom - insetY
        )
      })
    : undefined
  const targetCollision = swapTarget
    ? pointerWithin(filteredArgs).find(({ id }) => id === swapTarget.container.id)
    : undefined
  if (targetCollision) return [targetCollision]

  const targetIndex = itemContainers.findIndex(({ rect }) => {
    const rowThreshold = Math.max(8, rect.height * 0.35)
    if (pointer.y < rect.top + rowThreshold) return true
    const sharesRow = pointer.y <= rect.bottom - rowThreshold
    return sharesRow && pointer.x < rect.left + rect.width / 2
  })

  sectionContainer.data.current = {
    ...sectionContainer.data.current,
    sectionId,
    targetIndex: targetIndex < 0 ? itemContainers.length : targetIndex,
  } satisfies DropData

  return [sectionCollision]
}

export function ProcessSectionBoard(props: {
  interactive: boolean
  onChange: (sections: ProcessSection[]) => void
  onDeleteSection: (sectionId: string) => void
  processesById: Map<string, CreatedProcess>
  renderProcess: (process: CreatedProcess) => ReactNode
  sections: ProcessSection[]
}) {
  const { interactive, onChange, onDeleteSection, processesById, renderProcess, sections } = props
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const suppressClickRef = useRef(false)

  function handleDragEnd(event: DragEndEvent) {
    window.setTimeout(() => {
      suppressClickRef.current = false
    }, 0)
    const overData = event.over?.data.current as DropData | undefined
    if (!overData) return
    const processId = String(event.active.id)
    const activeSectionId = event.active.data.current?.sectionId as string | undefined
    const next =
      overData.processId && activeSectionId === overData.sectionId
        ? swapProcessPositions(sections, processId, overData.processId)
        : moveProcessToSection(
            sections,
            processId,
            overData.sectionId,
            overData.targetIndex
              ?? sections.find((section) => section.id === overData.sectionId)?.processIds.length
              ?? 0,
          )
    if (!processSectionsEqual(next, sections)) onChange(next)
  }

  return (
    <DndContext
      collisionDetection={collisionDetection}
      onDragCancel={() => {
        suppressClickRef.current = false
      }}
      onDragEnd={handleDragEnd}
      onDragStart={() => {
        suppressClickRef.current = true
      }}
      sensors={sensors}
    >
      <div className="group-board process-section-board">
        {sections.map((section) => (
          <ProcessSectionBlock
            interactive={interactive}
            key={section.id}
            onDeleteSection={onDeleteSection}
            processesById={processesById}
            renderProcess={renderProcess}
            section={section}
            suppressClickRef={suppressClickRef}
          />
        ))}
      </div>
    </DndContext>
  )
}

function ProcessSectionBlock(props: {
  interactive: boolean
  onDeleteSection: (sectionId: string) => void
  processesById: Map<string, CreatedProcess>
  renderProcess: (process: CreatedProcess) => ReactNode
  section: ProcessSection
  suppressClickRef: RefObject<boolean>
}) {
  const { interactive, onDeleteSection, processesById, renderProcess, section, suppressClickRef } = props
  const isDefaultSection = section.id.startsWith(DEFAULT_PROCESS_SECTION_ID)
  const { isOver, setNodeRef } = useDroppable({
    data: { sectionId: section.id } satisfies DropData,
    disabled: !interactive,
    id: `process-section:${section.id}`,
  })

  return (
    <section className={`group-section-block${isOver ? ' is-over' : ''}`} ref={setNodeRef}>
      <div className="group-section-row">
        <strong>{section.title}</strong>
        <i />
        {!isDefaultSection ? (
          <button
            aria-label={`Eliminar seccion ${section.title}`}
            className="process-section-delete"
            onClick={() => onDeleteSection(section.id)}
            title="Eliminar seccion"
            type="button"
          >
            <TrashIcon />
          </button>
        ) : null}
      </div>
      <div className="group-section-grid">
        {section.processIds.map((processId) => {
          const process = processesById.get(processId)
          return process ? (
            <DraggableProcess
              interactive={interactive}
              key={process.id}
              process={process}
              renderProcess={renderProcess}
              sectionId={section.id}
              suppressClickRef={suppressClickRef}
            />
          ) : null
        })}
      </div>
      <div className="group-section-drop-lane">
        {isOver ? 'Suelta el proceso en esta seccion' : 'Soltar aqui'}
      </div>
    </section>
  )
}

function DraggableProcess(props: {
  interactive: boolean
  process: CreatedProcess
  renderProcess: (process: CreatedProcess) => ReactNode
  sectionId: string
  suppressClickRef: RefObject<boolean>
}) {
  const { interactive, process, renderProcess, sectionId, suppressClickRef } = props
  const draggable = useDraggable({
    data: { processId: process.id, sectionId } satisfies DropData,
    disabled: !interactive,
    id: process.id,
  })
  const droppable = useDroppable({
    data: { processId: process.id, sectionId } satisfies DropData,
    disabled: !interactive,
    id: `process-target:${process.id}`,
  })
  const style: CSSProperties | undefined = draggable.transform
    ? {
        transform: `translate3d(${draggable.transform.x}px, ${draggable.transform.y}px, 0)`,
        zIndex: draggable.isDragging ? 10 : undefined,
      }
    : undefined

  return (
    <div
      {...draggable.attributes}
      {...draggable.listeners}
      className={[
        'group-board-slot',
        draggable.isDragging ? 'is-dragging' : '',
        droppable.isOver && !draggable.isDragging ? 'is-swap-target' : '',
      ].filter(Boolean).join(' ')}
      onClickCapture={(event) => {
        if (suppressClickRef.current) {
          event.preventDefault()
          event.stopPropagation()
        }
      }}
      ref={(node) => {
        draggable.setNodeRef(node)
        droppable.setNodeRef(node)
      }}
      style={style}
    >
      {renderProcess(process)}
    </div>
  )
}
