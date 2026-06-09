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
import type { CSSProperties, ReactNode } from 'react'
import type { CreatedSensorGroup } from '../types/groups'
import type { GroupSection } from '../types/groupSections'
import {
  moveGroupToSection,
  sectionsEqual,
  swapGroupPositions,
} from '../utils/groupSections'

type GroupSectionBoardProps = {
  groupsById: Map<string, CreatedSensorGroup>
  interactive: boolean
  onChange: (sections: GroupSection[]) => void
  renderGroup: (group: CreatedSensorGroup) => ReactNode
  sections: GroupSection[]
}

type DropData = {
  groupId?: string
  sectionId: string
  targetIndex?: number
}

const groupBoardCollisionDetection: CollisionDetection = (args) => {
  const activeTargetId = `group-target:${String(args.active.id)}`
  const filteredArgs = {
    ...args,
    droppableContainers: args.droppableContainers.filter(
      ({ id }) => String(id) !== activeTargetId,
    ),
  }
  const sectionCollision = (
    pointerWithin(filteredArgs).find(({ id }) => String(id).startsWith('section:'))
    ?? rectIntersection(filteredArgs).find(({ id }) => String(id).startsWith('section:'))
  )
  if (!sectionCollision) return []

  const sectionContainer = args.droppableContainers.find(
    ({ id }) => id === sectionCollision.id,
  )
  const sectionId = sectionContainer?.data.current?.sectionId as string | undefined
  if (!sectionContainer || !sectionId) return [sectionCollision]

  const itemContainers = args.droppableContainers
    .filter(({ data, id }) => (
      String(id).startsWith('group-target:')
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

export function GroupSectionBoard(props: GroupSectionBoardProps) {
  const { groupsById, interactive, onChange, renderGroup, sections } = props
  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: { distance: 6 },
  }))

  function handleDragEnd(event: DragEndEvent) {
    const overData = event.over?.data.current as DropData | undefined
    if (!overData) return

    const groupId = String(event.active.id)
    const activeSectionId = event.active.data.current?.sectionId as string | undefined
    const nextSections =
      overData.groupId && activeSectionId === overData.sectionId
        ? swapGroupPositions(sections, groupId, overData.groupId)
        : moveGroupToSection(
            sections,
            groupId,
            overData.sectionId,
            overData.targetIndex
              ?? sections.find((section) => section.id === overData.sectionId)?.groupIds.length
              ?? 0,
          )
    if (!sectionsEqual(nextSections, sections)) onChange(nextSections)
  }

  return (
    <DndContext
      collisionDetection={groupBoardCollisionDetection}
      onDragEnd={handleDragEnd}
      sensors={sensors}
    >
      <div className="group-board">
        {sections.map((section) => (
          <GroupSectionBlock
            groupsById={groupsById}
            interactive={interactive}
            key={section.id}
            renderGroup={renderGroup}
            section={section}
          />
        ))}
      </div>
    </DndContext>
  )
}

function GroupSectionBlock(props: {
  groupsById: Map<string, CreatedSensorGroup>
  interactive: boolean
  renderGroup: (group: CreatedSensorGroup) => ReactNode
  section: GroupSection
}) {
  const { groupsById, interactive, renderGroup, section } = props
  const { isOver, setNodeRef } = useDroppable({
    data: { sectionId: section.id } satisfies DropData,
    disabled: !interactive,
    id: `section:${section.id}`,
  })

  return (
    <section
      className={`group-section-block${isOver ? ' is-over' : ''}`}
      ref={setNodeRef}
    >
      <div className="group-section-row">
        <strong>{section.title}</strong>
        <i />
      </div>

      <div className="group-section-grid">
        {section.groupIds.map((groupId) => {
          const group = groupsById.get(groupId)
          if (!group) return null
          return (
            <DraggableGroup
              group={group}
              interactive={interactive}
              key={group.id}
              renderGroup={renderGroup}
              sectionId={section.id}
            />
          )
        })}
      </div>

      <div className="group-section-drop-lane">
        {isOver ? 'Suelta el grupo en esta seccion' : 'Soltar aqui'}
      </div>
    </section>
  )
}

function DraggableGroup(props: {
  group: CreatedSensorGroup
  interactive: boolean
  renderGroup: (group: CreatedSensorGroup) => ReactNode
  sectionId: string
}) {
  const { group, interactive, renderGroup, sectionId } = props
  const draggable = useDraggable({
    data: { groupId: group.id, sectionId } satisfies DropData,
    disabled: !interactive,
    id: group.id,
  })
  const droppable = useDroppable({
    data: { groupId: group.id, sectionId } satisfies DropData,
    disabled: !interactive,
    id: `group-target:${group.id}`,
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
      ref={(node) => {
        draggable.setNodeRef(node)
        droppable.setNodeRef(node)
      }}
      style={style}
    >
      {renderGroup(group)}
    </div>
  )
}
