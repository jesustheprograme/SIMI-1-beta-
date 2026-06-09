import type { CreatedSensorGroup } from '../../telemetria'
import type { GroupSection } from '../../telemetria/types/groupSections'
import type { PlanoLocationZone } from '../../plano'
import type { CreatedProcess } from '../../procesos'
import type { ProcessSection } from '../../procesos/types/processSections'
import { workspaceNav } from '../navigation'
import { ProcesosPage } from '../../procesos'
import { DashboardPage } from '../../../pages/DashboardPage'
import { PlanoPage } from '../../../pages/PlanoPage'
import { ProcessDetailPage } from '../../../pages/ProcessDetailPage'
import { ProcessHistoryPage } from '../../../pages/ProcessHistoryPage'
import {
  ControladoresPage,
  GruposPage,
  PlcJepkomPage,
  SensoresPage,
  SiemensReadingsPage,
} from '../../../pages/telemetria'
import { WorkspacePlaceholder } from '../../../pages/WorkspacePlaceholder'
import type { ProcessType } from '../../procesos'
import type {
  useLiveSensorReadings,
  useProcessSensorLogs,
} from '../../telemetria'

type Props = {
  groupSections: GroupSection[]
  groups: CreatedSensorGroup[]
  liveReadings: ReturnType<typeof useLiveSensorReadings>
  logs: ReturnType<typeof useProcessSensorLogs>
  onCreateGroup: (group: CreatedSensorGroup) => void
  onCreateProcess: (process: CreatedProcess) => void
  onDeleteGroup: (id: string) => void
  onDeleteProcess: (id: string) => void
  onGroupSectionsChange: (sections: GroupSection[]) => void
  onLocationZonesChange: (zones: PlanoLocationZone[]) => void
  onNavigate: (path: string) => void
  onProcessSectionsChange: (sections: ProcessSection[]) => void
  onUpdateGroup: (group: CreatedSensorGroup) => void
  onUpdateProcess: (process: CreatedProcess) => void
  pathname: string
  processes: CreatedProcess[]
  processSections: ProcessSection[]
  zones: PlanoLocationZone[]
}

const sensorTitles: Record<string, string> = {
  '/controladores/sensores-temperatura': 'Sensores Temperatura',
  '/controladores/sensores-humedad': 'Sensores Humedad',
  '/controladores/sensores-co2': 'Sensores co2',
  '/controladores/sensores-etileno': 'Sensores Etileno',
}

const processTitles: Record<string, string> = {
  '/procesos/procesos-almacenado': 'Procesos de Almacenado',
  '/procesos/procesos-maduracion': 'Procesos de Maduracion',
  '/procesos/proceso-3': 'Proceso 3',
}

const processTypesByPath: Record<string, ProcessType> = {
  '/procesos/procesos-almacenado': 'almacenado',
  '/procesos/procesos-maduracion': 'maduracion',
  '/procesos/proceso-3': 'proceso-3',
}

export function WorkspaceContent(props: Props) {
  const { groups, liveReadings, logs, onNavigate, pathname, processes, zones } = props
  const historyMode = pathname.startsWith('/historial/procesos/')
  const detailPrefix = historyMode ? '/historial/procesos/' : '/procesos/'
  const detailId = pathname.startsWith(detailPrefix)
    ? decodeURIComponent(pathname.replace(detailPrefix, ''))
    : ''
  const process = processes.find((item) => item.id === detailId)
  const active = workspaceNav.find(
    (item) => pathname === item.to || item.children?.some((child) => pathname === child.to),
  )
  const child = active?.children?.find((item) => pathname === item.to)

  if (pathname === '/dashboard') {
    return <DashboardPage createdGroups={groups} createdProcesses={processes} liveReadings={liveReadings} locationZones={zones} processLogs={logs} />
  }
  if (process) {
    return <ProcessDetailPage createdGroups={groups} historyMode={historyMode} liveReadings={liveReadings} logs={logs[process.id] ?? []} onBack={() => onNavigate(historyMode ? '/historial/procesos' : '/procesos')} process={process} />
  }
  if (pathname === '/historial/procesos') {
    return <ProcessHistoryPage createdGroups={groups} liveReadings={liveReadings} onOpenProcess={(id) => onNavigate(`/historial/procesos/${encodeURIComponent(id)}`)} processes={processes} />
  }
  if (pathname === '/procesos') {
    return <ProcesosPage createdGroups={groups} locationZones={zones} onOpenProcess={(id) => onNavigate(`/procesos/${encodeURIComponent(id)}`)} onCreateProcess={props.onCreateProcess} onDeleteProcess={props.onDeleteProcess} onProcessSectionsChange={props.onProcessSectionsChange} onUpdateProcess={props.onUpdateProcess} liveReadings={liveReadings} processes={processes} processSections={props.processSections} />
  }
  if (processTitles[pathname]) {
    const title = processTitles[pathname]
    const processType = processTypesByPath[pathname]
    return (
      <ProcesosPage
        createdGroups={groups}
        liveReadings={liveReadings}
        locationZones={zones}
        onCreateProcess={props.onCreateProcess}
        onDeleteProcess={props.onDeleteProcess}
        onOpenProcess={(id) => onNavigate(`/procesos/${encodeURIComponent(id)}`)}
        onProcessSectionsChange={props.onProcessSectionsChange}
        onUpdateProcess={props.onUpdateProcess}
        processes={processes}
        processSections={props.processSections}
        processType={processType}
        title={title}
      />
    )
  }
  if (pathname === '/controladores') return <ControladoresPage />
  if (pathname === '/controladores/grupos') {
    return <GruposPage createdGroups={groups} groupSections={props.groupSections} liveReadings={liveReadings} onCreateGroup={props.onCreateGroup} onDeleteGroup={props.onDeleteGroup} onGroupSectionsChange={props.onGroupSectionsChange} onUpdateGroup={props.onUpdateGroup} />
  }
  if (pathname === '/controladores/plc-jepkom') return <PlcJepkomPage />
  if (pathname === '/controladores/lecturas-siemens') return <SiemensReadingsPage />
  if (sensorTitles[pathname]) {
    return <SensoresPage createdGroups={groups} createdProcesses={processes} liveReadings={liveReadings} locationZones={zones} title={sensorTitles[pathname]} />
  }
  if (pathname === '/plano') {
    return <PlanoPage createdGroups={groups} createdProcesses={processes} locationZones={zones} liveReadings={liveReadings} onCreateProcess={props.onCreateProcess} onLocationZonesChange={props.onLocationZonesChange} onOpenProcess={(id) => onNavigate(`/procesos/${encodeURIComponent(id)}`)} />
  }
  return <WorkspacePlaceholder title={child?.title ?? active?.title ?? 'Dashboard'} />
}
