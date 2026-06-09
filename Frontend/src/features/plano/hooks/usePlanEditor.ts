import { useEffect, useMemo, useState, useRef, type MouseEvent } from 'react'
import {
  HEIGHT,
  WIDTH,
  snapToGrid,
  getDirection,
  shouldBreakLine,
  buildLineByDirection,
  isValidLine,
  getOppositeDirection,
} from '../utils/planoUtils'
import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessSensorVariable } from '../../procesos/types'
import type { PlanoBackgroundImage, PlanoLine, PlanoLocationShape, PlanoLocationZone, Point, SavedPlan } from '../types/plano'
import { createLocalId } from '../../../utils/localId'
import { getSensorVariableId } from '../../../utils/sensorVariableId'
import {
  loadWorkspaceConfiguration,
  saveWorkspaceConfiguration,
} from '../../auth/services/authApi'

const LINE_ENDPOINT_HIT_TOLERANCE = 10
const SAVED_PLANS_STORAGE_KEY = 'simi.savedPlans'
const ACTIVE_PLAN_STORAGE_KEY = 'simi.activePlanDraft'
const LOCATION_MIN_SIZE = 5
const PROCESS_CARD_SIZE = { width: 224, height: 56 }
const PROCESS_CARD_GAP = 14

export type PlanEditorTool = 'line' | 'location' | 'select'

type LineInteraction = {
  beforeLines: PlanoLine[]
  hasMoved: boolean
  originalLines?: PlanoLine[]
  startPoint: Point
}

type LocationDraft = {
  start: Point
  zone: PlanoLocationZone
}

type ActivePlanDraft = {
  backgroundImage: PlanoBackgroundImage | null
  lines: PlanoLine[]
  processPositions: Record<string, Point>
  returnedProcessIds: string[]
  variablePositions: Record<string, Point>
}

type PlanoBackgroundFrame = {
  displayHeight: number
  displayWidth: number
  imageDisplayHeight: number
  imageDisplayWidth: number
  imageX: number
  imageY: number
  x: number
  y: number
}

type BackgroundFrameBounds = {
  height: number
  minX?: number
  minY?: number
  width: number
}

export const getPlanoVariableId = getSensorVariableId

export function usePlanEditor(
  createdGroups: CreatedSensorGroup[] = [],
  createdProcesses: CreatedProcess[] = [],
  locationZones: PlanoLocationZone[] = [],
  onLocationZonesChange?: (zones: PlanoLocationZone[]) => void,
  tool: PlanEditorTool = 'select',
  locationShape: PlanoLocationShape = 'rectangle',
) {
  const [activePlanDraft] = useState<ActivePlanDraft>(() => loadActivePlanDraft())
  const [planBackgroundImage, setPlanBackgroundImage] = useState<PlanoBackgroundImage | null>(
    () => activePlanDraft.backgroundImage,
  )
  const [lines, setLines] = useState<PlanoLine[]>(() => activePlanDraft.lines)
  const [currentLine, setCurrentLine] = useState<PlanoLine | null>(null)
  const [locationDraft, setLocationDraft] = useState<PlanoLocationZone | null>(null)
  const [variablePositions, setVariablePositions] = useState<Record<string, Point>>(
    () => activePlanDraft.variablePositions,
  )
  const [processPositions, setProcessPositions] = useState<Record<string, Point>>(
    () => activePlanDraft.processPositions,
  )
  const [returnedProcessIds, setReturnedProcessIds] = useState<Set<string>>(
    () => new Set(activePlanDraft.returnedProcessIds),
  )
  const automaticProcessPositions = useMemo(
    () => buildAutomaticProcessPositions(createdProcesses, locationZones, returnedProcessIds),
    [createdProcesses, locationZones, returnedProcessIds],
  )
  const effectiveProcessPositions = useMemo(
    () => ({ ...automaticProcessPositions, ...processPositions }),
    [automaticProcessPositions, processPositions],
  )
  const variableNodes = useMemo(
    () => buildVariableNodes(createdGroups, variablePositions),
    [createdGroups, variablePositions],
  )
  const processNodes = useMemo(
    () => buildProcessNodes(createdProcesses, createdGroups, effectiveProcessPositions),
    [createdGroups, createdProcesses, effectiveProcessPositions],
  )
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() => loadSavedPlans())
  const [configurationLoaded, setConfigurationLoaded] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [planName, setPlanName] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragBoundaryRef = useRef<HTMLDivElement>(null)
  const linesRef = useRef<PlanoLine[]>(lines)
  const lineHistoryRef = useRef<PlanoLine[][]>([])
  const currentLineRef = useRef<PlanoLine | null>(null)
  const lineInteractionRef = useRef<LineInteraction | null>(null)
  const locationDraftRef = useRef<LocationDraft | null>(null)
  const hasLocalChangesRef = useRef(false)
  const activePlanSyncQueueRef = useRef<Promise<unknown>>(Promise.resolve())
  const initialActivePlanDraftRef = useRef(activePlanDraft)
  const initialSavedPlansRef = useRef(savedPlans)
  const effectiveTool: PlanEditorTool = planBackgroundImage ? 'select' : tool

  useEffect(() => {
    let cancelled = false

    void loadWorkspaceConfiguration()
      .then(({ configuration }) => {
        if (cancelled) return

        if (configuration.savedPlans.length > 0) {
          setSavedPlans(configuration.savedPlans)
          persistSavedPlansCache(configuration.savedPlans)
        } else if (initialSavedPlansRef.current.length > 0) {
          void saveWorkspaceConfiguration({ savedPlans: initialSavedPlansRef.current })
        }

        if (
          !hasLocalChangesRef.current &&
          configuration.activePlanDraft &&
          typeof configuration.activePlanDraft === 'object'
        ) {
          const draft = normalizeActivePlanDraft(configuration.activePlanDraft)
          setPlanBackgroundImage(draft.backgroundImage)
          setPlanLines(draft.lines)
          setProcessPositions(draft.processPositions)
          setReturnedProcessIds(new Set(draft.returnedProcessIds))
          setVariablePositions(draft.variablePositions)
          persistActivePlanDraftCache(draft)
        } else {
          void saveWorkspaceConfiguration({ activePlanDraft: initialActivePlanDraftRef.current })
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setConfigurationLoaded(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!configurationLoaded) return

    const draft = {
      backgroundImage: planBackgroundImage,
      lines,
      processPositions,
      returnedProcessIds: Array.from(returnedProcessIds),
      variablePositions,
    }
    persistActivePlanDraftCache(draft)

    const timer = window.setTimeout(() => {
      activePlanSyncQueueRef.current = activePlanSyncQueueRef.current
        .catch(() => undefined)
        .then(() => saveWorkspaceConfiguration({ activePlanDraft: draft }))
        .catch((error) => {
          console.warn('El borrador del plano se guardo localmente, pero no se sincronizo con MongoDB.', error)
        })
    }, 600)

    return () => window.clearTimeout(timer)
  }, [configurationLoaded, lines, planBackgroundImage, processPositions, returnedProcessIds, variablePositions])

  function getSnappedPosition(x: number, y: number, maxX: number, maxY: number): Point {
    return {
      x: clamp(snapToGrid(x), 0, maxX),
      y: clamp(snapToGrid(y), 0, maxY),
    }
  }

  function getFreePosition(x: number, y: number): Point {
    return {
      x: Math.max(0, Math.round(x)),
      y: Math.max(0, Math.round(y)),
    }
  }

  function setDraftLine(line: PlanoLine | null | ((current: PlanoLine | null) => PlanoLine | null)) {
    if (typeof line === 'function') {
      const next = line(currentLineRef.current)
      currentLineRef.current = next
      setCurrentLine(next)
      return
    }

    currentLineRef.current = line
    setCurrentLine(line)
  }

  function setPlanLines(nextLines: PlanoLine[] | ((current: PlanoLine[]) => PlanoLine[])) {
    if (typeof nextLines === 'function') {
      const next = nextLines(linesRef.current)
      linesRef.current = next
      setLines(next)
      return
    }

    linesRef.current = nextLines
    setLines(nextLines)
  }

  function getRawPoint(event: MouseEvent<HTMLElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
    }
  }

  function getPoint(event: MouseEvent<HTMLElement>): Point {
    const rect = event.currentTarget.getBoundingClientRect()
    const rawPoint = getRawPoint(event)
    return getSnappedPosition(rawPoint.x, rawPoint.y, rect.width, rect.height)
  }

  function handleMouseDown(event: MouseEvent<HTMLElement>) {
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('[data-plan-item="true"]')) return
    if ((event.target as HTMLElement).closest('[data-location-zone="true"]')) return

    event.preventDefault()
    hasLocalChangesRef.current = true
    const point = getPoint(event)

    if (effectiveTool === 'location') {
      const draft = {
        start: point,
        zone: {
          createdAt: new Date().toISOString(),
          height: 0,
          id: createLocalId('ubicado'),
          name: getNextLocationName(locationZones),
          shape: locationShape,
          width: 0,
          x: point.x,
          y: point.y,
        },
      }
      locationDraftRef.current = draft
      setLocationDraft(draft.zone)
      return
    }

    if (effectiveTool !== 'line') return

    const rawPoint = getRawPoint(event)
    const editableLineIndex = getEditableLineIndexAtPoint(linesRef.current, rawPoint)
    const editableLine = editableLineIndex >= 0 ? linesRef.current[editableLineIndex] : null
    if (editableLine) {
      const orientedLine = orientLineForNearestEndpoint(editableLine, rawPoint)
      const originalLines = linesRef.current.slice(editableLineIndex)
      const beforeLines = cloneLines(linesRef.current)
      setPlanLines((current) => current.slice(0, editableLineIndex))
      setDraftLine(anchorEditableLineAtPoint(orientedLine, point))
      lineInteractionRef.current = { beforeLines, hasMoved: false, originalLines, startPoint: point }
      return
    }

    const beforeLines = cloneLines(linesRef.current)
    setDraftLine({
      id: createLocalId('line'),
      x1: point.x,
      y1: point.y,
      x2: point.x,
      y2: point.y,
      direction: null,
    })
    lineInteractionRef.current = { beforeLines, hasMoved: false, startPoint: point }
  }

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    if (effectiveTool === 'location' && locationDraftRef.current) {
      const point = getPoint(event)
      const zone = buildLocationZone(locationDraftRef.current.start, point, locationDraftRef.current.zone)
      locationDraftRef.current = { ...locationDraftRef.current, zone }
      setLocationDraft(zone)
      return
    }

    const draftLine = currentLineRef.current
    if (!draftLine || !lineInteractionRef.current) return

    const point = getPoint(event)
    if (!samePoint(point, lineInteractionRef.current.startPoint)) {
      lineInteractionRef.current.hasMoved = true
    }

    if (!draftLine.direction) {
      const startPoint = { x: draftLine.x1, y: draftLine.y1 }
      const firstDirection = getDirection(startPoint, point)
      if (!firstDirection) return
      setDraftLine((prev) => (prev ? buildLineByDirection(prev, point, firstDirection) : prev))
      return
    }

    const backtrackLine = getBacktrackLine(linesRef.current, draftLine, point)
    if (backtrackLine) {
      setPlanLines((prev) => prev.slice(0, -1))
      setDraftLine(backtrackLine)
      return
    }

    if (shouldBreakLine(draftLine, point)) {
      const finishedLine = { ...draftLine }
      if (isValidLine(finishedLine)) {
        setPlanLines((prev) => [...prev, finishedLine])
      }

      const nextDirection = getOppositeDirection(draftLine.direction)
      const nextLineBase = {
        id: createLocalId('line'),
        x1: finishedLine.x2,
        y1: finishedLine.y2,
        x2: finishedLine.x2,
        y2: finishedLine.y2,
        direction: nextDirection,
      }
      setDraftLine(buildLineByDirection(nextLineBase, point, nextDirection))
      return
    }

    setDraftLine((prev) =>
      prev && prev.direction ? buildLineByDirection(prev, point, prev.direction) : prev,
    )
  }

  function handleMouseUp() {
    if (locationDraftRef.current) {
      const zone = locationDraftRef.current.zone
      if (zone.width >= LOCATION_MIN_SIZE && zone.height >= LOCATION_MIN_SIZE) {
        onLocationZonesChange?.([...locationZones, zone])
      }
      locationDraftRef.current = null
      setLocationDraft(null)
      return
    }

    const draftLine = currentLineRef.current
    if (!draftLine) return
    const interaction = lineInteractionRef.current
    const originalLines = interaction?.originalLines
    if (!interaction?.hasMoved && originalLines) {
      setPlanLines(interaction.beforeLines)
      setDraftLine(null)
      lineInteractionRef.current = null
      return
    }

    const nextLines = isValidLine(draftLine)
      ? [...linesRef.current, draftLine]
      : linesRef.current
    if (interaction && !sameLines(interaction.beforeLines, nextLines)) {
      lineHistoryRef.current.push(interaction.beforeLines)
    }
    setPlanLines(nextLines)
    setDraftLine(null)
    lineInteractionRef.current = null
  }

  function returnVariableToPalette(variableId: string) {
    hasLocalChangesRef.current = true
    setVariablePositions((current) => {
      const next = { ...current }
      delete next[variableId]
      return next
    })
  }

  function returnProcessToPalette(processId: string) {
    hasLocalChangesRef.current = true
    setProcessPositions((current) => {
      const next = { ...current }
      delete next[processId]
      return next
    })
    setReturnedProcessIds((current) => new Set([...current, processId]))
  }

  function placeVariableAtPoint(variableId: string, point: Point) {
    if (!findVariable(createdGroups, variableId)) return

    hasLocalChangesRef.current = true
    setVariablePositions((current) => ({
      ...current,
      [variableId]: getFreePosition(point.x, point.y),
    }))
  }

  function placeProcessAtPoint(processId: string, point: Point) {
    hasLocalChangesRef.current = true
    setProcessPositions((current) => ({
      ...current,
      [processId]: getFreePosition(point.x, point.y),
    }))
    setReturnedProcessIds((current) => {
      if (!current.has(processId)) return current
      const next = new Set(current)
      next.delete(processId)
      return next
    })
  }

  function savePlan() {
    const cleanName = planName.trim()
    if (!cleanName) return

    const plan = {
      id: createLocalId('plan'),
      name: cleanName,
      backgroundImage: planBackgroundImage,
      lines: lines.map((line) => ({ ...line })),
      locationZones: locationZones.map(normalizeLocationZone),
      processes: processNodes.map((process) => ({ ...process, variables: process.variables.map((variable) => ({ ...variable })) })),
      variables: variableNodes.map((variable) => ({ ...variable })),
      createdAt: new Date().toISOString(),
    }
    setSavedPlans((prev) => {
      const next = [plan, ...prev]
      persistSavedPlans(next)
      return next
    })
    setShowSaveModal(false)
    setPlanName('')
  }

  function deletePlan(planId: string) {
    setSavedPlans((prev) => {
      const next = prev.filter((plan) => plan.id !== planId)
      persistSavedPlans(next)
      return next
    })
  }

  function clearPlan() {
    hasLocalChangesRef.current = true
    lineHistoryRef.current = []
    setPlanLines([])
    setDraftLine(null)
    setProcessPositions({})
    setReturnedProcessIds(new Set())
    setVariablePositions({})
    setPlanBackgroundImage(null)
    locationDraftRef.current = null
    setLocationDraft(null)
    onLocationZonesChange?.([])
    lineInteractionRef.current = null
  }

  function undoLastLine() {
    hasLocalChangesRef.current = true
    if (currentLineRef.current) {
      const beforeLines = lineInteractionRef.current?.beforeLines
      if (beforeLines) setPlanLines(beforeLines)
      setDraftLine(null)
      lineInteractionRef.current = null
      return
    }

    const previousLines = lineHistoryRef.current.pop()
    setPlanLines(previousLines ?? linesRef.current.slice(0, -1))
  }

  function replicatePlan(plan: SavedPlan) {
    hasLocalChangesRef.current = true
    lineHistoryRef.current = []
    setPlanBackgroundImage(plan.backgroundImage ? normalizePlanoBackgroundImage(plan.backgroundImage) : null)
    setPlanLines(plan.lines.map((line) => ({ ...line })))
    onLocationZonesChange?.((plan.locationZones ?? []).map(normalizeLocationZone))
    setProcessPositions(
      Object.fromEntries((plan.processes ?? []).map((process) => [process.processId, { x: process.x, y: process.y }])),
    )
    setReturnedProcessIds(new Set())
    setVariablePositions(
      Object.fromEntries((plan.variables ?? []).map((variable) => [variable.variableId, { x: variable.x, y: variable.y }])),
    )
    setDraftLine(null)
  }

  async function uploadPlanBackground(file: File, frame?: PlanoBackgroundFrame) {
    try {
      const image = await readPlanBackgroundImage(file, frame)
      if (!image) return
      hasLocalChangesRef.current = true
      setDraftLine(null)
      lineInteractionRef.current = null
      setPlanBackgroundImage(image)
    } catch (error) {
      console.warn('No se pudo cargar la imagen del plano.', error)
    }
  }

  function clearPlanBackground() {
    hasLocalChangesRef.current = true
    setPlanBackgroundImage(null)
  }

  function updatePlanBackgroundFrame(frame: PlanoBackgroundFrame) {
    hasLocalChangesRef.current = true
    setPlanBackgroundImage((current) => {
      if (!current) return current
      const nextImage = { ...current, ...frame }
      return normalizePlanoBackgroundImage(nextImage, getBackgroundFrameBounds(nextImage))
    })
  }

  return {
    planBackgroundImage,
    lines,
    currentLine,
    locationDraft,
    locationZones,
    processNodes,
    variableNodes,
    savedPlans,
    showSaveModal,
    setShowSaveModal,
    planName,
    setPlanName,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    placeVariableAtPoint,
    placeProcessAtPoint,
    returnProcessToPalette,
    returnVariableToPalette,
    savePlan,
    clearPlan,
    clearPlanBackground,
    undoLastLine,
    uploadPlanBackground,
    updatePlanBackgroundFrame,
    replicatePlan,
    deletePlan,
    canvasRef,
    dragBoundaryRef,
  }
}

function buildVariableNodes(groups: CreatedSensorGroup[], positions: Record<string, Point>) {
  return Object.entries(positions).flatMap(([variableId, position]) => {
    const variable = findVariable(groups, variableId)
    if (!variable) return []

    return {
      categories: variable.group.categories,
      groupId: variable.group.id,
      groupName: variable.group.name,
      id: `variable-node-${variableId}`,
      sensorSummary: getSensorSummary(variable.group),
      sensorTitle: variable.group.sensorTitle,
      variableId,
      variableName: variable.name,
      x: position.x,
      y: position.y,
    }
  })
}

function findVariable(groups: CreatedSensorGroup[], variableId: string) {
  for (const group of groups) {
    const variableName = group.variables.find((name) => getPlanoVariableId(group.id, name) === variableId)
    if (variableName) return { group, name: variableName }
  }

  return null
}

function buildProcessNodes(
  processes: CreatedProcess[],
  groups: CreatedSensorGroup[],
  positions: Record<string, Point>,
) {
  return Object.entries(positions).flatMap(([processId, position]) => {
    const process = processes.find((item) => item.id === processId)
    if (!process) return []

    const processGroups = process.groupIds
      .map((groupId) => groups.find((group) => group.id === groupId))
      .filter((group): group is CreatedSensorGroup => Boolean(group))

    return {
      deadlineAt: process.deadlineAt,
      groupIds: process.groupIds,
      groupNames: processGroups.map((group) => group.name),
      id: `process-node-${processId}`,
      location: process.location,
      processId,
      processName: process.processName,
      variables: buildProcessVariables(process, processGroups),
      x: position.x,
      y: position.y,
    }
  })
}

function buildAutomaticProcessPositions(
  processes: CreatedProcess[],
  zones: PlanoLocationZone[],
  returnedProcessIds: Set<string>,
) {
  const positions: Record<string, Point> = {}
  const processesByLocation = new Map<string, CreatedProcess[]>()

  for (const process of processes) {
    if (!process.location || returnedProcessIds.has(process.id)) continue
    processesByLocation.set(process.location, [...(processesByLocation.get(process.location) ?? []), process])
  }

  for (const [location, locationProcesses] of processesByLocation) {
    const zone = zones.find((item) => item.name === location)
    if (!zone) continue

    const columns = Math.max(1, Math.min(locationProcesses.length, getProcessColumnsForZone(zone)))
    const rows = Math.ceil(locationProcesses.length / columns)
    const startX = zone.x + zone.width / 2 - (columns * PROCESS_CARD_SIZE.width + (columns - 1) * PROCESS_CARD_GAP) / 2
    const startY = zone.y + zone.height / 2 - (rows * PROCESS_CARD_SIZE.height + (rows - 1) * PROCESS_CARD_GAP) / 2

    locationProcesses.forEach((process, index) => {
      const column = index % columns
      const row = Math.floor(index / columns)
      positions[process.id] = {
        x: Math.max(0, Math.round(startX + column * (PROCESS_CARD_SIZE.width + PROCESS_CARD_GAP))),
        y: Math.max(0, Math.round(startY + row * (PROCESS_CARD_SIZE.height + PROCESS_CARD_GAP))),
      }
    })
  }

  return positions
}

function getProcessColumnsForZone(zone: PlanoLocationZone) {
  const comfortableColumns = Math.floor((zone.width + PROCESS_CARD_GAP) / (PROCESS_CARD_SIZE.width + PROCESS_CARD_GAP))
  return Math.max(2, comfortableColumns)
}

function buildProcessVariables(process: CreatedProcess, groups: CreatedSensorGroup[]) {
  const variables = new Map<string, ProcessSensorVariable & { groupName: string }>()

  for (const variable of process.sensorVariables) {
    variables.set(variable.id, { ...variable, groupName: 'Variable directa' })
  }

  for (const group of groups) {
    for (const variableName of group.variables) {
      const id = getPlanoVariableId(group.id, variableName)
      variables.set(id, {
        groupName: group.name,
        id,
        name: variableName,
        sensorTitle: group.sensorTitle,
      })
    }
  }

  return Array.from(variables.values())
}

function buildLocationZone(start: Point, end: Point, base: PlanoLocationZone): PlanoLocationZone {
  return {
    ...base,
    height: Math.abs(end.y - start.y),
    width: Math.abs(end.x - start.x),
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
  }
}

function getNextLocationName(zones: PlanoLocationZone[]) {
  const used = new Set(zones.map((zone) => zone.name))
  let index = zones.length + 1
  let name = `Ubicado ${index}`

  while (used.has(name)) {
    index += 1
    name = `Ubicado ${index}`
  }

  return name
}

function getBacktrackLine(
  lines: PlanoLine[],
  currentLine: PlanoLine,
  point: Point,
): PlanoLine | null {
  const previousLine = lines.at(-1)
  if (!previousLine?.direction) return null
  if (!samePoint(getLineEnd(previousLine), getLineStart(currentLine))) return null
  if (!pointIsOnLine(point, previousLine)) return null

  return {
    ...previousLine,
    x2: point.x,
    y2: point.y,
  }
}

function getEditableLineIndexAtPoint(lines: PlanoLine[], point: Point) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].direction && pointIsNearLineEndpoint(point, lines[index])) return index
  }

  return -1
}

function orientLineForNearestEndpoint(line: PlanoLine, point: Point): PlanoLine {
  const start = getLineStart(line)
  const end = getLineEnd(line)
  const startDistance = getDistance(point, start)
  const endDistance = getDistance(point, end)

  if (endDistance <= startDistance) return line

  return {
    ...line,
    x1: line.x2,
    y1: line.y2,
    x2: line.x1,
    y2: line.y1,
  }
}

function anchorEditableLineAtPoint(line: PlanoLine, point: Point): PlanoLine {
  if (!line.direction) return line

  const start = getLineStart(line)
  const end = getLineEnd(line)
  const startDistance = getDistance(point, start)
  const endDistance = getDistance(point, end)

  if (endDistance <= startDistance) {
    return {
      ...line,
      x2: line.direction === 'horizontal' ? point.x : line.x2,
      y2: line.direction === 'vertical' ? point.y : line.y2,
    }
  }

  return {
    ...line,
    x1: line.direction === 'horizontal' ? point.x : line.x1,
    y1: line.direction === 'vertical' ? point.y : line.y1,
  }
}

function getLineStart(line: PlanoLine): Point {
  return { x: line.x1, y: line.y1 }
}

function getLineEnd(line: PlanoLine): Point {
  return { x: line.x2, y: line.y2 }
}

function samePoint(a: Point, b: Point) {
  return a.x === b.x && a.y === b.y
}

function cloneLines(lines: PlanoLine[]) {
  return lines.map((line) => ({ ...line }))
}

function sameLines(a: PlanoLine[], b: PlanoLine[]) {
  return (
    a.length === b.length &&
    a.every((line, index) => {
      const other = b[index]
      return (
        line.id === other.id &&
        line.direction === other.direction &&
        line.x1 === other.x1 &&
        line.x2 === other.x2 &&
        line.y1 === other.y1 &&
        line.y2 === other.y2
      )
    })
  )
}

function pointIsOnLine(point: Point, line: PlanoLine) {
  if (line.direction === 'horizontal') {
    return point.y === line.y1 && isBetween(point.x, line.x1, line.x2)
  }

  return point.x === line.x1 && isBetween(point.y, line.y1, line.y2)
}

function pointIsNearLineEndpoint(point: Point, line: PlanoLine) {
  return (
    getDistance(point, getLineStart(line)) <= LINE_ENDPOINT_HIT_TOLERANCE ||
    getDistance(point, getLineEnd(line)) <= LINE_ENDPOINT_HIT_TOLERANCE
  )
}

function getDistance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isBetween(value: number, a: number, b: number, tolerance = 0) {
  return value >= Math.min(a, b) - tolerance && value <= Math.max(a, b) + tolerance
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function persistSavedPlans(plans: SavedPlan[]) {
  persistSavedPlansCache(plans)
  void saveWorkspaceConfiguration({ savedPlans: plans }).catch((error) => {
    console.warn('Los planos se guardaron localmente, pero no se sincronizaron con MongoDB.', error)
  })
}

function persistSavedPlansCache(plans: SavedPlan[]) {
  try {
    localStorage.setItem(SAVED_PLANS_STORAGE_KEY, JSON.stringify(plans))
  } catch (error) {
    try {
      localStorage.setItem(
        SAVED_PLANS_STORAGE_KEY,
        JSON.stringify(plans.map((plan) => ({ ...plan, backgroundImage: null }))),
      )
    } catch {
      // Keep the app usable even when the browser refuses every storage attempt.
    }
    console.warn('No se pudieron guardar los planos. El almacenamiento local esta lleno.', error)
  }
}

function persistActivePlanDraftCache(draft: ActivePlanDraft) {
  try {
    localStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, JSON.stringify(draft))
  } catch (error) {
    try {
      localStorage.setItem(ACTIVE_PLAN_STORAGE_KEY, JSON.stringify({ ...draft, backgroundImage: null }))
    } catch {
      // The in-memory draft still remains available for the current session.
    }
    console.warn('No se pudo guardar el borrador del plano. El almacenamiento local esta lleno.', error)
  }
}

function loadActivePlanDraft(): ActivePlanDraft {
  try {
    const stored = localStorage.getItem(ACTIVE_PLAN_STORAGE_KEY)
    const draft = stored ? (JSON.parse(stored) as Partial<ActivePlanDraft>) : {}

    return normalizeActivePlanDraft(draft)
  } catch {
    return {
      backgroundImage: null,
      lines: [],
      processPositions: {},
      returnedProcessIds: [],
      variablePositions: {},
    }
  }
}

function normalizeActivePlanDraft(draft: Partial<ActivePlanDraft> | Record<string, unknown>): ActivePlanDraft {
  return {
    backgroundImage: isPlanoBackgroundImage(draft.backgroundImage)
      ? normalizePlanoBackgroundImage(draft.backgroundImage)
      : null,
    lines: Array.isArray(draft.lines) ? draft.lines.filter(isPlanoLine).map((line) => ({ ...line })) : [],
    processPositions: normalizePointRecord(draft.processPositions),
    returnedProcessIds: Array.isArray(draft.returnedProcessIds)
      ? draft.returnedProcessIds.filter((id): id is string => typeof id === 'string')
      : [],
    variablePositions: normalizePointRecord(draft.variablePositions),
  }
}

function normalizePointRecord(value: unknown): Record<string, Point> {
  if (!value || typeof value !== 'object') return {}

  return Object.fromEntries(
    Object.entries(value).flatMap(([id, point]) =>
      typeof id === 'string' && isPoint(point) ? [[id, { x: point.x, y: point.y }]] : [],
    ),
  )
}

function isPoint(value: unknown): value is Point {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Partial<Point>).x === 'number' &&
    typeof (value as Partial<Point>).y === 'number'
  )
}

function isPlanoLine(value: unknown): value is PlanoLine {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Partial<PlanoLine>).id === 'string' &&
    typeof (value as Partial<PlanoLine>).x1 === 'number' &&
    typeof (value as Partial<PlanoLine>).x2 === 'number' &&
    typeof (value as Partial<PlanoLine>).y1 === 'number' &&
    typeof (value as Partial<PlanoLine>).y2 === 'number' &&
    ((value as Partial<PlanoLine>).direction === 'horizontal' ||
      (value as Partial<PlanoLine>).direction === 'vertical' ||
      (value as Partial<PlanoLine>).direction === null)
  )
}

function loadSavedPlans() {
  try {
    const stored = localStorage.getItem(SAVED_PLANS_STORAGE_KEY)
    const plans = stored ? (JSON.parse(stored) as Partial<SavedPlan>[]) : []

    return plans.filter(isSavedPlan).map((plan) => ({
      createdAt: plan.createdAt,
      backgroundImage: isPlanoBackgroundImage(plan.backgroundImage) ? normalizePlanoBackgroundImage(plan.backgroundImage) : null,
      id: plan.id,
      lines: plan.lines.map((line) => ({ ...line })),
      locationZones: (plan.locationZones ?? []).map(normalizeLocationZone),
      name: plan.name,
      processes: (plan.processes ?? []).map((process) => ({
        ...process,
        groupIds: Array.isArray(process.groupIds) ? process.groupIds : [],
        groupNames: Array.isArray(process.groupNames) ? process.groupNames : [],
        variables: Array.isArray(process.variables) ? process.variables.map((variable) => ({ ...variable })) : [],
      })),
      variables: plan.variables.map((variable) => ({ ...variable })),
    }))
  } catch {
    return []
  }
}

async function readPlanBackgroundImage(file: File, frame?: PlanoBackgroundFrame): Promise<PlanoBackgroundImage | null> {
  if (!file.type.startsWith('image/')) return null

  const dataUrl = await readFileAsDataUrl(file)
  const image = await loadImage(dataUrl)
  const defaultFrame = getDefaultBackgroundFrame(image.naturalWidth, image.naturalHeight)
  const safeFrame = normalizeBackgroundFrame(frame ?? defaultFrame)

  return {
    createdAt: new Date().toISOString(),
    displayHeight: safeFrame.displayHeight,
    displayWidth: safeFrame.displayWidth,
    fileName: file.name,
    height: image.naturalHeight,
    imageDisplayHeight: safeFrame.imageDisplayHeight,
    imageDisplayWidth: safeFrame.imageDisplayWidth,
    imageX: safeFrame.imageX,
    imageY: safeFrame.imageY,
    mimeType: file.type,
    src: dataUrl,
    width: image.naturalWidth,
    x: safeFrame.x,
    y: safeFrame.y,
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => (typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagen invalida')))
    reader.onerror = () => reject(reader.error ?? new Error('No se pudo leer la imagen'))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo cargar la imagen del plano'))
    image.src = src
  })
}

function getDefaultBackgroundFrame(width: number, height: number): PlanoBackgroundFrame {
  const scale = Math.min(WIDTH / width, HEIGHT / height)
  const displayWidth = Math.max(1, Math.round(width * scale))
  const displayHeight = Math.max(1, Math.round(height * scale))

  return {
    displayHeight,
    displayWidth,
    imageDisplayHeight: displayHeight,
    imageDisplayWidth: displayWidth,
    imageX: Math.round((WIDTH - displayWidth) / 2),
    imageY: Math.round((HEIGHT - displayHeight) / 2),
    x: Math.round((WIDTH - displayWidth) / 2),
    y: Math.round((HEIGHT - displayHeight) / 2),
  }
}

function normalizeBackgroundFrame(
  frame: PlanoBackgroundFrame,
  bounds: BackgroundFrameBounds = { height: HEIGHT, width: WIDTH },
): PlanoBackgroundFrame {
  const minX = bounds.minX ?? 0
  const minY = bounds.minY ?? 0
  const imageDisplayWidth = clamp(Math.round(frame.imageDisplayWidth ?? frame.displayWidth), 1, bounds.width - minX)
  const imageDisplayHeight = clamp(Math.round(frame.imageDisplayHeight ?? frame.displayHeight), 1, bounds.height - minY)
  const imageX = clamp(Math.round(frame.imageX ?? frame.x), minX, Math.max(minX, bounds.width - imageDisplayWidth))
  const imageY = clamp(Math.round(frame.imageY ?? frame.y), minY, Math.max(minY, bounds.height - imageDisplayHeight))
  const displayWidth = clamp(Math.round(frame.displayWidth), 1, imageDisplayWidth)
  const displayHeight = clamp(Math.round(frame.displayHeight), 1, imageDisplayHeight)

  return {
    displayHeight,
    displayWidth,
    imageDisplayHeight,
    imageDisplayWidth,
    imageX,
    imageY,
    x: clamp(Math.round(frame.x), imageX, imageX + imageDisplayWidth - displayWidth),
    y: clamp(Math.round(frame.y), imageY, imageY + imageDisplayHeight - displayHeight),
  }
}

function normalizePlanoBackgroundImage(
  image: PlanoBackgroundImage,
  bounds?: BackgroundFrameBounds,
): PlanoBackgroundImage {
  const normalizationBounds = bounds ?? getBackgroundImageNormalizationBounds(image)
  const frame = normalizeBackgroundFrame({
    displayHeight: image.displayHeight,
    displayWidth: image.displayWidth,
    imageDisplayHeight: image.imageDisplayHeight ?? image.displayHeight,
    imageDisplayWidth: image.imageDisplayWidth ?? image.displayWidth,
    imageX: image.imageX ?? image.x,
    imageY: image.imageY ?? image.y,
    x: image.x,
    y: image.y,
  }, normalizationBounds)

  return {
    ...image,
    displayHeight: frame.displayHeight,
    displayWidth: frame.displayWidth,
    imageDisplayHeight: frame.imageDisplayHeight,
    imageDisplayWidth: frame.imageDisplayWidth,
    imageX: frame.imageX,
    imageY: frame.imageY,
    x: frame.x,
    y: frame.y,
  }
}

function getBackgroundImageNormalizationBounds(image: PlanoBackgroundImage) {
  return getBackgroundFrameBounds({
    displayHeight: image.displayHeight,
    displayWidth: image.displayWidth,
    imageDisplayHeight: image.imageDisplayHeight ?? image.displayHeight,
    imageDisplayWidth: image.imageDisplayWidth ?? image.displayWidth,
    imageX: image.imageX ?? image.x,
    imageY: image.imageY ?? image.y,
    x: image.x,
    y: image.y,
  })
}

function getBackgroundFrameBounds(frame: PlanoBackgroundFrame): BackgroundFrameBounds {
  return {
    height: Math.max(
      HEIGHT,
      Math.round(frame.y + frame.displayHeight),
      Math.round(frame.imageY + frame.imageDisplayHeight),
    ),
    minX: Math.min(0, Math.round(frame.x), Math.round(frame.imageX)),
    minY: Math.min(0, Math.round(frame.y), Math.round(frame.imageY)),
    width: Math.max(
      WIDTH,
      Math.round(frame.x + frame.displayWidth),
      Math.round(frame.imageX + frame.imageDisplayWidth),
    ),
  }
}

function isPlanoBackgroundImage(value: unknown): value is PlanoBackgroundImage {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    typeof (value as Partial<PlanoBackgroundImage>).createdAt === 'string' &&
    typeof (value as Partial<PlanoBackgroundImage>).displayHeight === 'number' &&
    typeof (value as Partial<PlanoBackgroundImage>).displayWidth === 'number' &&
    typeof (value as Partial<PlanoBackgroundImage>).fileName === 'string' &&
    typeof (value as Partial<PlanoBackgroundImage>).height === 'number' &&
    ((value as Partial<PlanoBackgroundImage>).imageDisplayHeight === undefined ||
      typeof (value as Partial<PlanoBackgroundImage>).imageDisplayHeight === 'number') &&
    ((value as Partial<PlanoBackgroundImage>).imageDisplayWidth === undefined ||
      typeof (value as Partial<PlanoBackgroundImage>).imageDisplayWidth === 'number') &&
    ((value as Partial<PlanoBackgroundImage>).imageX === undefined ||
      typeof (value as Partial<PlanoBackgroundImage>).imageX === 'number') &&
    ((value as Partial<PlanoBackgroundImage>).imageY === undefined ||
      typeof (value as Partial<PlanoBackgroundImage>).imageY === 'number') &&
    typeof (value as Partial<PlanoBackgroundImage>).mimeType === 'string' &&
    typeof (value as Partial<PlanoBackgroundImage>).src === 'string' &&
    typeof (value as Partial<PlanoBackgroundImage>).width === 'number' &&
    typeof (value as Partial<PlanoBackgroundImage>).x === 'number' &&
    typeof (value as Partial<PlanoBackgroundImage>).y === 'number'
  )
}

function normalizeLocationZone(zone: PlanoLocationZone): PlanoLocationZone {
  return {
    ...zone,
    shape: isLocationShape(zone.shape) ? zone.shape : 'rectangle',
  }
}

function isLocationShape(value: unknown): value is PlanoLocationShape {
  return (
    value === 'rectangle' ||
    value === 'rounded' ||
    value === 'l-shape' ||
    value === 'ellipse' ||
    value === 'diamond'
  )
}

function isSavedPlan(plan: Partial<SavedPlan>): plan is SavedPlan {
  return (
    Boolean(plan) &&
    typeof plan.id === 'string' &&
    typeof plan.name === 'string' &&
    typeof plan.createdAt === 'string' &&
    Array.isArray(plan.lines) &&
    Array.isArray(plan.variables)
  )
}

function getSensorSummary(group: CreatedSensorGroup) {
  const categories = group.categories?.length ? group.categories : inferCategories(group.sensorTitle)
  return `Sensores ${categories.join(', ')}`
}

function inferCategories(sensorTitle: string) {
  if (sensorTitle.toLowerCase().includes('temperatura')) return ['Temperatura']
  if (sensorTitle.toLowerCase().includes('humedad')) return ['Humedad']
  if (sensorTitle.toLowerCase().includes('co2')) return ['CO2']
  if (sensorTitle.toLowerCase().includes('etileno')) return ['Etileno']
  return [sensorTitle.replace(/^Sensores\s+/i, '')]
}
