export type Point = {
  x: number
  y: number
}

export type LineDirection = 'horizontal' | 'vertical'

export type PlanoLine = {
  direction: LineDirection | null
  id: string
  x1: number
  x2: number
  y1: number
  y2: number
}

export type PlanoVariableNode = {
  categories?: string[]
  groupId: string
  groupName: string
  id: string
  sensorSummary: string
  sensorTitle: string
  variableId: string
  variableName: string
  x: number
  y: number
}

export type PlanoProcessVariable = {
  groupName: string
  id: string
  name: string
  sensorTitle: string
}

export type PlanoProcessNode = {
  deadlineAt?: string
  groupIds: string[]
  groupNames: string[]
  id: string
  location?: string
  processId: string
  processName: string
  variables: PlanoProcessVariable[]
  x: number
  y: number
}

export type PlanoLocationShape = 'rectangle' | 'rounded' | 'l-shape' | 'ellipse' | 'diamond'

export type PlanoLocationZone = {
  createdAt: string
  height: number
  id: string
  lCutX?: number
  lCutY?: number
  name: string
  shape?: PlanoLocationShape
  width: number
  x: number
  y: number
}

export type PlanoBackgroundImage = {
  createdAt: string
  displayHeight: number
  displayWidth: number
  fileName: string
  height: number
  imageDisplayHeight: number
  imageDisplayWidth: number
  imageX: number
  imageY: number
  mimeType: string
  src: string
  width: number
  x: number
  y: number
}

export type SavedPlan = {
  backgroundImage?: PlanoBackgroundImage | null
  createdAt: string
  id: string
  lines: PlanoLine[]
  locationZones?: PlanoLocationZone[]
  name: string
  processes?: PlanoProcessNode[]
  variables: PlanoVariableNode[]
}
