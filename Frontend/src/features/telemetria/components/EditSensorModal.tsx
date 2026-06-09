import { useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import type { EditableSensorData } from '../utils/sensorOverrides'

const SENSOR_STATUS_OPTIONS: EditableSensorData['status'][] = ['Activo', 'Revision']

type EditSensorModalProps = {
  initialSensor: EditableSensorData & { id: string; value: string }
  onClose: () => void
  onSave: (data: EditableSensorData) => void
}

export function EditSensorModal({ initialSensor, onClose, onSave }: EditSensorModalProps) {
  const reduceMotion = useReducedMotion()
  const [isStatusOpen, setIsStatusOpen] = useState(false)
  const [form, setForm] = useState<EditableSensorData>({
    max: initialSensor.max,
    min: initialSensor.min,
    name: initialSensor.name,
    status: initialSensor.status,
    unit: initialSensor.unit,
  })
  const canSave =
    form.name.trim().length > 0 &&
    form.unit.trim().length > 0 &&
    form.min.trim().length > 0 &&
    form.max.trim().length > 0

  function updateField<Key extends keyof EditableSensorData>(field: Key, value: EditableSensorData[Key]) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="modal-backdrop sensor-edit-backdrop"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      role="presentation"
      transition={{ duration: reduceMotion ? 0 : 0.18, ease: 'easeOut' }}
      onMouseDown={onClose}
    >
      <motion.section
        animate={{ opacity: 1 }}
        className="sensor-edit-modal"
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="sensor-edit-modal-title"
        autoFocus
        onMouseDown={(event) => event.stopPropagation()}
        tabIndex={-1}
        transition={{
          duration: reduceMotion ? 0 : 0.24,
          ease: [0.22, 1, 0.36, 1],
        }}
      >
        <header>
          <span className="sensor-edit-mark">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
            </svg>
          </span>
          <div>
            <p>{initialSensor.id}</p>
            <h2 id="sensor-edit-modal-title">Editar sensor</h2>
          </div>
        </header>

        <label className="sensor-edit-field" htmlFor="sensor-edit-name">
          Nombre del sensor
          <input
            id="sensor-edit-name"
            maxLength={48}
            onChange={(event) => updateField('name', event.target.value)}
            value={form.name}
          />
        </label>

        <div className="sensor-edit-grid">
          <label className="sensor-edit-field" htmlFor="sensor-edit-min">
            Valor mínimo
            <input
              id="sensor-edit-min"
              onChange={(event) => updateField('min', event.target.value)}
              placeholder="Mínimo"
              type="number"
              value={form.min}
            />
          </label>

          <label className="sensor-edit-field" htmlFor="sensor-edit-max">
            Valor máximo
            <input
              id="sensor-edit-max"
              onChange={(event) => updateField('max', event.target.value)}
              placeholder="Máximo"
              type="number"
              value={form.max}
            />
          </label>
        </div>

        <div className="sensor-edit-grid">
          <div
            className="sensor-edit-field sensor-status-field"
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) {
                setIsStatusOpen(false)
              }
            }}
          >
            <span>Estado</span>
            <button
              aria-controls="sensor-edit-status-options"
              aria-expanded={isStatusOpen}
              aria-haspopup="listbox"
              className={isStatusOpen ? 'sensor-status-trigger is-open' : 'sensor-status-trigger'}
              id="sensor-edit-status"
              onClick={() => setIsStatusOpen((current) => !current)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsStatusOpen(false)
                }
              }}
              type="button"
            >
              <span className={`sensor-status-dot is-${form.status.toLowerCase()}`} />
              <span>{form.status === 'Revision' ? 'Revisión' : form.status}</span>
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>

            <AnimatePresence>
              {isStatusOpen ? (
                <motion.div
                  animate={{ height: 'auto', opacity: 1 }}
                  className="sensor-status-menu"
                  exit={{ height: 0, opacity: 0 }}
                  id="sensor-edit-status-options"
                  initial={{ height: 0, opacity: 0 }}
                  role="listbox"
                  transition={{
                    duration: reduceMotion ? 0 : 0.18,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  <div className="sensor-status-options">
                    {SENSOR_STATUS_OPTIONS.map((status) => {
                      const isSelected = form.status === status

                      return (
                        <button
                          aria-selected={isSelected}
                          className={isSelected ? 'sensor-status-option is-selected' : 'sensor-status-option'}
                          key={status}
                          onClick={() => {
                            updateField('status', status)
                            setIsStatusOpen(false)
                          }}
                          role="option"
                          type="button"
                        >
                          <span className={`sensor-status-dot is-${status.toLowerCase()}`} />
                          <span>{status === 'Revision' ? 'Revisión' : status}</span>
                          <svg aria-hidden="true" viewBox="0 0 24 24">
                            <path d="m5 12 4 4L19 6" />
                          </svg>
                        </button>
                      )
                    })}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <label className="sensor-edit-field" htmlFor="sensor-edit-unit">
            Unidad
            <select id="sensor-edit-unit" onChange={(event) => updateField('unit', event.target.value)} value={form.unit}>
              <option value="C">C</option>
              <option value="%">%</option>
              <option value="ppm">ppm</option>
            </select>
          </label>
        </div>

        <div className="sensor-edit-readonly">
          <small>Lectura actual</small>
          <strong>
            {initialSensor.value} {initialSensor.unit}
          </strong>
        </div>

        <nav className="sensor-edit-actions">
          <button className="sensor-edit-cancel" onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="sensor-edit-save"
            disabled={!canSave}
            onClick={() =>
              onSave({
                max: form.max.trim(),
                min: form.min.trim(),
                name: form.name.trim(),
                status: form.status,
                unit: form.unit.trim(),
              })
            }
            type="button"
          >
            Guardar
          </button>
        </nav>
      </motion.section>
    </motion.div>
  )
}
