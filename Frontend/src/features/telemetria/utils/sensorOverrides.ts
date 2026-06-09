import type { FakeSensor } from '../data/fakeSensors'
import {
  loadWorkspaceConfiguration,
  saveWorkspaceConfiguration,
} from '../../auth/services/authApi'

export type EditableSensorData = Pick<FakeSensor, 'max' | 'min' | 'name' | 'status' | 'unit'>

export type SensorOverride = Partial<EditableSensorData>

export type SensorOverridesByKey = Record<string, SensorOverride>

const SENSOR_OVERRIDES_STORAGE_KEY = 'simi.sensorOverrides'
const SENSOR_OVERRIDES_PENDING_STORAGE_KEY = 'simi.sensorOverrides.pending'
const SENSOR_OVERRIDES_CHANGE_EVENT = 'simi:sensor-overrides-change'
const SENSOR_OVERRIDES_SYNC_RETRY_DELAYS = [0, 1000, 3000]

export function getSensorOverrideKey(sensorTitle: string, sensorId: string) {
  return `${sensorTitle}::${sensorId}`
}

export function applySensorOverride(sensorTitle: string, sensor: FakeSensor, overrides: SensorOverridesByKey) {
  const override = overrides[getSensorOverrideKey(sensorTitle, sensor.id)]
  if (!override) return sensor

  return {
    ...sensor,
    group: '',
    max: override.max ?? sensor.max,
    min: override.min ?? sensor.min,
    name: override.name ?? sensor.name,
    status: override.status ?? sensor.status,
    unit: override.unit ?? sensor.unit,
  }
}

export function loadSensorOverrides(): SensorOverridesByKey {
  try {
    const stored = localStorage.getItem(SENSOR_OVERRIDES_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}

    return parsed as SensorOverridesByKey
  } catch {
    return {}
  }
}

export function persistSensorOverrides(overrides: SensorOverridesByKey) {
  const serializedOverrides = JSON.stringify(overrides)
  localStorage.setItem(SENSOR_OVERRIDES_STORAGE_KEY, serializedOverrides)
  localStorage.setItem(SENSOR_OVERRIDES_PENDING_STORAGE_KEY, serializedOverrides)
  window.dispatchEvent(new CustomEvent<SensorOverridesByKey>(SENSOR_OVERRIDES_CHANGE_EVENT, {
    detail: overrides,
  }))
  void syncSensorOverrides(overrides, serializedOverrides)
}

export async function loadPersistedSensorOverrides() {
  const localOverrides = loadSensorOverrides()
  const pendingOverrides = loadPendingSensorOverrides()

  try {
    const { configuration } = await loadWorkspaceConfiguration()
    const remoteOverrides = configuration.sensorOverrides ?? {}
    const resolvedOverrides = mergeSensorOverrides(remoteOverrides, localOverrides)
    const serializedOverrides = JSON.stringify(resolvedOverrides)

    localStorage.setItem(SENSOR_OVERRIDES_STORAGE_KEY, serializedOverrides)

    if (pendingOverrides || JSON.stringify(remoteOverrides) !== serializedOverrides) {
      localStorage.setItem(SENSOR_OVERRIDES_PENDING_STORAGE_KEY, serializedOverrides)
      void syncSensorOverrides(resolvedOverrides, serializedOverrides)
    }

    return resolvedOverrides
  } catch {
    if (Object.keys(localOverrides).length > 0) {
      const serializedOverrides = JSON.stringify(localOverrides)
      localStorage.setItem(SENSOR_OVERRIDES_PENDING_STORAGE_KEY, serializedOverrides)
      void syncSensorOverrides(localOverrides, serializedOverrides)
    }

    return localOverrides
  }
}

export function subscribeToSensorOverrides(
  listener: (overrides: SensorOverridesByKey) => void,
) {
  function handleChange(event: Event) {
    const overrides = (event as CustomEvent<SensorOverridesByKey>).detail
    listener(overrides ?? loadSensorOverrides())
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === SENSOR_OVERRIDES_STORAGE_KEY) {
      listener(loadSensorOverrides())
    }
  }

  window.addEventListener(SENSOR_OVERRIDES_CHANGE_EVENT, handleChange)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(SENSOR_OVERRIDES_CHANGE_EVENT, handleChange)
    window.removeEventListener('storage', handleStorage)
  }
}

function loadPendingSensorOverrides() {
  try {
    const stored = localStorage.getItem(SENSOR_OVERRIDES_PENDING_STORAGE_KEY)
    const parsed = stored ? JSON.parse(stored) : null
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed as SensorOverridesByKey
  } catch {
    return null
  }
}

async function syncSensorOverrides(
  overrides: SensorOverridesByKey,
  serializedOverrides: string,
) {
  for (const delay of SENSOR_OVERRIDES_SYNC_RETRY_DELAYS) {
    if (delay > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, delay))
    }

    try {
      await saveWorkspaceConfiguration({ sensorOverrides: overrides })
      if (localStorage.getItem(SENSOR_OVERRIDES_PENDING_STORAGE_KEY) === serializedOverrides) {
        localStorage.removeItem(SENSOR_OVERRIDES_PENDING_STORAGE_KEY)
      }
      return
    } catch {
      // La copia pendiente permanece en localStorage para reintentarse al volver a cargar.
    }
  }

  console.warn('Los sensores siguen guardados localmente y se sincronizaran cuando la API vuelva a estar disponible.')
}

function mergeSensorOverrides(
  remoteOverrides: SensorOverridesByKey,
  localOverrides: SensorOverridesByKey,
) {
  const keys = new Set([...Object.keys(remoteOverrides), ...Object.keys(localOverrides)])
  return Object.fromEntries(
    Array.from(keys).map((key) => [
      key,
      {
        ...remoteOverrides[key],
        ...localOverrides[key],
      },
    ]),
  )
}
