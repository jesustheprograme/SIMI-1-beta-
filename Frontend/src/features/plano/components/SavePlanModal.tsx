type SavePlanModalProps = {
  planName: string
  onPlanNameChange: (name: string) => void
  onSave: () => void
  onCancel: () => void
}

export function SavePlanModal({
  planName,
  onPlanNameChange,
  onSave,
  onCancel,
}: SavePlanModalProps) {
  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSave()
    if (event.key === 'Escape') onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold">Guardar plano</h2>

        <p className="mt-1 text-sm text-zinc-600">
          Escribe un nombre para identificar este plano.
        </p>

        <input
          value={planName}
          onChange={(event) => onPlanNameChange(event.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="Ejemplo: Planta 1 - Producción"
          className="mt-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="rounded-xl bg-zinc-200 px-4 py-2 text-sm font-medium"
          >
            Cancelar
          </button>

          <button
            onClick={onSave}
            disabled={!planName.trim()}
            className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
