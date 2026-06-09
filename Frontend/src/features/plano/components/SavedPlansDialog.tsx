import { SavedPlansPanel } from './SavedPlansPanel'
import type { SavedPlan } from '../types/plano'

type SavedPlansDialogProps = {
  onClose: () => void
  onDeletePlan: (planId: string) => void
  onReplicatePlan: (plan: SavedPlan) => void
  savedPlans: SavedPlan[]
}

export function SavedPlansDialog({
  onClose,
  onDeletePlan,
  onReplicatePlan,
  savedPlans,
}: SavedPlansDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/50 px-4 py-6 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="relative w-full max-w-xl animate-in fade-in zoom-in-95 duration-200" onMouseDown={(event) => event.stopPropagation()}>
        <button
          className="absolute right-5 top-7 z-10 grid h-5 w-5 place-items-center p-0 text-zinc-950 transition hover:opacity-60"
          onClick={onClose}
          type="button"
          aria-label="Cerrar planos guardados"
        >
          <CloseIcon />
        </button>
        <SavedPlansPanel savedPlans={savedPlans} onDeletePlan={onDeletePlan} onReplicatePlan={onReplicatePlan} />
      </div>
    </div>
  )
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-3" viewBox="0 0 12 16">
      <path d="M0 0h12v16H0z" fill="none" />
      <path
        fill="currentColor"
        d="M10 12.5a.47.47 0 0 1-.35-.15l-8-8c-.2-.2-.2-.51 0-.71s.51-.2.71 0l7.99 8.01c.2.2.2.51 0 .71c-.1.1-.23.15-.35.15Z"
      />
      <path
        fill="currentColor"
        d="M2 12.5a.47.47 0 0 1-.35-.15c-.2-.2-.2-.51 0-.71l8-7.99c.2-.2.51-.2.71 0s.2.51 0 .71l-8.01 7.99c-.1.1-.23.15-.35.15"
      />
    </svg>
  )
}
