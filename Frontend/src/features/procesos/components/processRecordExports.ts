import type { CreatedSensorGroup } from '../../telemetria/types/groups'
import type { CreatedProcess, ProcessLogEntry } from '../types'
import { downloadBlob } from './processRecordExports/download'
import { downloadRecordsExcel } from './processRecordExports/excel'
import { buildRecordsPdf } from './processRecordExports/pdfDocument'
import { loadPdfLogo } from './processRecordExports/pdfImage'
import { getExportErrorRows, getOrderedErrorRows } from './processRecordExports/errorRows'
import { getExportRecordRows } from './processRecordExports/rows'
import { slugify } from './processRecordExports/text'

// Fachada publica: mantiene estable el import usado por la vista de detalle del proceso.
export function downloadProcessRecordsExcel(
  process: CreatedProcess,
  groups: CreatedSensorGroup[],
  logs: ProcessLogEntry[],
) {
  const rows = getExportRecordRows(process, groups, logs)
  downloadRecordsExcel(process, rows, logs.length)
}

// Genera el PDF completo: portada, graficos, errores y tabla pivoteada de registros.
export async function downloadProcessRecordsPdf(
  process: CreatedProcess,
  groups: CreatedSensorGroup[],
  logs: ProcessLogEntry[],
) {
  const rows = getExportRecordRows(process, groups, logs)
  const errorRows = getOrderedErrorRows(getExportErrorRows(logs, rows, process, groups))
  const logo = await loadPdfLogo().catch(() => null)
  const pdf = buildRecordsPdf(process, rows, errorRows, logs.length, logo)

  downloadBlob(
    new Blob([pdf], { type: 'application/pdf' }),
    `${slugify(process.processName)}-registros.pdf`,
  )
}
