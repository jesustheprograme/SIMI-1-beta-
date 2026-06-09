import type { CreatedSensorGroup } from '../../types/groups'

export function GroupInfoModal({ group, onClose }: { group: CreatedSensorGroup; onClose: () => void }) {
  return (
    <div className="modal-backdrop groups-info-backdrop" role="presentation" onMouseDown={onClose}>
      <article
        className="group-info-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="group-info-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button
          className="group-info-close"
          onClick={onClose}
          type="button"
          aria-label="Cerrar informacion del grupo"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 18 }}>
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" />
          </svg>
        </button>

        <header className="group-info-header">
          <span className="group-info-mark">
            <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: 24 }}>
              <path d="M12 8h.008M12 16v-5" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            </svg>
          </span>
          <div>
            <p>Grupo seleccionado</p>
            <h2 id="group-info-modal-title">{group.name}</h2>
            <span>Sensores {group.categories?.join(', ')}</span>
          </div>
        </header>

        <section className="group-info-section">
          <p>Variables usadas</p>
          <div className="group-info-variable-list">
            {group.variables.length > 0 ? (
              group.variables.map((variable) => (
                <span key={variable}>{variable}</span>
              ))
            ) : (
              <span>Sin variables asignadas</span>
            )}
          </div>
        </section>
      </article>
    </div>
  )
}