import type { Dispatch, SetStateAction } from 'react'
import { deleteProcess, logUserAction, saveProcess } from '../../auth/services/authApi'
import type { CreatedProcess } from '../../procesos'
import { persistCreatedProcesses } from './workspaceStorage'
import { showWorkspaceToast } from './toast'

export function useProcessActions(
  processes: CreatedProcess[],
  setProcesses: Dispatch<SetStateAction<CreatedProcess[]>>,
  pathname: string,
) {
  function commit(update: (current: CreatedProcess[]) => CreatedProcess[]) {
    setProcesses((current) => {
      const next = update(current)
      persistCreatedProcesses(next)
      return next
    })
  }

  function createProcess(process: CreatedProcess) {
    const nextProcess = ensureProcessType(process, pathname)
    commit((current) => [nextProcess, ...current])
    syncProcess(nextProcess, 'create_proceso', pathname)
    showWorkspaceToast(
      'Proceso creado',
      `El proceso "${nextProcess.processName}" fue guardado con ${nextProcess.groupIds.length} grupo${
        nextProcess.groupIds.length === 1 ? '' : 's'
      } y ${nextProcess.sensorVariables.length} variable${nextProcess.sensorVariables.length === 1 ? '' : 's'}.`,
      4600,
    )
  }

  function updateProcess(process: CreatedProcess) {
    const nextProcess = ensureProcessType(process, pathname)
    const previous = processes.find((item) => item.id === nextProcess.id)
    const justFinished = Boolean(nextProcess.finishedAt && !previous?.finishedAt)
    commit((current) => current.map((item) => (item.id === nextProcess.id ? nextProcess : item)))
    syncProcess(nextProcess, 'edit_proceso', pathname)
    if (!justFinished) {
      showWorkspaceToast('Proceso actualizado', `El proceso "${nextProcess.processName}" fue actualizado.`)
    }
  }

  function removeProcess(processId: string) {
    const process = processes.find((item) => item.id === processId)
    commit((current) => current.filter((item) => item.id !== processId))
    void deleteProcess(processId).catch((error) => {
      console.warn('El proceso se elimino localmente, pero no se pudo eliminar de MongoDB.', error)
    })
    if (!process) return
    void logUserAction({
      accion: 'delete_proceso',
      ubicacion: pathname,
      metadata: processMetadata(process),
    })
    showWorkspaceToast('Proceso eliminado', `El proceso "${process.processName}" fue eliminado.`)
  }

  return { createProcess, removeProcess, updateProcess }
}

function ensureProcessType(process: CreatedProcess, pathname: string): CreatedProcess {
  return {
    ...process,
    processType: inferProcessTypeFromPath(pathname) ?? process.processType ?? 'almacenado',
  }
}

function inferProcessTypeFromPath(pathname: string) {
  if (pathname.includes('/procesos/procesos-maduracion')) return 'maduracion'
  if (pathname.includes('/procesos/procesos-almacenado')) return 'almacenado'
  if (pathname.includes('/procesos/proceso-3')) return 'proceso-3'
  return null
}

function syncProcess(process: CreatedProcess, action: string, pathname: string) {
  void saveProcess(process).catch((error) => {
    console.warn('El proceso se guardo localmente, pero no se pudo sincronizar.', error)
  })
  void logUserAction({
    accion: action,
    ubicacion: pathname,
    metadata: processMetadata(process),
  })
}

function processMetadata(process: CreatedProcess) {
  return {
    id_proceso: process.id,
    nombre: process.processName,
    grupos: process.groupIds.length,
    variables: process.sensorVariables.length,
  }
}
