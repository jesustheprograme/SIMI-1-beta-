import { useDraggable } from '@dnd-kit/core'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess } from '../../procesos/types'
import { getPaletteProcessDragId } from '../utils/dragHelpers'

type PaletteProcessRowProps = {
  groups: CreatedSensorGroup[]
  process: CreatedProcess
}

export function PaletteProcessRow({ groups, process }: PaletteProcessRowProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: getPaletteProcessDragId(process.id),
    data: {
      kind: 'palette-process',
      processId: process.id,
      processName: process.processName,
    },
  })
  const groupNames = process.groupIds
    .map((groupId) => groups.find((group) => group.id === groupId)?.name)
    .filter((groupName): groupName is string => Boolean(groupName))
  const variableCount = process.sensorVariables.length + groupNames.length

  return (
    <article
      ref={setNodeRef}
      className="group/plan-process cursor-grab rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-white hover:shadow-md active:scale-[0.99] active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <strong className="block truncate text-sm font-bold">{process.processName}</strong>
          <span className="mt-1 block truncate text-xs text-zinc-500">
            {groupNames.length ? groupNames.join(', ') : 'Sin grupos vinculados'}
          </span>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-zinc-200 transition group-hover/plan-process:bg-blue-50">
          Arrastrar
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
          {process.groupIds.length} grupo{process.groupIds.length === 1 ? '' : 's'}
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-600 ring-1 ring-zinc-200">
          {variableCount} enlace{variableCount === 1 ? '' : 's'}
        </span>
      </div>
    </article>
  )
}
