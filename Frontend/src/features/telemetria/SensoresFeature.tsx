import { Fragment, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BreadcrumbNav } from '../../components/ui/BreadcrumbNav'
import { fakeSensorsByTitle, type FakeSensor } from './data/fakeSensors'
import { EditSensorModal } from './components/EditSensorModal'
import { SensorDetailPanel } from './components/SensorDetailPanel'
import { SensorValueDisplay } from './components/SensorValueDisplay'
import type { CreatedProcess, ProcessSensorReading } from '../procesos/types'
import type { CreatedSensorGroup } from './types/groups'
import type { PlanoLocationZone } from '../plano/types/plano'
import {
  applySensorOverride,
  getSensorOverrideKey,
  loadPersistedSensorOverrides,
  loadSensorOverrides,
  persistSensorOverrides,
  subscribeToSensorOverrides,
  type EditableSensorData,
} from './utils/sensorOverrides'
import { formatAssignment, getSensorGroupNames, getSensorLocationNames } from './utils/sensorAssignments'

type SensoresPageProps = {
  createdGroups: CreatedSensorGroup[]
  createdProcesses: CreatedProcess[]
  locationZones: PlanoLocationZone[]
  liveReadings: Record<string, ProcessSensorReading>
  title: string
}

export function SensoresPage({ createdGroups, createdProcesses, liveReadings, locationZones, title }: SensoresPageProps) {
  const sensorListRef = useRef<HTMLElement>(null)
  const displayTitle = title
  const [sensorOverrides, setSensorOverrides] = useState(() => loadSensorOverrides())
  const [editingSensor, setEditingSensor] = useState<FakeSensor | null>(null)
  const [expandedSensorIds, setExpandedSensorIds] = useState<Set<string>>(() => new Set())
  const sensors = (fakeSensorsByTitle[title] ?? []).map((sensor) => applySensorOverride(title, sensor, sensorOverrides))

  useEffect(() => {
    let cancelled = false
    const unsubscribe = subscribeToSensorOverrides((overrides) => {
      if (!cancelled) setSensorOverrides(overrides)
    })

    void loadPersistedSensorOverrides()
      .then((overrides) => {
        if (!cancelled) setSensorOverrides(overrides)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (expandedSensorIds.size === 0) return

    function handleOutsideSensorListClick(event: MouseEvent) {
      const target = event.target
      if (!(target instanceof Node)) return
      if (sensorListRef.current?.contains(target)) return

      setExpandedSensorIds(new Set())
    }

    document.addEventListener('mousedown', handleOutsideSensorListClick)
    return () => document.removeEventListener('mousedown', handleOutsideSensorListClick)
  }, [expandedSensorIds.size])

  function handleSaveSensorData(nextData: EditableSensorData) {
    if (!editingSensor) return

    setSensorOverrides((current) => {
      const next = {
        ...current,
        [getSensorOverrideKey(title, editingSensor.id)]: nextData,
      }

      persistSensorOverrides(next)
      return next
    })
    setEditingSensor(null)
  }

  function toggleSensor(sensorId: string) {
    setExpandedSensorIds((current) => {
      const next = new Set(current)

      if (next.has(sensorId)) {
        next.delete(sensorId)
      } else {
        next.add(sensorId)
      }

      return next
    })
  }

  return (
    <div className="dashboard-page">
      <BreadcrumbNav items={['Dashboard', 'Controladores', displayTitle]} />

      <div className="dashboard-heading compact">
        <h1>{displayTitle}</h1>
        <p>Gestiona lecturas, estados y agrupaciones para esta seccion.</p>
      </div>

      <section className="sensor-list" aria-label={`Listado de ${displayTitle}`} ref={sensorListRef}>
        <div className="sensor-list-header">
          <span>{title === 'PLC Jepkom' ? 'Variable' : 'Sensor'}</span>
          <span>Grupo</span>
          <span>Ubicación</span>
          <span>Valor</span>
          <span>Estado</span>
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </div>

        {sensors.map((sensor) => {
          const isExpanded = expandedSensorIds.has(sensor.id)
          const displayName = sensor.name
          const liveReading = liveReadings[`${title}::${sensor.id}`]
          const groupLabel = formatAssignment(getSensorGroupNames(title, sensor, createdGroups), 'Sin grupo')
          const locationLabel = formatAssignment(
            getSensorLocationNames(title, sensor, createdGroups, createdProcesses, locationZones),
            'Sin ubicación',
          )

          return (
            <Fragment key={sensor.id}>
              <article
                className={isExpanded ? 'sensor-row is-expanded' : 'sensor-row'}
                onClick={() => toggleSensor(sensor.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleSensor(sensor.id)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div>
                  <strong>{displayName}</strong>
                  <small>{sensor.id}</small>
                </div>
                <span>{groupLabel}</span>
                <span>{locationLabel}</span>
                <span className="sensor-value">
                  <SensorValueDisplay
                    sensorTitle={title}
                    unit={liveReading?.unit ?? sensor.unit}
                    value={liveReading?.value ?? sensor.value}
                  />
                </span>
                <span className={sensor.status === 'Activo' ? 'sensor-status is-active' : 'sensor-status'}>
                  {sensor.status}
                </span>
                <button
                  className="sensor-expand-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    toggleSensor(sensor.id)
                  }}
                  type="button"
                  aria-label={`${isExpanded ? 'Cerrar' : 'Ver'} detalles de ${displayName}`}
                  aria-expanded={isExpanded}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 16 }}>
                    <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
                <button
                  className="sensor-edit-button"
                  onClick={(event) => {
                    event.stopPropagation()
                    setEditingSensor(sensor)
                  }}
                  type="button"
                  aria-label={`Editar ${displayName}`}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 16 }}>
                    <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" fill="none" stroke="currentColor" strokeWidth="2" />
                  </svg>
                </button>
              </article>

              <AnimatePresence initial={false}>
                {isExpanded ? (
                  <motion.div
                    className="sensor-detail-motion"
                    initial={{ height: 0, opacity: 0, y: -6 }}
                    animate={{ height: 'auto', opacity: 1, y: 0 }}
                    exit={{ height: 0, opacity: 0, y: -6 }}
                    transition={{
                      height: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
                      opacity: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
                      y: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
                    }}
                  >
                    <SensorDetailPanel
                      displayName={displayName}
                      groupLabel={groupLabel}
                      liveReading={liveReading}
                      locationLabel={locationLabel}
                      sensor={sensor}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </Fragment>
          )
        })}
      </section>

      <AnimatePresence>
        {editingSensor ? (
          <EditSensorModal
            initialSensor={{
              id: editingSensor.id,
              max: editingSensor.max,
              min: editingSensor.min,
              name: editingSensor.name,
              status: editingSensor.status,
              unit: editingSensor.unit,
              value: liveReadings[`${title}::${editingSensor.id}`]?.value ?? editingSensor.value,
            }}
            onClose={() => setEditingSensor(null)}
            onSave={handleSaveSensorData}
          />
        ) : null}
      </AnimatePresence>

    </div>
  )
}
