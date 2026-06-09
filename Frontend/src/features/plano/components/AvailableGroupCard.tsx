import { AnimatePresence, motion } from 'framer-motion'
import { getPlanoVariableId } from '../hooks/usePlanEditor'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import { getAvailableVariables, getSensorSummary } from '../utils/groupHelpers'
import { PaletteVariableRow } from './PaletteVariableRow'

type AvailableGroupCardProps = {
  group: CreatedSensorGroup
  isOpen: boolean
  normalizedQuery: string
  onToggle: (groupId: string) => void
  placedVariableIds: Set<string>
}

export function AvailableGroupCard({
  group,
  isOpen,
  normalizedQuery,
  onToggle,
  placedVariableIds,
}: AvailableGroupCardProps) {
  const groupMatchesQuery =
    !normalizedQuery ||
    group.name.toLowerCase().includes(normalizedQuery) ||
    getSensorSummary(group).toLowerCase().includes(normalizedQuery)
  const visibleVariables = getAvailableVariables(group, placedVariableIds).filter(
    (variable) => groupMatchesQuery || variable.toLowerCase().includes(normalizedQuery),
  )

  return (
    <article className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
      <div className="p-3">
        <button
          className="flex min-h-0 w-full items-start justify-between gap-3 rounded-lg bg-transparent p-0 text-left"
          onClick={() => onToggle(group.id)}
          type="button"
          aria-expanded={isOpen}
        >
          <div className="min-w-0">
            <strong className="block truncate text-sm text-zinc-900">{group.name}</strong>
            <span className="mt-1 block text-xs text-zinc-500">{getSensorSummary(group)}</span>
            <span className="mt-2 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-zinc-600">
              {visibleVariables.length} variable{visibleVariables.length === 1 ? '' : 's'}
            </span>
          </div>

          <ChevronIcon open={isOpen} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="space-y-2 border-t border-zinc-200 bg-white p-2">
              <VariableRows group={group} visibleVariables={visibleVariables} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  )
}

function VariableRows({
  group,
  visibleVariables,
}: {
  group: CreatedSensorGroup
  visibleVariables: string[]
}) {
  if (visibleVariables.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
        Todas las variables de este grupo estan en el plano.
      </div>
    )
  }

  return visibleVariables.map((variable) => {
    const variableId = getPlanoVariableId(group.id, variable)
    return (
      <PaletteVariableRow
        key={variableId}
        groupName={group.name}
        variableId={variableId}
        variableName={variable}
      />
    )
  })
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      className={`mt-1 h-4 w-4 shrink-0 text-zinc-500 transition ${open ? 'rotate-180' : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}
