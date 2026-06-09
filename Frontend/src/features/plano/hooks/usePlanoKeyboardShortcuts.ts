import { useEffect, type MutableRefObject } from 'react'
import type { PlanoLocationZone } from '../types/plano'
import { isEditableTarget, isUndoShortcut } from '../utils/groupHelpers'

type UsePlanoKeyboardShortcutsParams = {
  lastContextLocationIdRef: MutableRefObject<string | null>
  locationZones: PlanoLocationZone[]
  onLocationZonesChange?: (zones: PlanoLocationZone[]) => void
  returnProcessToPalette: (processId: string) => void
  selectedLocationZoneId: string | null
  selectedProcessId: string | null
  setSelectedLocationZoneId: (id: string | null) => void
  setSelectedProcessId: (id: string | null) => void
  showSaveLocationModal: boolean
  showSaveModal: boolean
  showSavedPlans: boolean
  undoLastLine: () => void
}

export function usePlanoKeyboardShortcuts({
  lastContextLocationIdRef,
  locationZones,
  onLocationZonesChange,
  returnProcessToPalette,
  selectedLocationZoneId,
  selectedProcessId,
  setSelectedLocationZoneId,
  setSelectedProcessId,
  showSaveLocationModal,
  showSaveModal,
  showSavedPlans,
  undoLastLine,
}: UsePlanoKeyboardShortcutsParams) {
  useEffect(() => {
    function handleUndoShortcut(event: KeyboardEvent) {
      if (
        showSaveLocationModal ||
        showSaveModal ||
        showSavedPlans ||
        !isUndoShortcut(event) ||
        isEditableTarget(event.target)
      ) return

      event.preventDefault()
      if (lastContextLocationIdRef.current) {
        const locationId = lastContextLocationIdRef.current
        onLocationZonesChange?.(locationZones.filter((zone) => zone.id !== locationId))
        if (selectedLocationZoneId === locationId) setSelectedLocationZoneId(null)
        lastContextLocationIdRef.current = null
        return
      }

      undoLastLine()
    }

    window.addEventListener('keydown', handleUndoShortcut, { capture: true })
    return () => window.removeEventListener('keydown', handleUndoShortcut, { capture: true })
  }, [lastContextLocationIdRef, locationZones, onLocationZonesChange, selectedLocationZoneId, setSelectedLocationZoneId, showSaveLocationModal, showSaveModal, showSavedPlans, undoLastLine])

  useEffect(() => {
    function handleSelectedItemShortcut(event: KeyboardEvent) {
      if (showSaveModal || showSaveLocationModal || showSavedPlans) return
      if (isEditableTarget(event.target)) return

      if (event.key === 'Escape') {
        if (!selectedProcessId) return
        event.preventDefault()
        setSelectedProcessId(null)
        return
      }

      if (event.key !== 'Delete' && event.key !== 'Backspace') return

      if (selectedProcessId) {
        event.preventDefault()
        returnProcessToPalette(selectedProcessId)
        setSelectedProcessId(null)
        return
      }

      if (!selectedLocationZoneId) return

      event.preventDefault()
      onLocationZonesChange?.(locationZones.filter((zone) => zone.id !== selectedLocationZoneId))
      setSelectedLocationZoneId(null)
    }

    window.addEventListener('keydown', handleSelectedItemShortcut, { capture: true })
    return () => window.removeEventListener('keydown', handleSelectedItemShortcut, { capture: true })
  }, [
    locationZones,
    onLocationZonesChange,
    returnProcessToPalette,
    selectedLocationZoneId,
    selectedProcessId,
    setSelectedLocationZoneId,
    setSelectedProcessId,
    showSaveLocationModal,
    showSaveModal,
    showSavedPlans,
  ])
}
