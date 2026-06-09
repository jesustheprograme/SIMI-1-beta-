import { useRef, useState, type RefObject } from 'react'
import { createLocalId } from '../../../utils/localId'
import type { PlanoLocationShape, PlanoLocationZone, Point } from '../types/plano'
import type { CreatedProcess } from '../../procesos/types'
import { CONTEXT_LOCATION_SIZE } from '../types'
import { buildLocationZoneFromPoints, getNextLocationName, pointIsInsideZone } from '../utils/locationHelpers'
import { clamp } from '../utils/geometry'

const PROCESS_CONTEXT_CARD_SIZE = { height: 56, width: 224 }
const PROCESS_CONTEXT_LOCATION_PADDING = 14

type UsePlanoLocationStateParams = {
  canvasRef: RefObject<HTMLDivElement | null>
  locationZones: PlanoLocationZone[]
  onLocationZonesChange?: (zones: PlanoLocationZone[]) => void
}

export function usePlanoLocationState({
  canvasRef,
  locationZones,
  onLocationZonesChange,
}: UsePlanoLocationStateParams) {
  const [selectedLocationZoneId, setSelectedLocationZoneId] = useState<string | null>(null)
  const [showSaveLocationModal, setShowSaveLocationModal] = useState(false)
  const [locationZoneName, setLocationZoneName] = useState('')
  const [locationCreationDraft, setLocationCreationDraft] = useState<LocationDraft | null>(null)
  const [locationPlacementPrompt, setLocationPlacementPrompt] = useState<Point | null>(null)
  const [processDefaultLocation, setProcessDefaultLocation] = useState('')
  const [processCreationPoint, setProcessCreationPointState] = useState<Point | null>(null)
  const [processPlacementDraft, setProcessPlacementDraft] = useState<Point | null>(null)
  const [showCreateProcessModal, setShowCreateProcessModal] = useState(false)
  const lastContextLocationIdRef = useRef<string | null>(null)
  const processCreationPointRef = useRef<Point | null>(null)

  function setProcessCreationPoint(point: Point | null) {
    processCreationPointRef.current = point
    setProcessCreationPointState(point)
  }

  function handleLocationZoneShapeChange(zoneId: string, shape: PlanoLocationShape) {
    onLocationZonesChange?.(locationZones.map((zone) => (zone.id === zoneId ? { ...zone, shape } : zone)))
  }

  function handleLocationZoneChange(updatedZone: PlanoLocationZone) {
    onLocationZonesChange?.(locationZones.map((zone) => (zone.id === updatedZone.id ? updatedZone : zone)))
  }

  function openSaveLocationModal(zoneId = selectedLocationZoneId) {
    const zone = locationZones.find((item) => item.id === zoneId)
    if (!zone) return
    setSelectedLocationZoneId(zone.id)
    setLocationZoneName(zone.name)
    setShowSaveLocationModal(true)
  }

  function saveSelectedLocationZone() {
    const zone = locationZones.find((item) => item.id === selectedLocationZoneId)
    const nextName = locationZoneName.trim()
    if (!zone || !nextName) return
    onLocationZonesChange?.(locationZones.map((item) => (item.id === zone.id ? { ...item, name: nextName } : item)))
    setShowSaveLocationModal(false)
    setLocationZoneName('')
  }

  function createLocationAtPoint(point: Point) {
    setLocationCreationDraft(null)
    setProcessPlacementDraft(null)
    setLocationPlacementPrompt(point)
  }

  function startContextLocation(point: Point) {
    const canvas = canvasRef.current
    const canvasWidth = canvas?.clientWidth ?? CONTEXT_LOCATION_SIZE.width
    const canvasHeight = canvas?.clientHeight ?? CONTEXT_LOCATION_SIZE.height
    const start = { x: Math.round(clamp(point.x, 0, canvasWidth)), y: Math.round(clamp(point.y, 0, canvasHeight)) }

    setLocationPlacementPrompt(null)
    setLocationCreationDraft({ current: start, id: createLocalId('ubicado'), name: getNextLocationName(locationZones), start })
  }

  function moveContextLocation(point: Point) {
    if (locationCreationDraft) {
      setLocationCreationDraft((current) => (current ? { ...current, current: point } : current))
      return
    }
    setLocationPlacementPrompt(point)
  }

  function commitContextLocation() {
    const zone = locationCreationDraft ? buildLocationZoneFromPoints(locationCreationDraft.start, locationCreationDraft.current, buildDraftBase(locationCreationDraft)) : null
    if (zone && zone.width >= 5 && zone.height >= 5) {
      onLocationZonesChange?.([...locationZones, zone])
      setSelectedLocationZoneId(zone.id)
      lastContextLocationIdRef.current = zone.id
    }
    setLocationCreationDraft(null)
    setLocationPlacementPrompt(null)
  }

  function openCreateProcessAtPoint(point: Point) {
    setProcessCreationPoint(point)
    setProcessPlacementDraft(point)
  }

  function commitCreateProcessAtPoint(point: Point) {
    const zone = locationZones.find((item) => pointIsInsideZone(point, item))
    setProcessCreationPoint(point)
    setProcessDefaultLocation(zone?.name ?? '')
    setProcessPlacementDraft(null)
    setShowCreateProcessModal(true)
  }

  function createAutomaticLocationForProcess(process: CreatedProcess, pointOverride?: Point | null) {
    const point = pointOverride ?? processCreationPointRef.current ?? processCreationPoint ?? processPlacementDraft
    if (!point) return process

    const canvas = canvasRef.current
    const canvasWidth = canvas?.clientWidth ?? CONTEXT_LOCATION_SIZE.width
    const canvasHeight = canvas?.clientHeight ?? CONTEXT_LOCATION_SIZE.height
    const width = Math.min(
      canvasWidth,
      PROCESS_CONTEXT_CARD_SIZE.width + PROCESS_CONTEXT_LOCATION_PADDING * 2,
    )
    const height = Math.min(
      canvasHeight,
      PROCESS_CONTEXT_CARD_SIZE.height + PROCESS_CONTEXT_LOCATION_PADDING * 2,
    )
    const processX = clamp(point.x, 0, Math.max(0, canvasWidth - PROCESS_CONTEXT_CARD_SIZE.width))
    const processY = clamp(point.y, 0, Math.max(0, canvasHeight - PROCESS_CONTEXT_CARD_SIZE.height))
    const zoneName = process.location.trim() || getNextLocationName(locationZones)
    const zone: PlanoLocationZone = {
      createdAt: new Date().toISOString(),
      height,
      id: createLocalId('ubicado'),
      name: zoneName,
      shape: 'rectangle',
      width,
      x: Math.round(clamp(processX - PROCESS_CONTEXT_LOCATION_PADDING, 0, Math.max(0, canvasWidth - width))),
      y: Math.round(clamp(processY - PROCESS_CONTEXT_LOCATION_PADDING, 0, Math.max(0, canvasHeight - height))),
    }

    onLocationZonesChange?.([...locationZones, zone])
    setSelectedLocationZoneId(zone.id)
    lastContextLocationIdRef.current = zone.id
    setProcessCreationPoint(null)
    return { ...process, location: zoneName }
  }

  return {
    createLocationAtPoint,
    handleLocationZoneChange,
    handleLocationZoneShapeChange,
    lastContextLocationIdRef,
    locationCreationDraft,
    locationPlacementPrompt,
    locationZoneName,
    openCreateProcessAtPoint,
    openSaveLocationModal,
    createAutomaticLocationForProcess,
    processDefaultLocation,
    processCreationPoint,
    processPlacementDraft,
    saveSelectedLocationZone,
    selectedLocationZoneId,
    setLocationCreationDraft,
    setLocationPlacementPrompt,
    setLocationZoneName,
    setProcessDefaultLocation,
    setProcessCreationPoint,
    setProcessPlacementDraft,
    setSelectedLocationZoneId,
    setShowCreateProcessModal,
    setShowSaveLocationModal,
    showCreateProcessModal,
    showSaveLocationModal,
    startContextLocation,
    moveContextLocation,
    commitContextLocation,
    commitCreateProcessAtPoint,
  }
}

type LocationDraft = { current: Point; id: string; name: string; start: Point }

function buildDraftBase(draft: LocationDraft): PlanoLocationZone {
  return { createdAt: new Date().toISOString(), height: 0, id: draft.id, name: draft.name, shape: 'rectangle', width: 0, x: draft.start.x, y: draft.start.y }
}
