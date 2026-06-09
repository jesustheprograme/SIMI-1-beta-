import type { Dispatch, SetStateAction } from 'react'
import { saveWorkspaceConfiguration } from '../../auth/services/authApi'
import type { ProcessSection } from '../../procesos/types/processSections'
import { persistProcessSections } from './workspaceStorage'

export function useProcessSectionActions(setSections: Dispatch<SetStateAction<ProcessSection[]>>) {
  return (sections: ProcessSection[]) => {
    setSections(sections)
    persistProcessSections(sections)
    void saveWorkspaceConfiguration({ processSections: sections }).catch((error) => {
      console.warn('Las secciones de procesos se guardaron localmente, pero no se sincronizaron.', error)
    })
  }
}
