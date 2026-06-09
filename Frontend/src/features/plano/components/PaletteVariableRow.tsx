import { useDraggable } from '@dnd-kit/core'
import { getPaletteDragId } from '../utils/dragHelpers'

type PaletteVariableRowProps = {
  groupName: string
  variableId: string
  variableName: string
}

export function PaletteVariableRow({ groupName, variableId, variableName }: PaletteVariableRowProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: getPaletteDragId(variableId),
    data: {
      groupName,
      kind: 'palette-variable',
      variableId,
      variableName,
    },
  })

  return (
    <div
      ref={setNodeRef}
      className="group/plan-variable flex cursor-grab items-center justify-between gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-white hover:shadow-md active:scale-[0.99] active:cursor-grabbing"
      {...attributes}
      {...listeners}
    >
      <span className="min-w-0 truncate text-sm font-semibold">{variableName}</span>
      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-zinc-500 ring-1 ring-zinc-200 transition group-hover/plan-variable:bg-zinc-100">
        Arrastrar
      </span>
    </div>
  )
}
