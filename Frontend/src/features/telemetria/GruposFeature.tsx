import { useEffect, useMemo, useState } from 'react'
import { BreadcrumbNav } from '../../components/ui/BreadcrumbNav'
import { getInferredCategories } from '../../utils/categoryUtils'
import { createLocalId } from '../../utils/localId'
import { GroupSectionBoard } from './components/GroupSectionBoard'
import { SensorGroupModal } from './components/SensorGroupModal'
import { categories } from './components/sensorGroupModal/categories'
import type { ProcessSensorReading } from '../procesos/types'
import type { CreatedSensorGroup } from './types/groups'
import type { GroupSection } from './types/groupSections'
import {
  createGroupSection,
  normalizeGroupSections,
  sectionsEqual,
} from './utils/groupSections'

type GruposPageProps = {
  createdGroups: CreatedSensorGroup[]
  groupSections: GroupSection[]
  liveReadings: Record<string, ProcessSensorReading>
  onCreateGroup: (group: CreatedSensorGroup) => void
  onDeleteGroup: (groupId: string) => void
  onGroupSectionsChange: (sections: GroupSection[]) => void
  onUpdateGroup: (group: CreatedSensorGroup) => void
}

export function GruposPage(props: GruposPageProps) {
  const { createdGroups, groupSections, liveReadings, onCreateGroup, onDeleteGroup, onGroupSectionsChange, onUpdateGroup } = props
  const [editingGroup, setEditingGroup] = useState<CreatedSensorGroup | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showSectionCreator, setShowSectionCreator] = useState(false)
  const [sectionTitle, setSectionTitle] = useState('')
  const [query, setQuery] = useState('')

  const normalizedSections = useMemo(
    () => normalizeGroupSections(createdGroups, groupSections),
    [createdGroups, groupSections],
  )
  const groupsById = useMemo(
    () => new Map(createdGroups.map((group) => [group.id, group])),
    [createdGroups],
  )
  const filteredSections = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return normalizedSections

    return normalizedSections.filter((section) => {
      const sectionMatches = section.title.toLowerCase().includes(normalizedQuery)
      if (sectionMatches) return true

      return section.groupIds.some((groupId) => {
        const group = groupsById.get(groupId)
        if (!group) return false
        return [group.name, getSensorSummary(group), ...group.variables].some((value) =>
          value.toLowerCase().includes(normalizedQuery),
        )
      })
    }).map((section) => {
      const sectionMatches = section.title.toLowerCase().includes(normalizedQuery)
      if (sectionMatches) return section

      return {
        ...section,
        groupIds: section.groupIds.filter((groupId) => {
          const group = groupsById.get(groupId)
          if (!group) return false
          return [group.name, getSensorSummary(group), ...group.variables].some((value) =>
            value.toLowerCase().includes(normalizedQuery),
          )
        }),
      }
    })
  }, [groupsById, normalizedSections, query])
  const boardInteractive = query.trim().length === 0
  const visibleSections = boardInteractive ? normalizedSections : filteredSections
  const visibleGroupCount = visibleSections.reduce(
    (count, section) => count + section.groupIds.length,
    0,
  )

  useEffect(() => {
    if (!sectionsEqual(normalizedSections, groupSections)) {
      onGroupSectionsChange(normalizedSections)
    }
  }, [groupSections, normalizedSections, onGroupSectionsChange])

  function handleCreateSection() {
    const title = sectionTitle.trim()
    if (!title) return

    onGroupSectionsChange(
      createGroupSection(normalizedSections, title, createLocalId('group-section')),
    )
    setSectionTitle('')
    setShowSectionCreator(false)
  }

  return (
    <div className="dashboard-page">
      <BreadcrumbNav items={['Dashboard', 'Controladores', 'Grupos']} />

      <div className="dashboard-heading compact">
        <h1>Grupos</h1>
        <p>Organiza grupos por secciones y reubicalos arrastrando sus bloques.</p>
      </div>

      <section className="sensor-page-toolbar groups-toolbar">
        <button className="create-group-button" onClick={() => setShowCreateModal(true)} type="button">
          <PlusCircleIcon />
          <span>Crear grupo</span>
        </button>
        <button className="create-group-button create-section-button" onClick={() => setShowSectionCreator((value) => !value)} type="button">
          <SectionIcon />
          <span>Crear seccion</span>
        </button>
      </section>

      {showSectionCreator ? (
        <section className="groups-section-creator">
          <input
            maxLength={60}
            onChange={(event) => setSectionTitle(event.target.value)}
            placeholder="Ej. Grupo para piso 1"
            value={sectionTitle}
          />
          <button className="create-group-button" onClick={handleCreateSection} type="button">
            Guardar seccion
          </button>
        </section>
      ) : null}

      <section className="groups-search" aria-label="Buscar grupos">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por grupo, seccion o variable..."
          value={query}
        />
      </section>

      {createdGroups.length > 0 ? (
        visibleGroupCount > 0 ? (
          <section className="group-board-shell" aria-label="Grupos creados">
            <GroupSectionBoard
              groupsById={groupsById}
              interactive={boardInteractive}
              onChange={onGroupSectionsChange}
              renderGroup={(group) => (
                <GroupCard group={group} onEdit={() => setEditingGroup(group)} />
              )}
              sections={visibleSections}
            />
          </section>
        ) : (
          <section className="groups-panel">
            <p className="groups-empty">No hay grupos que coincidan con la busqueda.</p>
          </section>
        )
      ) : (
        <section className="groups-panel">
          <p className="groups-empty">Todavia no hay grupos creados.</p>
        </section>
      )}

      {showCreateModal ? (
        <SensorGroupModal
          existingGroups={createdGroups}
          liveReadings={liveReadings}
          onClose={() => setShowCreateModal(false)}
          onSave={onCreateGroup}
          sensorTitle="Sensores"
        />
      ) : null}

      {editingGroup ? (
        <SensorGroupModal
          existingGroups={createdGroups}
          initialGroup={editingGroup}
          liveReadings={liveReadings}
          onClose={() => setEditingGroup(null)}
          onDelete={(groupId) => {
            onDeleteGroup(groupId)
            setEditingGroup(null)
          }}
          onSave={onUpdateGroup}
          sensorTitle={editingGroup.sensorTitle}
        />
      ) : null}
    </div>
  )
}

function GroupCard({ group, onEdit }: { group: CreatedSensorGroup; onEdit: () => void }) {
  return (
    <article className="created-group-card sensor-group-card group-board-card">
      <div className="created-group-card-header">
        <GroupCategoryIcons group={group} />
        <div>
          <strong>{group.name}</strong>
          <span className="created-group-variable-list">{formatVariablePreview(group.variables)}</span>
        </div>
      </div>
      <button
        aria-label={`Editar ${group.name}`}
        className="created-group-edit"
        onClick={onEdit}
        onPointerDown={(event) => event.stopPropagation()}
        type="button"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M0 0h24v24H0z" fill="none" />
          <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z" />
          </g>
        </svg>
      </button>
    </article>
  )
}

function PlusCircleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8" />
      <path d="M8 12h8" />
    </svg>
  )
}

function SectionIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16" />
      <path d="M4 12h8" />
      <path d="M4 17h16" />
    </svg>
  )
}

function GroupCategoryIcons({ group }: { group: CreatedSensorGroup }) {
  const groupCategories = getGroupCategories(group)
  const categoryOrder = ['Temperatura', 'Humedad', 'Etileno', 'CO2']
  const configs = categories
    .filter((category) => groupCategories.includes(category.key))
    .sort((left, right) => categoryOrder.indexOf(left.key) - categoryOrder.indexOf(right.key))

  return (
    <span className="created-group-category-icons" aria-label={`Categorias: ${groupCategories.join(', ')}`}>
      {configs.map((category) => {
        const Icon = category.icon
        return (
          <span className={`created-group-category-icon ${category.tint}`} key={category.key} title={category.key}>
            <Icon />
          </span>
        )
      })}
    </span>
  )
}

function getSensorSummary(group: CreatedSensorGroup) {
  return `Sensores ${getGroupCategories(group).join(', ')}`
}

function getGroupCategories(group: CreatedSensorGroup) {
  const inferredCategories = [
    ...getInferredCategories(group.sensorTitle),
    ...group.variables.flatMap(inferCategoriesFromValue),
    ...(group.variableIds ?? []).flatMap(inferCategoriesFromValue),
  ]

  return Array.from(new Set([...(group.categories ?? []), ...inferredCategories]))
}

function inferCategoriesFromValue(value: string) {
  const normalized = value.trim().toLowerCase()
  if (/(temperatura|\btmp\b|\btemp\b|\btem\b)/.test(normalized)) return ['Temperatura']
  if (/(humedad|\bhum\b)/.test(normalized)) return ['Humedad']
  if (/\bco2\b/.test(normalized)) return ['CO2']
  if (/(etileno|\betn\b|\beti\b)/.test(normalized)) return ['Etileno']
  return []
}

function formatVariablePreview(variables: string[]) {
  if (variables.length === 0) return 'Sin variables asignadas'
  const visible = variables.slice(0, 3).join(', ')
  const remaining = variables.length - 3
  return remaining > 0 ? `${visible} +${remaining}` : visible
}
