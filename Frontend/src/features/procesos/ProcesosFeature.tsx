import { useEffect, useMemo, useState } from 'react'
import { BreadcrumbNav } from '../../components/ui'
import { showWorkspaceToast } from '../workspace/shell/toast'
import type { CreatedProcess } from './types'
import type { ProcessType } from './types'
import { CreateProcessToolbar } from './components/CreateProcessToolbar'
import { FinishProcessCardModal, FinishProcessConfirmModal } from './components/FinishProcessModals'
import { filterProcesses } from './utils/processFilters'
import { ProcessCard } from './components/ProcessCard'
import { ProcessModalLayer } from './components/ProcessModalLayer'
import { ProcessSearch } from './components/ProcessSearch'
import { ProcessSectionBoard } from './components/ProcessSectionBoard'
import type { ProcesosPageProps } from './types/view'
import { getProcessReadings } from './utils/processReadings'
import { createLocalId } from '../../utils/localId'
import {
  DEFAULT_PROCESS_SECTION_ID,
  createProcessSection,
  deleteProcessSection,
  filterProcessSections,
  getProcessSectionsForType,
  mergeVisibleProcessSections,
  migrateProcessSectionsByType,
  normalizeProcessSections,
  processSectionsEqual,
  replaceProcessSectionsForType,
} from './utils/processSections'

const PROCESS_TYPES: ProcessType[] = ['almacenado', 'maduracion', 'proceso-3']

export function ProcesosPage({
  createdGroups,
  locationZones,
  onCreateProcess,
  onDeleteProcess,
  onOpenProcess,
  onProcessSectionsChange,
  onUpdateProcess,
  liveReadings,
  processType,
  processes,
  processSections,
  title = 'Procesos',
}: ProcesosPageProps) {
  const [editingProcess, setEditingProcess] = useState<CreatedProcess | null>(null)
  const [finishingProcess, setFinishingProcess] = useState<CreatedProcess | null>(null)
  const [finishFinalOperator, setFinishFinalOperator] = useState('')
  const [finishFinalComment, setFinishFinalComment] = useState('')
  const [showFinishConfirm, setShowFinishConfirm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSectionCreator, setShowSectionCreator] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const [query, setQuery] = useState('')
  const [now, setNow] = useState(() => Date.now())
  const scopedProcesses = useMemo(
    () => (processType ? processes.filter((process) => process.processType === processType) : processes),
    [processType, processes],
  )
  const activeProcesses = useMemo(() => scopedProcesses.filter((process) => !process.finishedAt), [scopedProcesses])
  const allActiveProcesses = useMemo(() => processes.filter((process) => !process.finishedAt), [processes])
  const migratedProcessSections = useMemo(
    () => migrateProcessSectionsByType(processes, processSections),
    [processes, processSections],
  )
  const scopedProcessSections = useMemo(
    () => getProcessSectionsForType(migratedProcessSections, processType),
    [migratedProcessSections, processType],
  )
  const normalizedSections = useMemo(
    () => processType
      ? normalizeProcessSections(activeProcesses, scopedProcessSections, processType)
      : PROCESS_TYPES.flatMap((type) =>
          normalizeProcessSections(
            allActiveProcesses.filter((process) => process.processType === type),
            getProcessSectionsForType(migratedProcessSections, type),
            type,
          ),
        ),
    [
      activeProcesses,
      allActiveProcesses,
      migratedProcessSections,
      processType,
      scopedProcessSections,
    ],
  )
  const filteredProcesses = useMemo(
    () => filterProcesses(activeProcesses, query),
    [activeProcesses, query],
  )
  const visibleProcessIds = useMemo(
    () => new Set(filteredProcesses.map((process) => process.id)),
    [filteredProcesses],
  )
  const visibleSections = useMemo(
    () => filterProcessSections(normalizedSections, visibleProcessIds),
    [normalizedSections, visibleProcessIds],
  )
  const hasCustomSections = normalizedSections.some(
    (section) => !section.id.startsWith(DEFAULT_PROCESS_SECTION_ID),
  )
  const processesById = useMemo(
    () => new Map(filteredProcesses.map((process) => [process.id, process])),
    [filteredProcesses],
  )

  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    const nextProcessSections = replaceProcessSectionsForType(
      migratedProcessSections,
      normalizedSections,
      processType,
    )
    if (!processSectionsEqual(nextProcessSections, processSections)) {
      onProcessSectionsChange(nextProcessSections)
    }
  }, [
    migratedProcessSections,
    normalizedSections,
    onProcessSectionsChange,
    processSections,
    processType,
  ])

  function commitScopedSections(nextSections: typeof normalizedSections) {
    onProcessSectionsChange(
      replaceProcessSectionsForType(migratedProcessSections, nextSections, processType),
    )
  }

  function handleCreateSection() {
    const title = sectionTitle.trim()
    if (!title) return
    const targetProcessType = processType ?? 'almacenado'
    commitScopedSections(
      createProcessSection(
        normalizedSections,
        title,
        createLocalId('process-section'),
        targetProcessType,
      ),
    )
    setSectionTitle('')
    setShowSectionCreator(false)
  }

  function handleVisibleSectionsChange(nextVisibleSections: typeof visibleSections) {
    commitScopedSections(
      mergeVisibleProcessSections(normalizedSections, nextVisibleSections, visibleProcessIds),
    )
  }

  function handleDeleteSection(sectionId: string) {
    commitScopedSections(deleteProcessSection(normalizedSections, sectionId))
  }

  function openFinishProcess(process: CreatedProcess) {
    setFinishingProcess(process)
    setFinishFinalOperator(process.finalOperator ?? '')
    setFinishFinalComment(process.finalComment ?? '')
    setShowFinishConfirm(false)
  }

  function finishProcess() {
    if (!finishingProcess) return
    const finishedAt = new Date().toISOString()
    onUpdateProcess({
      ...finishingProcess,
      deadlineAt: finishedAt,
      finalComment: finishFinalComment.trim(),
      finalOperator: finishFinalOperator.trim(),
      finalReadings: getProcessReadings(finishingProcess, createdGroups, liveReadings),
      finishedAt,
    })
    showWorkspaceToast(
      'Proceso finalizado',
      `El proceso "${finishingProcess.processName}" fue trasladado al historial.`,
      6500,
    )
    setFinishingProcess(null)
    setShowFinishConfirm(false)
  }

  return (
    <div className="dashboard-page">
      <BreadcrumbNav items={title === 'Procesos' ? ['Dashboard', 'Procesos'] : ['Dashboard', 'Procesos', title]} />
      <div className="dashboard-heading compact">
        <h1>{title}</h1>
        <p>Crea procesos operativos y vincula grupos o variables de sensores.</p>
      </div>
      <CreateProcessToolbar
        onCreateClick={() => setShowCreateModal(true)}
        onCreateSectionClick={() => setShowSectionCreator((value) => !value)}
      />
      {showSectionCreator ? (
        <section className="groups-section-creator">
          <input
            maxLength={60}
            onChange={(event) => setSectionTitle(event.target.value)}
            placeholder="Ej. Procesos prioritarios"
            value={sectionTitle}
          />
          <button className="create-group-button" onClick={handleCreateSection} type="button">
            Guardar seccion
          </button>
        </section>
      ) : null}
      <ProcessSearch onQueryChange={setQuery} query={query} />
      {activeProcesses.length === 0 && !hasCustomSections ? (
        <section className="groups-panel"><p className="groups-empty">Todavia no hay procesos creados.</p></section>
      ) : filteredProcesses.length === 0 && query.trim().length > 0 ? (
        <section className="groups-panel"><p className="groups-empty">No hay procesos que coincidan con la busqueda.</p></section>
      ) : (
        <section className="group-board-shell" aria-label="Procesos creados">
          <ProcessSectionBoard
            interactive={Boolean(processType) && query.trim().length === 0}
            onChange={handleVisibleSectionsChange}
            onDeleteSection={handleDeleteSection}
            processesById={processesById}
            renderProcess={(process) => (
              <ProcessCard
                createdGroups={createdGroups}
                disableEntryAnimation
                liveReadings={liveReadings}
                now={now}
                onEdit={setEditingProcess}
                onFinish={openFinishProcess}
                onOpen={onOpenProcess}
                process={process}
              />
            )}
            sections={visibleSections}
          />
        </section>
      )}
      <ProcessModalLayer
        createdGroups={createdGroups}
        editingProcess={editingProcess}
        existingProcesses={processes}
        liveReadings={liveReadings}
        locationZones={locationZones}
        onCloseCreate={() => setShowCreateModal(false)}
        onCloseEdit={() => setEditingProcess(null)}
        onCreateProcess={onCreateProcess}
        onDeleteProcess={(id) => {
          setEditingProcess(null)
          onDeleteProcess(id)
        }}
        onUpdateProcess={onUpdateProcess}
        processType={processType}
        showCreateModal={showCreateModal}
      />
      {finishingProcess ? (
        <FinishProcessCardModal
          finalComment={finishFinalComment}
          finalOperator={finishFinalOperator}
          onCancel={() => setFinishingProcess(null)}
          onChangeFinalComment={setFinishFinalComment}
          onChangeFinalOperator={setFinishFinalOperator}
          onSubmit={() => setShowFinishConfirm(true)}
        />
      ) : null}
      {showFinishConfirm ? (
        <FinishProcessConfirmModal onCancel={() => setShowFinishConfirm(false)} onConfirm={finishProcess} />
      ) : null}
    </div>
  )
}
