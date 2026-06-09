import type { Dispatch, SetStateAction } from 'react'
import { saveWorkspaceConfiguration } from '../../auth/services/authApi'
import type { PlanoLocationZone } from '../../plano'
import { persistLocationZones } from './workspaceStorage'

export function useLocationActions(setZones: Dispatch<SetStateAction<PlanoLocationZone[]>>) {
  return (zones: PlanoLocationZone[]) => {
    setZones(zones)
    persistLocationZones(zones)
    void saveWorkspaceConfiguration({ locationZones: zones }).catch((error) => {
      console.warn('Las ubicaciones se guardaron localmente, pero no se sincronizaron.', error)
    })
  }
}
