type FinishFormProps = {
  finalComment: string
  finalOperator: string
  onCancel: () => void
  onChangeFinalComment: (value: string) => void
  onChangeFinalOperator: (value: string) => void
  onSubmit: () => void
}

export function FinishProcessCardModal({
  finalComment,
  finalOperator,
  onCancel,
  onChangeFinalComment,
  onChangeFinalOperator,
  onSubmit,
}: FinishFormProps) {
  return (
    <div className="process-create-confirm-backdrop" role="presentation">
      <section className="process-create-confirm process-finish-modal" role="dialog" aria-modal="true">
        <header>
          <span className="process-create-confirm-icon">✓</span>
          <div>
            <span>Cierre operativo</span>
            <h3>Finalizar proceso</h3>
            <p>Registra quien cierra el proceso y el comentario final.</p>
          </div>
        </header>
        <div className="process-finish-form">
          <label>
            <span>Operador Final</span>
            <input
              maxLength={60}
              onChange={(event) => onChangeFinalOperator(event.target.value)}
              placeholder="Ej. Maria Lopez"
              value={finalOperator}
            />
          </label>
          <label>
            <span>Comentario Final</span>
            <textarea
              maxLength={240}
              onChange={(event) => onChangeFinalComment(event.target.value)}
              placeholder="Resultado, novedades o cierre operativo"
              value={finalComment}
            />
          </label>
        </div>
        <div className="process-create-confirm-actions">
          <button className="process-create-confirm-cancel" onClick={onCancel} type="button">Cancelar</button>
          <button className="process-create-confirm-save" onClick={onSubmit} type="button">Finalizar proceso</button>
        </div>
      </section>
    </div>
  )
}

export function FinishProcessConfirmModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div
      className="delete-group-confirm-backdrop process-finish-confirm-backdrop"
      role="presentation"
      style={{ position: 'fixed', zIndex: 10000, background: 'transparent', backdropFilter: 'none' }}
    >
      <section className="delete-group-confirm" role="alertdialog" aria-modal="true">
        <span className="delete-group-confirm-icon">✓</span>
        <div>
          <h3>Finalizar proceso?</h3>
          <p>El proceso se detendra y se inhabilitara la edicion, estas seguro?</p>
        </div>
        <div className="delete-group-confirm-actions">
          <button className="delete-group-cancel" onClick={onCancel} type="button">Cancelar</button>
          <button className="delete-group-danger process-finish-confirm-action" onClick={onConfirm} type="button">
            Finalizar proceso
          </button>
        </div>
      </section>
    </div>
  )
}
