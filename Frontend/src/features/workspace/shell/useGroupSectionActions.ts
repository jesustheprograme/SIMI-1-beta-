import type { Dispatch, SetStateAction } from 'react'
import { saveWorkspaceConfiguration } from '../../auth/services/authApi'
import type { GroupSection } from '../../telemetria/types/groupSections'
import { persistGroupSections } from './workspaceStorage'

export function useGroupSectionActions(setSections: Dispatch<SetStateAction<GroupSection[]>>) {
  return (sections: GroupSection[]) => {
    setSections(sections)
    persistGroupSections(sections)
    void saveWorkspaceConfiguration({ groupSections: sections }).catch((error) => {
      console.warn('Las secciones se guardaron localmente, pero no se sincronizaron.', error)
    })
  }
}
