import { PlanoCanvas } from './PlanoCanvas'
import type { usePlanEditor } from '../hooks/usePlanEditor'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type { PlanoLocationZone, Point } from '../types/plano'
import { AvailablePalettePanel } from './AvailablePalettePanel'
import { getDragId } from '../utils/dragHelpers'
import { PlanoDndShell } from './PlanoDndShell'
import { SavedPlansTrigger } from './SavedPlansTrigger'
import type { AvailableMode, PlanDragData } from '../types'

type PlanEditor = ReturnType<typeof usePlanEditor>

type PlanoEditorGridProps = {
  activeDrag: PlanDragData | null
  availableMode: AvailableMode
  createdGroups: CreatedSensorGroup[]
  filteredAvailableGroups: CreatedSensorGroup[]
  filteredAvailableProcesses: CreatedProcess[]
  groupQuery: string
  isReturningVariable: boolean
  locationCreationDraft: PlanoLocationZone | null
  locationPlacementPrompt: Point | null
  locationZones: PlanoLocationZone[]
  normalizedQuery: string
  onCreateLocationAtPoint: (point: Point) => void
  onCreateProcessAtPoint: (point: Point) => void
  onGroupQueryChange: (query: string) => void
  onLocationPlacementCancel: () => void
  onLocationPlacementCommit: () => void
  onLocationPlacementMove: (point: Point) => void
  onLocationPlacementStart: (point: Point) => void
  onLocationZoneChange: (zone: PlanoLocationZone) => void
  onLocationZoneSave: (zoneId?: string | null) => void
  onLocationZoneSelect: (zoneId: string | null) => void
  onLocationZoneShapeChange: PlanEditor['handleMouseDown'] extends never ? never : (zoneId: string, shape: NonNullable<PlanoLocationZone['shape']>) => void
  onModeChange: (mode: AvailableMode) => void
  onOpenProcess?: (processId: string) => void
  onProcessSelect: (processId: string | null) => void
  onProcessPlacementCancel: () => void
  onProcessPlacementCommit: (point: Point) => void
  onProcessPlacementMove: (point: Point | null) => void
  onShowSavedPlans: () => void
  onToggleGroup: (groupId: string) => void
  openGroups: Record<string, boolean>
  placedVariableIds: Set<string>
  planoProcesses: CreatedProcess[]
  processPlacementDraft: Point | null
  processReadings: Record<string, ProcessSensorReading[]>
  selectedLocationZoneId: string | null
  selectedProcessId: string | null
  variableReadings: Record<string, ProcessSensorReading>
  editor: PlanEditor
  dndAlignOverlayToPointer: NonNullable<unknown>
  dndHandleDragCancel: () => void
  dndHandleDragEnd: NonNullable<unknown>
  dndHandleDragMove: NonNullable<unknown>
  dndHandleDragStart: NonNullable<unknown>
  dndRestrictOverlayToDragBoundary: NonNullable<unknown>
  dndSensors: NonNullable<unknown>
}

// dnd-kit modifiers and handlers close over refs but only read them during drag events.
/* eslint-disable react-hooks/refs */
export function PlanoEditorGrid(props: PlanoEditorGridProps) {
  return (
    <PlanoDndShell
      activeDrag={props.activeDrag}
      alignOverlayToPointer={props.dndAlignOverlayToPointer}
      handleDragCancel={props.dndHandleDragCancel}
      handleDragEnd={props.dndHandleDragEnd}
      handleDragMove={props.dndHandleDragMove}
      handleDragStart={props.dndHandleDragStart}
      restrictOverlayToDragBoundary={props.dndRestrictOverlayToDragBoundary}
      sensors={props.dndSensors}
    >
      <div ref={props.editor.dragBoundaryRef} className="grid items-start gap-4 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <PlanoCanvasArea {...props} />
        <PaletteArea {...props} />
      </div>
    </PlanoDndShell>
  )
}
/* eslint-enable react-hooks/refs */

function PlanoCanvasArea(props: PlanoEditorGridProps) {
  return (
    <PlanoCanvas
      activeDragId={props.activeDrag ? getDragId(props.activeDrag) : null}
      backgroundImage={props.editor.planBackgroundImage}
      canDragVariables
      canvasRef={props.editor.canvasRef}
      lines={props.editor.lines}
      currentLine={props.editor.currentLine}
      locationDraft={props.editor.locationDraft}
      locationZones={props.locationZones}
      processNodes={props.editor.processNodes}
      processReadings={props.processReadings}
      variableNodes={props.editor.variableNodes}
      variableReadings={props.variableReadings}
      onMouseDown={props.editor.handleMouseDown}
      onMouseMove={props.editor.handleMouseMove}
      onMouseUp={props.editor.handleMouseUp}
      onMouseLeave={props.editor.handleMouseUp}
      onBackgroundImageFrameChange={props.editor.updatePlanBackgroundFrame}
      onActiveDragCancel={props.dndHandleDragCancel}
      onCreateLocationAtPoint={props.onCreateLocationAtPoint}
      onCreateProcessAtPoint={props.onCreateProcessAtPoint}
      onOpenProcess={props.onOpenProcess}
      onProcessSelect={props.onProcessSelect}
      onLocationPlacementCancel={props.onLocationPlacementCancel}
      onLocationPlacementCommit={props.onLocationPlacementCommit}
      onLocationPlacementMove={props.onLocationPlacementMove}
      onLocationPlacementStart={props.onLocationPlacementStart}
      onProcessPlacementCancel={props.onProcessPlacementCancel}
      onProcessPlacementCommit={props.onProcessPlacementCommit}
      onProcessPlacementMove={props.onProcessPlacementMove}
      onLocationZoneChange={props.onLocationZoneChange}
      onLocationZoneSave={props.onLocationZoneSave}
      onLocationZoneSelect={props.onLocationZoneSelect}
      onLocationZoneShapeChange={props.onLocationZoneShapeChange}
      selectedLocationZoneId={props.selectedLocationZoneId}
      selectedProcessId={props.selectedProcessId}
      locationCreationDraft={props.locationCreationDraft}
      locationPlacementPrompt={props.locationPlacementPrompt}
      processPlacementDraft={props.processPlacementDraft}
    />
  )
}

function PaletteArea(props: PlanoEditorGridProps) {
  return (
    <div className="space-y-4 2xl:sticky 2xl:top-24">
      <AvailablePalettePanel
        availableMode={props.availableMode}
        createdGroups={props.createdGroups}
        filteredGroups={props.filteredAvailableGroups}
        filteredProcesses={props.filteredAvailableProcesses}
        groupQuery={props.groupQuery}
        isReturningVariable={props.isReturningVariable}
        normalizedQuery={props.normalizedQuery}
        onGroupQueryChange={props.onGroupQueryChange}
        onModeChange={props.onModeChange}
        onToggleGroup={props.onToggleGroup}
        openGroups={props.openGroups}
        placedVariableIds={props.placedVariableIds}
        planoProcesses={props.planoProcesses}
      />
      <SavedPlansTrigger count={props.editor.savedPlans.length} onClick={props.onShowSavedPlans} />
    </div>
  )
}
