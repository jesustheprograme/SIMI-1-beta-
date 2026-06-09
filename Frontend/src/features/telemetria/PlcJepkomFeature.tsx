import { useState } from 'react'
import { BreadcrumbNav } from '../../components/ui/BreadcrumbNav'
import { PlcPanelModal } from './components/PlcPanelModal'

export function PlcJepkomPage() {
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="dashboard-page plc-jepkom-page">
      <BreadcrumbNav items={['Dashboard', 'Controladores', 'PLC Jepkom']} />

      <div className="dashboard-heading compact">
        <h1>PLC Jepkom</h1>
        <p>Panel Raspberry integrado para monitorear lecturas PLC, telemetria MQTT y tags adquiridos.</p>
      </div>

      <section className="controller-launch">
        <article>
          <span className="panel-label">Panel Raspberry</span>
          <h2>Panel PLC</h2>
          <p>
            Abre el panel industrial de Raspberry en una ventana modal para monitorear lecturas,
            telemetria MQTT, estado de conexion y tags adquiridos del PLC Jepkom.
          </p>
          <button onClick={() => setPanelOpen(true)} type="button">
            Abrir panel PLC
          </button>
        </article>
      </section>

      {panelOpen && <PlcPanelModal onClose={() => setPanelOpen(false)} />}
    </div>
  )
}
