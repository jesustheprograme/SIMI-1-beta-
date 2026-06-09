import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { BreadcrumbNav } from '../../components/ui/BreadcrumbNav'
import type { CreatedSensorGroup } from '../telemetria/types/groups'
import type { CreatedProcess, ProcessLogEntry, ProcessSensorReading } from './types'
import {
  ProcessRecordsAreaChart,
} from './components/ProcessRecordsChart'
import {
  formatReadingValue,
  getProcessChartRecords,
} from './components/processChartHelpers'
import {
  getAllVariables,
  getProcessDetailStatus,
  getProcessInfoItems,
  getReadingOutlierState,
  getRecordDisplayId,
  getRecordReadingsByVariable,
  getRecordSortableId,
} from './components/processDetailHelpers'
import { downloadProcessRecordsExcel, downloadProcessRecordsPdf } from './components/processRecordExports'
import {
  ArrowLeftIcon,
  CircleIcon,
  ExcelIcon,
  InfoIcon,
  OutlierArrowIcon,
  PdfIcon,
  SearchIcon,
  SortIcon,
  XIcon,
} from './components/icons'
import { formatProcessDateOnly, formatProcessTimeOnly } from './utils/processDate'

type ProcessDetailPageProps = {
  createdGroups: CreatedSensorGroup[]
  historyMode?: boolean
  liveReadings: Record<string, ProcessSensorReading>
  logs: ProcessLogEntry[]
  onBack: () => void
  process: CreatedProcess
}

const PROCESS_RECORD_TABLE_BATCH_SIZE = 100

export function ProcessDetailPage({
  createdGroups,
  historyMode = false,
  logs,
  onBack,
  process,
}: ProcessDetailPageProps) {

  const pageRef = useRef<HTMLDivElement>(null)

  const [showInfoModal, setShowInfoModal] = useState(false)
  const [idSortDirection, setIdSortDirection] = useState<'asc' | 'desc'>('asc')
  const [recordQuery, setRecordQuery] = useState('')
  const [visibleTableCount, setVisibleTableCount] = useState(PROCESS_RECORD_TABLE_BATCH_SIZE)
  const [now, setNow] = useState(() => Date.now())

  const allVariables = useMemo(() => getAllVariables(process, createdGroups), [createdGroups, process])
  const processStatus = getProcessDetailStatus(process, now)
  const processInfoItems = getProcessInfoItems(process)

  const sortedLogs = useMemo(() => {
    const orderedLogs = [...logs].sort(
      (first, second) => getRecordSortableId(first, logs) - getRecordSortableId(second, logs),
    )

    return idSortDirection === 'asc' ? orderedLogs : orderedLogs.reverse()
  }, [idSortDirection, logs])
  const filteredTableLogs = useMemo(() => {
    const normalized = recordQuery.trim()

    if (!normalized) return sortedLogs

    return sortedLogs.filter((entry) => getRecordDisplayId(entry, logs).includes(normalized))
  }, [logs, recordQuery, sortedLogs])
  const chartRecords = useMemo(
    () => getProcessChartRecords(sortedLogs, logs, allVariables),
    [allVariables, logs, sortedLogs],
  )
  const visibleTableLogs = useMemo(
    () => filteredTableLogs.slice(0, visibleTableCount),
    [filteredTableLogs, visibleTableCount],
  )
  const hasMoreTableLogs = visibleTableLogs.length < filteredTableLogs.length

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  return (
    <div className="dashboard-page process-detail-page" ref={pageRef}>
      <BreadcrumbNav
        items={
          historyMode
            ? ['Dashboard', 'Historial', 'Historial de Procesos', process.processName]
            : ['Dashboard', 'Procesos', process.processName]
        }
      />

      <button className="process-detail-back" onClick={onBack} type="button">
        <ArrowLeftIcon />
        Volver a procesos
      </button>

      <header className="process-detail-title-block">
        <div>
          <div className="process-detail-title-meta">
            <span>Proceso</span>
            <i />
            <p className={`workspace-kicker process-detail-status is-${processStatus.status}`}>
              <CircleIcon />
              {processStatus.label}
            </p>
          </div>

          <h1 className="process-detail-title">{process.processName}</h1>
          <p>Resumen operativo y registros del monitoreo en tiempo real.</p>
        </div>

        <div className="process-detail-actions">
          <strong><span>{logs.length}</span> registros guardados</strong>

          <button
            aria-label="Descargar registros en Excel"
            disabled={logs.length === 0}
            onClick={() => downloadProcessRecordsExcel(process, createdGroups, logs)}
            title="Descargar Excel"
            type="button"
          >
            <ExcelIcon />
          </button>

          <button
            aria-label="Descargar registros en PDF"
            disabled={logs.length === 0}
            onClick={() => downloadProcessRecordsPdf(process, createdGroups, logs)}
            title="Descargar PDF"
            type="button"
          >
            <PdfIcon />
          </button>

          <button
            aria-label="Ver información del proceso"
            onClick={() => setShowInfoModal(true)}
            title="Ver información del proceso"
            type="button"
          >
            <InfoIcon />
          </button>
        </div>
      </header>

      <section
  className="process-records-list process-detail-records"
  aria-label="Historial de lecturas"
>
  {logs.length > 0 ? (
    <>
    <ProcessRecordsAreaChart
      allVariables={allVariables}
      key={process.id}
      processId={process.id}
      records={chartRecords}
    />

    <section className="process-records-table-card" aria-label="Registros del proceso">
      <header className="process-records-table-header">
        <div>
          <span>Registros</span>
          <h2>Historial de mediciones</h2>
        </div>

        <div className="process-records-table-tools">
          <label className="process-records-table-search">
            <SearchIcon />
            <input
              onChange={(event) => {
                setRecordQuery(event.target.value)
                setVisibleTableCount(PROCESS_RECORD_TABLE_BATCH_SIZE)
              }}
              placeholder="Buscar por ID de registro..."
              value={recordQuery}
            />
          </label>

          <button
            className="process-records-table-sort-button"
            aria-label={
              idSortDirection === 'asc'
                ? 'Invertir orden'
                : 'Ordenar registros del 1 al mas nuevo'
            }
            onClick={() => {
              setIdSortDirection((direction) => direction === 'asc' ? 'desc' : 'asc')
              setVisibleTableCount(PROCESS_RECORD_TABLE_BATCH_SIZE)
            }}
            type="button"
          >
            <SortIcon direction={idSortDirection} />
            {idSortDirection === 'asc' ? 'Invertir' : 'Invertir'}
          </button>
        </div>
      </header>

      <div
        className="process-records-table-wrap"
        style={
          {
            '--records-columns': allVariables.length + 3,
          } as CSSProperties
        }
      >
        <table className="process-records-table">
          <thead>
            <tr>
              <th>ID</th>

              <th>Fecha</th>
              <th>Hora</th>

              {allVariables.map((variable) => (
                <th key={variable.id} title={variable.name}>
                  <span className="process-record-column-label">
                    {variable.name}
                  </span>
                </th>
              ))}

            </tr>
          </thead>

          <tbody>
            {visibleTableLogs.length > 0 ? visibleTableLogs.map((entry) => {
              const originalIndex = logs.findIndex(
                (item) => item.id === entry.id,
              )
              const recordNumber = getRecordDisplayId(entry, logs, originalIndex)

              const dateLabel = formatProcessDateOnly(entry.createdAt)
              const timeLabel = formatProcessTimeOnly(entry.createdAt)

              const readingsMap = getRecordReadingsByVariable(entry, allVariables)

              return (
                <tr key={entry.id} className="is-clickable">
                  <td>
                    <span className="process-record-id">
                      {recordNumber}
                    </span>
                  </td>

                  <td>{dateLabel}</td>
                  <td>{timeLabel}</td>

                  {allVariables.map((variable) => {
                    const reading = readingsMap.get(variable.id)
                    const outlierState = reading ? getReadingOutlierState(reading, entry.outliers ?? []) : null

                    return (
                      <td
                        className={outlierState ? 'process-record-value-cell is-outlier' : 'process-record-value-cell'}
                        key={variable.id}
                        title={outlierState?.label}
                      >
                        {reading ? (
                          <span className="process-record-value">
                            {outlierState ? <OutlierArrowIcon direction={outlierState.direction} /> : null}
                            <span>{formatReadingValue(reading)}</span>
                          </span>
                        ) : (
                          <span className="process-record-missing">-</span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            }) : (
              <tr>
                <td className="process-records-empty-cell" colSpan={allVariables.length + 3}>
                  No hay registros que coincidan con la busqueda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="process-records-table-footer">
        <span>
          Mostrando <strong>{visibleTableLogs.length}</strong> de <strong>{filteredTableLogs.length}</strong> registros
        </span>
        <div>
          <button
            disabled={!hasMoreTableLogs}
            onClick={() => setVisibleTableCount((count) => count + PROCESS_RECORD_TABLE_BATCH_SIZE)}
            type="button"
          >
            Cargar 100 mas
          </button>
        </div>
      </footer>
    </section>
    </>
  ) : (
    <p className="process-records-empty">
      Proceso no ejecutado
    </p>
  )}
</section>

      {showInfoModal && (
        <div
          className="process-info-modal-backdrop"
          role="presentation"
          onMouseDown={() => setShowInfoModal(false)}
        >
          <section
            className="process-info-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="process-info-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header>
              <div>
                <p>Información del proceso</p>
                <h2 id="process-info-title">{process.processName}</h2>
                <span>
                  Cliente: {process.clientName || 'Cliente sin asignar'} -{' '}
                  Ubicación: {process.location || 'Ubicación sin asignar'}
                </span>
              </div>

              <button
                aria-label="Cerrar información"
                onClick={() => setShowInfoModal(false)}
                type="button"
              >
                <XIcon />
              </button>
            </header>

            <section
              className="process-info-detail-panel"
              aria-label="Información del proceso"
            >
              <div className="process-detail-info-block">
                <div className="process-detail-info-head">
                  <strong>Información del proceso</strong>
                  <div />
                </div>

                <dl className="process-detail-info-grid" aria-label="Información del proceso">
                  {processInfoItems.map((item) => (
                    <div className={item.wide ? 'is-wide' : undefined} key={item.label}>
                      <dt>{item.label}</dt>
                      <dd>{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </section>
          </section>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------
// Funciones auxiliares
// ------------------------------------------------------------
