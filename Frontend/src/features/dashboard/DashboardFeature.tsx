import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { BreadcrumbNav, MiniTrend } from '../../components/ui'
import { fakeSensorsByTitle, type FakeSensor } from '../telemetria/data/fakeSensors'
import { SensorValueDisplay } from '../telemetria/components/SensorValueDisplay'
import { CalendarIcon, ChevronDownIcon } from '../workspace/icons'
import { getOperationalSensor } from '../telemetria/utils/operationalModel'
import {
  formatAssignment,
  getSensorGroupNames,
  getSensorLocationNames,
} from '../telemetria/utils/sensorAssignments'
import {
  applySensorOverride,
  loadPersistedSensorOverrides,
  loadSensorOverrides,
  type SensorOverridesByKey,
} from '../telemetria/utils/sensorOverrides'
import type { ProcessLogEntry, CreatedProcess, ProcessSensorReading } from '../procesos'
import type { CreatedSensorGroup } from '../telemetria'
import type { SensorQuality, SensorType } from '../telemetria/types/operational'
import type { PlanoLocationZone } from '../plano'

type DashboardPageProps = {
  createdGroups: CreatedSensorGroup[]
  createdProcesses: CreatedProcess[]
  liveReadings: Record<string, ProcessSensorReading>
  locationZones: PlanoLocationZone[]
  processLogs: Record<string, ProcessLogEntry[]>
}

type DashboardSensorRow = {
  id: string
  label: string
  groupLabel: string
  lastReading: string
  location: string
  observation: string
  progress: number
  quality: SensorQuality
  sensorTitle: string
  status: 'normal' | 'warning' | 'critical' | 'no-data'
  statusLabel: string
  trendLabel: string
  type: SensorType
  typeLabel: string
  unit: string
  value: number | null
}

type LocationSummary = {
  active: number
  alerts: number
  location: string
  noData: number
  temperature: number | null
  total: number
}

const dashboardRangeOptions = ['Hoy', '7 días', '30 días']

export function DashboardPage({ createdGroups, createdProcesses, liveReadings, locationZones, processLogs }: DashboardPageProps) {
  const [dateFilter, setDateFilter] = useState('Hoy')
  const [dateMenuOpen, setDateMenuOpen] = useState(false)
  const [sensorOverrides, setSensorOverrides] = useState(() => loadSensorOverrides())

  useEffect(() => {
    let cancelled = false

    void loadPersistedSensorOverrides()
      .then((overrides) => {
        if (!cancelled) setSensorOverrides(overrides)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [])
  const sensorRows = useMemo(() => buildSensorRows(liveReadings, processLogs, sensorOverrides, createdGroups, createdProcesses, locationZones), [
    createdGroups,
    createdProcesses,
    locationZones,
    liveReadings,
    processLogs,
    sensorOverrides,
  ])
  const summaries = useMemo(() => buildDashboardSummaries(sensorRows, createdProcesses, locationZones), [
    createdProcesses,
    locationZones,
    sensorRows,
  ])
  const topAlert = summaries.alertRows[0] ?? null
  const activeAlertCount = summaries.alertRows.length

  return (
    <div className="dashboard-page operational-dashboard">
      <div className="dashboard-topline">
        <BreadcrumbNav items={['Dashboard', 'Monitoreo operativo']} />

        <div className="date-filter">
          <button className="date-chip" onClick={() => setDateMenuOpen((open) => !open)} type="button">
            <CalendarIcon />
            {dateFilter}
            <ChevronDownIcon />
          </button>

          {dateMenuOpen && (
            <div className="date-menu">
              {dashboardRangeOptions.map((option) => (
                <button
                  className={dateFilter === option ? 'is-selected' : undefined}
                  key={option}
                  onClick={() => {
                    setDateFilter(option)
                    setDateMenuOpen(false)
                  }}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="dashboard-heading compact">
        <h1>Dashboard operativo</h1>
        <p>Sensores, ubicaciones, lecturas actuales, disponibilidad y alertas con la estructura actual del proyecto.</p>
      </div>

      <section className={`operational-alert is-${topAlert?.status ?? 'normal'}`}>
        <span aria-hidden="true">
          {topAlert ? <WarningAlertIcon /> : <NormalStatusIcon />}
        </span>
        <div>
          {topAlert ? (
            <>
              <strong>
                {activeAlertCount} {activeAlertCount === 1 ? 'evento activo' : 'eventos activos'}
              </strong>
              <p>
                {topAlert.label} en {topAlert.location || 'Sin ubicacion asignada'}: {topAlert.observation}.
              </p>
            </>
          ) : (
            <>
              <strong>Sin alertas activas</strong>
              <p>Todos los sensores disponibles se mantienen dentro de sus límites configurados.</p>
            </>
          )}
        </div>
      </section>

      <section className="dashboard-section">
        <h2>Resumen global</h2>

        <div className="overview-grid operational-overview-grid">
          <MetricCard
            label="Temp. media global"
            meta={`${summaries.temperature.active} sensores activos`}
            tone={summaries.temperature.tone}
            value={formatMetricValue(summaries.temperature.average, 'C')}
          />
          <MetricCard
            label="HR media global"
            meta={`${summaries.humidity.active} sensores activos`}
            tone={summaries.humidity.tone}
            value={formatMetricValue(summaries.humidity.average, '%')}
          />
          <MetricCard
            label="CO2 medio"
            meta={`${summaries.co2.active} sensores activos`}
            tone={summaries.co2.tone}
            value={formatMetricValue(summaries.co2.average, 'ppm')}
          />
          <MetricCard
            label="Etileno medio"
            meta={`${summaries.etileno.active} sensores activos`}
            tone={summaries.etileno.tone}
            value={<SensorValueDisplay sensorTitle="Sensores Etileno" unit="ppm" value={summaries.etileno.average === null ? null : Math.round(summaries.etileno.average)} />}
          />
        </div>
      </section>

      <section className="details-grid operational-details-grid">
        <article className="details-card sensor-details-card">
          <div className="details-card-header">
            <div>
              <h2>Sensores activos: {summaries.activeSensors}</h2>
              <p>{summaries.activeSensors}/{summaries.totalSensors} sensores con lectura</p>
            </div>
          </div>

          <div className="details-table-wrap">
            <table className="details-table sensor-table">
              <thead>
                <tr>
                  <th>Sensor</th>
                  <th>Variable</th>
                  <th>Grupo</th>
                  <th>Ubicación</th>
                  <th>Lectura</th>
                  <th>Estado</th>
                  <th>Última lectura</th>
                  <th>Observación</th>
                </tr>
              </thead>

              <tbody>
                {sensorRows.map((sensor) => (
                  <tr key={sensor.id}>
                    <td>
                      <div className="sensor-name-cell">
                        <strong>{sensor.label}</strong>
                        <span>{getSensorCode(sensor.id)}</span>
                      </div>
                    </td>
                    <td>{sensor.typeLabel}</td>
                    <td>{sensor.groupLabel}</td>
                    <td>{sensor.location}</td>
                    <td>
                      <div className="sensor-value-cell">
                        <strong>
                          <SensorValueDisplay
                            sensorTitle={sensor.sensorTitle}
                            unit={sensor.unit}
                            value={sensor.value === null ? null : formatNumber(sensor.value)}
                          />
                        </strong>
                        <div className="sensor-progress">
                          <i style={{ width: `${sensor.progress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status ${getStatusClass(sensor.status)}`}>{sensor.statusLabel}</span>
                    </td>
                    <td>{sensor.lastReading}</td>
                    <td>{sensor.observation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>

        <aside className="side-panels">
          <article className="product-tree operational-location-card">
            <h3>Temperatura por ubicación</h3>
            <ul>
              {summaries.locationSummaries.map((location) => (
                <li key={location.location}>
                  <span>{location.location}</span>
                  <strong>{location.temperature === null ? 'Sin temp.' : `${formatNumber(location.temperature)} C`}</strong>
                  <em>
                    {location.active}/{location.total} activos
                  </em>
                </li>
              ))}
            </ul>
          </article>

          <article className="country-card operational-process-card">
            <h3>Procesos conectados</h3>
            <strong>
              {summaries.processesWithSensors} <span>con sensores o ubicación</span>
            </strong>
            {summaries.processRows.map((process) => (
              <div className="country-row operational-process-row" key={process.id}>
                <span>{process.name}</span>
                <div>
                  <i style={{ width: `${process.progress}%` }} />
                </div>
                <em>{process.state}</em>
              </div>
            ))}
          </article>
        </aside>
      </section>

      <section className="details-grid operational-details-grid">
        <article className="details-card">
          <div className="details-card-header">
            <div>
              <h2>Tendencias simples</h2>
              <p>Variación estimada desde registros locales de procesos cuando existen.</p>
            </div>
          </div>

          <div className="operational-trend-list">
            {sensorRows.slice(0, 8).map((sensor) => (
              <div className="operational-trend-row" key={sensor.id}>
                <span>{sensor.label}</span>
                <i className={`is-${sensor.status}`} />
                <strong>{sensor.trendLabel}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="details-card operational-next-step-card">
          <h2>Panel por rango de tiempo</h2>
          <p>
            Hoy usa lecturas actuales y registros locales. Para que 7 días y 30 días sean reales falta guardar cada lectura
            del PLC/Raspberry en backend o MongoDB con sensor, valor, timestamp, calidad y ubicación.
          </p>
        </article>
      </section>
    </div>
  )
}

function WarningAlertIcon() {
  return (
    <svg viewBox="0 0 48 48">
      <path d="M24 5 2 43h44Z" />
      <path d="M24 35v1m0-17 .008 10" />
    </svg>
  )
}

function NormalStatusIcon() {
  return (
    <svg viewBox="0 0 48 48">
      <circle cx="24" cy="24" r="19" />
      <path d="m15 24 6 6 13-13" />
    </svg>
  )
}

function MetricCard({ label, meta, tone, value }: { label: string; meta: string; tone: string; value: ReactNode }) {
  return (
    <article className="metric-card">
      <div className="metric-header">
        <span>{label}</span>
        <em className={`metric-badge ${tone}`}>{tone === 'positive' ? 'Normal' : tone === 'negative' ? 'Alerta' : 'Revisar'}</em>
      </div>
      <strong>{value}</strong>
      <p>{meta}</p>
      <MiniTrend tone={tone} />
    </article>
  )
}

function buildSensorRows(
  liveReadings: Record<string, ProcessSensorReading>,
  processLogs: Record<string, ProcessLogEntry[]>,
  sensorOverrides: SensorOverridesByKey,
  createdGroups: CreatedSensorGroup[],
  createdProcesses: CreatedProcess[],
  locationZones: PlanoLocationZone[],
): DashboardSensorRow[] {
  const trendValues = buildTrendValues(processLogs)

  return Object.entries(fakeSensorsByTitle)
    .filter(([sensorTitle]) => sensorTitle !== 'PLC Jepkom')
    .flatMap(([sensorTitle, sensors]) =>
      sensors.map((sensor) =>
        buildSensorRow(
          sensorTitle,
          applySensorOverride(sensorTitle, sensor, sensorOverrides),
          liveReadings,
          trendValues,
          createdGroups,
          createdProcesses,
          locationZones,
        ),
      ),
    )
}

function buildSensorRow(
  sensorTitle: string,
  sensor: FakeSensor,
  liveReadings: Record<string, ProcessSensorReading>,
  trendValues: Map<string, number[]>,
  createdGroups: CreatedSensorGroup[],
  createdProcesses: CreatedProcess[],
  locationZones: PlanoLocationZone[],
): DashboardSensorRow {
  const readingId = `${sensorTitle}::${sensor.id}`
  const reading = liveReadings[readingId]
  const operationalSensor = getOperationalSensor(sensor.id)
  const groupLabel = formatAssignment(getSensorGroupNames(sensorTitle, sensor, createdGroups), 'Sin grupo')
  const location = formatAssignment(
    getSensorLocationNames(sensorTitle, sensor, createdGroups, createdProcesses, locationZones),
    'Sin ubicación',
  )
  const type = operationalSensor?.type ?? getSensorTypeFromUnit(sensor.unit)
  const value = sensor.status === 'Activo' && reading ? Number(reading.value) : null
  const quality = value === null ? 'STALE' : getQuality(value, sensor, operationalSensor)
  const status = getRowStatus(sensor.status, reading, quality)
  const lastReading = status === 'no-data' ? getGapLabel(sensor.id) : 'hace <1 min'

  return {
    id: readingId,
    label: sensor.name,
    groupLabel,
    lastReading,
    location,
    observation: getObservation(status, sensor.unit, operationalSensor?.warningMax, Number(sensor.max)),
    progress: getSensorProgress(value, sensor.unit, Number(sensor.max)),
    quality,
    sensorTitle,
    status,
    statusLabel: getStatusLabel(status),
    trendLabel: getTrendLabel(readingId, sensorTitle, sensor, trendValues),
    type,
    typeLabel: getTypeLabel(type),
    unit: sensor.unit,
    value: Number.isFinite(value) ? value : null,
  }
}

function buildDashboardSummaries(
  sensorRows: DashboardSensorRow[],
  createdProcesses: CreatedProcess[],
  locationZones: PlanoLocationZone[],
) {
  const totalSensors = sensorRows.length
  const activeSensors = sensorRows.filter((sensor) => sensor.status !== 'no-data').length
  const alertRows = sensorRows.filter((sensor) => sensor.status === 'critical' || sensor.status === 'warning')
  const noDataRows = sensorRows.filter((sensor) => sensor.status === 'no-data')
  const availabilityPercent = totalSensors > 0 ? Math.round((activeSensors / totalSensors) * 100) : 0
  const processRows = createdProcesses.slice(0, 5).map((process) => ({
    id: process.id,
    name: process.processName || 'Proceso sin nombre',
    progress: getProcessProgress(process),
    state: process.location || process.sensorVariables.length > 0 || process.groupIds.length > 0 ? 'Vinculado' : 'Pendiente',
  }))

  return {
    activeSensors,
    alertRows,
    availabilityPercent,
    co2: buildMetricSummary(sensorRows, 'co2'),
    etileno: buildMetricSummary(sensorRows, 'etileno'),
    humidity: buildMetricSummary(sensorRows, 'humidity'),
    locationSummaries: buildLocationSummaries(sensorRows, locationZones),
    noDataRows,
    processRows,
    processesWithSensors: createdProcesses.filter(
      (process) => process.location.trim() || process.groupIds.length > 0 || process.sensorVariables.length > 0,
    ).length,
    temperature: buildMetricSummary(sensorRows, 'temperature'),
    totalSensors,
  }
}

function buildMetricSummary(sensorRows: DashboardSensorRow[], type: SensorType) {
  const rows = sensorRows.filter((sensor) => sensor.type === type && sensor.value !== null && sensor.status !== 'no-data')
  const average = rows.length > 0 ? rows.reduce((total, sensor) => total + Number(sensor.value), 0) / rows.length : null
  const hasAlert = rows.some((sensor) => sensor.status === 'critical')
  const hasWarning = rows.some((sensor) => sensor.status === 'warning')

  return {
    active: rows.length,
    average,
    tone: hasAlert ? 'negative' : hasWarning ? 'neutral' : 'positive',
  }
}

function buildLocationSummaries(sensorRows: DashboardSensorRow[], locationZones: PlanoLocationZone[]): LocationSummary[] {
  const locationNames = new Set([
    ...sensorRows.map((sensor) => sensor.location.trim()).filter((location) => location && location !== 'Sin ubicación'),
    ...locationZones.map((zone) => zone.name.trim()).filter(Boolean),
  ])

  return Array.from(locationNames)
    .map((location) => {
      const rows = sensorRows.filter((sensor) => sensor.location === location)
      const temperatureRows = rows.filter((sensor) => sensor.type === 'temperature' && sensor.value !== null)

      return {
        active: rows.filter((sensor) => sensor.status !== 'no-data').length,
        alerts: rows.filter((sensor) => sensor.status === 'critical' || sensor.status === 'warning').length,
        location,
        noData: rows.filter((sensor) => sensor.status === 'no-data').length,
        temperature:
          temperatureRows.length > 0
            ? temperatureRows.reduce((total, sensor) => total + Number(sensor.value), 0) / temperatureRows.length
            : null,
        total: rows.length,
      }
    })
    .filter((summary) => summary.total > 0)
    .sort((a, b) => b.alerts - a.alerts || b.noData - a.noData || a.location.localeCompare(b.location))
    .slice(0, 8)
}

function getQuality(
  value: number,
  sensor: FakeSensor,
  operationalSensor: ReturnType<typeof getOperationalSensor>,
): SensorQuality {
  const min = Number(sensor.min)
  const max = Number(sensor.max)
  if (Number.isFinite(min) && value < min) return 'BAD'
  if (Number.isFinite(max) && value > max) return 'BAD'
  if (!operationalSensor) return 'GOOD'
  if (value <= operationalSensor.warningMin || value >= operationalSensor.warningMax) return 'UNKNOWN'
  return 'GOOD'
}

function getRowStatus(
  sensorStatus: FakeSensor['status'],
  reading: ProcessSensorReading | undefined,
  quality: SensorQuality,
): DashboardSensorRow['status'] {
  if (sensorStatus !== 'Activo' || !reading) return 'no-data'
  if (quality === 'BAD') return 'critical'
  if (quality === 'UNKNOWN') return 'warning'
  return 'normal'
}

function getObservation(
  status: DashboardSensorRow['status'],
  unit: string,
  warningMax: number | undefined,
  max: number | undefined,
) {
  if (status === 'no-data') return 'Sin lectura reciente'
  if (status === 'critical') return `Fuera de rango, límite máximo ${max ?? 'configurado'} ${unit}`
  if (status === 'warning') return `Cerca del límite, advertencia desde ${warningMax ?? 'valor configurado'} ${unit}`
  return 'Dentro del rango configurado'
}

function buildTrendValues(processLogs: Record<string, ProcessLogEntry[]>) {
  const valuesBySensor = new Map<string, number[]>()

  for (const logs of Object.values(processLogs)) {
    for (const log of logs) {
      for (const reading of log.readings) {
        const value = Number(reading.value)
        if (!Number.isFinite(value)) continue

        for (const key of [reading.id, `${reading.sensorTitle}::${reading.name}`]) {
          const values = valuesBySensor.get(key) ?? []
          if (values.length >= 2) continue
          values.push(value)
          valuesBySensor.set(key, values)
        }
      }
    }
  }

  return valuesBySensor
}

function getTrendLabel(sensorId: string, sensorTitle: string, sensor: FakeSensor, trendValues: Map<string, number[]>) {
  const values = trendValues.get(sensorId) ?? trendValues.get(`${sensorTitle}::${sensor.name}`) ?? []

  if (values.length < 2) return 'Sin historial suficiente'

  const delta = values[0] - values[1]
  if (Math.abs(delta) < 0.1) return 'Estable'
  return `${delta > 0 ? '+' : ''}${delta.toFixed(1)} ${sensor.unit}/registro`
}

function getSensorTypeFromUnit(unit: string): SensorType {
  if (unit === '%') return 'humidity'
  if (unit === 'ppm') return 'co2'
  return 'temperature'
}

function getSensorCode(sensorId: string) {
  return sensorId.split('::').at(-1) ?? sensorId
}

function getTypeLabel(type: SensorType) {
  if (type === 'humidity') return 'Humedad'
  if (type === 'co2') return 'CO2'
  if (type === 'etileno') return 'Etileno'
  if (type === 'pressure') return 'Presión'
  return 'Temperatura'
}

function getStatusLabel(status: DashboardSensorRow['status']) {
  if (status === 'critical') return 'Fuera de rango'
  if (status === 'warning') return 'Alerta'
  if (status === 'no-data') return 'Sin datos'
  return 'Normal'
}

function getStatusClass(status: DashboardSensorRow['status']) {
  if (status === 'critical') return 'danger'
  if (status === 'warning') return 'warning'
  if (status === 'no-data') return 'offline'
  return 'online'
}

function getSensorProgress(value: number | null, unit: string, max: number | undefined) {
  if (value === null || !Number.isFinite(value)) return 0
  if (unit === '%') return clamp(value, 0, 100)
  if (unit === 'ppm') return clamp((value / (max ?? 600)) * 100, 0, 100)
  if (unit === 'C') return clamp((value / (max ?? 45)) * 100, 0, 100)
  return clamp(value, 0, 100)
}

function getGapLabel(sensorId: string) {
  const minutes = sensorId.split('').reduce((total, char) => total + char.charCodeAt(0), 0) % 50
  return `Gap: ${Math.max(12, minutes)} min`
}

function getProcessProgress(process: CreatedProcess) {
  if (!process.deadlineAt) return process.location ? 60 : 20
  const start = new Date(process.createdAt).getTime()
  const end = new Date(process.deadlineAt).getTime()
  const now = Date.now()
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 40
  return clamp(((now - start) / (end - start)) * 100, 5, 100)
}

function formatMetricValue(value: number | null, unit: string) {
  if (value === null) return `— ${unit}`
  if (unit === 'ppm') return `${Math.round(value)} ${unit}`
  return `${formatNumber(value)} ${unit}`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toString() : value.toFixed(1)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}
