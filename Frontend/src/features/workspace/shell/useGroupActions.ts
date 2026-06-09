import type { Dispatch, SetStateAction } from 'react'
import { deleteSensorGroup, logUserAction, saveSensorGroup } from '../../auth/services/authApi'
import type { CreatedSensorGroup } from '../../telemetria'
import { persistCreatedGroups } from './workspaceStorage'
import { showWorkspaceToast } from './toast'

export function useGroupActions(
  groups: CreatedSensorGroup[],
  setGroups: Dispatch<SetStateAction<CreatedSensorGroup[]>>,
  pathname: string,
) {
  function commit(update: (current: CreatedSensorGroup[]) => CreatedSensorGroup[]) {
    setGroups((current) => {
      const next = update(current)
      persistCreatedGroups(next)
      return next
    })
  }

  function createGroup(group: CreatedSensorGroup) {
    commit((current) => [group, ...current])
    void saveSensorGroup(group).catch((error) => {
      console.warn('El grupo se guardo localmente, pero no se pudo sincronizar.', error)
    })
    void logUserAction({
      accion: 'create_grupo',
      ubicacion: pathname,
      metadata: { id_grupo: group.id, nombre: group.name, variables: group.variables.length },
    })
    showWorkspaceToast(
      'Grupo creado',
      `El grupo "${group.name}" fue guardado con ${group.variables.length} variable${
        group.variables.length === 1 ? '' : 's'
      }.`,
      5000,
    )
  }

  function updateGroup(group: CreatedSensorGroup) {
    commit((current) => current.map((item) => (item.id === group.id ? group : item)))
    void saveSensorGroup(group).catch((error) => {
      console.warn('El grupo se actualizo localmente, pero no se pudo sincronizar.', error)
    })
    void logUserAction({
      accion: 'edit_grupo',
      ubicacion: pathname,
      metadata: { id_grupo: group.id, nombre: group.name, variables: group.variables.length },
    })
    showWorkspaceToast('Grupo actualizado', `El grupo "${group.name}" fue actualizado correctamente.`)
  }

  function removeGroup(groupId: string) {
    const group = groups.find((item) => item.id === groupId)
    commit((current) => current.filter((item) => item.id !== groupId))
    void deleteSensorGroup(groupId).catch((error) => {
      console.warn('El grupo se elimino localmente, pero no se pudo eliminar de MongoDB.', error)
    })
    void logUserAction({
      accion: 'delete_grupo',
      ubicacion: pathname,
      metadata: {
        id_grupo: groupId,
        nombre: group?.name ?? 'Grupo eliminado',
        variables: group?.variables.length ?? 0,
      },
    })
  }

  return { createGroup, removeGroup, updateGroup }
}
