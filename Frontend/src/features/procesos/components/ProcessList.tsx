import { AnimatePresence } from 'framer-motion'
import type { CreatedSensorGroup } from '../../telemetria'
import type { CreatedProcess, ProcessSensorReading } from '../types'
import { ProcessCard } from './ProcessCard'

type ProcessListProps = {
  createdGroups: CreatedSensorGroup[]
  filteredProcesses: CreatedProcess[]
  liveReadings: Record<string, ProcessSensorReading>
  now: number
  onEdit: (process: CreatedProcess) => void
  onFinish: (process: CreatedProcess) => void
  onOpen: (processId: string) => void
  processes: CreatedProcess[]
}

export function ProcessList({
  createdGroups,
  filteredProcesses,
  liveReadings,
  now,
  onEdit,
  onFinish,
  onOpen,
  processes,
}: ProcessListProps) {
  if (processes.length === 0) {
    return <section className="groups-panel"><p className="groups-empty">Todavia no hay procesos creados.</p></section>
  }
  if (filteredProcesses.length === 0) {
    return <section className="groups-panel"><p className="groups-empty">No hay procesos que coincidan con la busqueda.</p></section>
  }
  return (
    <section className="created-groups-list" aria-label="Procesos creados">
      <AnimatePresence initial={false}>
        {filteredProcesses.map((process) => (
          <ProcessCard
            createdGroups={createdGroups}
            key={process.id}
            liveReadings={liveReadings}
            now={now}
            onEdit={onEdit}
            onFinish={onFinish}
            onOpen={onOpen}
            process={process}
          />
        ))}
      </AnimatePresence>
    </section>
  )
}
