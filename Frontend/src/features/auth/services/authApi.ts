import type { AuthResponse, LoginPayload, RegisterPayload, User } from '../types'
import type { CreatedSensorGroup } from '../../telemetria'
import type { GroupSection } from '../../telemetria/types/groupSections'
import type { CreatedProcess, ProcessLogEntry } from '../../procesos'
import type { ProcessSection } from '../../procesos/types/processSections'
import type { PlanoLocationZone, SavedPlan } from '../../plano'
import type { SensorOverridesByKey } from '../../telemetria/utils/sensorOverrides'

export type WorkspaceConfiguration = {
  activePlanDraft: unknown
  groupSections: GroupSection[]
  locationZones: PlanoLocationZone[]
  processSections: ProcessSection[]
  savedPlans: SavedPlan[]
  sensorOverrides: SensorOverridesByKey
}

function getDefaultApiUrl() {
  const { protocol, hostname } = window.location
  const apiHost = hostname || 'localhost'

  return `${protocol}//${apiHost}:4100/api`
}

const API_URL = import.meta.env.VITE_API_URL ?? getDefaultApiUrl()

type RequestOptions = RequestInit & {
  networkRetryDelays?: number[]
}

export class ApiConnectionError extends Error {
  constructor() {
    super('No se pudo conectar con la API de SIMI.')
    this.name = 'ApiConnectionError'
  }
}

async function request<T>(path: string, options: RequestOptions = {}) {
  const { networkRetryDelays = [], ...fetchOptions } = options
  let lastNetworkError: unknown

  for (let attempt = 0; attempt <= networkRetryDelays.length; attempt += 1) {
    try {
      const response = await fetch(`${API_URL}${path}`, {
        ...fetchOptions,
        headers: {
          'Content-Type': 'application/json',
          ...fetchOptions.headers,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message ?? 'No se pudo completar la solicitud.')
      }

      return data as T
    } catch (error) {
      if (!(error instanceof TypeError)) throw error

      lastNetworkError = error
      const retryDelay = networkRetryDelays[attempt]
      if (retryDelay === undefined) break
      await wait(retryDelay)
    }
  }

  console.warn('No se pudo conectar con la API de SIMI.', lastNetworkError)
  throw new ApiConnectionError()
}

export function login(payload: LoginPayload) {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
    networkRetryDelays: [700, 1200, 1800],
  })
}

export function register(payload: RegisterPayload) {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function verifySession(token: string) {
  return request<{ user: User }>('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
}

export function logUserAction(payload: { accion: string; metadata?: Record<string, unknown>; ubicacion: string }) {
  const token = localStorage.getItem('simi_token')
  if (!token) return Promise.resolve(null)

  return request<{ action: unknown }>('/acciones-usuarios', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  }).catch((error) => {
    console.warn('No se pudo registrar la accion del usuario:', error)
    return null
  })
}

export function logSensorOutliers(outliers: Record<string, unknown>[]) {
  const token = localStorage.getItem('simi_token')
  if (!token || outliers.length === 0) return Promise.resolve(null)

  return request<{ count: number; outliers: unknown[] }>('/outliers', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ outliers }),
  }).catch((error) => {
    console.warn('No se pudieron registrar los outliers fuera de rango:', error)
    return null
  })
}

function authenticatedRequest<T>(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('simi_token')
  if (!token) return Promise.reject(new Error('No hay una sesion activa.'))

  return request<T>(path, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })
}

export function loadSensorGroups() {
  return authenticatedRequest<{ groups: CreatedSensorGroup[] }>('/grupos')
}

export function saveSensorGroup(group: CreatedSensorGroup) {
  return authenticatedRequest<{ group: CreatedSensorGroup }>(`/grupos/${encodeURIComponent(group.id)}`, {
    method: 'PUT',
    body: JSON.stringify(group),
  })
}

export function deleteSensorGroup(groupId: string) {
  return authenticatedRequest<{ deleted: boolean }>(`/grupos/${encodeURIComponent(groupId)}`, {
    method: 'DELETE',
  })
}

export function loadProcesses(processType?: CreatedProcess['processType']) {
  const query = processType ? `?type=${encodeURIComponent(processType)}` : ''
  return authenticatedRequest<{ processes: CreatedProcess[] }>(`/procesos${query}`)
}

export function saveProcess(process: CreatedProcess) {
  return authenticatedRequest<{ process: CreatedProcess }>(`/procesos/${encodeURIComponent(process.id)}`, {
    method: 'PUT',
    body: JSON.stringify(process),
  })
}

export function deleteProcess(processId: string) {
  return authenticatedRequest<{ deleted: boolean }>(`/procesos/${encodeURIComponent(processId)}`, {
    method: 'DELETE',
  })
}

export function loadProcessLogs() {
  return authenticatedRequest<{ logs: Record<string, ProcessLogEntry[]> }>('/registros-sensores')
}

export function saveProcessLogs(records: Array<{ entry: ProcessLogEntry; processId: string }>) {
  if (records.length === 0) return Promise.resolve({ inserted: 0, received: 0 })

  return authenticatedRequest<{ inserted: number; received: number }>('/registros-sensores', {
    method: 'POST',
    body: JSON.stringify({ records }),
  })
}

export function loadWorkspaceConfiguration() {
  return authenticatedRequest<{ configuration: WorkspaceConfiguration }>('/configuracion-workspace')
}

export function saveWorkspaceConfiguration(changes: Partial<WorkspaceConfiguration>) {
  return authenticatedRequest<{ configuration: WorkspaceConfiguration }>('/configuracion-workspace', {
    method: 'PATCH',
    body: JSON.stringify(changes),
  })
}

function wait(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds))
}
