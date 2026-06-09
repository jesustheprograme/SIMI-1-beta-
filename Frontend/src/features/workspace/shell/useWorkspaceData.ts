import { useEffect, useRef, useState } from 'react'
import {
  loadProcesses,
  loadSensorGroups,
  loadWorkspaceConfiguration,
  saveProcess,
  saveSensorGroup,
  saveWorkspaceConfiguration,
  deleteSensorGroup,
} from '../../auth/services/authApi'
import type { CreatedSensorGroup } from '../../telemetria'
import type { PlanoLocationZone } from '../../plano'
import type { CreatedProcess } from '../../procesos'
import type { ProcessSection } from '../../procesos/types/processSections'
import {
  loadCreatedGroups,
  loadCreatedProcesses,
  loadGroupSections,
  getLegacyDemoGroups,
  loadLocationZones,
  loadProcessSections,
  persistCreatedGroups,
  persistCreatedProcesses,
  persistGroupSections,
  persistLocationZones,
  persistProcessSections,
  markLegacyGroupsCleanupComplete,
} from './workspaceStorage'
import type { GroupSection } from '../../telemetria/types/groupSections'

export function useWorkspaceData() {
  const [groups, setGroups] = useState<CreatedSensorGroup[]>(loadCreatedGroups)
  const [groupSections, setGroupSections] = useState<GroupSection[]>(loadGroupSections)
  const [processes, setProcesses] = useState<CreatedProcess[]>(loadCreatedProcesses)
  const [processSections, setProcessSections] = useState<ProcessSection[]>(loadProcessSections)
  const [zones, setZones] = useState<PlanoLocationZone[]>(loadLocationZones)
  const startup = useRef({ groupSections, groups, processSections, processes, zones })

  useEffect(() => {
    let cancelled = false
    async function hydrate() {
      try {
        const [{ groups: remoteGroups }, { processes: remoteProcesses }, { configuration }] =
          await Promise.all([loadSensorGroups(), loadProcesses(), loadWorkspaceConfiguration()])
        if (cancelled) return
        const localGroups = startup.current.groups.filter(
          (local) => !remoteGroups.some((remote) => remote.id === local.id),
        )
        const localProcesses = startup.current.processes.filter(
          (local) => !remoteProcesses.some((remote) => remote.id === local.id),
        )
        const nextGroupSections = configuration.groupSections.length
          ? configuration.groupSections
          : startup.current.groupSections
        const combinedGroups = [...remoteGroups, ...localGroups]
        const legacyGroups = getLegacyDemoGroups(combinedGroups)
        const legacyGroupIds = new Set(legacyGroups.map((group) => group.id))
        const nextGroups = combinedGroups.filter((group) => !legacyGroupIds.has(group.id))
        const nextProcesses = [...remoteProcesses, ...localProcesses]
        const nextProcessSections = configuration.processSections?.length
          ? configuration.processSections
          : startup.current.processSections
        const nextZones = configuration.locationZones.length ? configuration.locationZones : startup.current.zones
        setGroupSections(nextGroupSections)
        setGroups(nextGroups)
        setProcesses(nextProcesses)
        setProcessSections(nextProcessSections)
        setZones(nextZones)
        persistGroupSections(nextGroupSections)
        persistCreatedGroups(nextGroups)
        persistCreatedProcesses(nextProcesses)
        persistProcessSections(nextProcessSections)
        persistLocationZones(nextZones)
        const legacyCleanupResults = await Promise.allSettled(
          legacyGroups.map((group) => deleteSensorGroup(group.id)),
        )
        await Promise.allSettled([
          ...localGroups.map(saveSensorGroup),
          ...localProcesses.map(saveProcess),
          ...(configuration.groupSections.length === 0 && startup.current.groupSections.length
            ? [saveWorkspaceConfiguration({ groupSections: startup.current.groupSections })]
            : []),
          ...(configuration.locationZones.length === 0 && startup.current.zones.length
            ? [saveWorkspaceConfiguration({ locationZones: startup.current.zones })]
            : []),
          ...(!configuration.processSections?.length && startup.current.processSections.length
            ? [saveWorkspaceConfiguration({ processSections: startup.current.processSections })]
            : []),
        ])
        if (legacyCleanupResults.every((result) => result.status === 'fulfilled')) {
          markLegacyGroupsCleanupComplete()
        }
      } catch (error) {
        console.warn('No se pudieron cargar datos desde MongoDB. Se usara el respaldo local.', error)
      }
    }
    void hydrate()
    return () => {
      cancelled = true
    }
  }, [])

  return {
    groupSections,
    groups,
    processSections,
    processes,
    setGroupSections,
    setGroups,
    setProcessSections,
    setProcesses,
    setZones,
    zones,
  }
}
