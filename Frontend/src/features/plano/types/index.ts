import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { PlanoLocationZone } from './plano'

export const VARIABLE_CARD_SIZE = { width: 160, height: 64 }
export const CONTEXT_LOCATION_SIZE = { width: 220, height: 130 }
export const RETURN_ZONE_MARGIN = 60
export const CANVAS_DROPPABLE_ID = 'plano-canvas'
export const GROUPS_DROPPABLE_ID = 'available-groups'

export type AvailableMode = 'groups' | 'processes'

export type VariableDragData = {
  groupName: string
  kind: 'palette-variable' | 'placed-variable'
  variableId: string
  variableName: string
  x?: number
  y?: number
}

export type ProcessDragData = {
  kind: 'palette-process' | 'placed-process'
  processId: string
  processName: string
  x?: number
  y?: number
}

export type PlanDragData = VariableDragData | ProcessDragData

export type PlanoPageProps = {
  createdGroups?: CreatedSensorGroup[]
  createdProcesses?: CreatedProcess[]
  locationZones?: PlanoLocationZone[]
  liveReadings?: Record<string, ProcessSensorReading>
  onLocationZonesChange?: (zones: PlanoLocationZone[]) => void
  onCreateProcess?: (process: CreatedProcess) => void
  onOpenProcess?: (processId: string) => void
}
