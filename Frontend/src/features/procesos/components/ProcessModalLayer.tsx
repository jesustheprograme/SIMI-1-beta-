import type { CreatedSensorGroup } from '../../telemetria'
import type { PlanoLocationZone } from '../../plano'
import type { CreatedProcess, ProcessSensorReading, ProcessType } from '../types'
import { ProcessModal } from './ProcessModal'

type Props = {
  createdGroups: CreatedSensorGroup[]
  editingProcess: CreatedProcess | null
  existingProcesses: CreatedProcess[]
  locationZones: PlanoLocationZone[]
  liveReadings: Record<string, ProcessSensorReading>
  onCloseCreate: () => void
  onCloseEdit: () => void
  onCreateProcess: (process: CreatedProcess) => void
  onDeleteProcess: (processId: string) => void
  onUpdateProcess: (process: CreatedProcess) => void
  processType?: ProcessType
  showCreateModal: boolean
}

export function ProcessModalLayer({
  createdGroups,
  editingProcess,
  existingProcesses,
  locationZones,
  liveReadings,
  onCloseCreate,
  onCloseEdit,
  onCreateProcess,
  onDeleteProcess,
  onUpdateProcess,
  processType,
  showCreateModal,
}: Props) {
  return (
    <>
      {showCreateModal ? (
        <ProcessModal
          createdGroups={createdGroups}
          existingProcesses={existingProcesses}
          liveReadings={liveReadings}
          locationZones={locationZones}
          onClose={onCloseCreate}
          onSave={onCreateProcess}
          processType={processType}
        />
      ) : null}
      {editingProcess ? (
        <ProcessModal
          createdGroups={createdGroups}
          existingProcesses={existingProcesses}
          initialProcess={editingProcess}
          liveReadings={liveReadings}
          locationZones={locationZones}
          onClose={onCloseEdit}
          onDelete={onDeleteProcess}
          onSave={onUpdateProcess}
        />
      ) : null}
    </>
  )
}
