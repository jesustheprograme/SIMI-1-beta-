import { WorkspaceShell } from '../../../components/layout'
import type { User } from '../types'

type SessionCardProps = {
  initials: string
  onLogout: () => void
  user: User
}

export function SessionCard(props: SessionCardProps) {
  return <WorkspaceShell {...props} />
}
