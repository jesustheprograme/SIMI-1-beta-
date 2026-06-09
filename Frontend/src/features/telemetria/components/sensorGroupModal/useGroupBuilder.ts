import { useMemo, useState } from 'react'
import type { DragEvent } from 'react'
import type { Category, Filter, Variable } from './types'

type InitialGroup = {
  name: string
  variableIds?: string[]
  variables: string[]
}

export function useGroupBuilder(initialGroup: InitialGroup | null | undefined, variables: Variable[]) {
  const [name, setName] = useState(() => initialGroup?.name ?? '')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('Todas')
  const [selected, setSelected] = useState<string[]>(() => getInitialSelected(initialGroup, variables))
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropActive, setDropActive] = useState(false)

  const available = useMemo(
    () =>
      variables
        .filter((variable) => !selected.includes(variable.id))
        .filter((variable) => filter === 'Todas' || variable.category === filter)
        .filter((variable) => matchesQuery(variable, query)),
    [selected, filter, query, variables],
  )

  const filteredVariables = useMemo(
    () =>
      variables
        .filter((variable) => filter === 'Todas' || variable.category === filter)
        .filter((variable) => matchesQuery(variable, query)),
    [filter, query, variables],
  )

  const grouped = useMemo(() => {
    const map = new Map<Category, Variable[]>()
    available.forEach((variable) => map.set(variable.category, [...(map.get(variable.category) ?? []), variable]))
    return map
  }, [available])

  const groupedAll = useMemo(() => {
    const map = new Map<Category, Variable[]>()
    filteredVariables.forEach((variable) => map.set(variable.category, [...(map.get(variable.category) ?? []), variable]))
    return map
  }, [filteredVariables])

  const selectedVariables = selected
    .map((id) => variables.find((variable) => variable.id === id))
    .filter((variable): variable is Variable => Boolean(variable))

  function add(id: string) {
    setSelected((current) => (current.includes(id) || !id ? current : [...current, id]))
  }

  function remove(id: string) {
    setSelected((current) => current.filter((item) => item !== id))
  }

  function toggle(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function handleDragStart(event: DragEvent<HTMLElement>, id: string) {
    event.dataTransfer.setData('text/plain', id)
    event.dataTransfer.effectAllowed = 'copy'
    setDraggingId(id)
  }

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    add(event.dataTransfer.getData('text/plain') || draggingId || '')
    setDraggingId(null)
    setDropActive(false)
  }

  return {
    add,
    available,
    canSave: name.trim().length > 0 && selected.length >= 2,
    draggingId,
    dropActive,
    filter,
    grouped,
    groupedAll,
    handleDragStart,
    handleDrop,
    name,
    query,
    remove,
    selected,
    selectedVariables,
    setDropActive,
    setFilter,
    setName,
    setQuery,
    setDraggingId,
    toggle,
  }
}

function matchesQuery(variable: Variable, query: string) {
  const normalized = query.trim().toLowerCase()
  return !normalized || variable.name.toLowerCase().includes(normalized) || variable.code.toLowerCase().includes(normalized)
}

function getInitialSelected(initialGroup: InitialGroup | null | undefined, variables: Variable[]) {
  const variableIds = initialGroup?.variableIds ?? []
  if (variableIds.length > 0) {
    const knownIds = new Set(variables.map((variable) => variable.id))
    return variableIds.filter((id) => knownIds.has(id))
  }

  const normalizedNames = new Set((initialGroup?.variables ?? []).map((name) => name.trim().toLowerCase()))

  return variables
    .filter((variable) => normalizedNames.has(variable.name.toLowerCase()))
    .map((variable) => variable.id)
}
