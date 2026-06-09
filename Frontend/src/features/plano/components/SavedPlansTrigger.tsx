export function SavedPlansTrigger({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      className="inline-flex w-full min-h-10 items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
      onClick={onClick}
      type="button"
    >
      <span className="inline-flex items-center gap-2">
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M5 5.5A2.5 2.5 0 0 1 7.5 3h9A2.5 2.5 0 0 1 19 5.5v15l-7-3.8-7 3.8z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="1.8"
          />
        </svg>
        Planos guardados
      </span>
      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">{count}</span>
    </button>
  )
}
