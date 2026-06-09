import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type MouseEvent as ReactMouseEvent,
  type SVGProps,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { getInferredCategories } from '../../../utils/categoryUtils'
import '../../telemetria/components/sensorGroupModal/SensorGroupModal.css'
import { fakeSensorsByTitle } from '../../telemetria/data/fakeSensors'
import { createLocalId } from '../../../utils/localId'
import {
  CheckIcon,
  DropletsIcon,
  LayoutGridIcon,
  PlusIcon,
  SearchIcon,
  SparklesIcon,
  ThermometerIcon,
  TrashIcon,
  WindIcon,
  XIcon,
} from '../../telemetria/components/sensorGroupModal/icons'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading, ProcessSensorVariable, ProcessType } from '../types'
import type { PlanoLocationZone } from '../../plano/types/plano'
import { formatProcessDateTime } from '../utils/processDate'

type ProcessCategory = 'Temperatura' | 'Humedad' | 'CO2' | 'Etileno'
type ProcessFilter = ProcessCategory | 'Todas'
type ProcessTab = 'groups' | 'variables'
type ContainerOption = 'Envase 1' | 'Envase 2' | 'Envase 3'
type VentilationOption = '70%' | '80%' | '90%'
type ReadingIntervalOption = '5' | '10' | '15' | '20' | 'custom'
type IconComponent = (props: SVGProps<SVGSVGElement>) => ReactNode
type LocationOption = {
  description?: string
  label: string
  value: string
}

type SelectableGroup = {
  category: ProcessCategory
  count: number
  id: string
  name: string
  variables: string[]
}

type SelectableVariable = ProcessSensorVariable & {
  category: ProcessCategory
  unit: string
  value: string
}

type ProcessModalProps = {
  allowEmptyLocation?: boolean
  confirmAutomaticLocation?: boolean
  createdGroups: CreatedSensorGroup[]
  defaultLocation?: string
  existingProcesses?: CreatedProcess[]
  initialProcess?: CreatedProcess | null
  liveReadings?: Record<string, ProcessSensorReading>
  locationZones?: PlanoLocationZone[]
  onClose: () => void
  onDelete?: (processId: string) => void
  onSave: (process: CreatedProcess) => void
  processType?: ProcessType
}

const CATEGORY_META: Record<ProcessCategory, { className: string; icon: IconComponent }> = {
  Temperatura: { className: 'is-temperature', icon: ThermometerIcon },
  Humedad: { className: 'is-humidity', icon: DropletsIcon },
  CO2: { className: 'is-co2', icon: WindIcon },
  Etileno: { className: 'is-etileno', icon: SparklesIcon },
}
const CONTAINER_OPTIONS: ContainerOption[] = ['Envase 1', 'Envase 2', 'Envase 3']
const VENTILATION_OPTIONS: VentilationOption[] = ['70%', '80%', '90%']
const STANDARD_READING_INTERVALS = [5, 10, 15, 20] as const
const READING_INTERVAL_OPTIONS: ReadingIntervalOption[] = ['5', '10', '15', '20', 'custom']

export function ProcessModal({
  allowEmptyLocation = false,
  confirmAutomaticLocation = false,
  createdGroups,
  defaultLocation = '',
  existingProcesses = [],
  initialProcess = null,
  liveReadings = {},
  locationZones = [],
  onClose,
  onDelete,
  onSave,
  processType = 'almacenado',
}: ProcessModalProps) {
  const [clientName, setClientName] = useState(initialProcess?.clientName ?? '')
  const [processName, setProcessName] = useState(initialProcess?.processName ?? '')
  const [binCount, setBinCount] = useState(initialProcess?.binCount ?? '')
  const [product, setProduct] = useState(initialProcess?.product ?? '')
  const [origin, setOrigin] = useState(initialProcess?.origin ?? '')
  const [destination, setDestination] = useState(initialProcess?.destination ?? '')
  const [initialOperator, setInitialOperator] = useState(initialProcess?.initialOperator ?? '')
  const initialReadingInterval = normalizeReadingInterval(initialProcess?.readingIntervalSeconds)
  const [readingIntervalOption, setReadingIntervalOption] = useState<ReadingIntervalOption>(
    isStandardReadingInterval(initialReadingInterval) ? String(initialReadingInterval) as ReadingIntervalOption : 'custom',
  )
  const [customReadingInterval, setCustomReadingInterval] = useState(
    isStandardReadingInterval(initialReadingInterval) ? '30' : String(initialReadingInterval),
  )
  const [container, setContainer] = useState<ContainerOption | ''>(
    isContainerOption(initialProcess?.container) ? initialProcess.container : '',
  )
  const [ventilation, setVentilation] = useState<VentilationOption | ''>(
    isVentilationOption(initialProcess?.ventilation) ? initialProcess.ventilation : '',
  )
  const [initialComment, setInitialComment] = useState(initialProcess?.initialComment ?? initialProcess?.finalObservation ?? '')
  const [location, setLocation] = useState(initialProcess?.location ?? defaultLocation)
  const [deadlineAt, setDeadlineAt] = useState(() => toDateTimeLocalValue(initialProcess?.deadlineAt))
  const [deadlineTouched, setDeadlineTouched] = useState(() => Boolean(initialProcess?.deadlineAt))
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(initialProcess?.groupIds ?? [])
  const [selectedVariables, setSelectedVariables] = useState<ProcessSensorVariable[]>(
    initialProcess?.sensorVariables ?? [],
  )
  const [tab, setTab] = useState<ProcessTab>('groups')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ProcessFilter>('Todas')
  const [openGroupInfo, setOpenGroupInfo] = useState<{
    group: SelectableGroup
    x: number
    y: number
  } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showAutomaticLocationConfirm, setShowAutomaticLocationConfirm] = useState(false)
  const [showCreateConfirm, setShowCreateConfirm] = useState(false)
  const [showNameConflict, setShowNameConflict] = useState(false)
  const isEditing = Boolean(initialProcess)
  const isFinished = Boolean(initialProcess?.finishedAt)
  const groups = useMemo(() => buildSelectableGroups(createdGroups), [createdGroups])
  const sensorVariables = useMemo(() => getSensorVariables(liveReadings), [liveReadings])
  const locationOptions = useMemo<LocationOption[]>(
    () => {
      const options = locationZones.map((zone) => ({
        label: zone.name,
        value: zone.name,
      }))
      const assignedLocation = location.trim()

      if (
        initialProcess &&
        assignedLocation &&
        !options.some((option) => option.value === assignedLocation)
      ) {
        return [
          {
            description: 'Ubicado asignado al proceso',
            label: assignedLocation,
            value: assignedLocation,
          },
          ...options,
        ]
      }

      return options
    },
    [initialProcess, location, locationZones],
  )
  const linkedCount = selectedGroupIds.length + selectedVariables.length
  const startAt = initialProcess?.createdAt ?? new Date().toISOString()
  const startAtLabel = toDateTimeLocalValue(startAt)
  const durationLabel = getProcessDurationLabel(startAt, deadlineTouched ? deadlineAt : '')
  const readingIntervalSeconds = getSelectedReadingInterval(readingIntervalOption, customReadingInterval)
  const hasValidReadingInterval =
    readingIntervalOption !== 'custom' ||
    (Number.isFinite(Number(customReadingInterval)) &&
      Number(customReadingInterval) >= 1 &&
      Number(customReadingInterval) <= 3600)
  const canSave = Boolean(
    processName.trim() &&
      (allowEmptyLocation || location.trim()) &&
      linkedCount > 0 &&
      hasValidReadingInterval,
  )
  const initialDraftSignature = useMemo(
    () =>
      getProcessDraftSignature({
        binCount: initialProcess?.binCount ?? '',
        clientName: initialProcess?.clientName ?? '',
        deadlineAt: initialProcess?.deadlineAt ? toDateTimeLocalValue(initialProcess.deadlineAt) : '',
        destination: initialProcess?.destination ?? '',
        container: isContainerOption(initialProcess?.container) ? initialProcess.container : '',
        initialComment: initialProcess?.initialComment ?? initialProcess?.finalObservation ?? '',
        groupIds: initialProcess?.groupIds ?? [],
        initialOperator: initialProcess?.initialOperator ?? '',
        location: initialProcess?.location ?? defaultLocation,
        origin: initialProcess?.origin ?? '',
        processName: initialProcess?.processName ?? '',
        product: initialProcess?.product ?? '',
        readingIntervalSeconds: normalizeReadingInterval(initialProcess?.readingIntervalSeconds),
        selectedVariables: initialProcess?.sensorVariables ?? [],
        ventilation: isVentilationOption(initialProcess?.ventilation) ? initialProcess.ventilation : '',
      }),
    [defaultLocation, initialProcess],
  )
  const currentDraftSignature = getProcessDraftSignature({
    binCount,
    clientName,
    deadlineAt: deadlineTouched ? deadlineAt : '',
    destination,
    container,
    initialComment,
    groupIds: selectedGroupIds,
    initialOperator,
    location,
    origin,
    processName,
    product,
    readingIntervalSeconds,
    selectedVariables,
    ventilation,
  })
  const hasDraftChanges = currentDraftSignature !== initialDraftSignature
  const canSubmitProcess =
    !isFinished &&
    hasValidReadingInterval &&
    (isEditing ? canSave || hasDraftChanges : canSave)
  const availableFilterOptions = useMemo(
    () => getAvailableFilterOptions(tab === 'groups' ? groups : sensorVariables),
    [groups, sensorVariables, tab],
  )
  const effectiveFilter = filter !== 'Todas' && availableFilterOptions.includes(filter) ? filter : 'Todas'
  const filteredGroups = useMemo(() => filterItems(groups, query, effectiveFilter), [effectiveFilter, groups, query])
  const filteredVariables = useMemo(
    () => filterItems(sensorVariables, query, effectiveFilter),
    [effectiveFilter, query, sensorVariables],
  )
  const visibleItemsCount = tab === 'groups' ? filteredGroups.length : filteredVariables.length
  const allVisibleSelected =
    visibleItemsCount > 0 &&
    (tab === 'groups'
      ? filteredGroups.every((group) => selectedGroupIds.includes(group.id))
      : filteredVariables.every((variable) => selectedVariables.some((item) => item.id === variable.id)))
  const listAnimationKey = `${tab}-${filter}-${query.trim().toLowerCase()}`

  function buildProcessPayload(): CreatedProcess {
    return {
      binCount: binCount.trim(),
      clientName: clientName.trim(),
      createdAt: startAt,
      deadlineAt: deadlineTouched && deadlineAt ? new Date(deadlineAt).toISOString() : undefined,
      destination: destination.trim(),
      duration: durationLabel,
      finalObservation: initialComment.trim(),
      finalOperator: initialProcess?.finalOperator ?? '',
      finalComment: initialProcess?.finalComment ?? '',
      finalReadings: initialProcess?.finalReadings,
      finishedAt: initialProcess?.finishedAt,
      container,
      groupIds: selectedGroupIds,
      id: initialProcess?.id ?? createLocalId('process'),
      initialComment: initialComment.trim(),
      location: location.trim(),
      origin: origin.trim(),
      processName: processName.trim() || initialProcess?.processName || 'Proceso sin nombre',
      processType: initialProcess?.processType ?? processType,
      product: product.trim(),
      readingIntervalSeconds,
      sensorVariables: selectedVariables,
      setPoint: initialProcess?.setPoint ?? '',
      initialOperator: initialOperator.trim(),
      totalWeight: initialProcess?.totalWeight ?? '',
      totalWeightUnit: initialProcess?.totalWeightUnit ?? 'kg',
      ventilation,
    }
  }

  function confirmSave() {
    if (hasDuplicateProcessName(existingProcesses, processName, initialProcess?.id)) {
      setShowCreateConfirm(false)
      setShowNameConflict(true)
      return
    }

    onSave({
      ...buildProcessPayload(),
    })
    onClose()
  }

  function handleSave() {
    if (!canSubmitProcess) return
    if (hasDuplicateProcessName(existingProcesses, processName, initialProcess?.id)) {
      setShowNameConflict(true)
      return
    }

    if (isEditing) {
      confirmSave()
      return
    }

    if (!canSave) {
      confirmSave()
      return
    }

    const hasPlanoLocation = locationZones.some((zone) => zone.name === location.trim())
    if (confirmAutomaticLocation && !hasPlanoLocation) {
      setShowAutomaticLocationConfirm(true)
      return
    }

    setShowCreateConfirm(true)
  }

  function handleDelete() {
    if (!initialProcess || !onDelete) return

    onDelete(initialProcess.id)
    onClose()
  }

  function toggleGroup(groupId: string) {
    setSelectedGroupIds((current) =>
      current.includes(groupId) ? current.filter((id) => id !== groupId) : [...current, groupId],
    )
  }

  function toggleVariable(variable: SelectableVariable) {
    setSelectedVariables((current) =>
      current.some((item) => item.id === variable.id)
        ? current.filter((item) => item.id !== variable.id)
        : [...current, { id: variable.id, name: variable.name, sensorTitle: variable.sensorTitle }],
    )
  }

  function toggleVisibleItems() {
    if (visibleItemsCount === 0) return

    if (tab === 'groups') {
      const visibleIds = filteredGroups.map((group) => group.id)

      setSelectedGroupIds((current) =>
        allVisibleSelected
          ? current.filter((id) => !visibleIds.includes(id))
          : Array.from(new Set([...current, ...visibleIds])),
      )
      return
    }

    const visibleIds = filteredVariables.map((variable) => variable.id)

    setSelectedVariables((current) =>
      allVisibleSelected
        ? current.filter((item) => !visibleIds.includes(item.id))
        : [
            ...current,
            ...filteredVariables
              .filter((variable) => !current.some((item) => item.id === variable.id))
              .map((variable) => ({ id: variable.id, name: variable.name, sensorTitle: variable.sensorTitle })),
          ],
    )
  }

  function toggleGroupInfo(group: SelectableGroup, event: ReactMouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect()

    setOpenGroupInfo((current) =>
      current?.group.id === group.id
        ? null
        : {
            group,
            x: rect.left + rect.width / 2,
            y: rect.top,
          },
    )
  }

  useEffect(() => {
    if (!openGroupInfo) return undefined

    function closeGroupInfoOnOutsideMouseDown(event: globalThis.MouseEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (
        target.closest('[data-process-modal-info-button="true"]') ||
        target.closest('[data-process-modal-info-popover="true"]')
      ) {
        return
      }

      setOpenGroupInfo(null)
    }

    window.addEventListener('mousedown', closeGroupInfoOnOutsideMouseDown, { capture: true })
    return () => window.removeEventListener('mousedown', closeGroupInfoOnOutsideMouseDown, { capture: true })
  }, [openGroupInfo])

  return (
    <div className="modal-backdrop process-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <main
        className="create-group-shell process-modal-shell"
        onMouseDown={(event) => {
          event.stopPropagation()
          setOpenGroupInfo(null)
        }}
      >
        <div className="create-group-card" role="dialog" aria-labelledby="process-modal-title">
          <header className="create-group-header process-modal-header">
            <div className="create-group-title">
              <div className="create-group-mark process-modal-mark">
                <LayoutGridIcon />
                <span>
                  <PlusIcon />
                </span>
              </div>
              <div className="process-modal-heading">
                <div>
                  <span>{isEditing ? 'Proceso existente' : 'Nuevo proceso'}</span>
                  <i />
                  <small>Operativo</small>
                </div>
                <h2 id="process-modal-title">{isEditing ? 'Editar proceso' : 'Crear proceso'}</h2>
                <p>Define la informacion operativa y vincula los grupos o variables que se monitorearan durante el proceso.</p>
              </div>
            </div>

            <div className="process-steps" aria-hidden="true">
              <ProcessStep active label="Informacion" value={1} />
              <ChevronRightIcon />
              <ProcessStep active label="Vinculos" value={2} />
              <ChevronRightIcon />
              <ProcessStep label="Revision" value={3} />
            </div>

            <button className="create-group-close" type="button" aria-label="Cerrar" onClick={onClose}>
              <XIcon />
            </button>
          </header>

          <div className="create-group-body process-modal-body">
            <ProcessSection eyebrow="Informacion del Proceso" title="">
              <section className="process-field-grid" aria-label="Informacion del proceso">
                <ProcessField icon={UsersIcon} label="Cliente" optional>
                  <input
                    maxLength={60}
                    onChange={(event) => setClientName(event.target.value)}
                    placeholder="Ej. Cliente norte"
                    value={clientName}
                  />
                </ProcessField>

                <ProcessField icon={WorkflowIcon} label="Proceso" required>
                  <input
                    aria-describedby={showNameConflict ? 'process-name-error' : undefined}
                    aria-invalid={showNameConflict}
                    className={showNameConflict ? 'is-invalid' : undefined}
                    maxLength={60}
                    onChange={(event) => {
                      setProcessName(event.target.value)
                      if (showNameConflict) setShowNameConflict(false)
                    }}
                    placeholder="Ej. Recepcion de materia prima"
                    value={processName}
                  />
                  {showNameConflict ? (
                    <span className="process-field-error" id="process-name-error" role="alert">
                      Este nombre ya lo tiene un proceso activo.
                    </span>
                  ) : null}
                </ProcessField>

                <ProcessField icon={BoxesIcon} label="Pallets" optional>
                  <input
                    min="0"
                    onChange={(event) => setBinCount(event.target.value)}
                    placeholder="Ej. 24"
                    type="number"
                    value={binCount}
                  />
                </ProcessField>

                <ProcessField icon={PackageIcon} label="Producto" optional>
                  <input
                    maxLength={80}
                    onChange={(event) => setProduct(event.target.value)}
                    placeholder="Ej. Platano verde"
                    value={product}
                  />
                </ProcessField>

                <ProcessField className="has-option-picker-icon" icon={WindIcon} label="Ventilacion" optional>
                  <ProcessOptionPicker
                    label="Ventilacion"
                    onChange={setVentilation}
                    options={VENTILATION_OPTIONS}
                    value={ventilation}
                  />
                </ProcessField>

                <ProcessField className="has-option-picker-icon" icon={PackageIcon} label="Envase" optional>
                  <ProcessOptionPicker
                    label="Envase"
                    onChange={setContainer}
                    options={CONTAINER_OPTIONS}
                    value={container}
                  />
                </ProcessField>

                <ProcessField icon={MapPinIcon} label="Ubicado">
                  {confirmAutomaticLocation || locationOptions.length > 0 ? (
                    <LocationPicker
                      emptyText="No hay ubicados con ese nombre"
                      onChange={setLocation}
                      options={locationOptions}
                      placeholder="Selecciona o escribe un ubicado"
                      value={location}
                    />
                  ) : (
                    <input
                      maxLength={80}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Crea un ubicado desde el plano"
                      value={location}
                    />
                  )}
                </ProcessField>

                <ProcessField icon={ClockIcon} label="Inicio" optional>
                  <input className="process-date-input" readOnly type="datetime-local" value={startAtLabel} />
                </ProcessField>

                <ProcessField icon={ClockIcon} label="Final" optional>
                  <input
                    className="process-date-input"
                    onChange={(event) => {
                      setDeadlineTouched(true)
                      setDeadlineAt(event.target.value)
                    }}
                    type="datetime-local"
                    value={deadlineAt}
                  />
                </ProcessField>

                <ProcessField icon={TimerIcon} label="Duracion" optional>
                  <input readOnly value={durationLabel} />
                </ProcessField>

                <ProcessField icon={UsersIcon} label="Operador inicial" optional>
                  <input
                    maxLength={60}
                    onChange={(event) => setInitialOperator(event.target.value)}
                    placeholder="Ej. Juan Perez"
                    value={initialOperator}
                  />
                </ProcessField>

                <ProcessField className="has-option-picker-icon" icon={TimerIcon} label="Intervalo de lectura">
                  <span className="process-reading-interval">
                    <ProcessOptionPicker
                      formatOption={(option) => option === 'custom' ? 'Personalizado' : `${option}s`}
                      icon={TimerIcon}
                      label="Intervalo de lectura"
                      onChange={(option) => {
                        if (option) setReadingIntervalOption(option)
                      }}
                      options={READING_INTERVAL_OPTIONS}
                      value={readingIntervalOption}
                    />
                    <AnimatePresence initial={false}>
                      {readingIntervalOption === 'custom' ? (
                        <motion.span
                          animate={{ height: 44, opacity: 1, y: 0 }}
                          className="process-reading-interval-custom"
                          exit={{ height: 0, opacity: 0, y: -5 }}
                          initial={{ height: 0, opacity: 0, y: -5 }}
                          transition={{ duration: 0.16, ease: 'easeOut' }}
                        >
                          <input
                            aria-label="Intervalo personalizado en segundos"
                            max="3600"
                            min="1"
                            onChange={(event) => setCustomReadingInterval(event.target.value)}
                            placeholder="Segundos"
                            type="number"
                            value={customReadingInterval}
                          />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </span>
                </ProcessField>

              </section>
            </ProcessSection>

            <ProcessSection eyebrow="Trayecto" title="">
              <section className="process-field-grid" aria-label="Trayecto del proceso">
                <ProcessField icon={MapPinIcon} label="Origen" optional>
                  <input
                    maxLength={80}
                    onChange={(event) => setOrigin(event.target.value)}
                    placeholder="Ej. Camara de recepcion"
                    value={origin}
                  />
                </ProcessField>

                <ProcessField icon={MapPinIcon} label="Destino" optional>
                  <input
                    maxLength={80}
                    onChange={(event) => setDestination(event.target.value)}
                    placeholder="Ej. Camara de maduracion"
                    value={destination}
                  />
                </ProcessField>
              </section>
            </ProcessSection>

            <ProcessSection eyebrow="Comentarios" title="">
              <section className="process-field-grid" aria-label="Comentarios del proceso">
                <ProcessField className="is-wide" icon={MessageIcon} label="Comentario Inicial" optional>
                  <textarea
                    maxLength={240}
                    onChange={(event) => setInitialComment(event.target.value)}
                    placeholder="Observaciones al iniciar el proceso"
                    value={initialComment}
                  />
                </ProcessField>

              </section>
            </ProcessSection>

            <ProcessSection eyebrow="Vinculaciones" title={`${linkedCount} seleccionadas`}>
              <section className="process-link-panel">
                <div className="process-link-toolbar">
                  <div className="process-tabs" role="tablist" aria-label="Tipo de vinculacion">
                    <TabButton
                      active={tab === 'groups'}
                      count={selectedGroupIds.length}
                      icon={LayersIcon}
                      label="Grupos creados"
                      onClick={() => setTab('groups')}
                      total={groups.length}
                    />
                    <TabButton
                      active={tab === 'variables'}
                      count={selectedVariables.length}
                      icon={RadioIcon}
                      label="Variables de sensores"
                      onClick={() => setTab('variables')}
                      total={sensorVariables.length}
                    />
                  </div>

                  <div className="process-toolbar-actions">
                    <button
                      className={allVisibleSelected ? 'process-bulk-toggle is-active' : 'process-bulk-toggle'}
                      disabled={visibleItemsCount === 0}
                      onClick={toggleVisibleItems}
                      type="button"
                    >
                      {allVisibleSelected ? <XIcon /> : <CheckIcon />}
                      {allVisibleSelected ? 'Desmarcar todas' : 'Marcar todas'}
                    </button>

                    <label className="process-search">
                      <SearchIcon />
                      <input
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder={`Buscar ${tab === 'groups' ? 'grupos' : 'variables'}...`}
                        value={query}
                      />
                    </label>
                  </div>
                </div>

                <div className="process-filter-row">
                  {availableFilterOptions.map((category) => (
                    <FilterChip
                      active={effectiveFilter === category}
                      category={category}
                      key={category}
                      onClick={() => setFilter(category)}
                    />
                  ))}
                </div>

                <div className="process-link-list">
                  {tab === 'groups' ? (
                    filteredGroups.length > 0 ? (
                      <div className="process-link-grid" key={listAnimationKey}>
                        {filteredGroups.map((group, index) => (
                          <SelectableCard
                            category={group.category}
                            index={index}
                            key={group.id}
                            onClick={() => toggleGroup(group.id)}
                            onInfoClick={(event) => toggleGroupInfo(group, event)}
                            infoOpen={openGroupInfo?.group.id === group.id}
                            selected={selectedGroupIds.includes(group.id)}
                            subtitle={`${group.count} variables · ${group.category}`}
                            title={group.name}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="process-picker-empty">No hay grupos para esta busqueda.</p>
                    )
                  ) : filteredVariables.length > 0 ? (
                    <div className="process-link-grid" key={listAnimationKey}>
                      {filteredVariables.map((variable, index) => (
                        <SelectableCard
                          category={variable.category}
                          index={index}
                          key={variable.id}
                          onClick={() => toggleVariable(variable)}
                          selected={selectedVariables.some((item) => item.id === variable.id)}
                          subtitle={`${variable.sensorTitle} · ${variable.value} ${variable.unit}`}
                          title={variable.name}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="process-picker-empty">No hay variables para esta busqueda.</p>
                  )}
                </div>
              </section>
            </ProcessSection>
          </div>

          <footer className="create-group-footer">
            {isEditing && isFinished ? (
              <div>
                <CheckIcon />
                <span>Proceso terminado - edicion inhabilitada</span>
              </div>
            ) : isEditing && initialProcess ? (
              <button
                className="delete-group-trigger"
                onClick={() => setShowDeleteConfirm(true)}
                type="button"
              >
                <TrashIcon />
                <span>Eliminar este proceso</span>
              </button>
            ) : (
              <div>
                <SparklesIcon />
                <span>
                  {linkedCount > 0
                    ? `${linkedCount} vinculaciones - ${selectedGroupIds.length} grupos, ${selectedVariables.length} variables`
                    : 'Selecciona al menos un grupo o variable'}
                </span>
              </div>
            )}

            <nav>
              <button className="create-cancel-button" onClick={onClose} type="button">
                Cancelar
              </button>
              {!isFinished ? (
                <button className="create-save-button" disabled={!canSubmitProcess} onClick={handleSave} type="button">
                  <CheckIcon />
                  {isEditing || linkedCount === 0 ? 'Guardar cambios' : 'Crear proceso'}
                </button>
              ) : null}
            </nav>
          </footer>

          {showDeleteConfirm && initialProcess && (
            <div className="delete-group-confirm-backdrop" role="presentation">
              <section
                className="delete-group-confirm"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-process-confirm-title"
                aria-describedby="delete-process-confirm-description"
              >
                <span className="delete-group-confirm-icon">
                  <TrashIcon />
                </span>

                <div>
                  <h3 id="delete-process-confirm-title">Eliminar este proceso?</h3>
                  <p id="delete-process-confirm-description">
                    Esta accion eliminara "{initialProcess.processName}" de la lista de procesos guardados.
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

          {showCreateConfirm && (
            <ProcessCreateConfirm
              createdGroups={createdGroups}
              groupCount={selectedGroupIds.length}
              onCancel={() => setShowCreateConfirm(false)}
              onConfirm={confirmSave}
              process={buildProcessPayload()}
            />
          )}

          {showAutomaticLocationConfirm && (
            <AutomaticLocationConfirm
              onCancel={() => setShowAutomaticLocationConfirm(false)}
              onConfirm={() => {
                setShowAutomaticLocationConfirm(false)
                setShowCreateConfirm(true)
              }}
            />
          )}

          {openGroupInfo ? (
            <div
              className="process-info-floating-popover"
              data-process-modal-info-popover="true"
              role="dialog"
              aria-label={`Variables de ${openGroupInfo.group.name}`}
              onMouseDown={(event) => event.stopPropagation()}
              style={{
                left: openGroupInfo.x,
                top: openGroupInfo.y - 10,
              }}
            >
              <span>Variables</span>
              {openGroupInfo.group.variables.length > 0 ? (
                openGroupInfo.group.variables.map((variable) => <small key={variable}>{variable}</small>)
              ) : (
                <small>Sin variables asignadas</small>
              )}
            </div>
          ) : null}

        </div>
      </main>
    </div>
  )
}

function AutomaticLocationConfirm({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="process-create-confirm-backdrop" role="presentation">
      <section
        className="process-create-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="automatic-location-title"
        aria-describedby="automatic-location-description"
      >
        <header>
          <span className="process-create-confirm-icon">
            <CheckIcon />
          </span>
          <div>
            <span>Ubicacion automatica</span>
            <h3 id="automatic-location-title">Proceso sin ubicacion del plano</h3>
            <p id="automatic-location-description">
              Se creara una ubicacion alrededor del proceso en el punto seleccionado del plano.
            </p>
          </div>
        </header>

        <div className="process-create-confirm-actions">
          <button className="process-create-confirm-cancel" onClick={onCancel} type="button">
            Volver
          </button>
          <button className="process-create-confirm-save" onClick={onConfirm} type="button">
            Continuar
          </button>
        </div>
      </section>
    </div>
  )
}

function ProcessCreateConfirm({
  createdGroups,
  groupCount,
  onCancel,
  onConfirm,
  process,
}: {
  createdGroups: CreatedSensorGroup[]
  groupCount: number
  onCancel: () => void
  onConfirm: () => void
  process: CreatedProcess
}) {
  const [linksOpen, setLinksOpen] = useState(false)
  const deadlineLabel = process.deadlineAt
    ? formatProcessDateTime(process.deadlineAt)
    : 'Sin cronometro'
  const linkedGroups = process.groupIds
    .map((groupId) => createdGroups.find((group) => group.id === groupId))
    .filter((group): group is CreatedSensorGroup => Boolean(group))

  return (
    <div className="process-create-confirm-backdrop" role="presentation">
      <section
        className="process-create-confirm"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="create-process-confirm-title"
        aria-describedby="create-process-confirm-description"
      >
        <header>
          <span className="process-create-confirm-icon">
            <CheckIcon />
          </span>
          <div>
            <span>Revision final</span>
            <h3 id="create-process-confirm-title">Crear este proceso?</h3>
            <p id="create-process-confirm-description">
              Revisa la informacion antes de guardar el proceso en la lista operativa.
            </p>
          </div>
        </header>

        <dl className="process-create-confirm-summary">
          <div className="is-wide">
            <dt>Final</dt>
            <dd>{deadlineLabel}</dd>
          </div>
          <div>
            <dt>Inicio</dt>
            <dd>{formatProcessDate(process.createdAt)}</dd>
          </div>
          <div>
            <dt>Duracion</dt>
            <dd>{process.duration || 'Sin final'}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{process.clientName || 'Sin asignar'}</dd>
          </div>
          <div>
            <dt>Ubicacion</dt>
            <dd>{process.location || 'Se creara automaticamente'}</dd>
          </div>
          <div>
            <dt>Origen</dt>
            <dd>{process.origin || 'Sin definir'}</dd>
          </div>
          <div>
            <dt>Destino</dt>
            <dd>{process.destination || 'Sin definir'}</dd>
          </div>
          <div>
            <dt>Pallets</dt>
            <dd>{process.binCount || '0'}</dd>
          </div>
          <div>
            <dt>Producto</dt>
            <dd>{process.product || 'Sin definir'}</dd>
          </div>
          <div>
            <dt>Proceso</dt>
            <dd>{process.processName}</dd>
          </div>
          <div>
            <dt>Operador inicial</dt>
            <dd>{process.initialOperator || 'Sin asignar'}</dd>
          </div>
          <div>
            <dt>Intervalo de lectura</dt>
            <dd>{process.readingIntervalSeconds}s</dd>
          </div>
          <div className="is-wide">
            <dt>Comentario inicial</dt>
            <dd>{process.initialComment || 'Sin comentario'}</dd>
          </div>
          <div className="is-wide process-confirm-links">
            <dt>Vinculaciones</dt>
            <dd>
              <button
                aria-expanded={linksOpen}
                className="process-confirm-links-trigger"
                onClick={() => setLinksOpen((value) => !value)}
                type="button"
              >
                <span>
                  {groupCount} grupo{groupCount === 1 ? '' : 's'} - {process.sensorVariables.length} variable
                  {process.sensorVariables.length === 1 ? '' : 's'}
                </span>
                <ChevronDownIcon />
              </button>

              {linksOpen ? (
                <div className="process-confirm-links-panel">
                  {linkedGroups.length > 0 ? (
                    linkedGroups.map((group) => (
                      <div className="process-confirm-links-group" key={group.id}>
                        <p>{group.name}</p>
                        {group.variables.length > 0 ? (
                          <ul>
                            {group.variables.map((variable) => (
                              <li key={variable}>{variable}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="process-confirm-links-empty">Sin variables asignadas.</p>
                        )}
                      </div>
                    ))
                  ) : null}

                  {process.sensorVariables.length > 0 ? (
                    <div className="process-confirm-links-group">
                      <p>Variables individuales</p>
                      <ul>
                        {process.sensorVariables.map((variable) => (
                          <li key={variable.id}>
                            {variable.name}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </dd>
          </div>
        </dl>

        <div className="process-create-confirm-actions">
          <button className="process-create-confirm-cancel" onClick={onCancel} type="button">
            Volver
          </button>
          <button className="process-create-confirm-save" onClick={onConfirm} type="button">
            <CheckIcon />
            Crear proceso
          </button>
        </div>
      </section>
    </div>
  )
}

function LocationPicker({
  emptyText,
  onChange,
  options,
  placeholder,
  value,
}: {
  emptyText: string
  onChange: (value: string) => void
  options: LocationOption[]
  placeholder: string
  value: string
}) {
  const [open, setOpen] = useState(false)
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({})
  const triggerRef = useRef<HTMLDivElement>(null)
  const filtered = useMemo(() => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return options

    return options.filter(
      (option) =>
        option.label.toLowerCase().includes(normalized) ||
        option.description?.toLowerCase().includes(normalized),
    )
  }, [options, value])

  useLayoutEffect(() => {
    if (!open) return undefined

    function syncPanelPosition() {
      const rect = triggerRef.current?.getBoundingClientRect()
      if (!rect) return

      setPanelStyle({
        left: rect.left,
        top: rect.bottom + 8,
        width: rect.width,
      })
    }

    syncPanelPosition()
    window.addEventListener('resize', syncPanelPosition)
    window.addEventListener('scroll', syncPanelPosition, true)

    return () => {
      window.removeEventListener('resize', syncPanelPosition)
      window.removeEventListener('scroll', syncPanelPosition, true)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event: globalThis.MouseEvent) {
      const target = event.target as Node
      if (
        triggerRef.current?.contains(target) ||
        (target instanceof Element && target.closest('[data-location-picker-panel="true"]'))
      ) {
        return
      }

      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <>
      <div
        aria-expanded={open}
        className={value ? 'process-location-picker-trigger' : 'process-location-picker-trigger is-placeholder'}
        ref={triggerRef}
      >
        <input
          aria-label="Ubicado"
          onChange={(event) => {
            onChange(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          value={value}
        />
        <button
          aria-label={open ? 'Cerrar ubicados' : 'Mostrar ubicados'}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <ChevronDownIcon />
        </button>
      </div>

      {createPortal(
        <AnimatePresence>
          {open ? (
            <motion.div
              key="location-picker-panel"
              initial={{ opacity: 0, scale: 0.98, y: -6 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -5 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="process-location-picker-panel"
              data-location-picker-panel="true"
              style={panelStyle}
            >
              <div className="process-location-picker-list">
                {filtered.length > 0 ? (
                  filtered.map((option) => (
                    <button
                      className={
                        option.value === value
                          ? 'process-location-picker-option is-selected'
                          : 'process-location-picker-option'
                      }
                      key={option.value}
                      onClick={() => {
                        onChange(option.value)
                        setOpen(false)
                      }}
                      type="button"
                    >
                      <span>
                        <strong>{option.label}</strong>
                        {option.description ? <small>{option.description}</small> : null}
                      </span>
                      {option.value === value ? <CheckIcon /> : null}
                    </button>
                  ))
                ) : (
                  <div className="process-location-picker-empty">{emptyText}</div>
                )}
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>,
        document.body,
      )}
    </>
  )
}

function ProcessField({
  children,
  className = '',
  icon: Icon,
  label,
  optional = false,
  required = false,
  suffix,
  suffixNode,
}: {
  children: ReactNode
  className?: string
  icon: IconComponent
  label: string
  optional?: boolean
  required?: boolean
  suffix?: string
  suffixNode?: ReactNode
}) {
  return (
    <label className={['process-field', className].filter(Boolean).join(' ')}>
      <span>
        <strong>
          {label}
          {required ? <em>*</em> : null}
        </strong>
        {optional ? <small>Opcional</small> : null}
      </span>
      <span className="process-input-wrap">
        <Icon />
        {children}
        {suffixNode}
        {suffix ? <small>{suffix}</small> : null}
      </span>
    </label>
  )
}

function ProcessOptionPicker<T extends string>({
  formatOption = (option) => option,
  icon,
  label,
  onChange,
  options,
  value,
}: {
  formatOption?: (option: T) => string
  icon?: IconComponent
  label: string
  onChange: (value: T | '') => void
  options: readonly T[]
  value: T | ''
}) {
  const [open, setOpen] = useState(false)
  const pickerRef = useRef<HTMLSpanElement>(null)
  const OptionIcon = icon ?? (label === 'Ventilacion' ? WindIcon : PackageIcon)
  const selectedLabel = value ? formatOption(value) : 'Seleccionar'

  useEffect(() => {
    if (!open) return undefined

    function handlePointerDown(event: globalThis.MouseEvent) {
      if (pickerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <span className={`process-option-picker${open ? ' is-open' : ''}`} ref={pickerRef}>
      <button
        aria-expanded={open}
        aria-label={`Seleccionar ${label.toLowerCase()}`}
        className={value ? 'process-location-picker-trigger' : 'process-location-picker-trigger is-placeholder'}
        onClick={(event) => {
          event.preventDefault()
          setOpen((current) => !current)
        }}
        type="button"
      >
        <span className="process-option-picker-trigger-label">
          <OptionIcon />
          <span>{selectedLabel}</span>
        </span>
        <ChevronDownIcon />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.span
            key={`${label}-picker-panel`}
            initial={{ opacity: 0, scale: 0.98, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: -5 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="process-location-picker-panel process-option-picker-panel"
          >
            <span className="process-location-picker-list">
              {options.map((option) => (
                <button
                  className={
                    option === value
                      ? 'process-location-picker-option is-selected'
                      : 'process-location-picker-option'
                  }
                  key={option}
                  onClick={(event) => {
                    event.preventDefault()
                    onChange(option)
                    setOpen(false)
                  }}
                  type="button"
                >
                  <span className="process-option-picker-option-label">
                    <OptionIcon />
                    <strong>{formatOption(option)}</strong>
                  </span>
                  {option === value ? <CheckIcon /> : null}
                </button>
              ))}
            </span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  )
}

function ProcessSection({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode
  eyebrow: string
  title: string
}) {
  return (
    <section className="process-section">
      <header>
        <span>{eyebrow}</span>
        {title ? <h3>{title}</h3> : <div />}
      </header>
      {children}
    </section>
  )
}

function TabButton({
  active,
  count,
  icon: Icon,
  label,
  onClick,
  total,
}: {
  active: boolean
  count: number
  icon: IconComponent
  label: string
  onClick: () => void
  total: number
}) {
  return (
    <button className={active ? 'process-tab is-active' : 'process-tab'} onClick={onClick} type="button">
      <Icon />
      <span>{label}</span>
      <strong>{count}/{total}</strong>
    </button>
  )
}

function FilterChip({
  active,
  category,
  onClick,
}: {
  active: boolean
  category: ProcessFilter
  onClick: () => void
}) {
  const Icon = category === 'Todas' ? null : CATEGORY_META[category].icon
  const label = category === 'Todas' ? 'Seleccionar' : category

  return (
    <button className={active ? 'process-filter-chip is-active' : 'process-filter-chip'} onClick={onClick} type="button">
      {Icon ? <Icon /> : null}
      {label}
    </button>
  )
}

function SelectableCard({
  category,
  infoOpen = false,
  index,
  onClick,
  onInfoClick,
  selected,
  subtitle,
  title,
}: {
  category: ProcessCategory
  infoOpen?: boolean
  index: number
  onClick: () => void
  onInfoClick?: (event: ReactMouseEvent<HTMLButtonElement>) => void
  selected: boolean
  subtitle: string
  title: string
}) {
  const meta = CATEGORY_META[category]
  const Icon = meta.icon

  return (
    <div
      className={[
        'process-select-card',
        selected ? 'is-selected' : '',
        infoOpen ? 'is-info-open' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onClick()
        }
      }}
      role="button"
      style={{ animationDelay: `${index * 20}ms` }}
      tabIndex={0}
    >
      <span className={`process-select-icon ${meta.className}`}>
        <Icon />
      </span>
      <span>
        <strong>{title}</strong>
        <small>{subtitle}</small>
      </span>
      {onInfoClick ? (
        <span className="process-info-wrap">
          <button
            aria-label={`Ver variables de ${title}`}
            className={infoOpen ? 'process-info-button is-open' : 'process-info-button'}
            data-process-modal-info-button="true"
            onMouseDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              onInfoClick(event)
            }}
            type="button"
          >
            <InfoIcon />
          </button>
        </span>
      ) : null}
      <span className={selected ? 'process-selection-check is-selected' : 'process-selection-check'}>
        {selected ? <CheckIcon /> : null}
      </span>
    </div>
  )
}

function ProcessStep({ active = false, label, value }: { active?: boolean; label: string; value: number }) {
  return (
    <span className={active ? 'process-step is-active' : 'process-step'}>
      <strong>{value}</strong>
      {label}
    </span>
  )
}

function getSensorVariables(liveReadings: Record<string, ProcessSensorReading>): SelectableVariable[] {
  const groups = Object.entries(fakeSensorsByTitle)
    .filter(([sensorTitle]) => sensorTitle !== 'PLC Jepkom')
    .map(([sensorTitle, sensors]) =>
      sensors.map((sensor) => {
        const id = `${sensorTitle}::${sensor.id}`
        const reading = liveReadings[id]

        return {
          category: getCategoryFromSensorTitle(sensorTitle),
          id,
          name: reading?.name ?? sensor.name,
          sensorTitle,
          unit: reading?.unit ?? sensor.unit,
          value: reading?.value ?? sensor.value,
        }
      }),
    )

  return interleaveByCategory(groups)
}

function interleaveByCategory(groups: SelectableVariable[][]) {
  const longestGroup = Math.max(...groups.map((group) => group.length), 0)
  const variables: SelectableVariable[] = []

  for (let index = 0; index < longestGroup; index += 1) {
    for (const group of groups) {
      const variable = group[index]
      if (variable) variables.push(variable)
    }
  }

  return variables
}

function buildSelectableGroups(groups: CreatedSensorGroup[]): SelectableGroup[] {
  return groups.map((group) => ({
    category: getGroupCategory(group),
    count: group.variables.length,
    id: group.id,
    name: group.name,
    variables: group.variables,
  }))
}

function filterItems<T extends { category: ProcessCategory; name: string }>(
  items: T[],
  query: string,
  filter: ProcessFilter,
) {
  const normalized = query.trim().toLowerCase()

  return items.filter((item) => {
    if (filter !== 'Todas' && item.category !== filter) return false
    if (!normalized) return true

    return item.name.toLowerCase().includes(normalized)
  })
}

function getAvailableFilterOptions(items: { category: ProcessCategory }[]): ProcessFilter[] {
  const categorySet = new Set(items.map((item) => item.category))
  return (['Temperatura', 'Humedad', 'CO2', 'Etileno'] as const).filter((category) => categorySet.has(category))
}

function getGroupCategory(group: CreatedSensorGroup): ProcessCategory {
  const category = group.categories?.[0] ?? getInferredCategories(group.sensorTitle)[0]
  if (category === 'Humedad') return 'Humedad'
  if (category === 'CO2') return 'CO2'
  if (category === 'Etileno') return 'Etileno'
  return 'Temperatura'
}

function getCategoryFromSensorTitle(sensorTitle: string): ProcessCategory {
  if (sensorTitle.toLowerCase().includes('humedad')) return 'Humedad'
  if (sensorTitle.toLowerCase().includes('co2')) return 'CO2'
  if (sensorTitle.toLowerCase().includes('etileno')) return 'Etileno'
  return 'Temperatura'
}

function hasDuplicateProcessName(processes: CreatedProcess[], name: string, currentProcessId?: string) {
  const normalizedName = normalizeName(name)
  if (!normalizedName) return false

  return processes.some(
    (process) =>
      !process.finishedAt &&
      process.id !== currentProcessId &&
      normalizeName(process.processName) === normalizedName,
  )
}

function normalizeName(name: string) {
  return name.trim().toLowerCase()
}

function getProcessDraftSignature({
  binCount,
  clientName,
  container,
  deadlineAt,
  destination,
  initialComment,
  groupIds,
  initialOperator,
  location,
  origin,
  processName,
  product,
  readingIntervalSeconds,
  selectedVariables,
  ventilation,
}: {
  binCount: string
  clientName: string
  container: string
  deadlineAt: string
  destination: string
  initialComment: string
  groupIds: string[]
  initialOperator: string
  location: string
  origin: string
  processName: string
  product: string
  readingIntervalSeconds: number
  selectedVariables: ProcessSensorVariable[]
  ventilation: string
}) {
  return JSON.stringify({
    binCount: binCount.trim(),
    clientName: clientName.trim(),
    container,
    deadlineAt,
    destination: destination.trim(),
    initialComment: initialComment.trim(),
    groupIds: [...groupIds].sort(),
    initialOperator: initialOperator.trim(),
    location: location.trim(),
    origin: origin.trim(),
    processName: processName.trim(),
    product: product.trim(),
    readingIntervalSeconds: normalizeReadingInterval(readingIntervalSeconds),
    selectedVariables: selectedVariables
      .map((variable) => `${variable.id}::${variable.name}::${variable.sensorTitle}`)
      .sort(),
    ventilation,
  })
}

function isStandardReadingInterval(value: number): value is typeof STANDARD_READING_INTERVALS[number] {
  return STANDARD_READING_INTERVALS.includes(value as typeof STANDARD_READING_INTERVALS[number])
}

function getSelectedReadingInterval(option: ReadingIntervalOption, customValue: string) {
  return normalizeReadingInterval(option === 'custom' ? customValue : option)
}

function normalizeReadingInterval(value: unknown) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 1 ? Math.min(3600, Math.round(seconds)) : 5
}

function getProcessDurationLabel(startAt: string, endAt: string) {
  if (!endAt) return 'Sin final'

  const startTime = new Date(startAt).getTime()
  const endTime = new Date(endAt).getTime()

  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) return 'Sin final'

  const totalMinutes = Math.max(0, Math.round((endTime - startTime) / 60000))
  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60

  if (days > 0) return `${days}d ${hours}h ${minutes.toString().padStart(2, '0')}m`
  if (hours > 0) return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  return `${minutes}m`
}

function isContainerOption(value: unknown): value is ContainerOption {
  return typeof value === 'string' && CONTAINER_OPTIONS.includes(value as ContainerOption)
}

function isVentilationOption(value: unknown): value is VentilationOption {
  return typeof value === 'string' && VENTILATION_OPTIONS.includes(value as VentilationOption)
}

function formatProcessDate(value?: string) {
  return formatProcessDateTime(value)
}

function toDateTimeLocalValue(value?: string) {
  const date = value ? new Date(value) : new Date()
  if (Number.isNaN(date.getTime())) return ''

  const timezoneOffset = date.getTimezoneOffset() * 60000
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16)
}

function UsersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 11a3 3 0 0 0 0-6" />
      <path d="M18 20a5 5 0 0 0-3-4.5" />
    </svg>
  )
}

function WorkflowIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <rect width="6" height="6" x="3" y="3" rx="1.5" />
      <rect width="6" height="6" x="15" y="15" rx="1.5" />
      <path d="M9 6h4a3 3 0 0 1 3 3v6" />
      <path d="m13 12 3 3 3-3" />
    </svg>
  )
}

function BoxesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 8 12 4l8 4-8 4Z" />
      <path d="M4 8v8l8 4 8-4V8" />
      <path d="M12 12v8" />
    </svg>
  )
}

function MapPinIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 21s7-5.2 7-12A7 7 0 0 0 5 9c0 6.8 7 12 7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  )
}

function LayersIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m12 3 9 5-9 5-9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </svg>
  )
}

function RadioIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="2" />
      <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
      <path d="M7.8 16.2a6 6 0 0 1 0-8.4" />
      <path d="M19 5a10 10 0 0 1 0 14" />
      <path d="M5 19A10 10 0 0 1 5 5" />
    </svg>
  )
}

function ChevronRightIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function ChevronDownIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function InfoIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  )
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}

function TimerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M10 2h4" />
      <circle cx="12" cy="14" r="8" />
      <path d="M12 10v4l3 2" />
    </svg>
  )
}

function PackageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5Z" />
      <path d="M4 7.5 12 12l8-4.5" />
      <path d="M12 12v9" />
    </svg>
  )
}

function MessageIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 5h16v11H8l-4 4Z" />
      <path d="M8 9h8" />
      <path d="M8 13h5" />
    </svg>
  )
}
