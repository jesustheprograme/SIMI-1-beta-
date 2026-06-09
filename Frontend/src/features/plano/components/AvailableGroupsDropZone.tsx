import { useDroppable } from '@dnd-kit/core'
import type { ReactNode } from 'react'
import { GROUPS_DROPPABLE_ID } from '../types'

type AvailableGroupsDropZoneProps = {
  children: ReactNode
  className: string
}

export function AvailableGroupsDropZone({ children, className }: AvailableGroupsDropZoneProps) {
  const { setNodeRef } = useDroppable({ id: GROUPS_DROPPABLE_ID })

  return (
    <section ref={setNodeRef} className={className}>
      {children}
    </section>
  )
}
