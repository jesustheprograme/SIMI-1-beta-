import type { CreatedSensorGroup } from '../../telemetria'
import type { GroupSection } from '../../telemetria/types/groupSections'
import type { PlanoLocationShape, PlanoLocationZone } from '../../plano'
import type { CreatedProcess, ProcessType } from '../../procesos'
import type { ProcessSection } from '../../procesos/types/processSections'
import { createLocalId } from '../../../utils/localId'

const GROUPS_KEY = 'simi.createdSensorGroups'
const LEGACY_GROUPS_CLEANUP_KEY = 'simi.migrations.removeLegacyGroupsV1'
const GROUP_SECTIONS_KEY = 'simi.groupSections'
const PROCESSES_KEY = 'simi.createdProcesses'
const PROCESS_SECTIONS_KEY = 'simi.processSections'
const ZONES_KEY = 'simi.planoLocationZones'
const ACTIVE_PLAN_KEY = 'simi.activePlanDraft'
const SAVED_PLANS_KEY = 'simi.savedPlans'
const REMOVED_PROCESS_IDS = new Set([
  'process-mq6xs7be-t2ozvcjk',
  'process-mq6xsvqm-msajjy98',
])

export function persistCreatedGroups(groups: CreatedSensorGroup[]) {
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
}

export function persistGroupSections(sections: GroupSection[]) {
  localStorage.setItem(GROUP_SECTIONS_KEY, JSON.stringify(sections))
}

export function persistCreatedProcesses(processes: CreatedProcess[]) {
  const payload = JSON.stringify(processes)
  try {
    localStorage.setItem(PROCESSES_KEY, payload)
  } catch (error) {
    if (clearPlanImages()) {
      try {
        localStorage.setItem(PROCESSES_KEY, payload)
        return
      } catch {
        // The in-memory process list remains available when storage is full.
      }
    }
    console.warn('No se pudieron guardar los procesos en el almacenamiento local.', error)
  }
}

export function persistProcessSections(sections: ProcessSection[]) {
  localStorage.setItem(PROCESS_SECTIONS_KEY, JSON.stringify(sections))
}

export function persistLocationZones(zones: PlanoLocationZone[]) {
  localStorage.setItem(ZONES_KEY, JSON.stringify(zones))
}

export function loadCreatedGroups(): CreatedSensorGroup[] {
  try {
    const stored = localStorage.getItem(GROUPS_KEY)
    const groups = stored ? (JSON.parse(stored) as Partial<CreatedSensorGroup>[]) : []
    const normalizedGroups = groups.filter(isStoredGroup).map((group) => ({
      categories: Array.isArray(group.categories) ? group.categories : [],
      createdAt: group.createdAt ?? new Date().toISOString(),
      id: group.id ?? createLocalId('group'),
      name: group.name ?? 'Grupo sin nombre',
      sensorTitle: group.sensorTitle ?? 'Sensores',
      variableIds: Array.isArray(group.variableIds) ? group.variableIds : [],
      variables: Array.isArray(group.variables) ? group.variables : [],
    }))
    return shouldCleanupLegacyGroups()
      ? normalizedGroups.filter((group) => !isLegacyDemoGroup(group))
      : normalizedGroups
  } catch {
    return []
  }
}

export function getLegacyDemoGroups(groups: CreatedSensorGroup[]) {
  if (!shouldCleanupLegacyGroups()) return []
  return groups.filter(isLegacyDemoGroup)
}

export function markLegacyGroupsCleanupComplete() {
  localStorage.setItem(LEGACY_GROUPS_CLEANUP_KEY, '1')
}

export function loadCreatedProcesses(): CreatedProcess[] {
  try {
    const stored = localStorage.getItem(PROCESSES_KEY)
    const processes = stored ? (JSON.parse(stored) as Partial<CreatedProcess>[]) : []
    const activeProcesses = processes.filter(
      (process) => !REMOVED_PROCESS_IDS.has(String(process?.id ?? '')),
    )
    if (activeProcesses.length !== processes.length) {
      localStorage.setItem(PROCESSES_KEY, JSON.stringify(activeProcesses))
    }
    return activeProcesses.filter(isStoredProcess).map(normalizeProcess)
  } catch {
    return []
  }
}

export function loadGroupSections(): GroupSection[] {
  try {
    const stored = localStorage.getItem(GROUP_SECTIONS_KEY)
    const sections = stored ? (JSON.parse(stored) as Partial<GroupSection>[]) : []
    return sections
      .filter((section) => Boolean(section?.id && section?.title))
      .map((section) => ({
        groupIds: Array.isArray(section.groupIds) ? section.groupIds : [],
        id: section.id ?? createLocalId('group-section'),
        title: section.title ?? 'Seccion',
      }))
  } catch {
    return []
  }
}

export function loadProcessSections(): ProcessSection[] {
  try {
    const stored = localStorage.getItem(PROCESS_SECTIONS_KEY)
    const sections = stored ? (JSON.parse(stored) as Partial<ProcessSection>[]) : []
    return sections
      .filter((section) => Boolean(section?.id && section?.title))
      .map((section) => ({
        id: section.id ?? createLocalId('process-section'),
        processIds: Array.isArray(section.processIds) ? section.processIds : [],
        processType: normalizeProcessType(section.processType),
        title: section.title ?? 'Seccion',
      }))
  } catch {
    return []
  }
}

export function loadLocationZones(): PlanoLocationZone[] {
  try {
    const stored = localStorage.getItem(ZONES_KEY)
    const zones = stored ? (JSON.parse(stored) as Partial<PlanoLocationZone>[]) : []
    return zones.filter(isStoredZone).map((zone) => ({
      createdAt: zone.createdAt ?? new Date().toISOString(),
      height: zone.height ?? 90,
      id: zone.id ?? createLocalId('ubicado'),
      lCutX: typeof zone.lCutX === 'number' ? zone.lCutX : undefined,
      lCutY: typeof zone.lCutY === 'number' ? zone.lCutY : undefined,
      name: zone.name ?? 'Ubicado',
      shape: isLocationShape(zone.shape) ? zone.shape : 'rectangle',
      width: zone.width ?? 120,
      x: zone.x ?? 0,
      y: zone.y ?? 0,
    }))
  } catch {
    return []
  }
}

function normalizeProcess(process: Partial<CreatedProcess>): CreatedProcess {
  return {
    binCount: process.binCount ?? '',
    clientName: process.clientName ?? '',
    createdAt: process.createdAt ?? new Date().toISOString(),
    deadlineAt: process.deadlineAt,
    destination: process.destination ?? '',
    duration: process.duration ?? '',
    finalObservation: process.finalObservation ?? '',
    finalOperator: process.finalOperator ?? '',
    finalComment: process.finalComment ?? '',
    finalReadings: Array.isArray(process.finalReadings) ? process.finalReadings : undefined,
    finishedAt: process.finishedAt,
    container: process.container ?? 'Envase 1',
    groupIds: Array.isArray(process.groupIds) ? process.groupIds : [],
    id: process.id ?? createLocalId('process'),
    initialComment: process.initialComment ?? process.finalObservation ?? '',
    location: process.location ?? '',
    origin: process.origin ?? '',
    processName: process.processName ?? 'Proceso sin nombre',
    processType: normalizeProcessType(process.processType),
    product: process.product ?? '',
    readingIntervalSeconds: normalizeInterval(process.readingIntervalSeconds),
    sensorVariables: Array.isArray(process.sensorVariables) ? process.sensorVariables : [],
    setPoint: process.setPoint ?? '',
    initialOperator: process.initialOperator ?? '',
    totalWeight: process.totalWeight ?? '',
    totalWeightUnit: process.totalWeightUnit === 't' ? 't' : 'kg',
    ventilation: process.ventilation ?? '70%',
  }
}

function clearPlanImages() {
  return clearBackground(ACTIVE_PLAN_KEY, false) || clearBackground(SAVED_PLANS_KEY, true)
}

function clearBackground(key: string, isList: boolean) {
  try {
    const stored = localStorage.getItem(key)
    if (!stored) return false
    const value = JSON.parse(stored)
    const items = isList && Array.isArray(value) ? value : [value]
    if (!items.some((item) => item?.backgroundImage)) return false
    const cleaned = items.map((item) => ({ ...item, backgroundImage: null }))
    localStorage.setItem(key, JSON.stringify(isList ? cleaned : cleaned[0]))
    return true
  } catch {
    return false
  }
}

const isStoredGroup = (group: Partial<CreatedSensorGroup>) => Boolean(group?.id && group?.name)
const isStoredProcess = (process: Partial<CreatedProcess>) => Boolean(process?.id && process?.processName)
const isStoredZone = (zone: Partial<PlanoLocationZone>) =>
  Boolean(zone?.id && zone?.name && ['x', 'y', 'width', 'height'].every((key) => typeof zone[key as keyof typeof zone] === 'number'))

function normalizeInterval(value: unknown) {
  const seconds = Number(value)
  return Number.isFinite(seconds) && seconds >= 1 ? Math.round(seconds) : 5
}

function normalizeProcessType(value: unknown): ProcessType | undefined {
  if (value === 'maduracion') return 'maduracion'
  if (value === 'almacenado') return 'almacenado'
  if (value === 'proceso-3') return 'proceso-3'
  return undefined
}

function isLocationShape(value: unknown): value is PlanoLocationShape {
  return ['rectangle', 'rounded', 'l-shape', 'ellipse', 'diamond'].includes(String(value))
}

function shouldCleanupLegacyGroups() {
  return localStorage.getItem(LEGACY_GROUPS_CLEANUP_KEY) !== '1'
}

function isLegacyDemoGroup(group: CreatedSensorGroup) {
  const name = group.name.trim().toLowerCase()
  return name === 'grupo 1' || name === 'grupo 2'
}
