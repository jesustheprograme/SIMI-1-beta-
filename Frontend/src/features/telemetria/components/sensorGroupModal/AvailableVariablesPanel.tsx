import { categories } from './categories'
import { GripIcon, PlusIcon, SearchIcon } from './icons'
import { cx } from './utils'
import type { Category, Filter, Variable } from './types'

type AvailableVariablesPanelProps = {
  add: (id: string) => void
  availableCount: number
  draggingId: string | null
  filter: Filter
  grouped: Map<Category, Variable[]>
  groupedAll: Map<Category, Variable[]>
  onDragEnd: () => void
  onDragStart: (event: React.DragEvent<HTMLElement>, id: string) => void
  query: string
  selected: string[]
  setFilter: (filter: Filter) => void
  setQuery: (query: string) => void
  toggle: (id: string) => void
}

export function AvailableVariablesPanel({
  add,
  availableCount,
  draggingId,
  filter,
  grouped,
  groupedAll,
  onDragEnd,
  onDragStart,
  query,
  selected,
  setFilter,
  setQuery,
  toggle,
}: AvailableVariablesPanelProps) {
  const selectedIds = new Set(selected)
  const mobileCount = Array.from(groupedAll.values()).reduce((total, items) => total + items.length, 0)

  return (
    <section className="available-panel">
      <header className="panel-heading">
        <div>
          <h3>Variables disponibles</h3>
          <p>
            <span className="desktop-helper">Arrastra una variable o pulsa <kbd>+</kbd> para agregar.</span>
            <span className="mobile-helper">Marca las variables que quieras incluir.</span>
          </p>
        </div>
        <span>{availableCount}</span>
      </header>

      <div className="available-tools">
        <label className="available-search">
          <SearchIcon />
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por nombre o codigo..." value={query} />
        </label>
        <FilterPills filter={filter} setFilter={setFilter} />
      </div>

      <div className="available-list desktop-variable-list">
        {categories
          .filter((category) => (grouped.get(category.key)?.length ?? 0) > 0)
          .map(({ key, icon: Icon, tint }) => (
            <div className="available-category" key={key}>
              <div className="available-category-title">
                <Icon className={tint} />
                <h4>{key}</h4>
                <span />
              </div>
              <div className="available-items">
                {grouped.get(key)?.map((variable) => (
                  <VariableRow
                    add={add}
                    dragging={draggingId === variable.id}
                    key={variable.id}
                    onDragEnd={onDragEnd}
                    onDragStart={onDragStart}
                    variable={variable}
                  />
                ))}
              </div>
            </div>
          ))}
        {availableCount === 0 ? <div className="available-empty">No hay variables que coincidan.</div> : null}
      </div>

      <div className="available-list mobile-variable-list">
        {categories
          .filter((category) => (groupedAll.get(category.key)?.length ?? 0) > 0)
          .map(({ key, icon: Icon, tint }) => (
            <div className="available-category" key={key}>
              <div className="available-category-title">
                <Icon className={tint} />
                <h4>{key}</h4>
                <span />
              </div>
              <div className="available-items">
                {groupedAll.get(key)?.map((variable) => (
                  <VariableCheckboxRow
                    checked={selectedIds.has(variable.id)}
                    key={variable.id}
                    toggle={toggle}
                    variable={variable}
                  />
                ))}
              </div>
            </div>
          ))}
        {mobileCount === 0 ? <div className="available-empty">No hay variables que coincidan.</div> : null}
      </div>
    </section>
  )
}

function FilterPills({ filter, setFilter }: { filter: Filter; setFilter: (filter: Filter) => void }) {
  return (
    <div className="filter-pills">
      {(['Todas', 'Temperatura', 'Humedad', 'CO2', 'Etileno'] as const).map((category) => (
        <button className={filter === category ? 'is-active' : undefined} key={category} onClick={() => setFilter(category)} type="button">
          {category}
        </button>
      ))}
    </div>
  )
}

function VariableCheckboxRow({
  checked,
  toggle,
  variable,
}: {
  checked: boolean
  toggle: (id: string) => void
  variable: Variable
}) {
  return (
    <label className={cx('available-variable mobile-variable-check', checked && 'is-selected')}>
      <input checked={checked} onChange={() => toggle(variable.id)} type="checkbox" />
      <span aria-hidden="true" />
      <div>
        <strong>{variable.name}</strong>
        <small>{variable.code}</small>
      </div>
      <em>
        <strong>{variable.value}</strong>
        <small>{variable.unit}</small>
      </em>
    </label>
  )
}

function VariableRow({
  add,
  dragging,
  onDragEnd,
  onDragStart,
  variable,
}: {
  add: (id: string) => void
  dragging: boolean
  onDragEnd: () => void
  onDragStart: (event: React.DragEvent<HTMLElement>, id: string) => void
  variable: Variable
}) {
  return (
    <div
      className={cx('available-variable', dragging && 'is-dragging')}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={(event) => onDragStart(event, variable.id)}
    >
      <GripIcon />
      <div>
        <strong>{variable.name}</strong>
        <small>{variable.code}</small>
      </div>
      <em>
        <strong>{variable.value}</strong>
        <small>{variable.unit}</small>
      </em>
      <button aria-label={`Agregar ${variable.name}`} onClick={() => add(variable.id)} type="button">
        <PlusIcon />
      </button>
    </div>
  )
}
