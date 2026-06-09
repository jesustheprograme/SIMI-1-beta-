import { Toaster } from 'sileo'
import 'sileo/styles.css'
import type { User } from '../../features/auth/types'
import { useLiveSensorReadings, useProcessSensorLogs } from '../../features/telemetria'
import { useGroupActions } from '../../features/workspace/shell/useGroupActions'
import { useGroupSectionActions } from '../../features/workspace/shell/useGroupSectionActions'
import { useLocationActions } from '../../features/workspace/shell/useLocationActions'
import { useProcessActions } from '../../features/workspace/shell/useProcessActions'
import { useProcessSectionActions } from '../../features/workspace/shell/useProcessSectionActions'
import { useWorkspaceData } from '../../features/workspace/shell/useWorkspaceData'
import { useWorkspaceNavigation } from '../../features/workspace/shell/useWorkspaceNavigation'
import { WorkspaceContent } from '../../features/workspace/shell/WorkspaceContent'
import { getSelectedProcess } from '../../features/workspace/shell/workspaceRouteUtils'
import { DashboardHeader } from './DashboardHeader'
import { WorkspaceSidebar } from './WorkspaceSidebar'

type WorkspaceShellProps = {
  initials: string
  onLogout: () => void
  user: User
}

export function WorkspaceShell({ initials, onLogout, user }: WorkspaceShellProps) {
  const { collapsed, navigate, pathname, setCollapsed } = useWorkspaceNavigation()
  const {
    groupSections,
    groups,
    processSections,
    processes,
    setGroupSections,
    setGroups,
    setProcessSections,
    setProcesses,
    setZones,
    zones,
  } = useWorkspaceData()
  const liveReadings = useLiveSensorReadings()
  const processLogs = useProcessSensorLogs(processes, groups, liveReadings)
  const groupActions = useGroupActions(groups, setGroups, pathname)
  const changeGroupSections = useGroupSectionActions(setGroupSections)
  const processActions = useProcessActions(processes, setProcesses, pathname)
  const changeProcessSections = useProcessSectionActions(setProcessSections)
  const changeLocationZones = useLocationActions(setZones)
  const selectedProcess = getSelectedProcess(pathname, processes)

  return (
    <div className="workspace-shell">
      <Toaster position="top-right" offset={{ top: 86, right: 24 }} theme="light" />
      <DashboardHeader
        collapsed={collapsed}
        groups={groups}
        initials={initials}
        onLogout={onLogout}
        onNavigate={navigate}
        onToggleSidebar={() => setCollapsed((value) => !value)}
        processes={processes}
        user={user}
        zones={zones}
      />
      {!collapsed ? (
        <button
          aria-label="Cerrar menu"
          className="mobile-sidebar-backdrop"
          onClick={() => setCollapsed(true)}
          type="button"
        />
      ) : null}
      <div className={selectedProcess ? 'workspace-body is-process-detail' : 'workspace-body'}>
        <WorkspaceSidebar
          collapsed={collapsed}
          initials={initials}
          onLogout={onLogout}
          onNavigate={navigate}
          pathname={pathname}
          user={user}
        />
        <section
          aria-label="Workspace"
          className={selectedProcess ? 'workspace-main is-process-detail' : 'workspace-main'}
        >
          <WorkspaceContent
            groupSections={groupSections}
            groups={groups}
            liveReadings={liveReadings}
            logs={processLogs}
            onCreateGroup={groupActions.createGroup}
            onCreateProcess={processActions.createProcess}
            onDeleteGroup={groupActions.removeGroup}
            onDeleteProcess={processActions.removeProcess}
            onGroupSectionsChange={changeGroupSections}
            onLocationZonesChange={changeLocationZones}
            onNavigate={navigate}
            onProcessSectionsChange={changeProcessSections}
            onUpdateGroup={groupActions.updateGroup}
            onUpdateProcess={processActions.updateProcess}
            pathname={pathname}
            processes={processes}
            processSections={processSections}
            zones={zones}
          />
        </section>
      </div>
    </div>
  )
}
