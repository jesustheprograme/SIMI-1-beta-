import { useMemo, useState } from 'react'
import { usePlanEditor } from './hooks/usePlanEditor'
import type { Point } from './types/plano'
import type { AvailableMode, PlanoPageProps } from './types'
import { hasProcessLinks } from './utils/groupHelpers'
import { PlanoEditorGrid } from './components/PlanoEditorGrid'
import { PlanoHelpText } from './components/PlanoHelpText'
import { PlanoPageHeader } from './components/PlanoPageHeader'
import { PlanoPageModals } from './components/PlanoPageModals'
import { PlanoToolbar } from './components/PlanoToolbar'
import { usePlanoDerivedData } from './hooks/usePlanoDerivedData'
import { usePlanoDnd } from './hooks/usePlanoDnd'
import { usePlanoKeyboardShortcuts } from './hooks/usePlanoKeyboardShortcuts'
import { usePlanoLocationState } from './hooks/usePlanoLocationState'

export function PlanoPage({
  createdGroups = [],
  createdProcesses = [],
  locationZones = [],
  liveReadings = {},
  onLocationZonesChange,
  onCreateProcess,
  onOpenProcess,
}: PlanoPageProps) {
  const [groupQuery, setGroupQuery] = useState('')
  const [availableMode, setAvailableMode] = useState<AvailableMode>('processes')
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({})
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null)
  const [showSavedPlans, setShowSavedPlans] = useState(false)
  const planoProcesses = useMemo(
    () => createdProcesses.filter((process) => !process.finishedAt && hasProcessLinks(process)),
    [createdProcesses],
  )
  const editor = usePlanEditor(createdGroups, planoProcesses, locationZones, onLocationZonesChange, 'line', 'rectangle')
  const location = usePlanoLocationState({ canvasRef: editor.canvasRef, locationZones, onLocationZonesChange })
  const placedProcessIds = useMemo(() => new Set(editor.processNodes.map((process) => process.processId)), [editor.processNodes])
  const derived = usePlanoDerivedData({
    createdGroups,
    createdProcesses,
    groupQuery,
    liveReadings,
    locationCreationDraft: location.locationCreationDraft,
    locationZones,
    placedProcessIds,
    processNodes: editor.processNodes,
    selectedLocationZoneId: location.selectedLocationZoneId,
    variableNodes: editor.variableNodes,
  })
  const dnd = usePlanoDnd({
    canvasRef: editor.canvasRef,
    dragBoundaryRef: editor.dragBoundaryRef,
    placeProcessAtPoint: editor.placeProcessAtPoint,
    placeVariableAtPoint: editor.placeVariableAtPoint,
    returnProcessToPalette: editor.returnProcessToPalette,
    returnVariableToPalette: editor.returnVariableToPalette,
  })
  usePlanoKeyboardShortcuts({
    lastContextLocationIdRef: location.lastContextLocationIdRef,
    locationZones,
    onLocationZonesChange,
    returnProcessToPalette: editor.returnProcessToPalette,
    selectedLocationZoneId: location.selectedLocationZoneId,
    selectedProcessId,
    setSelectedLocationZoneId: location.setSelectedLocationZoneId,
    setSelectedProcessId,
    showSaveLocationModal: location.showSaveLocationModal,
    showSaveModal: editor.showSaveModal,
    showSavedPlans,
    undoLastLine: editor.undoLastLine,
  })
  function toggleGroup(groupId: string) {
    setOpenGroups((current) => ({ ...current, [groupId]: !(current[groupId] ?? true) }))
  }
  return (
    <div className="min-h-screen bg-zinc-100 px-5 py-4 text-zinc-900">
      <div className="mx-auto max-w-[1800px] space-y-4">
        <PlanoPageHeader />
        <PlanoToolbar
          backgroundImageName={editor.planBackgroundImage?.fileName}
          onClearBackground={editor.clearPlanBackground}
          onClearPlan={editor.clearPlan}
          onSavePlan={() => editor.setShowSaveModal(true)}
          onUploadBackground={editor.uploadPlanBackground}
        />
        <PlanoEditorGrid
          activeDrag={dnd.activeDrag}
          availableMode={availableMode}
          createdGroups={createdGroups}
          dndAlignOverlayToPointer={dnd.alignOverlayToPointer}
          dndHandleDragCancel={dnd.handleDragCancel}
          dndHandleDragEnd={dnd.handleDragEnd}
          dndHandleDragMove={dnd.handleDragMove}
          dndHandleDragStart={dnd.handleDragStart}
          dndRestrictOverlayToDragBoundary={dnd.restrictOverlayToDragBoundary}
          dndSensors={dnd.sensors}
          editor={editor}
          filteredAvailableGroups={derived.filteredAvailableGroups}
          filteredAvailableProcesses={derived.filteredAvailableProcesses}
          groupQuery={groupQuery}
          isReturningVariable={dnd.isReturningVariable}
          locationCreationDraft={derived.contextLocationDraftZone}
          locationPlacementPrompt={location.locationPlacementPrompt}
          locationZones={locationZones}
          normalizedQuery={derived.normalizedQuery}
          onCreateLocationAtPoint={location.createLocationAtPoint}
          onCreateProcessAtPoint={location.openCreateProcessAtPoint}
          onGroupQueryChange={setGroupQuery}
          onLocationPlacementCancel={() => {
            location.setLocationPlacementPrompt(null)
            location.setLocationCreationDraft(null)
          }}
          onLocationPlacementCommit={location.commitContextLocation}
          onLocationPlacementMove={location.moveContextLocation}
          onLocationPlacementStart={location.startContextLocation}
          onLocationZoneChange={location.handleLocationZoneChange}
          onLocationZoneSave={location.openSaveLocationModal}
          onLocationZoneSelect={(zoneId) => {
            location.setSelectedLocationZoneId(zoneId)
            if (zoneId) setSelectedProcessId(null)
          }}
          onLocationZoneShapeChange={location.handleLocationZoneShapeChange}
          onModeChange={setAvailableMode}
          onOpenProcess={onOpenProcess}
          onProcessPlacementCancel={() => location.setProcessPlacementDraft(null)}
          onProcessPlacementCommit={location.commitCreateProcessAtPoint}
          onProcessPlacementMove={(point: Point | null) => location.setProcessPlacementDraft(point)}
          onShowSavedPlans={() => setShowSavedPlans(true)}
          onToggleGroup={toggleGroup}
          openGroups={openGroups}
          placedVariableIds={derived.placedVariableIds}
          planoProcesses={derived.planoProcesses}
          processPlacementDraft={location.processPlacementDraft}
          processReadings={derived.processReadings}
          selectedLocationZoneId={location.selectedLocationZoneId}
          selectedProcessId={selectedProcessId}
          onProcessSelect={setSelectedProcessId}
          variableReadings={derived.variableReadings}
        />
        <PlanoHelpText />
      </div>

      <PlanoPageModals
        createdGroups={createdGroups}
        editor={editor}
        existingProcesses={createdProcesses}
        location={location}
        locationZones={locationZones}
        liveReadings={liveReadings}
        onCreateProcess={onCreateProcess}
        setShowSavedPlans={setShowSavedPlans}
        showSavedPlans={showSavedPlans}
      />
    </div>
  )
}
