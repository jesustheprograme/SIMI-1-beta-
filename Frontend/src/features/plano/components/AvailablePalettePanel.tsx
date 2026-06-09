import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess } from '../../procesos/types'
import type { AvailableMode } from '../types'
import { AvailableGroupCard } from './AvailableGroupCard'
import { AvailableGroupsDropZone } from './AvailableGroupsDropZone'
import { PaletteProcessRow } from './PaletteProcessRow'

type AvailablePalettePanelProps = {
  availableMode: AvailableMode
  createdGroups: CreatedSensorGroup[]
  filteredGroups: CreatedSensorGroup[]
  filteredProcesses: CreatedProcess[]
  groupQuery: string
  isReturningVariable: boolean
  normalizedQuery: string
  onGroupQueryChange: (query: string) => void
  onModeChange: (mode: AvailableMode) => void
  onToggleGroup: (groupId: string) => void
  openGroups: Record<string, boolean>
  placedVariableIds: Set<string>
  planoProcesses: CreatedProcess[]
}

export function AvailablePalettePanel(props: AvailablePalettePanelProps) {
  return (
    <AvailableGroupsDropZone
      className={`plan-group-dropzone relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm ring-1 ring-zinc-200/80 transition ${
        props.isReturningVariable ? 'ring-2 ring-blue-400/70' : ''
      }`}
    >
      <div className={`transition duration-150 ${props.isReturningVariable ? 'pointer-events-none scale-[0.98] opacity-35 blur-[2px]' : ''}`}>
        <PaletteHeader />
        <PaletteSearch query={props.groupQuery} onChange={props.onGroupQueryChange} />
        <PaletteMode value={props.availableMode} onChange={props.onModeChange} />
        <PaletteList {...props} />
      </div>
      {props.isReturningVariable ? <ReturnDropHint /> : null}
    </AvailableGroupsDropZone>
  )
}

function PaletteHeader() {
  return (
    <>
      <h2 className="text-lg font-bold tracking-tight">Grupos disponibles</h2>
      <p className="mt-1 text-sm leading-5 text-zinc-600">
        Filtra grupos o procesos. Los procesos se arrastran completos y se abren en el plano para consultar sus variables.
      </p>
    </>
  )
}

function PaletteSearch({ query, onChange }: { query: string; onChange: (query: string) => void }) {
  return (
    <div className="mt-3 flex min-h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 transition focus-within:border-zinc-400 focus-within:bg-white">
      <svg aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-500" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      </svg>
      <input
        className="h-10 bg-transparent text-sm text-zinc-900 placeholder:text-zinc-400"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Buscar grupo, proceso o variable..."
        value={query}
      />
    </div>
  )
}

function PaletteMode({ value, onChange }: { value: AvailableMode; onChange: (mode: AvailableMode) => void }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-zinc-100 p-1">
      {(['processes', 'groups'] as const).map((mode) => (
        <button
          className={`min-h-9 rounded-lg text-sm font-bold transition ${
            value === mode ? 'bg-white text-zinc-950 shadow-sm' : 'text-zinc-500 hover:text-zinc-800'
          }`}
          key={mode}
          onClick={() => onChange(mode)}
          type="button"
        >
          {mode === 'processes' ? 'Procesos' : 'Grupos'}
        </button>
      ))}
    </div>
  )
}

function PaletteList(props: AvailablePalettePanelProps) {
  return (
    <div className="plan-group-scroll mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
      {props.availableMode === 'processes' ? <ProcessList {...props} /> : <GroupList {...props} />}
    </div>
  )
}

function ProcessList({ createdGroups, filteredProcesses, planoProcesses }: AvailablePalettePanelProps) {
  if (planoProcesses.length === 0) return <EmptyPaletteText text="Aun no hay procesos creados." />
  if (filteredProcesses.length === 0) return <EmptyPaletteText text="No hay procesos disponibles que coincidan." />

  return filteredProcesses.map((process) => (
    <PaletteProcessRow groups={createdGroups} key={process.id} process={process} />
  ))
}

function GroupList(props: AvailablePalettePanelProps) {
  if (props.createdGroups.length === 0) return <EmptyPaletteText text="Aun no hay grupos creados." />
  if (props.filteredGroups.length === 0) return <EmptyPaletteText text="No hay grupos o variables que coincidan con la busqueda." />

  return props.filteredGroups.map((group) => (
    <AvailableGroupCard
      group={group}
      isOpen={props.openGroups[group.id] ?? false}
      key={group.id}
      normalizedQuery={props.normalizedQuery}
      onToggle={props.onToggleGroup}
      placedVariableIds={props.placedVariableIds}
    />
  ))
}

function EmptyPaletteText({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-zinc-300 p-4 text-sm text-zinc-500">{text}</div>
}

function ReturnDropHint() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center bg-white/55 p-5 backdrop-blur-sm">
      <div className="rounded-2xl border-2 border-dashed border-blue-400 bg-white/90 px-5 py-4 text-center shadow-xl shadow-blue-950/10">
        <p className="text-sm font-bold text-zinc-900">Dejalo caer aqui</p>
        <p className="mt-1 text-xs font-medium text-zinc-600">La variable regresara a su grupo disponible.</p>
      </div>
    </div>
  )
}
