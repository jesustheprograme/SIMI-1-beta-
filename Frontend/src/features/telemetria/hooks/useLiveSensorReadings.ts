import { useEffect, useMemo, useRef, useState } from 'react'
import { fakeSensorsByTitle, type FakeSensor } from '../data/fakeSensors'
import type { CreatedSensorGroup } from '../types/groups'
import type { CreatedProcess, ProcessLogEntry, ProcessSensorOutlier, ProcessSensorReading } from '../../procesos/types'
import { getProcessReadings } from '../../procesos/utils/processReadings'
import { createLocalId } from '../../../utils/localId'
import {
  loadProcessLogs as loadProcessLogsFromApi,
  logSensorOutliers,
  saveProcessLogs,
} from '../../auth/services/authApi'
import {
  applySensorOverride,
  loadPersistedSensorOverrides,
  loadSensorOverrides,
  subscribeToSensorOverrides,
} from '../utils/sensorOverrides'

type ReadingsById = Record<string, ProcessSensorReading>
type ProcessLogsById = Record<string, ProcessLogEntry[]>

// Cache local del historial para conservar datos durante caidas temporales del backend.
const PROCESS_LOGS_STORAGE_KEY = 'simi.processSensorLogs'

// Actualiza la simulacion de lecturas en vivo cada cinco segundos.
const SENSOR_READING_INTERVAL_MS = 5000

// Comprueba cada segundo si algun proceso debe generar un registro.
const PROCESS_LOG_INTERVAL_MS = 1000

// Conserva como maximo 600 registros por proceso en la cache del navegador.
const PROCESS_LOGS_MAX_PER_PROCESS = 600

// Si localStorage se llena, reintenta con historiales progresivamente menores.
const PROCESS_LOGS_STORAGE_RETRY_LIMITS = [600, 400, 250, 100]

// Reduce las escrituras pesadas sin cambiar la frecuencia configurada del proceso.
const PROCESS_LOG_STORAGE_EVERY_N_RECORDS = 10

const DEFAULT_OUTLIER_PROBABILITY = 0.1
const OUTLIER_PROBABILITY_BY_SENSOR_TYPE = {
  co2: 0.1,
  etileno: 0.02,
  humidity: 0.1,
  temperature: 0.1,
} as const

const ETILENO_RANGE = { min: 0, max: 100 }

let previousLiveOutlierKeys = new Set<string>()
const previousProcessOutlierKeys = new Map<string, Set<string>>()

export function useLiveSensorReadings() {
  const [readingStep, setReadingStep] = useState(() => getCurrentReadingStep())
  const [sensorOverrides, setSensorOverrides] = useState(() => loadSensorOverrides())

  useEffect(() => {
    function syncReadingStep() {
      setReadingStep(getCurrentReadingStep())
    }

    syncReadingStep()
    const intervalId = window.setInterval(syncReadingStep, 1000)

    return () => window.clearInterval(intervalId)
  }, [])

  useEffect(() => {
    let cancelled = false

    const unsubscribe = subscribeToSensorOverrides(setSensorOverrides)
    void loadPersistedSensorOverrides()
      .then((overrides) => {
        if (cancelled) return
        setSensorOverrides(overrides)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return useMemo(() => buildLiveReadings(readingStep, sensorOverrides), [readingStep, sensorOverrides])
}

export function useProcessSensorLogs(
  processes: CreatedProcess[],
  groups: CreatedSensorGroup[],
  readingsById: ReadingsById,
) {
  const [logsByProcess, setLogsByProcess] = useState<ProcessLogsById>(() => loadProcessLogs())
  const latestLogsRef = useRef(logsByProcess)
  const pendingBackendRecordsRef = useRef<Array<{ entry: ProcessLogEntry; processId: string }>>([])
  const backendSyncInFlightRef = useRef(false)

  useEffect(() => {
    latestLogsRef.current = logsByProcess
  }, [logsByProcess])

  useEffect(() => {
    let cancelled = false
    const localLogs = latestLogsRef.current

    void loadProcessLogsFromApi()
      .then(async ({ logs: remoteLogs }) => {
        if (cancelled) return

        const mergedLogs = mergeProcessLogs(remoteLogs, localLogs)
        latestLogsRef.current = mergedLogs
        setLogsByProcess(mergedLogs)
        persistProcessLogs(mergedLogs)

        const remoteLogKeys = new Set(
          Object.entries(remoteLogs).flatMap(([processId, entries]) =>
            entries.map((entry) => `${processId}:${getProcessLogDeduplicationKey(entry)}`),
          ),
        )
        const localOnlyRecords = Object.entries(localLogs).flatMap(([processId, entries]) =>
          entries
            .filter(
              (entry) =>
                !remoteLogKeys.has(`${processId}:${getProcessLogDeduplicationKey(entry)}`),
            )
            .map((entry) => ({ entry, processId })),
        )

        for (let index = 0; index < localOnlyRecords.length; index += 200) {
          await saveProcessLogs(localOnlyRecords.slice(index, index + 200))
        }
      })
      .catch((error) => {
        console.warn('No se pudo cargar el historial desde MongoDB. Se usara la cache local.', error)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (processes.length === 0) return
    if (!processes.some((process) => isProcessRunning(process, Date.now()))) return

    function addLogEntry() {
      const currentLogs = latestLogsRef.current
      const nextLogs = { ...currentLogs }
      const backendRecords: Array<{ entry: ProcessLogEntry; processId: string }> = []
      const sensorOutliers: ProcessSensorOutlier[] = []
      let shouldPersist = false
      const now = Date.now()

      for (const process of processes) {
        if (!isProcessRunning(process, now)) continue
        const processLogs = nextLogs[process.id] ?? []
        if (!shouldCreateProcessLog(process, processLogs, now)) continue

        const readings = getProcessReadings(process, groups, readingsById)
        if (readings.length === 0) continue

        const recordNumber = getNextRecordNumber(processLogs)
        const outliers = buildOutliers(process, readings, recordNumber)
        const entry: ProcessLogEntry = {
          createdAt: new Date(now).toISOString(),
          id: createLocalId('process-log'),
          outliers,
          recordNumber,
          readings: applyOutliersToReadings(readings, outliers),
        }

        nextLogs[process.id] = [entry, ...processLogs]
        backendRecords.push({ entry, processId: process.id })
        sensorOutliers.push(...outliers)
        shouldPersist ||= recordNumber % PROCESS_LOG_STORAGE_EVERY_N_RECORDS === 0
      }

      if (backendRecords.length === 0) return

      const limitedLogs = limitProcessLogs(nextLogs, PROCESS_LOGS_MAX_PER_PROCESS)
      const updatedLogs = shouldPersist ? persistProcessLogs(limitedLogs) : limitedLogs
      latestLogsRef.current = updatedLogs
      setLogsByProcess(updatedLogs)

      pendingBackendRecordsRef.current.push(...backendRecords)
      if (sensorOutliers.length > 0) {
        void logSensorOutliers(sensorOutliers).catch((error) => {
          console.warn('No se pudieron sincronizar los valores atipicos con MongoDB.', error)
        })
      }
      flushPendingBackendRecords()
    }

    function flushPendingBackendRecords() {
      if (backendSyncInFlightRef.current) return
      const records = pendingBackendRecordsRef.current.splice(0)
      if (records.length === 0) return

      backendSyncInFlightRef.current = true
      void saveProcessLogs(records)
        .then(() => {
          backendSyncInFlightRef.current = false
          if (pendingBackendRecordsRef.current.length > 0) {
            flushPendingBackendRecords()
          }
        })
        .catch((error) => {
          backendSyncInFlightRef.current = false
          pendingBackendRecordsRef.current.unshift(...records)
          console.warn('No se pudieron sincronizar registros de sensores con MongoDB.', error)
        })
    }

    addLogEntry()
    const intervalId = window.setInterval(addLogEntry, PROCESS_LOG_INTERVAL_MS)

    return () => {
      window.clearInterval(intervalId)
      persistProcessLogs(latestLogsRef.current)
    }
  }, [groups, processes, readingsById])

  return logsByProcess
}

function getNextRecordNumber(logs: ProcessLogEntry[]) {
  const maxRecordNumber = logs.reduce((max, entry, index, entries) => {
    const fallbackRecordNumber = entries.length - index
    const recordNumber = Number(entry.recordNumber ?? fallbackRecordNumber)
    return Number.isFinite(recordNumber) ? Math.max(max, recordNumber) : max
  }, 0)

  return maxRecordNumber + 1
}

function shouldCreateProcessLog(process: CreatedProcess, logs: ProcessLogEntry[], now: number) {
  const latestLogTime = logs.reduce((latest, entry) => {
    const timestamp = new Date(entry.createdAt).getTime()
    return Number.isFinite(timestamp) ? Math.max(latest, timestamp) : latest
  }, 0)

  if (latestLogTime === 0) return true

  const intervalSeconds = Number(process.readingIntervalSeconds)
  const normalizedInterval = Number.isFinite(intervalSeconds) && intervalSeconds >= 1
    ? intervalSeconds
    : 5

  return now - latestLogTime >= normalizedInterval * 1000
}

function isProcessExecutable(process: CreatedProcess) {
  if (process.finishedAt) return false
  return Boolean(
    process.processName.trim() &&
      process.location.trim() &&
      (process.groupIds.length > 0 || process.sensorVariables.length > 0),
  )
}

function isProcessRunning(process: CreatedProcess, now: number) {
  if (!isProcessExecutable(process)) return false

  const start = new Date(process.createdAt).getTime()
  if (Number.isNaN(start)) return false
  if (start > now) return false

  if (!process.deadlineAt) return true

  const deadline = new Date(process.deadlineAt).getTime()
  if (Number.isNaN(deadline)) return false
  return deadline > now
}

function getCurrentReadingStep() {
  return Math.floor(Date.now() / SENSOR_READING_INTERVAL_MS)
}

function buildLiveReadings(readingStep: number, sensorOverrides = loadSensorOverrides()) {
  const readings: ReadingsById = {}
  const currentLiveOutlierKeys = new Set<string>()

  for (const [sensorTitle, sensors] of Object.entries(fakeSensorsByTitle)) {
    if (sensorTitle === 'PLC Jepkom') continue

    for (const baseSensor of sensors) {
      const sensor = applySensorOverride(sensorTitle, baseSensor, sensorOverrides)
      if (sensor.status !== 'Activo') continue

      const id = `${sensorTitle}::${sensor.id}`
      const reading = {
        id,
        name: sensor.name,
        sensorTitle,
        unit: sensor.unit,
        value: getLiveValue(sensor, sensorTitle, readingStep),
      }
      readings[id] = applyLiveOutlier(reading, currentLiveOutlierKeys)
    }
  }

  previousLiveOutlierKeys = currentLiveOutlierKeys
  return readings
}

function mergeProcessLogs(primary: ProcessLogsById, secondary: ProcessLogsById) {
  const processIds = new Set([...Object.keys(primary), ...Object.keys(secondary)])

  return limitProcessLogs(
    Object.fromEntries(
      Array.from(processIds).map((processId) => {
        const entries = [...(primary[processId] ?? []), ...(secondary[processId] ?? [])]
        const uniqueEntries = deduplicateProcessLogs(entries)
          .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
        return [processId, uniqueEntries]
      }),
    ),
    PROCESS_LOGS_MAX_PER_PROCESS,
  )
}

function getProcessLogDeduplicationKey(entry: ProcessLogEntry) {
  const recordNumber = Number(entry.recordNumber)
  return Number.isFinite(recordNumber) && recordNumber > 0
    ? `record:${recordNumber}`
    : `id:${entry.id}`
}

function deduplicateProcessLogs(entries: ProcessLogEntry[]) {
  const uniqueEntries = new Map<string, ProcessLogEntry>()

  for (const entry of entries) {
    const key = getProcessLogDeduplicationKey(entry)
    const current = uniqueEntries.get(key)
    if (!current || getLogTimestamp(entry) > getLogTimestamp(current)) {
      uniqueEntries.set(key, entry)
    }
  }

  return Array.from(uniqueEntries.values())
}

function getLogTimestamp(entry: ProcessLogEntry) {
  const timestamp = new Date(entry.createdAt).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function buildOutliers(process: CreatedProcess, readings: ProcessSensorReading[], recordNumber: number) {
  const previousOutlierKeys = previousProcessOutlierKeys.get(process.id) ?? new Set<string>()
  const currentOutlierKeys = new Set<string>()
  const outliers = readings.flatMap((reading) => {
    const range = getReadingRange(reading)
    const outlierProbability = getOutlierProbability(reading)
    const value = Number(reading.value)
    if (!range || !Number.isFinite(value)) return []
    if (previousOutlierKeys.has(reading.id)) return []

    if (value < range.min || value > range.max) {
      currentOutlierKeys.add(reading.id)
      return buildSensorOutlier(process, reading, recordNumber, value, value < range.min)
    }

    if (Math.random() >= outlierProbability) return []

    currentOutlierKeys.add(reading.id)
    return buildSensorOutlier(process, reading, recordNumber)
  })

  previousProcessOutlierKeys.set(process.id, currentOutlierKeys)
  return outliers
}

function buildSensorOutlier(
  process: CreatedProcess,
  reading: ProcessSensorReading,
  recordNumber: number,
  fixedOutlierValue?: number,
  fixedLowerOutlier?: boolean,
) {
  const range = getReadingRange(reading)
  const isLowerOutlier = fixedLowerOutlier ?? shouldGenerateLowerOutlier(reading)
  const outlierValue = fixedOutlierValue ?? getOutlierValue(reading, range, isLowerOutlier)

  return {
    id: reading.id,
    sensor: reading.sensorTitle,
    nombre: reading.name,
    fecha_hora: new Date().toISOString(),
    valor: outlierValue.toFixed(1),
    valor_minimo: range?.min ?? null,
    valor_maximo: range?.max ?? null,
    unidad: reading.unit,
    observacion: isLowerOutlier ? 'Superó el valor mínimo' : 'Superó el valor máximo',
    proceso_en_ejecucion: true,
    proceso_id: process.id,
    proceso_nombre: process.processName,
    registro_numero: recordNumber,
    ubicacion: process.location,
  }
}

function applyLiveOutlier(reading: ProcessSensorReading, currentOutlierKeys: Set<string>): ProcessSensorReading {
  const range = getReadingRange(reading)
  const outlierProbability = getOutlierProbability(reading)
  const value = Number(reading.value)
  if (!range || !Number.isFinite(value)) return reading
  if (value < range.min || value > range.max) return reading
  if (previousLiveOutlierKeys.has(reading.id)) return reading
  if (Math.random() >= outlierProbability) return reading

  const isLowerOutlier = shouldGenerateLowerOutlier(reading)
  currentOutlierKeys.add(reading.id)

  return {
    ...reading,
    value: getOutlierValue(reading, range, isLowerOutlier).toFixed(1),
  }
}

function applyOutliersToReadings(readings: ProcessSensorReading[], outliers: ProcessSensorOutlier[]) {
  if (outliers.length === 0) return readings

  const outliersByReadingId = new Map(outliers.map((outlier) => [outlier.id, outlier]))

  return readings.map((reading) => {
    const outlier = outliersByReadingId.get(reading.id)
    if (!outlier) return reading

    return {
      ...reading,
      unit: outlier.unidad || reading.unit,
      value: outlier.valor || reading.value,
    }
  })
}

function getOutlierValue(reading: ProcessSensorReading, range: { min: number; max: number } | null, isLowerOutlier: boolean) {
  if (!range) return Number(reading.value)

  if (getSensorTypeFromReading(reading) === 'etileno') {
    const offset = 1 + Math.random() * 14
    return isLowerOutlier ? range.min : range.max + offset
  }

  const offset = 0.5 + Math.random() * 2.5
  return isLowerOutlier ? range.min - offset : range.max + offset
}

function getReadingRange(reading: ProcessSensorReading) {
  const sensorType = getSensorTypeFromReading(reading)
  const baseSensor = getBaseSensorForReading(reading)
  if (baseSensor) {
    const min = Number(baseSensor.min)
    const max = Number(baseSensor.max)
    if (Number.isFinite(min) && Number.isFinite(max)) return { min, max }
  }

  if (sensorType === 'etileno') return ETILENO_RANGE
  if (sensorType === 'co2') return { min: 300, max: 600 }
  if (reading.unit === '%') return { min: 25, max: 85 }
  if (reading.unit === 'C') return { min: -5, max: 45 }
  return null
}

function getOutlierProbability(reading: ProcessSensorReading) {
  return OUTLIER_PROBABILITY_BY_SENSOR_TYPE[getSensorTypeFromReading(reading)] ?? DEFAULT_OUTLIER_PROBABILITY
}

function getBaseSensorForReading(reading: ProcessSensorReading) {
  const sensors = fakeSensorsByTitle[reading.sensorTitle] ?? []
  const sensorId = getReadingSensorId(reading.id)
  return sensors.find((sensor) => sensor.id.toLowerCase() === sensorId.toLowerCase()) ?? null
}

function getReadingSensorId(readingId: string) {
  return readingId.split('::').at(-1) ?? readingId
}

function getSensorTypeFromTitle(sensorTitle: string) {
  const normalizedTitle = sensorTitle.trim().toLowerCase()
  if (normalizedTitle.includes('etileno')) return 'etileno'
  if (normalizedTitle.includes('co2')) return 'co2'
  if (normalizedTitle.includes('humedad')) return 'humidity'
  return 'temperature'
}

function getSensorTypeFromReading(reading: Pick<ProcessSensorReading, 'name' | 'sensorTitle'>) {
  const normalizedText = `${reading.sensorTitle} ${reading.name}`.trim().toLowerCase()
  if (normalizedText.includes('etileno') || normalizedText.includes('etn')) {
    return 'etileno'
  }
  if (normalizedText.includes('co2')) return 'co2'
  if (normalizedText.includes('humedad')) return 'humidity'
  return 'temperature'
}

function shouldGenerateLowerOutlier(reading: ProcessSensorReading) {
  return getSensorTypeFromReading(reading) === 'etileno' ? false : Math.random() < 0.5
}

function getLiveValue(sensor: FakeSensor, sensorTitle: string, tick: number) {
  const base = Number(sensor.value)
  if (!Number.isFinite(base)) return sensor.value
  const min = Number(sensor.min)
  const max = Number(sensor.max)
  const normalizedMin = Number.isFinite(min) ? min : undefined
  const normalizedMax = Number.isFinite(max) ? max : undefined
  const phase = sensor.id.split('').reduce((total, char) => total + char.charCodeAt(0), 0)
  const wave = Math.sin((tick + phase) * 0.75)
  const noise = Math.cos((tick * 1.3 + phase) * 0.45)
  const sensorType = getSensorTypeFromTitle(sensorTitle)

  if (sensor.unit === 'ppm' && sensorType === 'etileno') {
    return clamp(base + wave * 4.5 + noise * 1.8, normalizedMin ?? 0, normalizedMax ?? 100).toFixed(0)
  }
  if (sensor.unit === 'ppm') {
    return clamp(base + wave * 26 + noise * 9, normalizedMin ?? 300, normalizedMax ?? 600).toFixed(0)
  }
  if (sensor.unit === '%') return clamp(base + wave * 3.5 + noise * 1.2, normalizedMin ?? 25, normalizedMax ?? 85).toFixed(0)
  if (sensor.unit === 'C') return clamp(base + wave * 1.4 + noise * 0.4, normalizedMin ?? -5, normalizedMax ?? 45).toFixed(1)

  return (base + wave).toFixed(1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function persistProcessLogs(logs: ProcessLogsById) {
  let fallbackLogs = limitProcessLogs(logs, PROCESS_LOGS_MAX_PER_PROCESS)

  for (const limit of PROCESS_LOGS_STORAGE_RETRY_LIMITS) {
    const candidateLogs = limitProcessLogs(logs, limit)

    try {
      localStorage.setItem(PROCESS_LOGS_STORAGE_KEY, JSON.stringify(candidateLogs))
      return candidateLogs
    } catch (error) {
      fallbackLogs = candidateLogs

      if (!isStorageQuotaError(error)) {
        console.warn('No se pudo guardar el historial de registros del proceso.', error)
        return candidateLogs
      }
    }
  }

  try {
    localStorage.removeItem(PROCESS_LOGS_STORAGE_KEY)
    localStorage.setItem(PROCESS_LOGS_STORAGE_KEY, JSON.stringify(fallbackLogs))
  } catch (error) {
    console.warn('Se redujo el historial en memoria porque el almacenamiento local esta lleno.', error)
  }

  return fallbackLogs
}

function loadProcessLogs() {
  try {
    const stored = localStorage.getItem(PROCESS_LOGS_STORAGE_KEY)
    const parsed = stored ? (JSON.parse(stored) as ProcessLogsById) : {}

    return limitProcessLogs(
      Object.fromEntries(
      Object.entries(parsed).map(([processId, entries]) => [
        processId,
        Array.isArray(entries)
          ? deduplicateProcessLogs(
              entries.filter(
                (entry) => entry && typeof entry.id === 'string' && Array.isArray(entry.readings),
              ),
            )
          : [],
      ]),
      ),
      PROCESS_LOGS_MAX_PER_PROCESS,
    )
  } catch {
    return {}
  }
}

function limitProcessLogs(logs: ProcessLogsById, maxPerProcess: number) {
  return Object.fromEntries(
    Object.entries(logs).map(([processId, entries]) => [
      processId,
      entries.slice(0, maxPerProcess),
    ]),
  )
}

function isStorageQuotaError(error: unknown) {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      error.code === 22 ||
      error.code === 1014)
  )
}
