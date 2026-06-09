import type { Dispatch, SetStateAction } from 'react'
import type { usePlanEditor } from '../hooks/usePlanEditor'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type { PlanoLocationZone, Point } from '../types/plano'
import { PlanoModalLayer } from './PlanoModalLayer'
import type { usePlanoLocationState } from '../hooks/usePlanoLocationState'

const PROCESS_PLACEMENT_SIZE = { height: 56, width: 224 }

type PlanoPageModalsProps = {
  createdGroups: CreatedSensorGroup[]
  editor: ReturnType<typeof usePlanEditor>
  existingProcesses: CreatedProcess[]
  location: ReturnType<typeof usePlanoLocationState>
  locationZones: PlanoLocationZone[]
  liveReadings: Record<string, ProcessSensorReading>
  onCreateProcess?: (process: CreatedProcess) => void
  setShowSavedPlans: Dispatch<SetStateAction<boolean>>
  showSavedPlans: boolean
}

export function PlanoPageModals(props: PlanoPageModalsProps) {
  function closeCreateProcess() {
    props.location.setShowCreateProcessModal(false)
    props.location.setProcessDefaultLocation('')
    props.location.setProcessCreationPoint(null)
  }

  function closeSavePlan() {
    props.editor.setShowSaveModal(false)
    props.editor.setPlanName('')
  }

  function closeSaveLocation() {
    props.location.setShowSaveLocationModal(false)
    props.location.setLocationZoneName('')
  }

  function handleCreateProcess(process: CreatedProcess) {
    const placementPoint = props.location.processCreationPoint
    const processPosition = getProcessPositionFromContextPoint(placementPoint)
    const hasPlanoLocation = props.locationZones.some((zone) => zone.name === process.location.trim())
    const processWithLocation = hasPlanoLocation
      ? process
      : props.location.createAutomaticLocationForProcess(process, processPosition)

    props.onCreateProcess?.(processWithLocation)
    placeCreatedProcessAtPosition(processWithLocation.id, processPosition)
    props.location.setProcessCreationPoint(null)
  }

  function placeCreatedProcessAtPosition(processId: string, position: Point | null) {
    if (!position) return

    props.editor.placeProcessAtPoint(processId, position)
  }

  function getProcessPositionFromContextPoint(point: Point | null): Point | null {
    if (!point) return null
    const canvas = props.editor.canvasRef.current
    const canvasWidth = canvas?.clientWidth ?? 0
    const canvasHeight = canvas?.clientHeight ?? 0
    const maxX = Math.max(0, canvasWidth - PROCESS_PLACEMENT_SIZE.width)
    const maxY = Math.max(0, canvasHeight - PROCESS_PLACEMENT_SIZE.height)

    return {
      x: clamp(point.x - PROCESS_PLACEMENT_SIZE.width / 2, 0, maxX),
      y: clamp(point.y - PROCESS_PLACEMENT_SIZE.height / 2, 0, maxY),
    }
  }

  return (
    <>
    <PlanoModalLayer
      createdGroups={props.createdGroups}
      deletePlan={props.editor.deletePlan}
      existingProcesses={props.existingProcesses}
      locationName={props.location.locationZoneName}
      locationZones={props.locationZones}
      liveReadings={props.liveReadings}
      onCloseCreateProcess={closeCreateProcess}
      onCloseSaveLocation={closeSaveLocation}
      onCloseSavePlan={closeSavePlan}
      onCloseSavedPlans={() => props.setShowSavedPlans(false)}
      onCreateProcess={handleCreateProcess}
      onLocationNameChange={props.location.setLocationZoneName}
      onReplicatePlan={(plan) => {
        props.editor.replicatePlan(plan)
        props.setShowSavedPlans(false)
      }}
      onSaveLocation={props.location.saveSelectedLocationZone}
      onSavePlan={props.editor.savePlan}
      planName={props.editor.planName}
      processDefaultLocation={props.location.processDefaultLocation}
      savedPlans={props.editor.savedPlans}
      setPlanName={props.editor.setPlanName}
      showCreateProcessModal={props.location.showCreateProcessModal}
      showSaveLocationModal={props.location.showSaveLocationModal}
      showSaveModal={props.editor.showSaveModal}
      showSavedPlans={props.showSavedPlans}
    />
    </>
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
