import { useMemo } from 'react'
import { getProcessReadings } from '../../procesos/utils/processReadings'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorReading } from '../../procesos/types'
import type { PlanoLocationZone, PlanoProcessNode, PlanoVariableNode, Point } from '../types/plano'
import { buildLocationZoneFromPoints } from '../utils/locationHelpers'
import { getSensorSummary, getVariableReading, hasProcessLinks } from '../utils/groupHelpers'

type UsePlanoDerivedDataParams = {
  createdGroups: CreatedSensorGroup[]
  createdProcesses: CreatedProcess[]
  groupQuery: string
  liveReadings: Record<string, ProcessSensorReading>
  locationCreationDraft: { current: Point; id: string; name: string; start: Point } | null
  locationZones: PlanoLocationZone[]
  placedProcessIds: Set<string>
  selectedLocationZoneId: string | null
  variableNodes: PlanoVariableNode[]
  processNodes: PlanoProcessNode[]
}

export function usePlanoDerivedData({
  createdGroups,
  createdProcesses,
  groupQuery,
  liveReadings,
  locationCreationDraft,
  locationZones,
  placedProcessIds,
  processNodes,
  selectedLocationZoneId,
  variableNodes,
}: UsePlanoDerivedDataParams) {
  const planoProcesses = useMemo(
    () => createdProcesses.filter((process) => !process.finishedAt && hasProcessLinks(process)),
    [createdProcesses],
  )
  const placedVariableIds = useMemo(() => new Set(variableNodes.map((variable) => variable.variableId)), [variableNodes])
  const variableReadings = useMemo(
    () =>
      Object.fromEntries(
        variableNodes.flatMap((variable) => {
          const reading = getVariableReading(variable, liveReadings)
          return reading ? [[variable.variableId, reading]] : []
        }),
      ),
    [liveReadings, variableNodes],
  )
  const processReadings = useMemo(
    () =>
      Object.fromEntries(
        processNodes.map((processNode) => {
          const process = createdProcesses.find((item) => item.id === processNode.processId)
          const readings = process ? getProcessReadings(process, createdGroups, liveReadings) : []
          return [processNode.processId, readings]
        }),
      ),
    [createdGroups, createdProcesses, liveReadings, processNodes],
  )
  const selectedLocationZone = useMemo(
    () => locationZones.find((zone) => zone.id === selectedLocationZoneId) ?? null,
    [locationZones, selectedLocationZoneId],
  )
  const contextLocationDraftZone = useMemo(
    () => buildContextLocationDraft(locationCreationDraft),
    [locationCreationDraft],
  )
  const normalizedQuery = groupQuery.trim().toLowerCase()
  const filteredAvailableGroups = useMemo(
    () => filterGroups(createdGroups, normalizedQuery),
    [createdGroups, normalizedQuery],
  )
  const filteredAvailableProcesses = useMemo(
    () => filterProcesses(planoProcesses, createdGroups, placedProcessIds, normalizedQuery),
    [createdGroups, normalizedQuery, placedProcessIds, planoProcesses],
  )

  return {
    contextLocationDraftZone,
    filteredAvailableGroups,
    filteredAvailableProcesses,
    normalizedQuery,
    placedVariableIds,
    planoProcesses,
    processReadings,
    selectedLocationZone,
    variableReadings,
  }
}

function buildContextLocationDraft(draft: UsePlanoDerivedDataParams['locationCreationDraft']) {
  if (!draft) return null

  return buildLocationZoneFromPoints(draft.start, draft.current, {
    createdAt: new Date().toISOString(),
    height: 0,
    id: draft.id,
    name: draft.name,
    shape: 'rectangle',
    width: 0,
    x: draft.start.x,
    y: draft.start.y,
  })
}

function filterGroups(groups: CreatedSensorGroup[], query: string) {
  if (!query) return groups
  return groups.filter((group) =>
    [group.name, getSensorSummary(group), ...group.variables].some((value) => value.toLowerCase().includes(query)),
  )
}

function filterProcesses(
  processes: CreatedProcess[],
  groups: CreatedSensorGroup[],
  placedProcessIds: Set<string>,
  query: string,
) {
  const availableProcesses = processes.filter((process) => !placedProcessIds.has(process.id))
  if (!query) return availableProcesses

  return availableProcesses.filter((process) => {
    const groupNames = process.groupIds.map((groupId) => groups.find((group) => group.id === groupId)?.name ?? '')
    const variableNames = process.sensorVariables.map((variable) => variable.name)
    return [process.processName, process.clientName, process.location, ...groupNames, ...variableNames].some((value) =>
      value.toLowerCase().includes(query),
    )
  })
}
