import type { CreatedSensorGroup } from '../../telemetria'
import type { PlanoLocationZone } from '../../plano'
import type { CreatedProcess, ProcessSensorReading, ProcessType } from '../types'
import type { ProcessSection } from './processSections'

export type ProcesosPageProps = {
  createdGroups: CreatedSensorGroup[]
  locationZones: PlanoLocationZone[]
  onCreateProcess: (process: CreatedProcess) => void
  onDeleteProcess: (processId: string) => void
  onOpenProcess: (processId: string) => void
  onProcessSectionsChange: (sections: ProcessSection[]) => void
  onUpdateProcess: (process: CreatedProcess) => void
  liveReadings: Record<string, ProcessSensorReading>
  processType?: ProcessType
  processes: CreatedProcess[]
  processSections: ProcessSection[]
  title?: string
}

export type ProcessCountdownState = {
  detail: string
  label: string
  status: 'danger' | 'idle' | 'safe' | 'warning'
}
