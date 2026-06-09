import { motion } from 'framer-motion'
import type { CreatedSensorGroup } from '../../telemetria'
import { getProcessReadings } from '../utils/processReadings'
import type { CreatedProcess, ProcessSensorReading } from '../types'
import { ProcessCountdown } from './ProcessCountdown'
import { ProcessLiveSummary } from './ProcessLiveSummary'

type ProcessCardProps = {
  createdGroups: CreatedSensorGroup[]
  disableEntryAnimation?: boolean
  liveReadings: Record<string, ProcessSensorReading>
  now: number
  onEdit: (process: CreatedProcess) => void
  onFinish: (process: CreatedProcess) => void
  onOpen: (processId: string) => void
  process: CreatedProcess
}

export function ProcessCard({
  createdGroups,
  disableEntryAnimation = false,
  liveReadings,
  now,
  onEdit,
  onFinish,
  onOpen,
  process,
}: ProcessCardProps) {
  const isFinished = Boolean(process.finishedAt)
  const readings = getProcessReadings(process, createdGroups, liveReadings)
  return (
    <motion.article
      className="created-group-card process-card is-clickable"
      key={process.id}
      onClick={() => onOpen(process.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(process.id)
        }
      }}
      role="button"
      tabIndex={0}
      initial={disableEntryAnimation ? false : { opacity: 0, scale: 0.96, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: -8 }}
      transition={disableEntryAnimation ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
      layout={!disableEntryAnimation}
    >
      <div className="created-group-card-header">
        <div>
          <span className="process-card-title-row"><strong>{process.processName}</strong></span>
          <span className="process-card-info-line">
            <strong>Nombre del cliente:</strong> {process.clientName || 'Sin asignar'}
          </span>
          <span className="process-card-info-line">
            <strong>Ubicado:</strong> {process.location || 'Sin ubicación'}
          </span>
          <span className="process-card-info-line">
            <strong>Operador inicial:</strong> {process.initialOperator || 'Sin asignar'}
          </span>
          <ProcessLiveSummary readings={readings} />
        </div>
      </div>
      {!isFinished ? (
        <div className="process-card-actions">
          <ProcessCountdown compact process={process} now={now} />
          <button
            className="created-group-edit"
            onClick={(event) => {
              event.stopPropagation()
              onEdit(process)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            type="button"
            aria-label={`Editar ${process.processName}`}
          >
            <EditIcon />
          </button>
        </div>
      ) : null}
      {!isFinished ? (
        <button
          className="process-card-finish"
          onClick={(event) => {
            event.stopPropagation()
            onFinish(process)
          }}
          onPointerDown={(event) => event.stopPropagation()}
          type="button"
        >
          <FinishIcon />
          Finalizar proceso
        </button>
      ) : null}
    </motion.article>
  )
}

function EditIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M0 0h24v24H0z" fill="none" />
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
        <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
      </g>
    </svg>
  )
}

function FinishIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 2h4" />
      <path d="M12 14v-4" />
      <path d="m15 11-3 3-2-2" />
      <circle cx="12" cy="14" r="8" />
    </svg>
  )
}
