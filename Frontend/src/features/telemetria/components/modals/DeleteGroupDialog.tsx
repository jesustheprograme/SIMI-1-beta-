import { TrashIcon } from '../sensorGroupModal/icons'

type DeleteGroupDialogProps = {
  groupName: string
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteGroupDialog({ groupName, onCancel, onConfirm }: DeleteGroupDialogProps) {
  return (
    <div className="delete-group-confirm-backdrop" role="presentation">
      <section
        aria-describedby="delete-group-confirm-description"
        aria-labelledby="delete-group-confirm-title"
        aria-modal="true"
        className="delete-group-confirm"
        role="alertdialog"
      >
        <span className="delete-group-confirm-icon">
          <TrashIcon />
        </span>

        <div>
          <h3 id="delete-group-confirm-title">¿Eliminar este grupo?</h3>
          <p id="delete-group-confirm-description">
            Esta acción eliminará "{groupName}" y puede afectar planos u otras vistas vinculadas a sus variables.
          </p>
        </div>

        <div className="delete-group-confirm-actions">
          <button className="delete-group-cancel" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button className="delete-group-confirm-button" onClick={onConfirm} type="button">
            Sí, eliminar
          </button>
        </div>
      </section>
    </div>
  )
}
