import { useMemo, useState } from 'react'
import './sensorGroupModal/SensorGroupModal.css'
import { AvailableVariablesPanel } from './sensorGroupModal/AvailableVariablesPanel'
import { CheckIcon, LayoutGridIcon, SparklesIcon, TrashIcon, XIcon } from './sensorGroupModal/icons'
import { SelectedVariablesPanel } from './sensorGroupModal/SelectedVariablesPanel'
import { useGroupBuilder } from './sensorGroupModal/useGroupBuilder'
import type { CreatedSensorGroup } from '../types/groups'
import type { ProcessSensorReading } from '../../procesos/types'
import { createLocalId } from '../../../utils/localId'
import { variables as defaultVariables } from './sensorGroupModal/data'
import type { Variable } from './sensorGroupModal/types'

type SensorGroupModalProps = {
  existingGroups?: CreatedSensorGroup[]
  initialGroup?: CreatedSensorGroup | null
  onClose: () => void
  onDelete?: (groupId: string) => void
  onSave: (group: CreatedSensorGroup) => void
  liveReadings?: Record<string, ProcessSensorReading>
  sensorTitle: string
}

export function SensorGroupModal({
  existingGroups = [],
  initialGroup = null,
  onClose,
  onDelete,
  onSave,
  liveReadings = {},
  sensorTitle,
}: SensorGroupModalProps) {
  const variables = useMemo(() => getLiveGroupVariables(liveReadings), [liveReadings])
  const builder = useGroupBuilder(initialGroup, variables)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showNameConflict, setShowNameConflict] = useState(false)
  const isEditing = Boolean(initialGroup)
  const initialDraftSignature = useMemo(
    () =>
      getGroupDraftSignature({
        name: initialGroup?.name ?? '',
        selected: initialGroup?.variables ?? [],
      }),
    [initialGroup],
  )
  const currentDraftSignature = getGroupDraftSignature({
    name: builder.name,
    selected: builder.selectedVariables.map((variable) => variable.name),
  })
  const hasDraftChanges = currentDraftSignature !== initialDraftSignature
  const saveStatusMessage = getSaveStatusMessage(builder.name, builder.selected.length)
  const duplicateSensors = getDuplicateSensors(builder.selectedVariables, existingGroups, initialGroup?.id)

  function buildGroupPayload() {
    return {
      categories: Array.from(new Set(builder.selectedVariables.map((variable) => variable.category))),
      createdAt: initialGroup?.createdAt ?? new Date().toISOString(),
      id: initialGroup?.id ?? createLocalId('group'),
      name: builder.name.trim() || initialGroup?.name || 'Grupo sin nombre',
      sensorTitle: initialGroup?.sensorTitle ?? sensorTitle,
      variableIds: builder.selectedVariables.map((variable) => variable.id),
      variables: builder.selectedVariables.map((variable) => variable.name),
    }
  }

  function handleSave() {
    if (!builder.canSave) return
    if (hasDuplicateGroupName(existingGroups, builder.name, initialGroup?.id)) {
      setShowNameConflict(true)
      return
    }

    onSave(buildGroupPayload())
    onClose()
  }

  function handleBackdropClose() {
    if (hasDraftChanges && builder.canSave) {
      if (hasDuplicateGroupName(existingGroups, builder.name, initialGroup?.id)) {
        setShowNameConflict(true)
        return
      }

      onSave(buildGroupPayload())
    }

    onClose()
  }

  function handleDelete() {
    if (!initialGroup || !onDelete) return

    onDelete(initialGroup.id)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropClose}>
      <main className="create-group-shell sensor-group-shell" onMouseDown={(event) => event.stopPropagation()}>
        <div className="create-group-card" role="dialog" aria-labelledby="sensor-group-modal-title">
          <header className="create-group-header">
            <div className="create-group-title">
              <div className="create-group-mark">
                <LayoutGridIcon />
              </div>
              <div>
                <h2 id="sensor-group-modal-title">{isEditing ? 'Editar grupo' : 'Crear grupo'}</h2>
                <p>
                  {isEditing
                    ? `Ajusta las variables y el nombre de ${initialGroup?.name}.`
                    : `Organiza variables para ${sensorTitle.toLowerCase()} y guarda una agrupacion reutilizable.`}
                </p>
              </div>
            </div>

            <button className="create-group-close" type="button" aria-label="Cerrar" onClick={onClose}>
              <XIcon />
            </button>
          </header>

          <div className="create-group-body">
            <div className="create-name-field">
              <label htmlFor="create-group-name">Nombre del grupo</label>
              {!builder.canSave ? (
                <p className="create-group-save-hint" role="status">
                  {saveStatusMessage}
                </p>
              ) : null}
              <div className="create-name-input">
                <input
                  id="create-group-name"
                  maxLength={40}
                  onChange={(event) => builder.setName(event.target.value)}
                  placeholder="Ej. Grupo ambiental linea 1"
                  value={builder.name}
                />
                <span>
                  <SparklesIcon />
                  {builder.name.length}/40
                </span>
              </div>
            </div>

            <div className="create-group-grid">
              <AvailableVariablesPanel
                add={builder.add}
                availableCount={builder.available.length}
                draggingId={builder.draggingId}
                filter={builder.filter}
                grouped={builder.grouped}
                groupedAll={builder.groupedAll}
                onDragEnd={() => builder.setDraggingId(null)}
                onDragStart={builder.handleDragStart}
                query={builder.query}
                selected={builder.selected}
                setFilter={builder.setFilter}
                setQuery={builder.setQuery}
                toggle={builder.toggle}
              />
              <SelectedVariablesPanel
                dropActive={builder.dropActive}
                onDragLeave={() => builder.setDropActive(false)}
                onDragOver={(event) => {
                  event.preventDefault()
                  builder.setDropActive(true)
                }}
                onDrop={builder.handleDrop}
                remove={builder.remove}
                selectedCount={builder.selected.length}
                variables={builder.selectedVariables}
              />
            </div>
            {duplicateSensors.length > 0 ? (
              <section className="duplicate-sensor-warning" role="status">
                <strong>Sensores ya usados en otros grupos</strong>
                <p>
                  {formatDuplicateSensorMessage(duplicateSensors)}
                </p>
              </section>
            ) : null}
          </div>

          <footer className="create-group-footer">
            {isEditing && initialGroup ? (
              <button
                className="delete-group-trigger"
                onClick={() => setShowDeleteConfirm(true)}
                type="button"
              >
                <TrashIcon />
                <span>Eliminar este grupo</span>
              </button>
            ) : (
              <div>
                <CheckIcon />
                <span>{`${builder.selected.length} variable${builder.selected.length === 1 ? '' : 's'} seleccionada${builder.selected.length === 1 ? '' : 's'}`}</span>
              </div>
            )}

            <nav>
              <button className="create-cancel-button" onClick={onClose} type="button">
                Cancelar
              </button>
              <button className="create-save-button" disabled={!builder.canSave} onClick={handleSave} type="button">
                {isEditing ? 'Guardar cambios' : 'Guardar grupo'}
              </button>
            </nav>
          </footer>

          {showDeleteConfirm && initialGroup && (
            <div className="delete-group-confirm-backdrop" role="presentation">
              <section
                className="delete-group-confirm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-group-confirm-title"
                aria-describedby="delete-group-confirm-description"
              >
                <span className="delete-group-confirm-icon">
                  <TrashIcon />
                </span>

                <div>
                  <h3 id="delete-group-confirm-title">Eliminar este grupo?</h3>
                  <p id="delete-group-confirm-description">
                    Esta accion eliminara "{initialGroup.name}" y puede afectar los componentes que usan
                    sus variables, como planos u otras vistas vinculadas.
                  </p>
                </div>

                <div className="delete-group-confirm-actions">
                  <button
                    className="delete-group-cancel"
                    onClick={() => setShowDeleteConfirm(false)}
                    type="button"
                  >
                    Cancelar
                  </button>
                  <button className="delete-group-confirm-button" onClick={handleDelete} type="button">
                    Si, eliminar
                  </button>
                </div>
              </section>
            </div>
          )}

          {showNameConflict ? (
            <NameConflictModal
              message="Este nombre ya lo tiene un grupo."
              onContinue={() => setShowNameConflict(false)}
              title="Nombre duplicado"
            />
          ) : null}

        </div>
      </main>
    </div>
  )
}

function NameConflictModal({
  message,
  onContinue,
  title,
}: {
  message: string
  onContinue: () => void
  title: string
}) {
  return (
    <div className="delete-group-confirm-backdrop" role="presentation">
      <section
        className="delete-group-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="name-conflict-title"
        aria-describedby="name-conflict-description"
      >
        <span className="delete-group-confirm-icon">
          <XIcon />
        </span>

        <div>
          <h3 id="name-conflict-title">{title}</h3>
          <p id="name-conflict-description">{message}</p>
        </div>

        <div className="delete-group-confirm-actions">
          <button className="delete-group-confirm-button" onClick={onContinue} type="button">
            Continuar
          </button>
        </div>
      </section>
    </div>
  )
}

function hasDuplicateGroupName(groups: CreatedSensorGroup[], name: string, currentGroupId?: string) {
  const normalizedName = normalizeName(name)
  if (!normalizedName) return false

  return groups.some((group) => group.id !== currentGroupId && normalizeName(group.name) === normalizedName)
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function getLiveGroupVariables(liveReadings: Record<string, ProcessSensorReading>): Variable[] {
  return defaultVariables.map((variable) => {
    const reading = Object.values(liveReadings).find((item) => getSensorCode(item.id) === variable.code)
    if (!reading) return variable

    return {
      ...variable,
      name: reading.name,
      unit: reading.unit,
      value: reading.value,
    }
  })
}

function getSensorCode(sensorId: string) {
  return sensorId.split('::').at(-1) ?? sensorId
}

function getGroupDraftSignature({ name, selected }: { name: string; selected: string[] }) {
  return JSON.stringify({
    name: name.trim(),
    selected: [...selected].map((item) => item.trim()).sort(),
  })
}

function getSaveStatusMessage(name: string, selectedCount: number) {
  if (!name.trim()) return 'Escribe un nombre y selecciona al menos 2 variables para guardar el grupo.'
  if (selectedCount === 0) return 'Selecciona al menos 2 variables para guardar el grupo.'
  if (selectedCount === 1) return 'Agrega una variable mas: los grupos necesitan minimo 2 variables.'
  return ''
}

type SelectedVariable = {
  id: string
  name: string
}

function getDuplicateSensors(
  selectedVariables: SelectedVariable[],
  groups: CreatedSensorGroup[],
  currentGroupId?: string,
) {
  const selectedById = new Map(selectedVariables.map((variable) => [variable.id, variable]))
  const selectedByName = new Map(
    selectedVariables.map((variable) => [normalizeVariableName(variable.name), variable]),
  )
  const duplicates = new Map<string, { groupNames: Set<string>; name: string }>()

  for (const group of groups) {
    if (group.id === currentGroupId) continue

    for (const variableId of group.variableIds ?? []) {
      const variable = selectedById.get(variableId)
      if (variable) addDuplicate(duplicates, variable.id, variable.name, group.name)
    }

    for (const variableName of group.variables) {
      const variable = selectedByName.get(normalizeVariableName(variableName))
      if (variable) addDuplicate(duplicates, variable.id, variable.name, group.name)
    }
  }

  return Array.from(duplicates.values()).map((duplicate) => ({
    groupNames: Array.from(duplicate.groupNames),
    name: duplicate.name,
  }))
}

function addDuplicate(
  duplicates: Map<string, { groupNames: Set<string>; name: string }>,
  id: string,
  name: string,
  groupName: string,
) {
  const current = duplicates.get(id) ?? { groupNames: new Set<string>(), name }
  current.groupNames.add(groupName)
  duplicates.set(id, current)
}

function normalizeVariableName(name: string) {
  return name.trim().toLowerCase()
}

function formatDuplicateSensorMessage(duplicates: Array<{ groupNames: string[]; name: string }>) {
  const visible = duplicates.slice(0, 3).map((duplicate) => {
    const groups = duplicate.groupNames.slice(0, 2).join(', ')
    const extraGroups = duplicate.groupNames.length > 2 ? ` +${duplicate.groupNames.length - 2}` : ''
    return `${duplicate.name} en ${groups}${extraGroups}`
  })
  const extraSensors = duplicates.length > 3 ? ` y ${duplicates.length - 3} mas` : ''

  return `${visible.join('; ')}${extraSensors}. Puedes guardarlo si el sensor debe compartir contexto, pero el dashboard debera contarlo una sola vez.`
}
