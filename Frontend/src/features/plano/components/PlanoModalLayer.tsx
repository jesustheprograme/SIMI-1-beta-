import { ProcessModal } from '../../procesos/components/ProcessModal'
import { SavePlanModal } from './SavePlanModal'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type { PlanoLocationZone, SavedPlan } from '../types/plano'
import { SavedPlansDialog } from './SavedPlansDialog'
import { SaveLocationModal } from './SaveLocationModal'

type PlanoModalLayerProps = {
  createdGroups: CreatedSensorGroup[]
  deletePlan: (planId: string) => void
  existingProcesses: CreatedProcess[]
  locationName: string
  locationZones: PlanoLocationZone[]
  liveReadings: Record<string, ProcessSensorReading>
  onCloseCreateProcess: () => void
  onCloseSaveLocation: () => void
  onCloseSavePlan: () => void
  onCloseSavedPlans: () => void
  onCreateProcess?: (process: CreatedProcess) => void
  onLocationNameChange: (name: string) => void
  onReplicatePlan: (plan: SavedPlan) => void
  onSaveLocation: () => void
  onSavePlan: () => void
  planName: string
  processDefaultLocation: string
  savedPlans: SavedPlan[]
  setPlanName: (name: string) => void
  showCreateProcessModal: boolean
  showSaveLocationModal: boolean
  showSaveModal: boolean
  showSavedPlans: boolean
}

export function PlanoModalLayer(props: PlanoModalLayerProps) {
  return (
    <>
      {props.showSaveModal && (
        <SavePlanModal
          planName={props.planName}
          onPlanNameChange={props.setPlanName}
          onSave={props.onSavePlan}
          onCancel={props.onCloseSavePlan}
        />
      )}

      {props.showSaveLocationModal && (
        <SaveLocationModal
          locationName={props.locationName}
          onCancel={props.onCloseSaveLocation}
          onLocationNameChange={props.onLocationNameChange}
          onSave={props.onSaveLocation}
        />
      )}

      {props.showCreateProcessModal && props.onCreateProcess && (
        <ProcessModal
          allowEmptyLocation
          confirmAutomaticLocation
          createdGroups={props.createdGroups}
          defaultLocation={props.processDefaultLocation}
          existingProcesses={props.existingProcesses}
          liveReadings={props.liveReadings}
          locationZones={props.locationZones}
          onClose={props.onCloseCreateProcess}
          onSave={props.onCreateProcess}
        />
      )}

      {props.showSavedPlans && (
        <SavedPlansDialog
          savedPlans={props.savedPlans}
          onClose={props.onCloseSavedPlans}
          onDeletePlan={props.deletePlan}
          onReplicatePlan={props.onReplicatePlan}
        />
      )}
    </>
  )
}
