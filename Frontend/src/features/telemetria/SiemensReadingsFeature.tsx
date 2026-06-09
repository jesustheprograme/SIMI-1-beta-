import { useEffect, useState } from 'react'
import { BreadcrumbNav } from '../../components/ui/BreadcrumbNav'
import { PLC_PANEL_URL } from './config'
import { MetricCard, SiemensReadingsTable, type SiemensReading } from './components/SiemensReadingsTable'

type SiemensPlc = {
  name?: string
  host?: string
  protocol?: string
  enabled?: boolean
}

type SiemensPayload = {
  data?: SiemensReading[]
  errorMessage?: string | null
  lastDurationMs?: number
  lastReadAt?: string
  plcs?: SiemensPlc[]
  quality?: string
  status?: string
  summary?: {
    total: number
    good: number
    bad: number
    }
}

const emptySummary = { total: 0, good: 0, bad: 0 }

async function requestSiemensReadings() {
  const response = await fetch(`${PLC_PANEL_URL}/api/read/siemens-s7`, { method: 'POST' })
  const data = (await response.json()) as SiemensPayload
  if (!response.ok) throw new Error(data.errorMessage || 'No se pudieron consultar las lecturas Siemens.')
  return data
}

export function SiemensReadingsPage() {
  const [payload, setPayload] = useState<SiemensPayload | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadReadings() {
    setLoading(true)
    setError('')

    try {
      setPayload(await requestSiemensReadings())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo conectar con Raspberry.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    void requestSiemensReadings()
      .then((data) => {
        if (!cancelled) setPayload(data)
      })
      .catch((requestError) => {
        if (cancelled) return
        setError(requestError instanceof Error ? requestError.message : 'No se pudo conectar con Raspberry.')
      })

    return () => {
      cancelled = true
    }
  }, [])

  const plc = payload?.plcs?.[0]
  const readings = payload?.data ?? []
  const summary = payload?.summary ?? emptySummary
  const hasNoActivePlc = payload?.status === 'NO_ACTIVE_PLC'

  return (
    <div className="dashboard-page plc-jepkom-page">
      <BreadcrumbNav items={['Dashboard', 'Controladores', 'Lecturas Siemens']} />

      <div className="dashboard-heading compact">
        <h1>Lecturas Siemens</h1>
        <p>Lectura directa de variables Siemens S7 configuradas en Raspberry.</p>
      </div>

      <section className="overview-grid">
        <MetricCard
          badge={payload?.quality ?? 'Sin datos'}
          badgeTone={payload?.quality === 'GOOD' ? 'positive' : 'negative'}
          label="PLC"
          meta={plc?.host ?? 'Habilita un PLC siemens-s7 en Raspberry/config/plcs.json'}
          value={plc?.name ?? 'Sin PLC activo'}
        />
        <MetricCard badge={`${summary.good} OK`} label="Tags" meta={`${summary.bad} lecturas con calidad BAD`} value={summary.total} />
        <MetricCard
          badge={`${payload?.lastDurationMs ?? 0} ms`}
          label="Ultima lectura"
          meta={payload?.status ?? 'Esperando lectura'}
          value={formatDate(payload?.lastReadAt)}
        />
      </section>

      <section className="details-card sensor-details-card">
        <div className="details-card-header">
          <div>
            <h2>Variables Siemens S7</h2>
            <p>{payload?.errorMessage || error || 'Valores recibidos desde el endpoint /api/read/siemens-s7.'}</p>
          </div>
          <button disabled={loading} onClick={() => void loadReadings()} type="button">
            {loading ? 'Actualizando...' : 'Actualizar lecturas'}
          </button>
        </div>

        {hasNoActivePlc && <p className="empty-state">No hay PLC Siemens activo. Habilita un PLC con protocolo siemens-s7 en Raspberry/config/plcs.json.</p>}
        {!hasNoActivePlc && readings.length === 0 && <p className="empty-state">No hay lecturas Siemens disponibles todavia.</p>}
        {!hasNoActivePlc && readings.length > 0 && <SiemensReadingsTable readings={readings} />}
      </section>
    </div>
  )
}

function formatDate(value?: string) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date(value))
}
