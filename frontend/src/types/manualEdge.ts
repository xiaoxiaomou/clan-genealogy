export interface ManualEdge {
  id: string
  source: string
  target: string
  label: string
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
}

export interface ManualEdgeData {
  isManual: true
  edge: ManualEdge
}

export type HistoryAction =
  | { type: 'ADD'; edge: ManualEdge }
  | { type: 'DELETE'; edge: ManualEdge }
  | { type: 'UPDATE'; before: ManualEdge; after: ManualEdge }

export interface HistoryState {
  past: ManualEdge[][]
  present: ManualEdge[]
  future: ManualEdge[][]
}

export type EditingMode = 'default' | 'adding' | 'editing'

export interface AddingState {
  step: 'select-source' | 'select-target' | 'confirm'
  sourceId: string | null
  sourceName: string | null
  targetId: string | null
  targetName: string | null
}

export interface DragHandle {
  edgeId: string
  handleType: 'source' | 'target'
  nodeId: string
}

export const SNAP_THRESHOLD = 30

export const LINE_COLORS = [
  { value: '#3b82f6', label: '蓝色' },
  { value: '#10b981', label: '绿色' },
  { value: '#f59e0b', label: '橙色' },
  { value: '#ef4444', label: '红色' },
  { value: '#8b5cf6', label: '紫色' },
  { value: '#ec4899', label: '粉色' },
  { value: '#6b7280', label: '灰色' },
] as const

export const LINE_STYLES = [
  { value: 'solid', label: '实线' },
  { value: 'dashed', label: '虚线' },
  { value: 'dotted', label: '点线' },
] as const