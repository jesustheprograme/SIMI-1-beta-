import { useEffect, useMemo, useState } from 'react'
import { BreadcrumbNav } from '../../components/ui/BreadcrumbNav'
import type { CreatedSensorGroup } from '../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading } from './types'
import { ProcessCard } from './components/ProcessCard'
import { ProcessSearch } from './components/ProcessSearch'
import { filterProcesses } from './utils/processFilters'

type ProcessHistoryPageProps = {
  createdGroups: CreatedSensorGroup[]
  liveReadings: Record<string, ProcessSensorReading>
  onOpenProcess: (processId: string) => void
  processes: CreatedProcess[]
}

export function ProcessHistoryPage({
  createdGroups,
  liveReadings,
  onOpenProcess,
  processes,
}: ProcessHistoryPageProps) {
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const finishedProcesses = useMemo(
    () =>
      processes
        .filter((process) => Boolean(process.finishedAt))
        .sort((first, second) => getFinishedTime(second) - getFinishedTime(first)),
    [processes],
  )
  const filteredProcesses = useMemo(
    () => filterProcesses(finishedProcesses, query),
    [finishedProcesses, query],
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="dashboard-page">
      <BreadcrumbNav items={['Dashboard', 'Historial', 'Historial de Procesos']} />

      <div className="dashboard-heading compact">
        <h1>Historial de Procesos</h1>
        <p>Consulta los procesos finalizados, sus lecturas y registros operativos.</p>
      </div>

      <ProcessSearch onQueryChange={setQuery} query={query} />

      {finishedProcesses.length === 0 ? (
        <section className="groups-panel">
          <p className="groups-empty">Todavia no hay procesos finalizados.</p>
        </section>
      ) : filteredProcesses.length === 0 ? (
        <section className="groups-panel">
          <p className="groups-empty">No hay procesos finalizados que coincidan con la busqueda.</p>
        </section>
      ) : (
        <section className="created-groups-list" aria-label="Historial de procesos finalizados">
          {filteredProcesses.map((process) => (
            <ProcessCard
              createdGroups={createdGroups}
              disableEntryAnimation
              key={process.id}
              liveReadings={liveReadings}
              now={now}
              onEdit={() => undefined}
              onFinish={() => undefined}
              onOpen={onOpenProcess}
              process={process}
            />
          ))}
        </section>
      )}
    </div>
  )
}

function getFinishedTime(process: CreatedProcess) {
  const timestamp = new Date(process.finishedAt ?? process.deadlineAt ?? process.createdAt).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}
