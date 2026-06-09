import type { ProcessType } from './index'

export type ProcessSection = {
  id: string
  processIds: string[]
  processType?: ProcessType
  title: string
}
