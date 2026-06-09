import { categories } from './categories'
import { LayoutGridIcon, PlusIcon, TrashIcon } from './icons'
import { cx } from './utils'
import type { Variable } from './types'

type SelectedVariablesPanelProps = {
  dropActive: boolean
  onDragLeave: () => void
  onDragOver: (event: React.DragEvent<HTMLElement>) => void
  onDrop: (event: React.DragEvent<HTMLElement>) => void
  remove: (id: string) => void
  selectedCount: number
  variables: Variable[]
}

export function SelectedVariablesPanel({
  dropActive,
  onDragLeave,
  onDragOver,
  onDrop,
  remove,
  selectedCount,
  variables,
}: SelectedVariablesPanelProps) {
  return (
    <section className={cx('selected-panel', dropActive && 'is-drop-active')} onDragLeave={onDragLeave} onDragOver={onDragOver} onDrop={onDrop}>
      <header className="panel-heading">
        <div>
          <h3>Variables del grupo</h3>
          <p>{selectedCount === 0 ? 'Aun no has agregado variables' : 'Reorganiza, agrega o quita variables'}</p>
        </div>
        <span className={selectedCount > 0 ? 'is-active' : undefined}>{selectedCount}</span>
      </header>

      <div className="selected-dropzone">{variables.length === 0 ? <SelectedEmpty /> : <SelectedList remove={remove} variables={variables} />}</div>
    </section>
  )
}

function SelectedEmpty() {
  return (
    <div className="selected-empty">
      <div>
        <LayoutGridIcon />
      </div>
      <strong>Arrastra variables aqui</strong>
      <p>
        Tambien puedes pulsar el boton <PlusIcon /> sobre cada variable.
      </p>
    </div>
  )
}

function SelectedList({ remove, variables }: { remove: (id: string) => void; variables: Variable[] }) {
  return (
    <ul className="selected-list">
      {variables.map((variable, index) => {
        const category = categories.find((item) => item.key === variable.category)
        const Icon = category?.icon ?? LayoutGridIcon

        return (
          <li className="selected-item" key={variable.id} style={{ animationDelay: `${index * 30}ms` }}>
            <div className={cx('selected-icon', category?.tint)}>
              <Icon />
            </div>
            <div>
              <strong>{variable.name}</strong>
              <small>
                {variable.code} / {variable.value} {variable.unit}
              </small>
            </div>
            <button aria-label={`Quitar ${variable.name}`} onClick={() => remove(variable.id)} type="button">
              <TrashIcon />
            </button>
          </li>
        )
      })}
    </ul>
  )
}
