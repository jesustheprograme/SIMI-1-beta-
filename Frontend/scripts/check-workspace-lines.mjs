import { readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const sourceRoot = join(process.cwd(), 'src')
const maxLines = 150
const extensions = new Set(['.ts', '.tsx', '.css'])
const debtBudgets = new Map([
  ['components/ui/charts.tsx', 353],
  ['components/ui/Combobox.tsx', 181],
  ['components/ui/dropdown-menu.tsx', 160],
  ['features/auth/AuthFeature.tsx', 200],
  ['features/auth/services/authApi.ts', 192],
  ['features/dashboard/DashboardFeature.tsx', 621],
  ['features/plano/PlanoFeature.tsx', 153],
  ['features/plano/components/PlanoCanvas.tsx', 2214],
  ['features/plano/components/PlanoEditorGrid.tsx', 153],
  ['features/plano/components/PlanoPageModals.tsx', 181],
  ['features/plano/components/PlanoToolbar.tsx', 412],
  ['features/plano/components/SavedPlansPanel.tsx', 174],
  ['features/plano/hooks/usePlanEditor.ts', 1123],
  ['features/plano/hooks/usePlanoLocationState.ts', 189],
  ['features/procesos/ProcessDetailFeature.tsx', 381],
  ['features/procesos/components/ProcessModal.tsx', 1791],
  ['features/procesos/components/ProcessRecordSvgChart.tsx', 208],
  ['features/procesos/components/ProcessRecordsChart.tsx', 259],
  ['features/procesos/components/processChartHelpers.ts', 236],
  ['features/procesos/components/processDetailHelpers.ts', 321],
  ['features/procesos/components/processRecordExports.ts', 309],
  ['features/telemetria/GruposFeature.tsx', 273],
  ['features/telemetria/SensoresFeature.tsx', 225],
  ['features/telemetria/components/SensorGroupModal.tsx', 401],
  ['features/telemetria/components/sensorGroupModal/AvailableVariablesPanel.tsx', 188],
  ['features/telemetria/components/sensorGroupModal/SensorGroupModal.css', 948],
  ['features/telemetria/components/sensorGroupModal/icons.tsx', 172],
  ['features/telemetria/hooks/useLiveSensorReadings.ts', 536],
  ['features/telemetria/operationalCatalog.ts', 206],
  ['features/workspace/icons.tsx', 161],
  ['styles/auth-01.css', 197],
  ['styles/auth-02.css', 179],
  ['styles/auth-03.css', 157],
  ['styles/controllers-sensors-01.css', 4619],
  ['styles/controllers-sensors-02.css', 186],
  ['styles/dashboard-01.css', 193],
  ['styles/dashboard-02.css', 179],
  ['styles/dashboard-03.css', 343],
  ['styles/plc-modal-01.css', 186],
  ['styles/plc-modal-02.css', 176],
  ['styles/responsive.css', 1999],
  ['styles/workspace-shell-01.css', 190],
  ['styles/workspace-shell-02.css', 273],
  ['styles/workspace-shell-03.css', 174],
])
const failures = []

walk(sourceRoot)

function walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      walk(path)
      continue
    }
    if (!extensions.has(extname(entry.name))) continue

    const projectPath = relative(sourceRoot, path).replaceAll('\\', '/')
    const lines = readFileSync(path, 'utf8').split(/\r?\n/).length
    const budget = debtBudgets.get(projectPath) ?? maxLines
    if (lines > budget) failures.push({ budget, lines, projectPath })
  }
}

if (failures.length) {
  console.error('Files exceed their line budget:')
  for (const failure of failures) {
    console.error(`  ${failure.lines}/${failure.budget} ${failure.projectPath}`)
  }
  process.exit(1)
}

console.log(`Line budget passed. New files are <= ${maxLines} lines and existing debt cannot grow.`)
