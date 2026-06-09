import type { KeyboardEvent as ReactKeyboardEvent } from 'react'

type SaveLocationModalProps = {
  locationName: string
  onCancel: () => void
  onLocationNameChange: (name: string) => void
  onSave: () => void
}

export function SaveLocationModal({
  locationName,
  onCancel,
  onLocationNameChange,
  onSave,
}: SaveLocationModalProps) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') onSave()
    if (event.key === 'Escape') onCancel()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-bold">Guardar ubicado</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Escribe el nombre que aparecera en el combo de ubicados al crear procesos.
        </p>

        <input
          autoFocus
          className="mt-4 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          maxLength={80}
          onChange={(event) => onLocationNameChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ejemplo: Camara fria 1"
          value={locationName}
        />

        <div className="mt-5 flex justify-end gap-3">
          <button className="rounded-xl bg-zinc-200 px-4 py-2 text-sm font-medium" onClick={onCancel} type="button">
            Cancelar
          </button>
          <button
            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
            disabled={!locationName.trim()}
            onClick={onSave}
            type="button"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
