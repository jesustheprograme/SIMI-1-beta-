import { IconBox } from '../../../components/ui/IconBox'

type FloatingVariableCardProps = {
  subtitle: string
  title: string
  wide?: boolean
}

export function FloatingVariableCard({ subtitle, title, wide = false }: FloatingVariableCardProps) {
  return (
    <div
      className={`pointer-events-none select-none rounded-lg border-2 border-blue-500 bg-white p-2 text-zinc-900 shadow-2xl shadow-zinc-950/25 ring-2 ring-blue-400 ring-offset-2 ${
        wide ? 'w-56' : 'w-40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <strong className="block truncate text-xs font-bold leading-tight">{title}</strong>
          <span className="mt-1 block truncate text-[11px] font-medium text-zinc-500">{subtitle}</span>
        </div>

        <span className="shrink-0">
          <IconBox variant="data" size="sm">
            <svg aria-hidden="true" className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
              <path d="M12 16v-4M12 8h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </IconBox>
        </span>
      </div>
    </div>
  )
}
