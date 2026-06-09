import type { SVGProps } from 'react'
import type { CreatedProcess } from '../types'
import { getCountdown } from '../utils/processStatus'

export function ProcessCountdown({ compact, now, process }: { compact?: boolean; now: number; process: CreatedProcess }) {
  const countdown = getCountdown(process, now)
  return (
    <span className={`process-countdown is-${countdown.status}${compact ? ' is-compact' : ''}`}>
      <ClockIcon />
      <span>
        <strong>{countdown.label}</strong>
        <small>{countdown.detail}</small>
      </span>
    </span>
  )
}

function ClockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  )
}
