import { operationalSensors } from '../../telemetria/operationalCatalog'
import { historyNav, primaryNav, secondaryNav } from '../navigation'
import type { CreatedSensorGroup } from '../../telemetria'
import type { PlanoLocationZone } from '../../plano'
import type { CreatedProcess } from '../../procesos'

export type WorkspaceSearchItem = {
  breadcrumb: string
  category: 'Grupo' | 'Navegacion' | 'Proceso' | 'Sensor' | 'Ubicacion'
  id: string
  keywords: string
  path: string
  subtitle: string
  title: string
}

const sensorPaths: Record<string, string> = {
  'Sensores Temperatura': '/controladores/sensores-temperatura',
  'Sensores Humedad': '/controladores/sensores-humedad',
  'Sensores co2': '/controladores/sensores-co2',
  'Sensores Etileno': '/controladores/sensores-etileno',
}

export function buildSearchIndex(
  groups: CreatedSensorGroup[],
  processes: CreatedProcess[],
  zones: PlanoLocationZone[],
) {
  return [
    ...buildNavigationItems(),
    ...operationalSensors.map((sensor) => ({
      breadcrumb: `Espacio de trabajo > Controladores > ${getSensorDisplayText(sensor.sourceTitle)} > ${sensor.sourceTag}`,
      category: 'Sensor' as const,
      id: `sensor-${sensor.id}`,
      keywords: `${getSensorDisplayText(sensor.name)} ${sensor.sourceTag} ${sensor.type} etileno ${sensor.unit}`,
      path: sensorPaths[sensor.sourceTitle],
      subtitle: `${sensor.sourceTag} · ${sensor.unit}`,
      title: getSensorDisplayText(sensor.name),
    })),
    ...groups.map((group) => ({
      breadcrumb: `Espacio de trabajo > Controladores > Grupos > ${group.name}`,
      category: 'Grupo' as const,
      id: `group-${group.id}`,
      keywords: `${group.name} ${group.sensorTitle} ${group.variables.join(' ')}`,
      path: '/controladores/grupos',
      subtitle: `${group.variables.length} variable${group.variables.length === 1 ? '' : 's'}`,
      title: group.name,
    })),
    ...processes.map((process) => ({
      breadcrumb: `Espacio de trabajo > Procesos > ${process.processName}`,
      category: 'Proceso' as const,
      id: `process-${process.id}`,
      keywords: `${process.processName} ${process.clientName} ${process.product} ${process.location}`,
      path: `/procesos/${encodeURIComponent(process.id)}`,
      subtitle: process.clientName || process.product || 'Proceso guardado',
      title: process.processName,
    })),
    ...zones.map((zone) => ({
      breadcrumb: `Espacio de trabajo > Plano > Ubicaciones > ${zone.name}`,
      category: 'Ubicacion' as const,
      id: `zone-${zone.id}`,
      keywords: `${zone.name} ubicacion zona plano`,
      path: '/plano',
      subtitle: 'Ubicacion del plano',
      title: zone.name,
    })),
  ]
}

function getSensorDisplayText(value: string) {
  return value
}

export function filterSearchItems(items: WorkspaceSearchItem[], query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean)
  if (!terms.length) return items.filter((item) => item.category === 'Navegacion').slice(0, 7)
  return items
    .map((item) => {
      const haystack = normalize(`${item.title} ${item.subtitle} ${item.breadcrumb} ${item.keywords}`)
      const score = terms.reduce((total, term) => total + scoreTerm(haystack, normalize(item.title), term), 0)
      return { item, score }
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 9)
    .map(({ item }) => item)
}

function buildNavigationItems(): WorkspaceSearchItem[] {
  return [...primaryNav, ...historyNav, ...secondaryNav].flatMap((item) => [
    navigationItem(item.title, item.to, `Espacio de trabajo > ${item.title}`),
    ...(item.children?.map((child) =>
      navigationItem(child.title, child.to, `Espacio de trabajo > ${item.title} > ${child.title}`),
    ) ?? []),
  ])
}

function navigationItem(title: string, path: string, breadcrumb: string): WorkspaceSearchItem {
  return {
    breadcrumb,
    category: 'Navegacion',
    id: `nav-${path}`,
    keywords: `${title} pagina seccion`,
    path,
    subtitle: 'Ir a la seccion',
    title,
  }
}

function scoreTerm(haystack: string, title: string, term: string) {
  if (title.startsWith(term)) return 8
  if (title.includes(term)) return 5
  return haystack.includes(term) ? 2 : -20
}

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}
